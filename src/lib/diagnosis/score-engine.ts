// Sprint 7-M2 Step 2 — 9-axis CTI score engine (C1-C4 + T1-T5).
//
// All axis functions return a value clamped to [0, 1]. Step 1 used seeded
// pseudo-random; this revision derives each axis from real product signals
// plus the PlayMCP cache when available.
//
// Conventions:
//  * Higher score = stronger positive signal for the axis, regardless of
//    whether the axis describes a strength (C3 revenue) or a deficit (C4
//    source poverty). The total-score weighting in the route accounts for that.
//  * Functions are pure and synchronous where possible — cache fetch happens
//    once in the route and is passed in as `meta`.
//  * Keyword counts use case-insensitive Korean substring matching.

import {
  TONE_KEYWORDS,
  SEASON_KEYWORDS,
  GIFT_KEYWORDS,
  COMPETITION_KEYWORDS,
  monthToSeason,
} from './keyword-dict';
import type { CategoryMetadata } from './playmcp-adapter';

export interface ProductScoreInputs {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  naverCategoryCode: string | null;
  supplierPrice: number;
  salePrice: number;
  margin: number;
  imageCount: number;
}

export interface SupplierScoreInputs {
  platformCode: string;
  name: string;
}

export interface AxisScores {
  c1Category: number;
  c2PriceTier: number;
  c3RevenuePotential: number;
  c4SourcePoverty: number;
  t1ToneScore: number;
  t2Seasonality: number;
  t3GiftScore: number;
  t4Competition: number;
  t5BrandIdentity: number;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function countMatches(haystack: string, needles: readonly string[]): number {
  let n = 0;
  for (const w of needles) {
    if (haystack.includes(w)) n += 1;
  }
  return n;
}

// C1 — naver category code completeness. Underscore-delimited (e.g. 11_08_22_00_00):
// each non-zero segment is one depth level filled in. uncategorized -> 0.2.
export function calcC1Category(product: ProductScoreInputs): number {
  if (!product.naverCategoryCode || product.naverCategoryCode === 'uncategorized') {
    return 0.2;
  }
  const segments = product.naverCategoryCode.split('_').filter((s) => s && s !== '00' && s !== '0');
  if (segments.length === 0) return 0.2;
  if (segments.length === 1) return 0.4;
  if (segments.length === 2) return 0.6;
  if (segments.length === 3) return 0.85;
  return 0.95;
}

// C2 — sale price vs category average. Sweet spot 70-130% of average.
export function calcC2PriceTier(product: ProductScoreInputs, meta: CategoryMetadata): number {
  if (meta.source === 'fallback' || meta.avgPrice <= 0) {
    return 0.5;
  }
  const ratio = product.salePrice / meta.avgPrice;
  if (ratio >= 0.7 && ratio <= 1.3) return 0.85;
  if (ratio >= 0.5 && ratio <= 1.6) return 0.6;
  if (ratio >= 0.3 && ratio <= 2.0) return 0.4;
  return 0.25;
}

// C3 — revenue potential = margin pct scaled by log10 of monthly search volume.
// margin is the product.margin field (already a ratio like 1.30 for 30% mark-up).
export function calcC3RevenuePotential(
  product: ProductScoreInputs,
  meta: CategoryMetadata,
): number {
  const marginPct = product.margin > 1
    ? product.margin - 1
    : product.salePrice > 0 && product.supplierPrice > 0
      ? (product.salePrice - product.supplierPrice) / product.supplierPrice
      : 0;
  // Margin contribution: 0% -> 0.0, 30% -> 0.6, 60%+ -> 1.0
  const marginScore = clamp01(marginPct / 0.6);

  if (meta.source === 'fallback' || meta.monthlySearchVolume <= 0) {
    // No volume signal yet — let margin alone carry the score at a discount.
    return clamp01(marginScore * 0.6);
  }
  // Volume contribution: 1k searches -> 0.0, 100k -> 1.0, log-scaled.
  const volumeScore = clamp01(Math.log10(meta.monthlySearchVolume / 1000) / 2);
  // Geometric blend so a brilliant margin doesn't mask a dead category.
  return clamp01(Math.sqrt(marginScore * Math.max(volumeScore, 0.1)));
}

// C4 — source poverty (image starvation + description starvation). Unchanged
// from Step 1; reproduced here so the engine is self-contained.
export function calcC4SourcePoverty(product: ProductScoreInputs): number {
  const imageStarvation = clamp01(1 - product.imageCount / 10);
  const descLen = (product.description ?? '').length;
  const descStarvation = clamp01(1 - descLen / 2000);
  return clamp01(imageStarvation * 0.6 + descStarvation * 0.4);
}

// T1 — emotional vs practical tone. 1.0 = pure emotional, 0.0 = pure practical.
export function calcT1Tone(product: ProductScoreInputs): number {
  const text = `${product.name} ${product.description ?? ''}`;
  const emotional = countMatches(text, TONE_KEYWORDS.emotional);
  const practical = countMatches(text, TONE_KEYWORDS.practical);
  const total = emotional + practical;
  if (total === 0) return 0.5;
  return clamp01(emotional / total);
}

// T2 — seasonality. Counts matches against the current month's season set.
export function calcT2Seasonality(product: ProductScoreInputs, currentMonth: number): number {
  const season = monthToSeason(currentMonth);
  const haystack = `${product.name} ${product.description ?? ''}`;
  const hits = countMatches(haystack, SEASON_KEYWORDS[season]);
  if (hits === 0) return 0.2;
  if (hits === 1) return 0.55;
  if (hits === 2) return 0.8;
  return 0.95;
}

// T3 — gift propensity. Even one gift-context keyword is a meaningful signal.
export function calcT3GiftScore(product: ProductScoreInputs): number {
  const haystack = `${product.name} ${product.description ?? ''}`;
  const hits = countMatches(haystack, GIFT_KEYWORDS);
  if (hits === 0) return 0.15;
  if (hits === 1) return 0.6;
  if (hits === 2) return 0.8;
  return 0.95;
}

// T4 — competition. We invert competition_level from the cache (saturated
// market = low score for us) and boost slightly when the product name carries
// niche-signal keywords like 핸드메이드/한정.
export function calcT4Competition(
  product: ProductScoreInputs,
  meta: CategoryMetadata,
): number {
  const baseFromCache = meta.source === 'cache'
    ? clamp01(1 - meta.competitionLevel)
    : 0.5;
  const nicheHits = countMatches(product.name, COMPETITION_KEYWORDS);
  const nicheBoost = clamp01(nicheHits * 0.1);
  return clamp01(baseFromCache + nicheBoost);
}

// T5 — brand identity. Pure wholesale upstreams (DMM/OWC) get a low score
// because the product is fungible; in-house manufacturing gets the high score.
export function calcT5BrandIdentity(supplier: SupplierScoreInputs): number {
  const code = (supplier.platformCode ?? '').toUpperCase();
  if (code === 'DMM' || code === 'OWC' || code === 'WHOLESALE') return 0.2;
  if (code === 'ETC') return 0.5;
  if (code === 'OWN' || code === 'INHOUSE' || code === 'BRAND') return 0.9;
  return 0.5;
}

export function computeAllAxes(args: {
  product: ProductScoreInputs;
  supplier: SupplierScoreInputs;
  meta: CategoryMetadata;
  currentMonth: number;
}): AxisScores {
  return {
    c1Category: clamp01(calcC1Category(args.product)),
    c2PriceTier: clamp01(calcC2PriceTier(args.product, args.meta)),
    c3RevenuePotential: clamp01(calcC3RevenuePotential(args.product, args.meta)),
    c4SourcePoverty: clamp01(calcC4SourcePoverty(args.product)),
    t1ToneScore: clamp01(calcT1Tone(args.product)),
    t2Seasonality: clamp01(calcT2Seasonality(args.product, args.currentMonth)),
    t3GiftScore: clamp01(calcT3GiftScore(args.product)),
    t4Competition: clamp01(calcT4Competition(args.product, args.meta)),
    t5BrandIdentity: clamp01(calcT5BrandIdentity(args.supplier)),
  };
}

// Returns the count of GIFT_KEYWORDS hits — used by the upgraded pickSkeleton
// to bias towards S5 (premium gift) when gift signals are strong.
export function giftKeywordCount(product: ProductScoreInputs): number {
  const haystack = `${product.name} ${product.description ?? ''}`;
  return countMatches(haystack, GIFT_KEYWORDS);
}

// Returns the count of TONE_KEYWORDS.emotional hits — used by pickSkeleton to
// route apparel into S13 (comfort homewear) when tone is strongly emotional.
export function emotionalKeywordCount(product: ProductScoreInputs): number {
  const haystack = `${product.name} ${product.description ?? ''}`;
  return countMatches(haystack, TONE_KEYWORDS.emotional);
}
