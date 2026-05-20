// src/lib/compliance/dark-pattern-lint.ts
//
// Sprint 7-M3 Pre-Step 5 — Dark pattern lint module.
// Implements the six KFTC-banned dark-pattern categories enforced from
// 2025-02-14 (decree) and 2025-08-13 (full enforcement). First fines were
// levied on 2025-10-15 (Coupang, Wavve, Bugs, Spotify — KRW 10.5M total).
//
// Design source: docs/research/DARK_PATTERN_LINT_MODULE_DESIGN.md
// Seller-facing Korean messages live in seller-messages.ko.json
// (workflow principle #29: no Korean literals in TS source).
//
// Rules
//   1. Hidden renewal           — recurring payments without disclosure
//   2. Sequential price reveal  — drip-pricing on shipping / option fees
//   3. Pre-selected paid option — auto-checked options that add cost
//   4. Wrong visual hierarchy   — buy button dwarfs cancel/refund button
//   5. Cancellation obstruction — withdrawal path too deep / refund hidden
//   6. Repeated interference    — notification spam beyond per-session cap

import sellerMessages from './seller-messages.ko.json';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type Severity = 'low' | 'medium' | 'high';

export type BuildingBlockType =
  | 'B01' | 'B02' | 'B03' | 'B04' | 'B05' | 'B06'
  | 'B07' | 'B08' | 'B09' | 'B10' | 'B11' | 'B12';

export interface OptionInput {
  id: string;
  name?: string;
  extraPrice: number;
  defaultSelected: boolean;
}

export interface ButtonInput {
  role: 'primary_purchase' | 'cancel_refund_info' | 'secondary' | 'other';
  /** Pseudo-pixel area (width * height). Pass 0 if unknown. */
  area?: number;
  /** Tailwind / hex / oklch foreground contrast score 0..1. */
  contrast?: number;
  /** Vertical position normalised to 0..1 from top of page. */
  scrollDepth?: number;
}

export interface ProductInput {
  /** Sale price in KRW. */
  salePrice: number;
  /** Shipping fee in KRW. 0 means free. */
  shippingFee: number;
  /** Max additional option price in KRW (0 if no paid options). */
  optionMaxExtra: number;
  /** Plain text of the first-fold area (above-the-fold copy). */
  firstFoldText: string;
  /** True when product page lists option extras inline before selection. */
  optionsShowExtraInListing: boolean;
  /** Whether the product is a recurring/subscription product. */
  hasRecurringPayment: boolean;
  /** Options list. May be empty. */
  options: OptionInput[];
  /** CTA buttons rendered on the page. May be empty. */
  buttons: ButtonInput[];
}

export interface SiteMapMeta {
  /** Number of clicks from logged-in home to "withdraw membership". */
  withdrawalClickDepth: number;
  /** Whether refund info is reachable in <=1 click from product page. */
  refundAccessibleFromProduct: boolean;
}

export interface NotificationEvent {
  userId: string;
  channelId: string;
  kind: string;
  /** Count of same-kind notifications already sent in this session. */
  sessionCount: number;
  /** Count of same-kind notifications already sent to this channel in 24h. */
  dailyCount: number;
}

export interface LintViolation {
  rule: string;
  severity: Severity;
  autoFix?: string;
  sellerMessage: string;
}

export interface LintResult {
  pass: boolean;
  violations: LintViolation[];
}

// ---------------------------------------------------------------------------
// Message lookup
// ---------------------------------------------------------------------------

interface RuleMeta {
  severity: Severity;
  message: string;
  autoFix?: string;
}

type SellerMessagesShape = {
  rules: Record<string, RuleMeta>;
};

const RULES: Record<string, RuleMeta> = (sellerMessages as SellerMessagesShape).rules;

function lookupRule(ruleId: string): RuleMeta {
  const meta = RULES[ruleId];
  if (meta) return meta;
  return {
    severity: 'medium',
    message: `규칙 '${ruleId}' 위반이 감지됐어요.`,
    autoFix: undefined,
  };
}

function buildViolation(ruleId: string): LintViolation {
  const meta = lookupRule(ruleId);
  return {
    rule: ruleId,
    severity: meta.severity,
    autoFix: meta.autoFix,
    sellerMessage: meta.message,
  };
}

// ---------------------------------------------------------------------------
// Rule 1 — Hidden renewal
// ---------------------------------------------------------------------------

export function checkHiddenRenewal(product: ProductInput): LintResult {
  if (product.hasRecurringPayment) {
    return {
      pass: false,
      violations: [buildViolation('recurring_payment_disclosure_missing')],
    };
  }
  return { pass: true, violations: [] };
}

// ---------------------------------------------------------------------------
// Rule 2 — Sequential price reveal (high risk)
// ---------------------------------------------------------------------------

export function checkPriceTransparency(product: ProductInput): LintResult {
  const violations: LintViolation[] = [];
  const firstFold = product.firstFoldText ?? '';

  const totalCost = product.salePrice + product.shippingFee + product.optionMaxExtra;
  const totalAsString = String(totalCost);
  const totalWithComma = totalCost.toLocaleString('ko-KR');

  const hasTotal = firstFold.includes(totalAsString) || firstFold.includes(totalWithComma);
  if (!hasTotal) {
    violations.push(buildViolation('total_cost_not_shown_in_first_fold'));
  }

  if (product.shippingFee > 0 && !/배송비|무료배송/.test(firstFold)) {
    violations.push(buildViolation('shipping_fee_hidden'));
  }

  if (product.optionMaxExtra > 0 && !product.optionsShowExtraInListing) {
    violations.push(buildViolation('option_extra_revealed_too_late'));
  }

  return { pass: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// Rule 3 — Pre-selected paid option (high risk)
// ---------------------------------------------------------------------------

export function checkOptionDefaults(product: ProductInput): LintResult {
  const violations: LintViolation[] = [];
  for (const option of product.options) {
    if (option.extraPrice > 0 && option.defaultSelected) {
      violations.push(buildViolation('option_auto_selected_with_extra_cost'));
      // One violation per offending option, but reuse the same rule id so the
      // seller-facing message stays singular.
    }
  }
  return { pass: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// Rule 4 — Wrong visual hierarchy (high risk)
// ---------------------------------------------------------------------------

function computeVisualWeight(button: ButtonInput | undefined): number {
  if (!button) return 0;
  const area = Math.max(0, button.area ?? 0);
  const contrast = Math.max(0, Math.min(1, button.contrast ?? 0.5));
  // Weight = area * (0.5 + contrast). Contrast doubles the impact at max.
  return area * (0.5 + contrast);
}

export function checkButtonHierarchy(buttons: ButtonInput[]): LintResult {
  const violations: LintViolation[] = [];
  const buy = buttons.find((b) => b.role === 'primary_purchase');
  const cancel = buttons.find((b) => b.role === 'cancel_refund_info');

  if (!cancel) {
    violations.push(buildViolation('cancel_refund_button_missing'));
    return { pass: false, violations };
  }

  const buyWeight = computeVisualWeight(buy);
  const cancelWeight = computeVisualWeight(cancel);
  if (cancelWeight > 0 && buyWeight / cancelWeight > 3) {
    violations.push(buildViolation('cancel_button_visually_suppressed'));
  }

  if ((cancel.scrollDepth ?? 0) > 0.9) {
    violations.push(buildViolation('cancel_button_hidden_in_footer'));
  }

  return { pass: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// Rule 5 — Cancellation obstruction (medium risk)
// ---------------------------------------------------------------------------

export function checkCancellationAccess(siteMap: SiteMapMeta): LintResult {
  const violations: LintViolation[] = [];
  if (siteMap.withdrawalClickDepth > 3) {
    violations.push(buildViolation('withdrawal_too_deep'));
  }
  if (!siteMap.refundAccessibleFromProduct) {
    violations.push(buildViolation('refund_info_inaccessible'));
  }
  return { pass: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// Rule 6 — Repeated interference (high risk)
// ---------------------------------------------------------------------------

const SESSION_LIMIT = 1;
const DAILY_LIMIT = 3;

export function checkNotificationFrequency(event: NotificationEvent): LintResult {
  const violations: LintViolation[] = [];
  if (event.sessionCount >= SESSION_LIMIT) {
    violations.push(buildViolation('notification_repeated_in_session'));
  }
  if (event.dailyCount >= DAILY_LIMIT) {
    violations.push(buildViolation('notification_daily_limit_exceeded'));
  }
  return { pass: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// Copy-level lint (additive to existing groq copywriter regex filter)
// ---------------------------------------------------------------------------

const COPY_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/마감\s*임박|품절\s*임박|단\s*\d+\s*개|선착순\s*\d+/g, 'copy_scarcity_pattern'],
  [/원래\s*가격|정상가|할인\s*\d+\s*%|즉시\s*할인/g, 'copy_anchor_discount'],
  [/최저가|1위|독점|유일/g, 'copy_superlative_claim'],
];

export function checkCopyText(copy: string): LintResult {
  const violations: LintViolation[] = [];
  for (const [pattern, ruleId] of COPY_RULES) {
    // Fresh test per call — global regex state must not leak across calls.
    const flags = pattern.flags.replace('g', '');
    const probe = new RegExp(pattern.source, flags);
    if (probe.test(copy)) {
      violations.push(buildViolation(ruleId));
    }
  }
  return { pass: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// Per-building-block matrix
// ---------------------------------------------------------------------------
//
// Maps the 12 building blocks (B01..B12) to the subset of rules that apply.
// Source: design doc §appendix.

const BLOCK_RULES: Record<BuildingBlockType, Array<'price' | 'option' | 'button' | 'cancellation'>> = {
  B01: ['button'],
  B02: ['price'],
  B03: [],
  B04: [],
  B05: [],
  B06: ['option'],
  B07: [],
  B08: ['price', 'option'],
  B09: ['cancellation'],
  B10: [],
  B11: ['price'],
  B12: ['button'],
};

export interface BlockLintContext {
  product?: ProductInput;
  buttons?: ButtonInput[];
  siteMap?: SiteMapMeta;
}

export function lintBuildingBlock(
  blockType: BuildingBlockType,
  ctx: BlockLintContext,
): LintResult {
  const applicable = BLOCK_RULES[blockType] ?? [];
  const violations: LintViolation[] = [];

  for (const ruleKind of applicable) {
    if (ruleKind === 'price' && ctx.product) {
      violations.push(...checkPriceTransparency(ctx.product).violations);
    }
    if (ruleKind === 'option' && ctx.product) {
      violations.push(...checkOptionDefaults(ctx.product).violations);
    }
    if (ruleKind === 'button' && ctx.buttons) {
      violations.push(...checkButtonHierarchy(ctx.buttons).violations);
    }
    if (ruleKind === 'cancellation' && ctx.siteMap) {
      violations.push(...checkCancellationAccess(ctx.siteMap).violations);
    }
  }

  return { pass: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// Full-product lint (carries every applicable rule)
// ---------------------------------------------------------------------------

export interface FullLintContext {
  product: ProductInput;
  siteMap?: SiteMapMeta;
}

export function lintProduct(ctx: FullLintContext): LintResult {
  const violations: LintViolation[] = [
    ...checkHiddenRenewal(ctx.product).violations,
    ...checkPriceTransparency(ctx.product).violations,
    ...checkOptionDefaults(ctx.product).violations,
    ...checkButtonHierarchy(ctx.product.buttons).violations,
  ];
  if (ctx.siteMap) {
    violations.push(...checkCancellationAccess(ctx.siteMap).violations);
  }
  return { pass: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// Severity helpers
// ---------------------------------------------------------------------------

export function highestSeverity(result: LintResult): Severity | null {
  if (result.violations.length === 0) return null;
  if (result.violations.some((v) => v.severity === 'high')) return 'high';
  if (result.violations.some((v) => v.severity === 'medium')) return 'medium';
  return 'low';
}

/** True when a result should block automated progress (per design §5). */
export function shouldBlockAutomation(result: LintResult): boolean {
  return highestSeverity(result) === 'high';
}
