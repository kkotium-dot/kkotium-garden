// src/lib/naver/category-score.ts
// ============================================================================
// Category SEO × ROI composite recommendation engine (#249 / #62).
// Authority: docs/design/CATEGORY_SEO_ROI_ENGINE_SPEC_2026-07-11.md
// ============================================================================
//
// Systemic gap this closes: SEO (search trend) and ROI (margin) were computed
// by two separate modules and never combined, so the seller could not pick a
// category that is *both* well-searched and profitable. This module fuses the
// two scattered signals into a SINGLE pure function whose result the UI simply
// renders (#62) — no scoring logic leaks into the components.
//
// Reuse (no new data sources):
//   - SEO  <- category-trend-cache trendScore (DataLab Shopping Insights, D1)
//   - ROI  <- naver-margin-advisor (net margin + return-risk + 2026 fees)
//
// Purity: this function performs NO I/O and reads NO clock. The caller resolves
// the (async, DB-backed) trend entry first and passes it in, so the function is
// deterministic and unit-testable. All margin helpers it calls are pure.
//
// Honest data limits (#231) are surfaced as `caveats`, never hidden:
//   - trend precision is D1-level only — a leaf inherits its D1 trend (approx)
//   - competition intensity (listing/review counts) is not provided by Naver
//     and is deliberately excluded from the score (no crawling).
//
// Seller-facing language (#233): reasons/caveats use power-seller terms
// (검색 상승세 · 마진 매력도 · 종합 추천), never raw jargon (trendScore, ratio).
// ============================================================================

import {
  getMarginAdvice,
  calcMarketSalePrice,
  calcNetMargin,
} from '@/lib/naver-margin-advisor';
import type { CategoryTrendEntry } from '@/lib/naver/category-trend-cache';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type CategoryGrade = 'S' | 'A' | 'B' | 'C';

export interface CategoryScoreInput {
  d1: string;
  d2: string;
  d3: string;
  /** Wholesale (도매) price. When present, ROI becomes product-specific. */
  supplierPrice?: number | null;
  /** Shipping burden; falls back to the category's typical fee when omitted. */
  shippingFee?: number | null;
  /**
   * Resolved trend entry for this category's D1 (from category-trend-cache).
   * The caller does the async cache lookup and passes the result here so this
   * function stays pure. null => trend data cold/unknown (neutral SEO applied).
   */
  trend?: CategoryTrendEntry | null;
  /** Optional SEO/ROI weight override. Normalized internally; default 5:5. */
  weights?: { seo?: number; roi?: number };
}

export interface CategoryScore {
  seoScore: number; // 0..100 — search favourability (trend)
  roiScore: number; // 0..100 — margin attractiveness
  totalScore: number; // 0..100 — weighted composite
  grade: CategoryGrade;
  reasons: string[]; // seller-language justification (#233)
  caveats: string[]; // honest data limits (#231)
  detail: {
    trendScore: number | null;
    marketLevel: string | null;
    netMarginPct: number | null; // present only when supplierPrice given
    marginRecommended: number;
    returnRateTypical: number;
    seoWeight: number;
    roiWeight: number;
  };
}

// ----------------------------------------------------------------------------
// Tunables (documented, not magic)
// ----------------------------------------------------------------------------

// When no trend data exists we apply a neutral SEO so the category is neither
// unfairly boosted nor buried — and we say so in caveats.
const NEUTRAL_SEO = 50;

// Net-margin normalization band. 10% net → 0, 40% net → 100. These bracket the
// realistic smart-store survival(≈15%)..excellent(≈40%) net-margin range.
const MARGIN_FLOOR = 10;
const MARGIN_CEIL = 40;

// Category-profile ROI (no supplierPrice) discounts the recommended margin by
// the typical return rate — a high-return category realizes less than its
// headline margin. 1.2 points per return-% is a deliberate, gentle penalty.
const RETURN_PENALTY_PER_PCT = 1.2;

// A category whose typical return rate is this high earns an explicit warning.
const HIGH_RETURN_PCT = 12;

const DEFAULT_SEO_WEIGHT = 0.5;
const DEFAULT_ROI_WEIGHT = 0.5;

// Grade cutoffs on totalScore.
const GRADE_S = 80;
const GRADE_A = 65;
const GRADE_B = 45;

// ----------------------------------------------------------------------------
// Helpers (pure)
// ----------------------------------------------------------------------------

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Map a net-margin percentage into the 0..100 ROI band. */
function normalizeMarginPct(marginPct: number): number {
  const span = MARGIN_CEIL - MARGIN_FLOOR;
  return clamp(Math.round(((marginPct - MARGIN_FLOOR) / span) * 100), 0, 100);
}

function gradeFor(total: number): CategoryGrade {
  if (total >= GRADE_S) return 'S';
  if (total >= GRADE_A) return 'A';
  if (total >= GRADE_B) return 'B';
  return 'C';
}

function resolveWeights(w?: { seo?: number; roi?: number }): {
  seo: number;
  roi: number;
} {
  const seo =
    typeof w?.seo === 'number' && w.seo >= 0 ? w.seo : DEFAULT_SEO_WEIGHT;
  const roi =
    typeof w?.roi === 'number' && w.roi >= 0 ? w.roi : DEFAULT_ROI_WEIGHT;
  const sum = seo + roi;
  if (sum <= 0) return { seo: 0.5, roi: 0.5 };
  return { seo: seo / sum, roi: roi / sum };
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Fuse the SEO (trend) and ROI (margin) signals for one category into a single
 * ranked recommendation. Pure and deterministic given its inputs.
 */
export function computeCategoryScore(input: CategoryScoreInput): CategoryScore {
  const { d1, d2, d3, supplierPrice, shippingFee, trend } = input;
  const reasons: string[] = [];
  const caveats: string[] = [];

  // ── SEO from the D1 trend cache ──────────────────────────────────────────
  const trendScore = trend?.trendScore ?? null;
  const marketLevel = trend?.marketLevel ?? null;
  let seoScore: number;
  if (trendScore != null) {
    seoScore = clamp(Math.round(trendScore), 0, 100);
    if (seoScore >= 60) {
      reasons.push('검색 상승세 — 지금 수요가 뜨거운 카테고리예요');
    } else if (seoScore >= 30) {
      reasons.push('검색 수요 안정적 — 꾸준히 팔리는 카테고리예요');
    } else {
      reasons.push('검색 수요 낮음 — 노출 경쟁은 덜하지만 유입은 제한적이에요');
    }
    caveats.push(
      '검색 점수는 대분류 트렌드 기반 근사치예요 — 세부 카테고리 정밀 검색량은 추후 반영됩니다',
    );
  } else {
    seoScore = NEUTRAL_SEO;
    reasons.push('검색 트렌드 데이터 준비 중 — 중립 점수로 계산했어요');
    caveats.push(
      '이 카테고리의 검색 트렌드 데이터가 아직 없어 중립값(50)으로 계산했어요',
    );
  }

  // ── ROI from the margin advisor ──────────────────────────────────────────
  const advice = getMarginAdvice(d1, d2, d3);
  const ship =
    typeof shippingFee === 'number' && shippingFee >= 0
      ? shippingFee
      : advice.typicalShippingFee;

  let roiScore: number;
  let netMarginPct: number | null = null;

  if (typeof supplierPrice === 'number' && supplierPrice > 0) {
    // Product-specific: what net margin does a realistic market price yield?
    const marketPrice = calcMarketSalePrice(supplierPrice, ship);
    netMarginPct = calcNetMargin(
      supplierPrice,
      marketPrice,
      ship,
      advice.naverFeeRate,
      advice.returnRateTypical,
    );
    roiScore = normalizeMarginPct(netMarginPct);
    const rounded = Math.round(netMarginPct);
    if (roiScore >= 70) {
      reasons.push(`마진 매력적 — 예상 순마진 약 ${rounded}%`);
    } else if (roiScore >= 45) {
      reasons.push(`마진 무난 — 예상 순마진 약 ${rounded}%`);
    } else {
      reasons.push(`마진 얇음 — 예상 순마진 약 ${rounded}%, 가격 전략이 필요해요`);
    }
  } else {
    // Category profile: recommended margin discounted by return risk.
    const base = normalizeMarginPct(advice.marginRecommended);
    roiScore = clamp(
      Math.round(base - advice.returnRateTypical * RETURN_PENALTY_PER_PCT),
      0,
      100,
    );
    if (roiScore >= 70) {
      reasons.push(`마진 매력적 — 권장 순마진 ${advice.marginRecommended}%`);
    } else if (roiScore >= 45) {
      reasons.push(`마진 무난 — 권장 순마진 ${advice.marginRecommended}%`);
    } else {
      reasons.push(`마진 얇음 — 권장 순마진 ${advice.marginRecommended}%, 차별화가 필요해요`);
    }
    caveats.push('마진 점수는 카테고리 표준 권장 마진 기준이에요 (실제 공급가 미반영)');
  }

  if (advice.returnRateTypical >= HIGH_RETURN_PCT) {
    reasons.push(
      `반품률 높음 주의 — 통상 ${advice.returnRateTypical}% (${advice.returnRateReason})`,
    );
  }

  // Competition intensity is not available from Naver — say so, don't fake it.
  caveats.push('경쟁 강도(상품수·리뷰수)는 네이버 미제공으로 점수에서 제외했어요');

  // ── Weighted composite ───────────────────────────────────────────────────
  const { seo: seoWeight, roi: roiWeight } = resolveWeights(input.weights);
  const totalScore = clamp(
    Math.round(seoScore * seoWeight + roiScore * roiWeight),
    0,
    100,
  );
  const grade = gradeFor(totalScore);

  return {
    seoScore,
    roiScore,
    totalScore,
    grade,
    reasons,
    caveats,
    detail: {
      trendScore,
      marketLevel,
      netMarginPct,
      marginRecommended: advice.marginRecommended,
      returnRateTypical: advice.returnRateTypical,
      seoWeight,
      roiWeight,
    },
  };
}
