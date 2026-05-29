// src/lib/automation/asset-legal-gate.ts
//
// Sprint 7-M2 Phase G8-ENGINE-Q3 — pre-publish legal gate (research §3, §9).
//
// Korea has a triple legal frame for AI-assisted commerce imagery:
//   - AI 기본법 (2026-01-22): transparency duties — but only for an 'AI 사업자'
//     (provider). A solo seller using AI tools is an 'user', outside direct
//     scope. KKOTIUM is self-use today -> disclosure module deferred.
//   - 표시·광고의 공정화에 관한 법률 (2026-04-08 행정예고): a 'virtual person'
//     in an ad must be labelled. Safest answer: never generate faces.
//   - 퍼블리시티권 / 부정경쟁방지법 (타)목: an AI face resembling a real person
//     is a risk. Safest answer: identifiable human parts only (hand / back).
//
// This module is the code-side half of the "no face" double-check (the Firefly
// prompts carry "no human face" on the generation side). It runs PURE checks:
// no external image API at runtime (workrule #38).
//
// MVP HONESTY (#46): pixel-level face detection and ΔE over-retouching scoring
// require a detector / reference frame we do not have at runtime. They are
// declared in the result union for forward-compat but are NOT asserted here —
// precision detection is a separate sprint (handoff §3 item 2). What this MVP
// enforces deterministically: masterpiece-copyright + realistic-person keyword
// blocks, and the AI-disclosure warning that switches on iff we become a
// provider. Generated backdrops are no-human by construction (ModelPolicy has
// no face member), so the generation path never introduces a face.

import type { ThumbnailVariant } from './thumbnail-generator';
import type { FireflyModel } from './adobe-tool-router';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LegalBlock =
  | { type: 'masterpiece-copyright'; keyword: string }
  | { type: 'realistic-person'; keyword: string }
  | { type: 'face-detected'; confidence: number }
  // G8-ENGINE-Q4 (research §2-D / §10, handoff §2-E): a partner (non-Adobe)
  // model is not IP-indemnified, so it cannot be the FINAL commercial cut
  // (clean / badge). Blocks pending a Firefly-native re-render.
  | { type: 'partner-model-final-commercial'; model: FireflyModel; requiresFireflyNativeRegeneration: true };

export type LegalWarning =
  | { type: 'excessive-retouching'; diff: number }
  | { type: 'ai-disclosure-needed'; reason: string }
  // G8-ENGINE-Q4 (research §4): a domeggook-sourced visual may be a protected
  // 이미지(연출)컷. Our pipeline only borrows the product cutout + regenerates
  // the background, which mitigates the derivative risk — so this is advisory
  // (verify 도매꾹 "이미지 사용여부"), not a hard block.
  | { type: 'domeggook-source-derivative'; sourceUrl: string; requiresOriginalApproval: true };

export interface LegalGateResult {
  passed: boolean;
  blocks: LegalBlock[];
  warnings: LegalWarning[];
  /** Variant the gate was evaluated for — clean is the strictest (네이버
   *  대표이미지: text 0, human 0, watermark 0; research §2-B). */
  variant: ThumbnailVariant;
}

export interface LegalGateInput {
  productName: string;
  category?: string | null;
  variant: ThumbnailVariant;
  /** True only when the app is offered to external sellers as a SaaS — flips
   *  the AI 기본법 / 표시광고법 disclosure duty on. Self-use stays false. */
  isBusinessProvider?: boolean;
  // ── G8-ENGINE-Q4 ──────────────────────────────────────────────────────
  /** Product.legalApproval override. 'master_pd_verified' waives the
   *  masterpiece-copyright block (operator confirmed public-domain artwork,
   *  e.g. Van Gogh d.1890 / Monet d.1926 — author +70yr). */
  legalApproval?: string | null;
  /** Source image URL — flags a domeggook-derived advisory warning. */
  sourceImageUrl?: string | null;
  /** Model proposed for this variant — partner models cannot be the final
   *  commercial cut (clean / badge). */
  model?: FireflyModel | null;
}

/** Partner (non-Adobe-indemnified) models. Firefly-native models are indemnified. */
const PARTNER_MODELS: ReadonlyArray<FireflyModel> = [
  'gemini-3-nano-banana-pro',
  'gemini-3-1-nano-banana-2',
  'gemini-2-5-nano-banana',
  'imagen',
  'gpt-image-2',
];

const MASTER_PD_APPROVAL = 'master_pd_verified';
const DOMEGGOOK_HOST_RE = /domeggook|domeme/i;

// ---------------------------------------------------------------------------
// Keyword rules (Korean matching tokens — workrule #35 carve-out)
// ---------------------------------------------------------------------------

// research §9-3: paintings need public-domain status (author +70yr). A product
// that markets itself on a "명화/그림" needs explicit operator approval before
// publish, so we BLOCK pending review rather than silently ship.
const MASTERPIECE_TOKENS = ['명화', '명화송풍구', '그림', '회화', '유화', '그래픽아트', '아트포스터', 'masterpiece', 'painting', 'artwork'];

// research §9-4: an identifiable real person / face overlay is a 초상권 risk.
const PERSON_TOKENS = ['연예인', '셀럽', '셀러브리티', '인물사진', '모델얼굴', '실존인물', 'celebrity'];

function firstMatch(haystack: string, tokens: string[]): string | null {
  const lc = haystack.toLowerCase();
  for (const t of tokens) {
    if (lc.includes(t.toLowerCase())) return t;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

/**
 * Evaluate the pre-publish legal gate for one product/variant. Pure + sync-safe
 * (returns a Promise to keep the signature stable for a future detector). A
 * masterpiece keyword BLOCKS unless the product carries a master_pd_verified
 * legalApproval (operator-confirmed public-domain artwork). A partner model on
 * a final commercial cut also BLOCKS. passed === (blocks.length === 0).
 */
export async function runLegalGate(input: LegalGateInput): Promise<LegalGateResult> {
  const haystack = `${input.productName} ${input.category ?? ''}`;
  const blocks: LegalBlock[] = [];
  const warnings: LegalWarning[] = [];

  // masterpiece keyword blocks UNLESS the operator has recorded a public-domain
  // approval (master_pd_verified) on the product (research §9-3, handoff §2-E).
  const masterpiece = firstMatch(haystack, MASTERPIECE_TOKENS);
  if (masterpiece && input.legalApproval !== MASTER_PD_APPROVAL) {
    blocks.push({ type: 'masterpiece-copyright', keyword: masterpiece });
  }

  const person = firstMatch(haystack, PERSON_TOKENS);
  if (person) {
    blocks.push({ type: 'realistic-person', keyword: person });
  }

  // A partner model cannot be the FINAL commercial cut (clean / badge): not
  // Adobe-indemnified. Blocks pending a Firefly-native re-render (handoff §4-A).
  if (
    input.model &&
    PARTNER_MODELS.includes(input.model) &&
    (input.variant === 'clean' || input.variant === 'badge')
  ) {
    blocks.push({
      type: 'partner-model-final-commercial',
      model: input.model,
      requiresFireflyNativeRegeneration: true,
    });
  }

  // A domeggook source may be a protected 연출컷. We only borrow the product
  // cutout + regenerate the background, so this is advisory (research §4-D).
  if (input.sourceImageUrl && DOMEGGOOK_HOST_RE.test(input.sourceImageUrl)) {
    warnings.push({
      type: 'domeggook-source-derivative',
      sourceUrl: input.sourceImageUrl,
      requiresOriginalApproval: true,
    });
  }

  // AI disclosure duty switches on only when we provide the tool to others.
  if (input.isBusinessProvider) {
    warnings.push({
      type: 'ai-disclosure-needed',
      reason: 'AI 기본법/표시광고법: provider mode requires AI-generation disclosure',
    });
  }

  return {
    passed: blocks.length === 0,
    blocks,
    warnings,
    variant: input.variant,
  };
}
