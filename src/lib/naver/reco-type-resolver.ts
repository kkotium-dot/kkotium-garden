// src/lib/naver/reco-type-resolver.ts
// ============================================================================
// Async bridge for 꼬띠 추천 유형배지 (#250 §3): resolves the D1 trend from the
// cache and runs the PURE classifyRecommendationType per item, returning a
// compact RecoTypeTag[] the embed builders render. Kept OUT of the pure
// classifier so recommendation-type.ts has no prisma/DB dependency.
//
// Callers (sourcing route / daily cron) pass a category descriptor per item;
// trend lookups are memoized per D1. Unknown category → null tag (no fabrication,
// #231). nowMonth is injected so classification stays deterministic.
// ============================================================================

import { classifyRecommendationType, type RecoTypeTag } from './recommendation-type';
import { getCachedTrend, buildD1Key, type CategoryTrendEntry } from './category-trend-cache';

export type { RecoTypeTag } from './recommendation-type';

export interface RecoTypeInputDescriptor {
  d1: string;
  d2?: string;
  d3?: string;
  supplierPrice?: number | null;
}

/**
 * Resolve a recommendation-type tag per input. Trend is fetched once per
 * distinct D1. Returns null for items whose category is unknown / doesn't clear
 * any bar (caller simply renders no tag).
 */
export async function resolveRecoTypeTags(
  inputs: RecoTypeInputDescriptor[],
  nowMonth: number,
): Promise<(RecoTypeTag | null)[]> {
  const trendByD1 = new Map<string, CategoryTrendEntry | null>();
  const out: (RecoTypeTag | null)[] = [];
  for (const it of inputs) {
    const d1 = (it.d1 ?? '').trim();
    if (!d1) {
      out.push(null);
      continue;
    }
    const key = buildD1Key(d1);
    if (!trendByD1.has(key)) {
      trendByD1.set(key, await getCachedTrend(key).catch(() => null));
    }
    const r = classifyRecommendationType({
      d1,
      d2: it.d2 ?? '',
      d3: it.d3 ?? '',
      supplierPrice: it.supplierPrice,
      trend: trendByD1.get(key) ?? null,
      nowMonth,
    });
    out.push(r.type ? { type: r.type, emoji: r.emoji, label: r.label } : null);
  }
  return out;
}
