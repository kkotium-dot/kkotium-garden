// src/lib/automation/section-composer.ts
//
// Sprint 7-M2 Step 5-A — Text-section composer for L2 automation.
//
// Scope (text-only, no image work — that ships in Step 5-B):
//   - B02 페인포인트  paragraph
//   - B06 상세 사양   structured spec table (rows of label:value)
//   - B07 사용 시나리오 paragraph
//   - B09 신뢰 FAQ    Q&A list
//
// Each composer returns 4 variants differentiated along two axes (tone ×
// length) as documented in docs/research/SPRINT_7_M2_STEP_5_REDESIGN_2026_05.md
// §5.1. Variants are generated sequentially to stay inside Vercel memory
// limits (§10 note 2 of the design doc).
//
// All Groq calls go through groq-client.ts (no duplicated key rotation).
// If no Groq key is configured the composer falls back to a deterministic
// template per variant so the L2 API never throws.
//
// Dark-pattern lint runs on every generated variant via
// lintBuildingBlock. High-severity findings get one retry with a tightened
// prompt; if it still fires, the variant carries requiresSellerApproval=true
// and lint logs are written via persistLintViolations() in the caller.

import {
  lintBuildingBlock,
  checkCopyText,
  type LintViolation,
  type BlockLintContext,
  type ProductInput,
} from '@/lib/compliance/dark-pattern-lint';
import { pickGroqKey, callGroq } from './groq-client';
import fallbackMessages from '@/lib/i18n/section-composer-fallbacks.ko.json';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type TextBlockId = 'B02' | 'B06' | 'B07' | 'B09';

export type Tone = 'friendly' | 'professional';
export type Length = 'short' | 'long';

/** The 4-variant grid (tone × length). Mirrors design doc §5.1. */
export const TEXT_VARIANT_AXES: ReadonlyArray<{ tone: Tone; length: Length }> = [
  { tone: 'friendly', length: 'short' },
  { tone: 'professional', length: 'short' },
  { tone: 'friendly', length: 'long' },
  { tone: 'professional', length: 'long' },
];

export interface ProductData {
  id: string;
  name: string;
  salePrice: number;
  /** Optional category label (e.g. "주방용품"). Used in prompts when present. */
  category?: string;
  /** Optional brand. */
  brand?: string;
  /** Shipping fee in KRW (defaults to 0). Used by B08 lint context, kept here
   *  for parity with ProductInput on lint calls. */
  shippingFee?: number;
  /** Plain text of the first-fold above-the-fold block. Used for lint
   *  context (rule 2). Pass '' when unknown. */
  firstFoldText?: string;
}

export interface TextVariant {
  variantId: string;
  tone: Tone;
  length: Length;
  /** Final text content of the variant after lint pass. */
  content: string;
  /** True when Groq returned a usable string. False = deterministic fallback. */
  source: 'groq' | 'fallback';
  /** Lint violations remaining AFTER any auto-retry. */
  lintViolations: LintViolation[];
  /** True when at least one high-severity lint violation could not be
   *  auto-cleaned (needs explicit seller approval before publish). */
  requiresSellerApproval: boolean;
}

export interface SectionResult {
  blockId: TextBlockId;
  title: string;
  variants: TextVariant[];
  /** Aggregate count of high-severity violations across all variants. */
  highSeverityCount: number;
}

// ---------------------------------------------------------------------------
// Prompt builders — per block
// ---------------------------------------------------------------------------

function commonHeader(tone: Tone, length: Length, p: ProductData): string {
  const toneLine =
    tone === 'friendly'
      ? 'Tone: warm, friendly, conversational. No hard-sell language.'
      : 'Tone: professional, concise, fact-oriented. No filler.';
  const lengthHint =
    length === 'short'
      ? 'Length: under 120 Korean characters total.'
      : 'Length: 200~300 Korean characters total.';
  const ctx = [
    `Product name: ${p.name}`,
    p.category ? `Category: ${p.category}` : '',
    `Sale price (KRW): ${p.salePrice}`,
    p.brand ? `Brand: ${p.brand}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return [
    'You write Korean ecommerce copy for a smart-store detail page.',
    toneLine,
    lengthHint,
    'Hard constraints:',
    '- No emoji of any kind.',
    '- No exclamation marks.',
    '- No price-anchoring claims ("원래 가격", "정상가", "할인").',
    '- No artificial scarcity ("마감 임박", "한정 수량").',
    '- No superlatives ("최저가", "1위", "독점", "유일", "100% 정품").',
    '- Respond with the raw Korean text only — no quotes, no markdown headings, no leading bullet labels.',
    `Product context:\n${ctx}`,
  ].join('\n\n');
}

function promptB02(tone: Tone, length: Length, p: ProductData): string {
  return [
    commonHeader(tone, length, p),
    'Task: Write the "Pain point" section (B02). One paragraph that names a daily-life problem the buyer hits and gently positions this product as the relief, without claiming results.',
  ].join('\n\n');
}

function promptB06(tone: Tone, length: Length, p: ProductData): string {
  return [
    commonHeader(tone, length, p),
    'Task: Write the "Spec table" section (B06). Output exactly 4 to 6 lines, each in the format "라벨: 값". Examples of labels: 소재, 크기, 색상, 무게, 원산지, 보관 방법. Do not invent numeric specs that were not provided — write "정보 없음" instead.',
  ].join('\n\n');
}

function promptB07(tone: Tone, length: Length, p: ProductData): string {
  return [
    commonHeader(tone, length, p),
    'Task: Write the "Usage scenario" section (B07). One paragraph describing a realistic moment-of-use scene (time of day, who is using it, what feeling). No claims, no metrics.',
  ].join('\n\n');
}

function promptB09(tone: Tone, length: Length, p: ProductData): string {
  return [
    commonHeader(tone, length, p),
    'Task: Write the "FAQ" section (B09). Output exactly 3 Q&A pairs in the format:\nQ. <question>\nA. <answer>\n\nCover: 배송 안내, 교환/반품 안내, 사용/보관 팁. Refund/return question must mention 7일 청약철회. Do not bury refund info — name it clearly.',
  ].join('\n\n');
}

const PROMPT_BUILDERS: Record<
  TextBlockId,
  (tone: Tone, length: Length, p: ProductData) => string
> = {
  B02: promptB02,
  B06: promptB06,
  B07: promptB07,
  B09: promptB09,
};

const BLOCK_TITLES: Record<TextBlockId, string> = {
  B02: 'pain_point',
  B06: 'spec_table',
  B07: 'usage_scenario',
  B09: 'faq',
};

// ---------------------------------------------------------------------------
// Deterministic fallback — used when Groq has no key or all retries fail
// ---------------------------------------------------------------------------

interface FallbackShape {
  B02: { short: string; long: string };
  B06: { lines: string[]; brandPlaceholder: string };
  B07: { short: string; long: string };
  B09: { lines: string[] };
}

const FALLBACK = fallbackMessages as unknown as FallbackShape;

function applyTokens(template: string, p: ProductData): string {
  return template
    .replaceAll('{productName}', p.name)
    .replaceAll('{brand}', p.brand ?? FALLBACK.B06.brandPlaceholder);
}

function fallbackFor(blockId: TextBlockId, _tone: Tone, length: Length, p: ProductData): string {
  switch (blockId) {
    case 'B02':
      return applyTokens(length === 'short' ? FALLBACK.B02.short : FALLBACK.B02.long, p);
    case 'B06':
      return FALLBACK.B06.lines.map((line) => applyTokens(line, p)).join('\n');
    case 'B07':
      return applyTokens(length === 'short' ? FALLBACK.B07.short : FALLBACK.B07.long, p);
    case 'B09':
      return FALLBACK.B09.lines.join('\n');
  }
}

// ---------------------------------------------------------------------------
// Lint integration
// ---------------------------------------------------------------------------

function toLintProductInput(p: ProductData, firstFoldText: string): ProductInput {
  return {
    salePrice: p.salePrice,
    shippingFee: p.shippingFee ?? 0,
    optionMaxExtra: 0,
    firstFoldText,
    optionsShowExtraInListing: true,
    hasRecurringPayment: false,
    options: [],
    buttons: [],
  };
}

function lintBlock(
  blockId: TextBlockId,
  content: string,
  p: ProductData,
): LintViolation[] {
  // Two pieces of lint stack here:
  //   1. The structural BlockLintContext (price / option / button / cancel)
  //      via lintBuildingBlock — relevant for B02/B09 where the rule matrix
  //      lists 'price'/'cancellation'.
  //   2. The free-text copy regex (checkCopyText) — catches scarcity /
  //      anchor-discount / superlative phrases the model still sneaks in.
  const ctx: BlockLintContext = {
    product: toLintProductInput(p, content),
  };
  const structural = lintBuildingBlock(blockId, ctx);
  const copy = checkCopyText(content);
  return [...structural.violations, ...copy.violations];
}

function hasHigh(v: LintViolation[]): boolean {
  return v.some((x) => x.severity === 'high');
}

// ---------------------------------------------------------------------------
// Single-variant generator (Groq + retry + fallback)
// ---------------------------------------------------------------------------

async function generateOneVariant(
  blockId: TextBlockId,
  tone: Tone,
  length: Length,
  p: ProductData,
  variantIndex: number,
): Promise<TextVariant> {
  const variantId = `${p.id}-${blockId}-${variantIndex}`;
  const promptBuilder = PROMPT_BUILDERS[blockId];
  const key = pickGroqKey();

  const finalize = (
    content: string,
    source: 'groq' | 'fallback',
  ): TextVariant => {
    const violations = lintBlock(blockId, content, p);
    return {
      variantId,
      tone,
      length,
      content,
      source,
      lintViolations: violations,
      requiresSellerApproval: hasHigh(violations),
    };
  };

  if (!key) {
    return finalize(fallbackFor(blockId, tone, length, p), 'fallback');
  }

  const prompt = promptBuilder(tone, length, p);
  const maxTokens = length === 'short' ? 200 : 450;
  // Temperature spread so 4 variants are visibly different even when the
  // two axes collapse (e.g. both short).
  const temperature = 0.5 + variantIndex * 0.1;

  let raw = await callGroq(prompt, key, { maxTokens, temperature });
  if (!raw) {
    return finalize(fallbackFor(blockId, tone, length, p), 'fallback');
  }

  let violations = lintBlock(blockId, raw, p);
  if (hasHigh(violations)) {
    // One retry with explicit hardening.
    const hardened = [
      prompt,
      `Hard constraint (retry): the previous draft violated these rules — ${violations
        .filter((v) => v.severity === 'high')
        .map((v) => v.rule)
        .join(', ')}. Remove every offending phrase. Do not paraphrase them.`,
    ].join('\n\n');
    const retried = await callGroq(hardened, key, { maxTokens, temperature: 0.3 });
    if (retried) {
      const retriedViolations = lintBlock(blockId, retried, p);
      if (!hasHigh(retriedViolations)) {
        return finalize(retried, 'groq');
      }
      // Retry failed too — keep the better of the two and mark needs approval.
      raw = retried;
      violations = retriedViolations;
    }
  }

  return finalize(raw, 'groq');
}

// ---------------------------------------------------------------------------
// Public composer — one block, 4 variants
// ---------------------------------------------------------------------------

async function composeBlock(
  blockId: TextBlockId,
  p: ProductData,
): Promise<SectionResult> {
  const variants: TextVariant[] = [];
  // Sequential — workflow principle #38 and design doc §10 note 2.
  for (let i = 0; i < TEXT_VARIANT_AXES.length; i += 1) {
    const { tone, length } = TEXT_VARIANT_AXES[i];
    // eslint-disable-next-line no-await-in-loop
    const v = await generateOneVariant(blockId, tone, length, p, i);
    variants.push(v);
  }
  const highSeverityCount = variants.reduce(
    (n, v) => n + v.lintViolations.filter((x) => x.severity === 'high').length,
    0,
  );
  return {
    blockId,
    title: BLOCK_TITLES[blockId],
    variants,
    highSeverityCount,
  };
}

export function composeB02PainPoint(p: ProductData): Promise<SectionResult> {
  return composeBlock('B02', p);
}

export function composeB06SpecTable(p: ProductData): Promise<SectionResult> {
  return composeBlock('B06', p);
}

export function composeB07Scenario(p: ProductData): Promise<SectionResult> {
  return composeBlock('B07', p);
}

export function composeB09Faq(p: ProductData): Promise<SectionResult> {
  return composeBlock('B09', p);
}

/** Compose all 4 text sections sequentially. The L2 API uses this. */
export async function composeAllTextSections(
  p: ProductData,
): Promise<SectionResult[]> {
  const b02 = await composeB02PainPoint(p);
  const b06 = await composeB06SpecTable(p);
  const b07 = await composeB07Scenario(p);
  const b09 = await composeB09Faq(p);
  return [b02, b06, b07, b09];
}

// ---------------------------------------------------------------------------
// Persistence helper — write violations to dark_pattern_lint_logs
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/prisma';

export async function persistLintViolations(
  productId: string,
  results: SectionResult[],
): Promise<number> {
  const rows = results.flatMap((section) =>
    section.variants.flatMap((variant) =>
      variant.lintViolations.map((v) => ({
        productId,
        blockId: section.blockId,
        rule: v.rule,
        severity: v.severity,
        autoFixed: false,
        autoFix: v.autoFix ?? null,
        sellerMessage: v.sellerMessage,
        context: {
          variantId: variant.variantId,
          tone: variant.tone,
          length: variant.length,
          source: variant.source,
        },
      })),
    ),
  );
  if (rows.length === 0) return 0;
  const created = await prisma.darkPatternLintLog.createMany({ data: rows });
  return created.count;
}
