// src/lib/automation/copy-writer.ts
//
// Sprint 7-M1 (v3.1 FINAL Smart Asset Workflow) — Groq copy generator +
// dark-pattern filter. Produces the short ad-text strings that
// thumbnail-generator stamps onto each variant.
//
// Pipeline:
//   1. Build a per-skeleton Groq prompt from SkeletonSpec.copyGlobalTone +
//      the requested copy slot (hook / price / badge).
//   2. Call Groq Llama 3.1 8B with round-robin keys (workflow principle #38:
//      Groq is the only LLM allowed at runtime).
//   3. Run dark-pattern regex filter on the result. If the filter trips,
//      retry once with an explicit "do not use these phrases" hardening
//      prompt. If it still trips, fall back to the deterministic template.
//   4. Trim to the slot's max character budget.
//
// Dark-pattern coverage (Korean fair-trade guidance, 2025 KFTC update):
//   - 단계적 할인 / "원래 가격" (price-anchoring without basis)
//   - 한정 수량 / 마감 임박 (artificial scarcity without a real cap)
//   - "공식 / 정품 / 100%" claims that overstate
//   - "최저가" / "독점" superlatives
//   - 적립 / 쿠폰 / 즉시할인 stacking implied without disclosure
//   - 별점 / 리뷰 인용 with no source

import type { SkeletonSpec } from './layout-skeletons';
import {
  checkCopyText,
  type LintViolation,
} from '@/lib/compliance/dark-pattern-lint';
import { pickGroqKey, callGroq } from './groq-client';
import { pickLeafFromCategory, firstNameToken } from './category-leaf';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CopySlot = 'hook' | 'priceBadge' | 'categoryBadge' | 'lifestyleCaption';

export interface CopyRequest {
  slot: CopySlot;
  skeleton: SkeletonSpec;
  /** Required: product name as crawled or entered. */
  productName: string;
  /** Optional: sale price in KRW, used only by the priceBadge slot. */
  salePrice?: number;
  /** Optional: free-text category label. */
  category?: string;
  /** Optional: short additional context to mention (e.g. "4종 세트"). */
  highlight?: string;
}

export interface CopyResult {
  text: string;
  source: 'groq' | 'fallback';
  /** True when the dark-pattern filter rewrote or fell back. */
  filtered: boolean;
  /** Bytes of input prompt + tokens (rough). Useful for cost telemetry. */
  promptCharsApprox: number;
  /** Sprint 7-M3 lint engine violations on the final text (post-filter).
   *  Callers can persist these to dark_pattern_lint_logs. */
  lintViolations: LintViolation[];
}

// ---------------------------------------------------------------------------
// Slot specs
// ---------------------------------------------------------------------------

const SLOT_LIMITS: Record<CopySlot, number> = {
  hook: 28,
  priceBadge: 16,
  categoryBadge: 14,
  lifestyleCaption: 48,
};

const SLOT_INSTRUCTIONS: Record<CopySlot, string> = {
  hook:
    'A single-line product hook in Korean. Plain friendly tone, no emoji, ' +
    'no exclamation marks, no price mentions, no superlatives like "최저가" ' +
    'or "1위", no scarcity phrases like "마감 임박". Under 28 characters.',
  priceBadge:
    'A short Korean price badge string. Include the price number only ' +
    '(no "원래 가격", no "할인", no percent-off claims). Format like "₩15,000". ' +
    'Under 16 characters.',
  categoryBadge:
    'A short Korean category or season label in 2-6 syllables. No "정품", ' +
    'no "공식", no superlatives. Under 14 characters.',
  lifestyleCaption:
    'A two-clause Korean caption describing a daily-use scenario for the ' +
    'product, in plain friendly tone. No emoji, no claims about results. ' +
    'Under 48 characters.',
};

// ---------------------------------------------------------------------------
// Dark-pattern filter
// ---------------------------------------------------------------------------

/** Patterns ordered by descending KFTC risk. Each tuple is [regex, label]. */
const DARK_PATTERN_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  // Artificial scarcity
  [/마감\s*임박|품절\s*임박|단\s*\d+\s*개|선착순\s*\d+/g, 'scarcity'],
  // Anchored / fake discount
  [/원래\s*가격|정상가|할인\s*\d+\s*%|즉시\s*할인/g, 'anchor-discount'],
  // Superlatives / claims
  [/최저가|최고|1위|독점|유일/g, 'superlative'],
  // Overclaimed authenticity
  [/100\s*%\s*정품|100\s*%\s*공식/g, 'authenticity'],
  // Coupon stacking without disclosure
  [/쿠폰\s*중복|적립\s*중복|혜택\s*폭탄/g, 'coupon-stack'],
  // Emoji blanket ban (workflow principle #29 + brand guideline)
  [/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/gu, 'emoji'],
];

export interface FilterResult {
  text: string;
  filtered: boolean;
  reasons: string[];
}

/** Strip dark-pattern phrases from a copy string. Returns the cleaned text
 *  plus the list of rule labels that fired. */
export function filterDarkPatterns(input: string): FilterResult {
  let working = input;
  const reasons: string[] = [];
  for (const [pattern, label] of DARK_PATTERN_RULES) {
    if (pattern.test(working)) {
      working = working.replace(pattern, '');
      reasons.push(label);
    }
  }
  // Collapse runs of whitespace introduced by removal.
  working = working.replace(/\s+/g, ' ').trim();
  return {
    text: working,
    filtered: reasons.length > 0,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// Deterministic fallback
// ---------------------------------------------------------------------------

function fallbackCopy(req: CopyRequest): string {
  const tokens = req.productName.split(/\s+/);
  switch (req.slot) {
    case 'hook':
      return tokens.slice(0, 3).join(' ').slice(0, SLOT_LIMITS.hook);
    case 'priceBadge':
      if (typeof req.salePrice === 'number') {
        return `₩${req.salePrice.toLocaleString('ko-KR')}`;
      }
      return tokens[0]?.slice(0, SLOT_LIMITS.priceBadge) ?? '';
    case 'categoryBadge':
      return deriveCategoryBadge(req);
    case 'lifestyleCaption':
      return tokens.slice(0, 6).join(' ').slice(0, SLOT_LIMITS.lifestyleCaption);
  }
}

/**
 * Deterministic category badge: take the most specific (leaf) segment of a
 * category path and use it verbatim. The leaf of "생활/건강>주방용품" is
 * "주방용품". This deliberately bypasses Groq — the LLM was free-synthesizing
 * this slot and produced broken Korean compounds (observed: "일용보관함"), a
 * non-word that reads as machine-translated junk and undermines brand
 * authority. A category label needs faithful extraction, not generation.
 * Falls back to the first product-name token when no category is supplied.
 */
function deriveCategoryBadge(req: CopyRequest): string {
  // SSOT (2026-06-01): the leaf + sentinel filter logic lives in
  // category-leaf.ts so the thumbnail badge and the detail spec always agree.
  // The thumbnail route now pre-resolves the category via resolveCategoryLeaf
  // (including a crawl_logs fallback when needed), so by the time req.category
  // arrives here it should already be a real label — but we still apply the
  // sentinel-aware extractor defensively for callers that bypass the route.
  const leaf = pickLeafFromCategory(req.category) ?? firstNameToken(req.productName);
  return leaf.slice(0, SLOT_LIMITS.categoryBadge);
}

// ---------------------------------------------------------------------------
// Groq call
// ---------------------------------------------------------------------------

function buildPrompt(req: CopyRequest, hardening: string = ''): string {
  const skeleton = req.skeleton;
  const ctx = [
    `Product name: ${req.productName}`,
    req.category ? `Category: ${req.category}` : '',
    typeof req.salePrice === 'number'
      ? `Sale price (KRW): ${req.salePrice}`
      : '',
    req.highlight ? `Highlight: ${req.highlight}` : '',
  ].filter(Boolean).join('\n');

  const limit = SLOT_LIMITS[req.slot];
  return [
    `You are writing a single Korean string for the "${req.slot}" slot of a thumbnail.`,
    `Skeleton: ${skeleton.id} — ${skeleton.description}`,
    `Skeleton tone: ${skeleton.copyGlobalTone}`,
    `Slot rules: ${SLOT_INSTRUCTIONS[req.slot]}`,
    hardening ? `Hard constraint: ${hardening}` : '',
    `Hard limit: ${limit} characters. Do not exceed.`,
    `Context:\n${ctx}`,
    'Respond with the Korean string only, no quotes, no markdown, no explanation.',
  ].filter(Boolean).join('\n\n');
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export async function generateCopy(req: CopyRequest): Promise<CopyResult> {
  const limit = SLOT_LIMITS[req.slot];

  // categoryBadge is extracted deterministically from the category leaf, never
  // synthesized by Groq. The LLM invented broken compounds for this slot
  // (observed: "일용보관함") that the dark-pattern filter cannot catch because
  // they are grammatically malformed rather than non-compliant. Faithful
  // extraction removes the hallucination vector entirely.
  if (req.slot === 'categoryBadge') {
    const text = deriveCategoryBadge(req).slice(0, limit);
    return {
      text,
      source: 'fallback',
      filtered: false,
      promptCharsApprox: 0,
      lintViolations: checkCopyText(text).violations,
    };
  }

  const key = pickGroqKey();
  const prompt = buildPrompt(req);

  const finalize = (
    text: string,
    source: 'groq' | 'fallback',
    filtered: boolean,
  ): CopyResult => ({
    text,
    source,
    filtered,
    promptCharsApprox: prompt.length,
    lintViolations: checkCopyText(text).violations,
  });

  // Path 1: no Groq key -> deterministic fallback.
  if (!key) {
    return finalize(fallbackCopy(req), 'fallback', false);
  }

  // Path 2: Groq call -> filter. Retry once if dark-pattern matched.
  let raw = await callGroq(prompt, key);
  let filteredEverHit = false;
  if (raw) {
    const f = filterDarkPatterns(raw);
    if (!f.filtered && f.text.length > 0) {
      return finalize(f.text.slice(0, limit), 'groq', false);
    }
    // First filter fired — retry with a tighter constraint.
    filteredEverHit = true;
    const tightenedPrompt = buildPrompt(
      req,
      'Do not use any of: ' + f.reasons.join(', ') + '. Plain text only.',
    );
    raw = await callGroq(tightenedPrompt, key);
    if (raw) {
      const f2 = filterDarkPatterns(raw);
      if (f2.text.length > 0) {
        return finalize(
          f2.text.slice(0, limit),
          'groq',
          f2.filtered || filteredEverHit,
        );
      }
    }
  }

  // Path 3: Groq failed or returned empty -> deterministic fallback.
  return finalize(fallbackCopy(req), 'fallback', filteredEverHit);
}
