// src/lib/naver/category-trend-cache.ts
// ============================================================================
// Sprint 7 P0-B enhancement: per-category trend score cache.
// ============================================================================
//
// DataLab Shopping Insights provides aggregate trend ratios per top-level
// category. We pull these once a day (cron-daily) and cache per category so
// the golden-window-tracker can enrich each product with market context
// without hitting DataLab per-fetch (rate-limited 1000/day).
//
// Lookup keys:
//   'd1:<depth1Name>'  — primary; we always know a product's d1 from the
//                        naver category mapping
//   'code:<code>'      — reserved for future when we map subtree codes
//
// Market level buckets (cosmetic, used by widget tone):
//   hot     trendScore >= 60
//   normal  30..59
//   cold    0..29
//
// Score interpretation:
//   trendScore — DataLab last-7-day ratio, rescaled to 0..100 against the
//                10 top categories. The "most-trending" category lands near
//                100; the least near a few points.
//   volumeScore — Reserved for future Search Ad keyword volume blending.
//                For now we leave it 0 and the analyzer ignores it; the
//                column exists so adding keyword-driven boosting later
//                requires no DB change.
// ============================================================================

import { prisma } from '@/lib/prisma';

const DATALAB_URL = 'https://openapi.naver.com/v1/datalab/shopping/categories';

// Top 10 Naver shopping categories — same set already used by trend-analyzer.ts.
// We keep a local copy so this module has no cyclic import.
const DATALAB_CATEGORIES = [
  { name: '패션의류',      param: '50000000' },
  { name: '패션잡화',      param: '50000001' },
  { name: '화장품/미용',   param: '50000002' },
  { name: '디지털/가전',   param: '50000003' },
  { name: '가구/인테리어', param: '50000004' },
  { name: '출산/육아',     param: '50000005' },
  { name: '식품',          param: '50000006' },
  { name: '스포츠/레저',   param: '50000007' },
  { name: '생활/건강',     param: '50000008' },
  { name: '여가/생활편의', param: '50000009' },
];

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type MarketLevel = 'hot' | 'normal' | 'cold';

export interface CategoryTrendEntry {
  cacheKey: string;
  trendScore: number;   // 0..100
  volumeScore: number;  // 0..100 (reserved)
  marketLevel: MarketLevel;
  dataSource: string;
  refreshedAt: Date;
}

export interface RefreshTrendResult {
  fetched: number;
  upserted: number;
  durationMs: number;
  error?: string;
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Read a cached category trend entry. Returns null on miss (cron hasn't run
 * yet, or category not in DataLab top-10).
 */
export async function getCachedTrend(
  cacheKey: string,
): Promise<CategoryTrendEntry | null> {
  const row = await prisma.categoryTrendCache.findUnique({
    where: { cacheKey },
  });
  if (!row) return null;
  return {
    cacheKey: row.cacheKey,
    trendScore: row.trendScore,
    volumeScore: row.volumeScore,
    marketLevel: row.marketLevel as MarketLevel,
    dataSource: row.dataSource,
    refreshedAt: row.refreshedAt,
  };
}

/**
 * Lookup by depth1 name. Most product records have `category` populated; we
 * normalize a single d1 token from the category string when present, fall
 * back to '기타'.
 */
export function buildD1Key(depth1: string): string {
  return `d1:${(depth1 ?? '').trim()}`;
}

/**
 * Refresh cache from DataLab. Idempotent — safe to call from cron daily.
 * Returns counts for cron logging. On DataLab failure leaves prior cache
 * intact and returns an error note (does not delete cache).
 */
export async function refreshCategoryTrendCache(): Promise<RefreshTrendResult> {
  const startedAt = Date.now();

  const clientId =
    process.env.NAVER_DATALAB_CLIENT_ID ??
    process.env.NAVER_OPEN_API_CLIENT_ID ??
    process.env.NAVER_CLIENT_ID;
  const clientSecret =
    process.env.NAVER_DATALAB_CLIENT_SECRET ??
    process.env.NAVER_OPEN_API_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      fetched: 0,
      upserted: 0,
      durationMs: Date.now() - startedAt,
      error: 'datalab_credentials_missing',
    };
  }

  // DataLab Shopping Insights `categories` endpoint enforces a hard limit
  // of *3 categories per request*. We chunk the top-10 into batches of 3
  // and merge results. Ratios within a batch are normalized to that batch's
  // max — for the hot/normal/cold market-level bucket this batch-local
  // normalization is acceptable (we are not doing precise cross-category
  // comparison, only relative trend strength).
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const CHUNK = 3;
  const batches: typeof DATALAB_CATEGORIES[] = [];
  for (let i = 0; i < DATALAB_CATEGORIES.length; i += CHUNK) {
    batches.push(DATALAB_CATEGORIES.slice(i, i + CHUNK));
  }

  // Collect latest-day ratios across all batches
  const raw: Array<{ title: string; ratio: number }> = [];
  let lastError: string | undefined;

  for (const batch of batches) {
    let res: Response;
    try {
      res = await fetch(DATALAB_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
        body: JSON.stringify({
          startDate: fmt(startDate),
          endDate: fmt(endDate),
          timeUnit: 'date',
          category: batch.map((c) => ({ name: c.name, param: [c.param] })),
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (e) {
      lastError = e instanceof Error ? e.message.slice(0, 200) : 'datalab_network_error';
      continue;
    }

    if (!res.ok) {
      lastError = `datalab_http_${res.status}`;
      continue;
    }

    const data = (await res.json()) as {
      results?: Array<{ title?: string; data?: Array<{ period?: string; ratio?: number }> }>;
    };
    for (const r of data.results ?? []) {
      const title = r.title ?? '';
      const latest = r.data && r.data.length > 0 ? r.data[r.data.length - 1] : null;
      const ratio = latest?.ratio ?? 0;
      if (title) raw.push({ title, ratio });
    }
  }

  if (raw.length === 0) {
    return {
      fetched: 0,
      upserted: 0,
      durationMs: Date.now() - startedAt,
      error: lastError ?? 'datalab_empty_results',
    };
  }

  // Cross-batch normalization: use the global max across all collected ratios
  const maxRatio = Math.max(...raw.map((r) => r.ratio), 1);

  let upserted = 0;
  for (const r of raw) {
    const trendScore = Math.round((r.ratio / maxRatio) * 100);
    const marketLevel: MarketLevel = trendScore >= 60 ? 'hot' : trendScore >= 30 ? 'normal' : 'cold';
    await prisma.categoryTrendCache.upsert({
      where: { cacheKey: buildD1Key(r.title) },
      create: {
        cacheKey: buildD1Key(r.title),
        trendScore,
        volumeScore: 0,
        marketLevel,
        dataSource: 'datalab',
      },
      update: {
        trendScore,
        volumeScore: 0,
        marketLevel,
        dataSource: 'datalab',
        refreshedAt: new Date(),
      },
    });
    upserted += 1;
  }

  return {
    fetched: raw.length,
    upserted,
    durationMs: Date.now() - startedAt,
    error: lastError, // surface partial failures so caller can see
  };
}

/**
 * Resolve a product's market context using the cache. Accepts the raw category
 * string (or naver depth1) and returns a normalized entry — null when category
 * is unknown or cache is cold.
 *
 * The product's `category` field is often a concatenation like "패션의류>여성의류>레깅스".
 * We split on '>' / ' > ' / '/' and take the first non-empty token.
 */
export async function resolveProductMarketContext(
  categoryRaw: string | null | undefined,
): Promise<CategoryTrendEntry | null> {
  if (!categoryRaw) return null;
  const d1 = extractDepth1(categoryRaw);
  if (!d1) return null;
  return getCachedTrend(buildD1Key(d1));
}

function extractDepth1(category: string): string | null {
  // Split on '>', ' > ', '/' — first non-empty token wins.
  const parts = category.split(/\s*[>/]\s*/);
  for (const p of parts) {
    const t = p.trim();
    if (t) return t;
  }
  return null;
}
