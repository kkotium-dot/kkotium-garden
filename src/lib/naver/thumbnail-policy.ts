// src/lib/naver/thumbnail-policy.ts
// ============================================================================
// Representative-thumbnail policy gate — Image+SEO/ROI Strategy Engine Stage 0.
// Authority: docs/design/IMAGE_SEO_STRATEGY_ENGINE.md §8 / §9 (hard gate).
// ============================================================================
//
// Naver tightened representative-image rules on 2024-10-28: the representative
// thumbnail must be a single product on a clean background — NO text, NO price/
// discount/benefit/shipping/install/promo/certification/origin overlays, no
// unrelated props, no artificial borders. Violations cause non-exposure and
// "clean" sanctions. All persuasion text belongs in the detail page.
//
// This module is the LAST hard gate before a publish payload is built. It is a
// pure, config-driven evaluator: detection signals (OCR text regions, product
// count, overlay flags) are supplied by the caller. We do NOT call any external
// vision/OCR API at runtime — production stays Sharp-only (#37/#38). Detection
// can be operator-asserted or produced by a future on-box heuristic; the policy
// decision itself lives here so the rule set is config-versioned (#62, #46:
// block with an honest reason, never silently pass).
//
// Wiring (Stage 1): call assertThumbnailPolicy(...) immediately before
// buildNaverProductPayload for the representative image. It throws on fail so
// the publish path stops with a structured reason. It performs NO Naver PUT.
// ============================================================================

// ----------------------------------------------------------------------------
// Config (policy is movable — keep it data, re-verify before each release, §12)
// ----------------------------------------------------------------------------

export type OverlayKind =
  | 'price'
  | 'promo'
  | 'shipping'
  | 'install'
  | 'benefit'
  | 'certification'
  | 'origin'
  | 'border';

export interface ThumbnailPolicyConfig {
  // Maximum tolerated OCR text regions on the representative image (0 = none).
  maxTextRegions: number;
  // Exactly one product must be present in the representative cut.
  maxProducts: number;
  minProducts: number;
  // Overlay categories that are never allowed on a representative image.
  forbiddenOverlays: OverlayKind[];
  // Policy revision tag for audit (bumped when Naver changes the rules).
  policyRevision: string;
}

export const THUMBNAIL_POLICY_CONFIG: ThumbnailPolicyConfig = {
  maxTextRegions: 0,
  maxProducts: 1,
  minProducts: 1,
  forbiddenOverlays: [
    'price',
    'promo',
    'shipping',
    'install',
    'benefit',
    'certification',
    'origin',
    'border',
  ],
  // Reflects the 2024-10-28 representative-image tightening.
  policyRevision: '2024-10-28',
};

// ----------------------------------------------------------------------------
// Input signals (supplied by the caller — operator assertion or on-box heuristic)
// ----------------------------------------------------------------------------

export interface ThumbnailCandidateSignals {
  // Number of detected text regions (OCR). 0 means clean.
  textRegionCount: number;
  // Number of distinct products detected in the frame.
  productCount: number;
  // Overlay kinds detected on the image (price tag, promo ribbon, border, ...).
  overlays: OverlayKind[];
  // Optional label for the violation report (asset id / filename).
  label?: string;
}

// ----------------------------------------------------------------------------
// Result
// ----------------------------------------------------------------------------

export type ViolationCode =
  | 'text_present'
  | 'not_single_product'
  | 'forbidden_overlay';

export interface PolicyViolation {
  code: ViolationCode;
  // Stable English reason token; the UI maps it to a Korean message (#3-5/#46).
  reason: string;
  detail?: string;
}

export interface ThumbnailPolicyResult {
  pass: boolean;
  violations: PolicyViolation[];
  policyRevision: string;
  label?: string;
}

// ----------------------------------------------------------------------------
// Evaluator
// ----------------------------------------------------------------------------

export function evaluateThumbnailPolicy(
  signals: ThumbnailCandidateSignals,
  config: ThumbnailPolicyConfig = THUMBNAIL_POLICY_CONFIG,
): ThumbnailPolicyResult {
  const violations: PolicyViolation[] = [];

  if (signals.textRegionCount > config.maxTextRegions) {
    violations.push({
      code: 'text_present',
      reason: 'representative_image_must_be_text_free',
      detail: `textRegions=${signals.textRegionCount} > ${config.maxTextRegions}`,
    });
  }

  if (
    signals.productCount > config.maxProducts ||
    signals.productCount < config.minProducts
  ) {
    violations.push({
      code: 'not_single_product',
      reason: 'representative_image_must_show_single_product',
      detail: `productCount=${signals.productCount} (allowed ${config.minProducts}..${config.maxProducts})`,
    });
  }

  const banned = new Set<OverlayKind>(config.forbiddenOverlays);
  const hitOverlays = signals.overlays.filter((o) => banned.has(o));
  for (const o of hitOverlays) {
    violations.push({
      code: 'forbidden_overlay',
      reason: 'representative_image_overlay_forbidden',
      detail: o,
    });
  }

  return {
    pass: violations.length === 0,
    violations,
    policyRevision: config.policyRevision,
    label: signals.label,
  };
}

// ----------------------------------------------------------------------------
// Hard gate — throws on fail (wire before payload build; performs NO Naver PUT)
// ----------------------------------------------------------------------------

export class ThumbnailPolicyError extends Error {
  readonly result: ThumbnailPolicyResult;
  constructor(result: ThumbnailPolicyResult) {
    const reasons = result.violations.map((v) => v.reason).join(', ');
    super(`thumbnail_policy_blocked: ${reasons}`);
    this.name = 'ThumbnailPolicyError';
    this.result = result;
  }
}

/**
 * Publish-time hard gate. Returns the result on pass; throws
 * ThumbnailPolicyError on fail so the publish pipeline halts with an honest,
 * structured reason (#46). Never performs a Naver write.
 */
export function assertThumbnailPolicy(
  signals: ThumbnailCandidateSignals,
  config: ThumbnailPolicyConfig = THUMBNAIL_POLICY_CONFIG,
): ThumbnailPolicyResult {
  const result = evaluateThumbnailPolicy(signals, config);
  if (!result.pass) throw new ThumbnailPolicyError(result);
  return result;
}
