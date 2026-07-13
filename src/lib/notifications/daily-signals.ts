// src/lib/notifications/daily-signals.ts
// Shared recommendation + ops-digest computation for the 08:00 daily Discord
// cron AND the manual test-send trigger (/api/admin/test-daily-discord).
// Extracted verbatim from cron/daily/route.ts so both callers produce
// byte-identical embeds — the whole point of the test trigger is to see the
// REAL content, not a re-derived approximation of it.

import { calcHoneyScore } from '@/lib/honey-score';
import { calcUploadReadiness } from '@/lib/upload-readiness';
import { computeRevivalScore, revivalSignalsFromProduct } from '@/lib/products/revival-score';
import { loadTuningScores, type TuningSourceProduct } from '@/lib/products/tuning-signals';
import { NAVER_CATEGORIES_FULL } from '@/lib/naver/naver-categories-full';
import { resolveRecoTypeTags, type RecoTypeTag } from '@/lib/naver/reco-type-resolver';
import { fetchNaverTrends, matchProductsToTrends } from '@/lib/trend-analyzer';
import { fetchKeywordStats } from '@/lib/naver/keyword-api';
import { getCachedMapping, nameHashKey } from '@/lib/dome-category-cache';
import { prisma } from '@/lib/prisma';

export interface DailyDigestProduct extends TuningSourceProduct {
  naverProductId?: string | null;
  supplier?: { name: string; id: string } | null;
}

export function scoreProduct(p: {
  salePrice: number;
  supplierPrice: number;
  naverCategoryCode?: string | null;
  name: string;
  keywords?: unknown;
  tags?: unknown;
  mainImage?: string | null;
}) {
  return calcHoneyScore({
    salePrice:     p.salePrice,
    supplierPrice: p.supplierPrice,
    categoryId:    p.naverCategoryCode ?? '',
    productName:   p.name,
    keywords:      Array.isArray(p.keywords) ? (p.keywords as string[]) : [],
    tags:          Array.isArray(p.tags)     ? (p.tags     as string[]) : [],
    hasMainImage:  !!p.mainImage,
  });
}

// ── Ops digest (publish-ready / revival / zombie / margin-warn) ────────────

export interface OpsDigestSignals {
  publishReady: string[];
  revival: string[];
  zombie: string[];
  zombieDetected: { name: string; productId: string; marginPct: number; reason: string }[];
  marginWarn: { name: string; margin: number }[];
}

export async function computeOpsDigestSignals(
  products: DailyDigestProduct[],
): Promise<OpsDigestSignals> {
  const publishReady: string[] = [];
  const revival: string[] = [];
  const zombie: string[] = [];
  const zombieDetected: OpsDigestSignals['zombieDetected'] = [];
  const marginWarn: OpsDigestSignals['marginWarn'] = [];

  const tuningMap = await loadTuningScores(products);

  for (const p of products) {
    // 발행 준비 완료: passes every upload-readiness check AND not yet live on Naver.
    if (!p.naverProductId) {
      const rd = calcUploadReadiness({
        naverCategoryCode: p.naverCategoryCode,
        keywords: Array.isArray(p.keywords) ? (p.keywords as string[]) : [],
        tags: Array.isArray(p.tags) ? (p.tags as string[]) : [],
        name: p.name,
        mainImage: p.mainImage,
        salePrice: p.salePrice,
        supplierPrice: p.supplierPrice,
      });
      if (rd.failed.length === 0) publishReady.push(p.name);
    }

    // 부활 후보 (revival S/A) + 좀비 (long_inactive).
    const rev = computeRevivalScore(revivalSignalsFromProduct({
      naver_status_type: p.naver_status_type ?? null,
      status: p.status,
      naverProductId: p.naverProductId ?? null,
      name: p.name,
      mainImage: p.mainImage,
    }));
    if (rev.grade === 'S' || rev.grade === 'A') revival.push(p.name);

    const tuning = tuningMap.get(p.id);
    if (tuning?.isZombie) {
      zombie.push(p.name);
      zombieDetected.push({
        name: p.name, productId: p.id,
        marginPct: p.salePrice > 0 && p.supplierPrice > 0 ? scoreProduct(p).netMarginRate : 0,
        reason: tuning.zombieReason ?? '튜닝 필요',
      });
    }

    // 마진 경고 (임계 이하: 순마진 < 20%, honey-score 위험 기준).
    if (p.salePrice > 0 && p.supplierPrice > 0) {
      const m = scoreProduct(p).netMarginRate;
      if (m < 20) marginWarn.push({ name: p.name, margin: m });
    }
  }

  return { publishReady, revival, zombie, zombieDetected, marginWarn };
}

// ── Recommendation (top5 with trend + keyword-volume boost) ────────────────

export interface RecommendationItem {
  name: string;
  score: number;
  grade: string;
  netMarginRate: number;
  supplierName?: string;
  keywords: string[];
  volumeBoost: number;
  isSourcing: boolean;
  naverCategoryCode: string | null;
  recoType: RecoTypeTag | null;
}

export interface RecommendationResult {
  top5: RecommendationItem[];
  seasonTop2: { name: string; score: number }[];
  season: { label: string; daysLeft: number; words: string[] } | null;
  trendNote: string;
  trendSource: string;
  trendKeywords: string[];
}

export async function computeRecommendation(
  products: DailyDigestProduct[],
  season: { label: string; daysLeft: number; words: string[] } | null,
): Promise<RecommendationResult> {
  // Fetch today's Naver trends via Perplexity (non-blocking fallback if fails)
  const trends = await fetchNaverTrends();
  const trendMatches = matchProductsToTrends(products, trends);
  const trendBoostMap = new Map(trendMatches.map(m => [m.productId, m.boostScore]));

  // Step 3 (C-5): include SOURCED crawl_logs in recommendation pool.
  let sourcingCandidates: Array<{
    id: string; name: string; score: ReturnType<typeof scoreProduct>;
    boost: number; isSourcing: true;
    supplierPrice: number; salePrice: number;
    keywords: string[];
  }> = [];
  try {
    const crawlItems = await (prisma as any).crawlLog.findMany({
      where: { sourcingStatus: 'SOURCED', name: { not: null }, supplierPrice: { gt: 0 } },
      orderBy: { crawledAt: 'desc' },
      take: 30,
    });

    sourcingCandidates = crawlItems
      .map((c: any) => {
        const estSalePrice = Math.round(c.supplierPrice * 2.5);
        const sc = scoreProduct({
          salePrice:     estSalePrice,
          supplierPrice: c.supplierPrice,
          naverCategoryCode: c.categoryCode ?? null,
          name:          c.name ?? '',
          keywords:      [],
          tags:          [],
          mainImage:     null,
        });
        const trendBoost = trendMatches
          .filter(m => c.name && m.productId === c.id)
          .reduce((s: number, m: any) => s + m.boostScore, 0);
        return {
          id:            c.id,
          name:          c.name ?? '',
          score:         { ...sc, total: Math.min(sc.total + trendBoost, 100) },
          boost:         trendBoost,
          isSourcing:    true as const,
          supplierPrice: c.supplierPrice,
          salePrice:     estSalePrice,
          keywords:      [],
        };
      })
      .filter((c: any) => c.score.netMarginRate >= 20);
  } catch {
    // Sourcing pool is best-effort; recommendation still works from DB products alone.
  }

  const scored = products
    .filter(p => p.salePrice > 0 && p.supplierPrice > 0)
    .map(p => {
      const base  = scoreProduct(p);
      const boost = trendBoostMap.get(p.id) ?? 0;
      return { p, score: { ...base, total: Math.min(base.total + boost, 100) }, boost };
    })
    .sort((a, b) => b.score.total - a.score.total);

  // Step 3-A: keyword search volume boost for top candidates.
  const top10Candidates = scored.slice(0, 10);
  const volumeBoostMap = new Map<string, number>();
  try {
    const keywordBatches: { productId: string; keyword: string }[] = [];
    for (const { p } of top10Candidates) {
      const kws = Array.isArray(p.keywords) ? (p.keywords as string[]) : [];
      if (kws[0]) keywordBatches.push({ productId: p.id, keyword: kws[0] });
    }
    if (keywordBatches.length > 0) {
      const uniqueKws = [...new Set(keywordBatches.map(k => k.keyword))].slice(0, 5);
      const stats = await fetchKeywordStats(uniqueKws).catch(() => []);
      const volumeMap = new Map<string, number>(stats.map(s => [s.keyword, s.totalMonthly] as [string, number]));
      for (const { productId, keyword } of keywordBatches) {
        const vol = Number(volumeMap.get(keyword) ?? 0);
        const volBoost = vol >= 1000 && vol < 10000 ? 5 : vol < 1000 && vol > 0 ? 3 : vol >= 10000 ? 1 : 0;
        volumeBoostMap.set(productId, volBoost);
      }
    }
  } catch {
    // Keyword volume boost is best-effort.
  }

  const scoredWithBoost = scored.map(item => ({
    id:            item.p.id,
    name:          item.p.name,
    finalScore:    Math.min(item.score.total + (volumeBoostMap.get(item.p.id) ?? 0), 100),
    grade:         item.score.grade,
    netMarginRate: item.score.netMarginRate,
    supplierName:  item.p.supplier?.name,
    keywords:      Array.isArray(item.p.keywords) ? (item.p.keywords as string[]).slice(0, 3) : [],
    volumeBoost:   volumeBoostMap.get(item.p.id) ?? 0,
    isSourcing:    false as const,
    naverCategoryCode: item.p.naverCategoryCode ?? null,
  }));

  const sourcingWithBoost = sourcingCandidates.map(c => ({
    id:            c.id,
    name:          c.name,
    finalScore:    Math.min(c.score.total + (volumeBoostMap.get(c.id) ?? 0), 100),
    grade:         c.score.grade,
    netMarginRate: c.score.netMarginRate,
    supplierName:  undefined as string | undefined,
    keywords:      [] as string[],
    volumeBoost:   volumeBoostMap.get(c.id) ?? 0,
    isSourcing:    true as const,
    naverCategoryCode: null as string | null,
  }));

  const reRanked = [...scoredWithBoost, ...sourcingWithBoost]
    .sort((a, b) => b.finalScore - a.finalScore);

  const top5base = reRanked.slice(0, 5).map(item => ({
    name:          item.name,
    score:         item.finalScore,
    grade:         item.grade,
    netMarginRate: item.netMarginRate,
    supplierName:  item.supplierName,
    keywords:      item.keywords,
    volumeBoost:   item.volumeBoost,
    isSourcing:    item.isSourcing,
    naverCategoryCode: item.naverCategoryCode,
  }));

  // #250 §3: tag each recommended product 황금/니치/시즌 (category-score).
  // #258 — naverCategoryCode is often unset for sourced/unregistered candidates
  // (that's most of this list, not the exception), which previously starved
  // the classifier of a d1/d2/d3 triple and the tag silently never showed.
  // Fall back to the learned name_hash cache (dome-category-cache) — a
  // cache-only lookup, no new AI calls. A cache miss still yields no tag
  // (#231 honest: never fabricate a category to force a tag to appear).
  const nowMonth = new Date().getMonth() + 1;
  const catDescriptors = await Promise.all(top5base.map(async (t) => {
    if (t.naverCategoryCode) {
      const cat = NAVER_CATEGORIES_FULL.find((c) => c.code === t.naverCategoryCode);
      if (cat) return { d1: cat.d1, d2: cat.d2 ?? '', d3: cat.d3 ?? '' };
    }
    const cached = await getCachedMapping('name_hash', nameHashKey(t.name)).catch(() => null);
    return cached ? { d1: cached.d1, d2: cached.d2, d3: cached.d3 } : { d1: '' };
  }));
  const recoTags = await resolveRecoTypeTags(catDescriptors, nowMonth)
    .catch(() => top5base.map(() => null));
  const top5 = top5base.map((t, i) => ({ ...t, recoType: recoTags[i] ?? null }));

  const seasonTop2 = season
    ? scored
        .filter(({ p }) => season.words.some(w => p.name.includes(w)))
        .slice(0, 2)
        .map(({ p, score }) => ({ name: p.name, score: score.total }))
    : [];

  // #258 — plain sentence, seller language: no raw "(datalab)" source jargon,
  // no markdown/leading blank lines (that combined with the action-line
  // numbering to look like a hollow "3." bullet in Discord).
  const trendNote = trends.trendKeywords.length > 0
    ? `오늘 네이버 트렌드: ${trends.trendKeywords.slice(0, 3).join(', ')} 참고해서 등록해보세요`
    : '';

  return { top5, seasonTop2, season, trendNote, trendSource: trends.source, trendKeywords: trends.trendKeywords };
}
