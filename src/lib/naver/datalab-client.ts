// src/lib/naver/datalab-client.ts
// ============================================================================
// DataLab Shopping Insights client — Image+SEO/ROI Strategy Engine Stage 0.
// Authority: docs/design/IMAGE_SEO_STRATEGY_ENGINE.md §B-2 / L0.
// ============================================================================
//
// Feeds the L0 category-intelligence layer (CategoryDna.demographics): per
// category trend ratios plus age/gender/device skew, and keyword-level trend.
//
// All 8 Shopping-Insights endpoints under /v1/datalab/shopping/ are wrapped:
//   1 categories                 — multi-category trend (<=3 per request)
//   2 category/device            — one category, split by device
//   3 category/gender            — one category, split by gender
//   4 category/age               — one category, split by age band
//   5 category/keywords          — keyword-set trend within a category
//   6 category/keyword/device    — one keyword, split by device
//   7 category/keyword/gender    — one keyword, split by gender
//   8 category/keyword/age       — one keyword, split by age band
//
// Auth: X-Naver-Client-Id / X-Naver-Client-Secret (Open API app, NOT the
// Commerce API). Same env keys already used by category-trend-cache.ts.
//
// IMPORTANT — age codes are 6 bands here (Shopping Insights), distinct from
// the 1..11 bands used by the Search-Trend (datalab/search) API. See AGE_BANDS.
//
// Quota: ~1,000 calls/day (console-verifiable). Category trend should be
// cached weekly (see category-trend-cache.ts for the daily category path);
// per-keyword pulls are operator-triggered, not per-product.
//
// TODO(golden-keyword): DataLab does NOT return the top-500 popular keywords
// per category — those are web-UI only. The golden-keyword discovery path
// needs a separate source (Search-Ad keyword tool / manual seed list); it is
// intentionally out of scope for this client.
//
// Runtime: pure fetch + JSON, no external image API (#37/#38 unaffected).
// ============================================================================

const DATALAB_BASE = 'https://openapi.naver.com/v1/datalab/shopping';

// ----------------------------------------------------------------------------
// Credentials (mirrors category-trend-cache.ts resolution order)
// ----------------------------------------------------------------------------

function resolveCredentials():
  | { clientId: string; clientSecret: string }
  | { error: 'datalab_credentials_missing' } {
  const clientId =
    process.env.NAVER_DATALAB_CLIENT_ID ??
    process.env.NAVER_OPEN_API_CLIENT_ID ??
    process.env.NAVER_CLIENT_ID;
  const clientSecret =
    process.env.NAVER_DATALAB_CLIENT_SECRET ??
    process.env.NAVER_OPEN_API_CLIENT_SECRET ??
    process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { error: 'datalab_credentials_missing' };
  }
  return { clientId, clientSecret };
}

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

export const TIME_UNITS = ['date', 'week', 'month'] as const;
export type TimeUnit = (typeof TIME_UNITS)[number];

export const DEVICES = ['pc', 'mo'] as const;
export type Device = (typeof DEVICES)[number];

export const GENDERS = ['m', 'f'] as const;
export type Gender = (typeof GENDERS)[number];

// Shopping Insights age bands — SIX bands. Do NOT reuse the search-trend 1..11
// mapping; mixing them silently returns empty results.
export const AGE_BANDS = ['10', '20', '30', '40', '50', '60'] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

// Per-request hard cap on the number of category/keyword groups Naver accepts.
export const MAX_GROUPS_PER_REQUEST = 3;

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface CategoryGroup {
  name: string;
  // One or more Naver shopping category codes for this group.
  param: string[];
}

export interface KeywordGroup {
  name: string;
  // One or more search keywords for this group.
  param: string[];
}

export interface DataLabBaseRequest {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  timeUnit: TimeUnit;
}

// results[].data[] = {period, ratio, group?}
export interface DataLabPoint {
  period: string;
  ratio: number;
  group?: string;
}

export interface DataLabResult {
  title: string;
  keyword?: string[];
  category?: string[];
  data: DataLabPoint[];
}

export interface DataLabResponse {
  startDate: string;
  endDate: string;
  timeUnit: string;
  results: DataLabResult[];
}

export type DataLabOutcome =
  | { ok: true; data: DataLabResponse }
  | { ok: false; error: string };

// ----------------------------------------------------------------------------
// Core transport
// ----------------------------------------------------------------------------

async function postDataLab(
  path: string,
  body: Record<string, unknown>,
): Promise<DataLabOutcome> {
  const creds = resolveCredentials();
  if ('error' in creds) return { ok: false, error: creds.error };

  let res: Response;
  try {
    res = await fetch(`${DATALAB_BASE}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Naver-Client-Id': creds.clientId,
        'X-Naver-Client-Secret': creds.clientSecret,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 200) : 'datalab_network_error';
    return { ok: false, error: `datalab_network:${msg}` };
  }

  if (!res.ok) {
    return { ok: false, error: `datalab_http_${res.status}` };
  }

  const data = (await res.json()) as DataLabResponse;
  return { ok: true, data };
}

// ----------------------------------------------------------------------------
// 1) Multi-category trend — categories (<=3 groups per request)
// ----------------------------------------------------------------------------

export async function shoppingCategories(
  base: DataLabBaseRequest,
  category: CategoryGroup[],
): Promise<DataLabOutcome> {
  if (category.length === 0) return { ok: false, error: 'datalab_empty_category' };
  if (category.length > MAX_GROUPS_PER_REQUEST) {
    return { ok: false, error: 'datalab_too_many_groups' };
  }
  return postDataLab('categories', {
    ...base,
    category: category.map((c) => ({ name: c.name, param: c.param })),
  });
}

// ----------------------------------------------------------------------------
// 2-4) Single-category demographic split — device / gender / age
// ----------------------------------------------------------------------------

export async function shoppingCategoryByDevice(
  base: DataLabBaseRequest,
  categoryCode: string,
): Promise<DataLabOutcome> {
  return postDataLab('category/device', { ...base, category: categoryCode });
}

export async function shoppingCategoryByGender(
  base: DataLabBaseRequest,
  categoryCode: string,
): Promise<DataLabOutcome> {
  return postDataLab('category/gender', { ...base, category: categoryCode });
}

export async function shoppingCategoryByAge(
  base: DataLabBaseRequest,
  categoryCode: string,
  ages: AgeBand[] = [...AGE_BANDS],
): Promise<DataLabOutcome> {
  return postDataLab('category/age', { ...base, category: categoryCode, ages });
}

// ----------------------------------------------------------------------------
// 5) Keyword-set trend within a category — category/keywords
// ----------------------------------------------------------------------------

export async function shoppingCategoryKeywords(
  base: DataLabBaseRequest,
  categoryCode: string,
  keyword: KeywordGroup[],
): Promise<DataLabOutcome> {
  if (keyword.length === 0) return { ok: false, error: 'datalab_empty_keyword' };
  if (keyword.length > MAX_GROUPS_PER_REQUEST) {
    return { ok: false, error: 'datalab_too_many_groups' };
  }
  return postDataLab('category/keywords', {
    ...base,
    category: categoryCode,
    keyword: keyword.map((k) => ({ name: k.name, param: k.param })),
  });
}

// ----------------------------------------------------------------------------
// 6-8) Single-keyword demographic split — device / gender / age
// ----------------------------------------------------------------------------

export async function shoppingKeywordByDevice(
  base: DataLabBaseRequest,
  categoryCode: string,
  keyword: string,
): Promise<DataLabOutcome> {
  return postDataLab('category/keyword/device', {
    ...base,
    category: categoryCode,
    keyword,
  });
}

export async function shoppingKeywordByGender(
  base: DataLabBaseRequest,
  categoryCode: string,
  keyword: string,
): Promise<DataLabOutcome> {
  return postDataLab('category/keyword/gender', {
    ...base,
    category: categoryCode,
    keyword,
  });
}

export async function shoppingKeywordByAge(
  base: DataLabBaseRequest,
  categoryCode: string,
  keyword: string,
  ages: AgeBand[] = [...AGE_BANDS],
): Promise<DataLabOutcome> {
  return postDataLab('category/keyword/age', {
    ...base,
    category: categoryCode,
    keyword,
    ages,
  });
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/**
 * Format a Date to the 'YYYY-MM-DD' string DataLab expects.
 */
export function formatDataLabDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/**
 * Collapse a result set into the latest-period ratio per result title — the
 * shape the DNA-card demographics aggregator consumes.
 */
export function latestRatios(
  resp: DataLabResponse,
): Array<{ title: string; group?: string; ratio: number }> {
  const out: Array<{ title: string; group?: string; ratio: number }> = [];
  for (const r of resp.results ?? []) {
    const last = r.data && r.data.length > 0 ? r.data[r.data.length - 1] : null;
    if (!last) continue;
    out.push({ title: r.title, group: last.group, ratio: last.ratio ?? 0 });
  }
  return out;
}
