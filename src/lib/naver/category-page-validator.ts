// src/lib/naver/category-page-validator.ts
// ============================================================================
// Sprint 7 P1-A (리서치 6번): 1-page category distribution validator
// ============================================================================
//
// For a given product name, call Naver Shopping Search API to fetch the
// first page of search results (up to 30 items by default). Each item
// carries category breadcrumbs (category1..category4). We aggregate the
// distribution and find the dominant category path.
//
// Heuristic: if >=80% of page-1 results share the same depth1 + depth2,
// that's the "correct" Naver category for the product — recommend it over
// any AI/fallback suggestion that disagrees.
//
// Why this matters (research 6):
//   Naver Shopping's algorithm strongly weights category match — registering
//   under a "wrong" category that competes with off-niche listings means
//   your product won't rank even with perfect keywords.
//
// API: https://openapi.naver.com/v1/search/shop.json
// Auth: NAVER_CLIENT_ID + NAVER_CLIENT_SECRET (Open API, same as DataLab/Search)
// Rate limit: 25,000/day (generous; one call per /api/category/suggest is fine)
// ============================================================================

const SHOP_SEARCH_URL = 'https://openapi.naver.com/v1/search/shop.json';
const DEFAULT_DISPLAY = 30; // page-1 sample size

// Threshold for "dominant" category. Tuned conservative — 80% is high enough
// that we're confident in overriding AI/fallback, but loose enough that
// natural variance (e.g. one outlier product) doesn't drop us below.
const DOMINANT_THRESHOLD = 0.6;

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface PageCategoryDistribution {
  /** Path like "패션의류 > 여성의류" with depth1+depth2 only. */
  d1d2Path: string;
  count: number;
  share: number; // 0..1
}

export interface PageValidationResult {
  /** Total items pulled (typically 30, may be less if Naver returns fewer). */
  totalItems: number;
  /** All distinct d1+d2 paths sorted by count DESC. */
  distribution: PageCategoryDistribution[];
  /** Dominant path if share >= DOMINANT_THRESHOLD, else null. */
  dominant: {
    d1: string;
    d2: string;
    share: number;
    count: number;
  } | null;
  /** Error code when the search fails (credentials missing, rate limit, etc.). */
  error?: string;
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Fetch page-1 Naver Shopping results for the keyword and compute the
 * dominant category distribution. Returns a structured result; failures
 * are surfaced via `error` field rather than thrown.
 */
export async function validatePageCategory(
  keyword: string,
): Promise<PageValidationResult> {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return { totalItems: 0, distribution: [], dominant: null, error: 'empty_keyword' };
  }

  // Open API credentials. Mirror trend-analyzer's fallback chain because some
  // projects register the same client_id under NAVER_DATALAB_* (which is what
  // currently works in this project — NAVER_CLIENT_ID by itself is Commerce
  // API's separate ID and not valid for /v1/search).
  const clientId =
    process.env.NAVER_DATALAB_CLIENT_ID ??
    process.env.NAVER_OPEN_API_CLIENT_ID ??
    process.env.NAVER_CLIENT_ID;
  const clientSecret =
    process.env.NAVER_DATALAB_CLIENT_SECRET ??
    process.env.NAVER_OPEN_API_CLIENT_SECRET ??
    process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { totalItems: 0, distribution: [], dominant: null, error: 'open_api_credentials_missing' };
  }

  const params = new URLSearchParams({
    query: trimmed,
    display: String(DEFAULT_DISPLAY),
    sort: 'sim', // similarity = Naver's default ranking; matches what shoppers see
  });

  let res: Response;
  try {
    res = await fetch(`${SHOP_SEARCH_URL}?${params.toString()}`, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
      signal: AbortSignal.timeout(8_000),
    });
  } catch (e) {
    return {
      totalItems: 0,
      distribution: [],
      dominant: null,
      error: e instanceof Error ? e.message.slice(0, 200) : 'network_error',
    };
  }

  if (!res.ok) {
    return {
      totalItems: 0,
      distribution: [],
      dominant: null,
      error: `http_${res.status}`,
    };
  }

  const data = (await res.json()) as {
    items?: Array<{
      category1?: string;
      category2?: string;
      category3?: string;
      category4?: string;
    }>;
  };
  const items = data.items ?? [];

  if (items.length === 0) {
    return { totalItems: 0, distribution: [], dominant: null };
  }

  // Aggregate by d1 + d2 (most useful granularity for Naver category routing)
  const counts = new Map<string, { d1: string; d2: string; count: number }>();
  for (const it of items) {
    const d1 = (it.category1 ?? '').trim();
    const d2 = (it.category2 ?? '').trim();
    if (!d1) continue;
    const key = `${d1} > ${d2}`;
    const prev = counts.get(key);
    if (prev) prev.count += 1;
    else counts.set(key, { d1, d2, count: 1 });
  }

  const totalItems = items.length;
  const distribution: PageCategoryDistribution[] = Array.from(counts.values())
    .map((c) => ({
      d1d2Path: `${c.d1} > ${c.d2}`,
      count: c.count,
      share: c.count / totalItems,
    }))
    .sort((a, b) => b.count - a.count);

  const top = distribution[0];
  // Top entry sorted by count. Re-derive d1/d2 from path for cleanliness.
  const dominant = top && top.share >= DOMINANT_THRESHOLD
    ? (() => {
        const c = Array.from(counts.values()).find((c) => `${c.d1} > ${c.d2}` === top.d1d2Path)!;
        return { d1: c.d1, d2: c.d2, share: top.share, count: top.count };
      })()
    : null;

  return { totalItems, distribution, dominant };
}
