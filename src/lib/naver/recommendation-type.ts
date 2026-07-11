// src/lib/naver/recommendation-type.ts
// ============================================================================
// 꼬띠 추천 유형 분류 (황금🏆 / 니치💎 / 시즌🗓️) — #250 §3 / #251 / #249.
// Authority: docs/design/DISCORD_KKOTTI_RECOMMEND_LINK_UI_UPGRADE_2026-07-11.md §3
//
// A PURE classifier that fuses the SEO×ROI signal (computeCategoryScore, #249)
// with the category's seasonality (naver-margin-advisor) to tag a category as:
//   황금 (golden)  — 검색 상승세 高 + 마진 高          (seoScore↑ AND roiScore↑)
//   니치 (niche)   — 경쟁 덜한 틈새 + 마진 안정          (roiScore ok, search not hot)
//   시즌 (seasonal)— 지금 시즌 급상승                    (seasonal category, now in/near peak)
//
// Reuses existing engines only (no dupe): computeCategoryScore + getMarginAdvice.
// No I/O, no clock — the caller injects the trend entry and nowMonth so the
// function is deterministic and unit-testable. Reasons are seller language
// (#233); honest limits (#231) ride along via score.caveats.
// ============================================================================

import { computeCategoryScore, type CategoryScore } from './category-score';
import { getMarginAdvice } from '@/lib/naver-margin-advisor';
import type { CategoryTrendEntry } from './category-trend-cache';

export type RecommendationType = 'golden' | 'niche' | 'seasonal';

export interface RecoTypeInput {
  d1: string;
  d2: string;
  d3: string;
  supplierPrice?: number | null;
  shippingFee?: number | null;
  /** Resolved D1 trend (from category-trend-cache); caller does the async lookup. */
  trend?: CategoryTrendEntry | null;
  /** Current month 1..12 — enables seasonal classification (kept pure). */
  nowMonth?: number;
}

export interface RecoTypeResult {
  type: RecommendationType | null;
  emoji: string;
  label: string;
  reasons: string[]; // seller language (#233)
  score: CategoryScore; // carries caveats (#231) for the caller to surface
}

// Compact tag the embed builders render (no score/reasons payload).
export interface RecoTypeTag {
  type: RecommendationType;
  emoji: string;
  label: string;
}

/** Summary counts for an embed header, e.g. "🏆 황금 3 · 🗓️ 시즌 2". Pure. */
export function recoTypeSummary(tags: Array<RecoTypeTag | null | undefined>): string {
  const c = { golden: 0, niche: 0, seasonal: 0 };
  for (const t of tags) {
    if (t) c[t.type] += 1;
  }
  const parts: string[] = [];
  if (c.golden) parts.push(`🏆 황금 ${c.golden}`);
  if (c.niche) parts.push(`💎 니치 ${c.niche}`);
  if (c.seasonal) parts.push(`🗓️ 시즌 ${c.seasonal}`);
  return parts.join(' · ');
}

// Type metadata (emoji + seller-facing label).
const TYPE_META: Record<RecommendationType, { emoji: string; label: string }> = {
  golden: { emoji: '🏆', label: '황금상품' },
  niche: { emoji: '💎', label: '니치상품' },
  seasonal: { emoji: '🗓️', label: '시즌상품' },
};

// Thresholds (on the 0..100 SEO×ROI scale).
const HOT_SEO = 60; // 검색 상승세 = hot
const GOOD_ROI = 60; // 마진 高
const STABLE_ROI = 45; // 마진 안정

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

/** Is the category in (or one month ahead of) its peak season right now? */
function seasonalNow(
  seasonMonths: number[] | undefined,
  nowMonth?: number,
): { hit: boolean; peakLabel: string } {
  if (!seasonMonths || seasonMonths.length === 0 || !nowMonth) {
    return { hit: false, peakLabel: '' };
  }
  const next = (nowMonth % 12) + 1; // pre-peak lead window
  const hit = seasonMonths.includes(nowMonth) || seasonMonths.includes(next);
  const peakLabel = seasonMonths
    .filter((m) => m >= 1 && m <= 12)
    .map((m) => MONTH_NAMES[m - 1])
    .join('·');
  return { hit, peakLabel };
}

/**
 * PURE. Classify a category into a 꼬띠 recommendation type, or null when it
 * doesn't clear any bar. Priority: seasonal (time-sensitive) > golden > niche.
 */
export function classifyRecommendationType(input: RecoTypeInput): RecoTypeResult {
  const { d1, d2, d3, supplierPrice, shippingFee, trend, nowMonth } = input;

  const score = computeCategoryScore({ d1, d2, d3, supplierPrice, shippingFee, trend });
  const advice = getMarginAdvice(d1, d2, d3);

  // 시즌 — time-sensitive, wins when in/near peak.
  const season = seasonalNow(advice.seasonMonths, nowMonth);
  if (advice.isSeasonal && season.hit) {
    const reasons = [`지금 시즌 급상승 — 성수기 ${season.peakLabel}, 놓치면 아까워요`];
    if (score.roiScore >= STABLE_ROI) reasons.push('마진도 받쳐줘서 성수기에 밀기 좋아요');
    return { type: 'seasonal', ...TYPE_META.seasonal, reasons, score };
  }

  // 황금 — hot search AND strong margin.
  if (score.seoScore >= HOT_SEO && score.roiScore >= GOOD_ROI) {
    return {
      type: 'golden',
      ...TYPE_META.golden,
      reasons: [
        '검색 상승세 + 마진 매력적 — 지금 밀면 크게 터져요',
        `검색 유리도 ${score.seoScore} · 마진 매력도 ${score.roiScore}`,
      ],
      score,
    };
  }

  // 니치 — decent margin but search not hot = 틈새 롱테일.
  if (score.roiScore >= STABLE_ROI && score.seoScore < HOT_SEO) {
    return {
      type: 'niche',
      ...TYPE_META.niche,
      reasons: [
        '경쟁 덜한 틈새 + 마진 안정 — 롱테일로 꾸준히 팔려요',
        `마진 매력도 ${score.roiScore}`,
      ],
      score,
    };
  }

  return { type: null, emoji: '', label: '', reasons: [], score };
}
