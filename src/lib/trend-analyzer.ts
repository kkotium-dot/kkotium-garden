// src/lib/trend-analyzer.ts
// A-8: Naver DataLab Shopping Insight API (primary)
// DataLab API: free, requires NAVER_CLIENT_ID + NAVER_CLIENT_SECRET_OPEN (separate from Commerce API)
// Endpoint: https://openapi.naver.com/v1/datalab/shopping/categories
// 2026-05-19 Sprint 7-PC-D: Perplexity fallback removed (Pro plan expired, dead code).
// Cron continues silently without trend data; keyword volume re-ranking still works.

const DATALAB_URL = 'https://openapi.naver.com/v1/datalab/shopping/categories';

export interface TrendResult {
  trendKeywords:   string[];
  trendCategories: string[];
  source: 'datalab' | 'fallback';
}

export interface TrendMatchResult {
  productId:       string;
  productName:     string;
  matchedKeywords: string[];
  boostScore:      number;   // +5 ~ +20 pts added to honey score
}

// ── 꼬띠 소싱 v2 §3-0: rising-rate / volatility signal (급상승·스테디 렌즈) ──
// Reuses the same 7-day DataLab series fetchDataLabTrends() already pulls —
// no additional API call. Sourcing-lenses.ts (src/lib/sourcing-lenses.ts)
// consumes CategoryTrendSignal to judge the 급상승📈 and 스테디📚 lenses.
export interface CategoryTrendSignal {
  name: string;           // D1 category name (matches DATALAB_CATEGORIES / naver d1 strings)
  latestRatio: number;    // most recent day's ratio (raw DataLab scale)
  risingRate: number;     // % change, first-half avg -> second-half avg of the window
  volatility: number;     // coefficient of variation (stddev/mean * 100), lower = steadier
  points: number;         // how many daily points fed the calc (honesty — thin data = less trust)
  isRising: boolean;
  isStable: boolean;
}

// Naver DataLab category codes (top 10 shopping categories)
const DATALAB_CATEGORIES = [
  { name: '패션의류',   param: '50000000' },
  { name: '패션잡화',   param: '50000001' },
  { name: '화장품/미용', param: '50000002' },
  { name: '디지털/가전', param: '50000003' },
  { name: '가구/인테리어', param: '50000004' },
  { name: '출산/육아',  param: '50000005' },
  { name: '식품',       param: '50000006' },
  { name: '스포츠/레저', param: '50000007' },
  { name: '생활/건강',  param: '50000008' },
  { name: '여가/생활편의', param: '50000009' },
];

// ── Shared raw fetch: last-7-day per-category DataLab series ──────────────
// Extracted so both fetchDataLabTrends() (latest-ratio ranking) and
// fetchCategoryTrendSignals() (rising-rate/volatility, 꼬띠 소싱 v2 §3-0)
// reuse the SAME API calls instead of hitting DataLab twice.
type RawCategorySeries = { title: string; data: Array<{ period: string; ratio: number }> };

async function fetchRawCategorySeries(): Promise<RawCategorySeries[] | null> {
  // DataLab uses separate Open API keys (not Commerce API keys)
  const clientId     = process.env.NAVER_DATALAB_CLIENT_ID
                    ?? process.env.NAVER_OPEN_API_CLIENT_ID
                    ?? process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_DATALAB_CLIENT_SECRET
                    ?? process.env.NAVER_OPEN_API_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    // Build date range: last 7 days
    const endDate   = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // DataLab Shopping Insights enforces max 3 categories per request — we
    // chunk the top-10 and merge. Sprint 7 P0-B (2026-05-12) fix: prior code
    // sent 10 in one call and silently fell back due to HTTP 400.
    const CHUNK = 3;
    const batches: typeof DATALAB_CATEGORIES[] = [];
    for (let i = 0; i < DATALAB_CATEGORIES.length; i += CHUNK) {
      batches.push(DATALAB_CATEGORIES.slice(i, i + CHUNK));
    }

    const results: RawCategorySeries[] = [];

    for (const batch of batches) {
      const body = {
        startDate: fmt(startDate),
        endDate:   fmt(endDate),
        timeUnit:  'date',
        category:  batch.map(c => ({ name: c.name, param: [c.param] })),
      };
      const res = await fetch(DATALAB_URL, {
        method:  'POST',
        headers: {
          'Content-Type':          'application/json',
          'X-Naver-Client-Id':     clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) continue; // Skip failed batch, keep partial results
      const data = await res.json();
      const batchResults: RawCategorySeries[] = data.results ?? [];
      results.push(...batchResults);
    }

    return results.length > 0 ? results : null;
  } catch {
    return null;
  }
}

// ── A-8: Naver DataLab Shopping Insight ──────────────────────────────────
async function fetchDataLabTrends(): Promise<TrendResult | null> {
  try {
    const results = await fetchRawCategorySeries();
    if (!results || results.length === 0) return null;

    // Get latest day ratio for each category, sort by ratio desc
    const ranked = results
      .map(r => {
        const latest = r.data[r.data.length - 1];
        return { name: r.title, ratio: latest?.ratio ?? 0 };
      })
      .sort((a, b) => b.ratio - a.ratio);

    // Top 3 categories → trend categories
    const trendCategories = ranked.slice(0, 3).map(r => r.name);

    // Derive trend keywords from top category names + common search terms
    const trendKeywords = trendCategories
      .flatMap(cat => {
        const KW_MAP: Record<string, string[]> = {
          '패션의류':    ['원피스', '반팔티'],
          '패션잡화':    ['가방', '지갑'],
          '화장품/미용': ['선크림', '마스크팩'],
          '가구/인테리어': ['수납장', '조명'],
          '생활/건강':  ['청소기', '공기청정기'],
          '식품':        ['건강식품', '간식'],
          '스포츠/레저': ['요가매트', '운동복'],
          '출산/육아':  ['기저귀', '유아용품'],
          '디지털/가전': ['이어폰', '충전기'],
          '여가/생활편의': ['캠핑용품', '여행가방'],
        };
        return KW_MAP[cat] ?? [cat];
      })
      .slice(0, 5);

    return { trendKeywords, trendCategories, source: 'datalab' };
  } catch {
    return null;
  }
}

// ── A-8: Main export — DataLab primary, silent fallback ───────────────────
export async function fetchNaverTrends(): Promise<TrendResult> {
  // Try DataLab (free, reliable, primary source)
  const datalab = await fetchDataLabTrends();
  if (datalab && datalab.trendKeywords.length > 0) return datalab;

  // Silent fallback — Perplexity fallback removed in Sprint 7-PC-D (2026-05-19).
  // Cron continues without trend data; keyword volume re-ranking still works.
  return { trendKeywords: [], trendCategories: [], source: 'fallback' };
}

// ── Match DB products against trend keywords ──────────────────────────────
export function matchProductsToTrends(
  products: Array<{
    id: string;
    name: string;
    keywords?: unknown;
    tags?: unknown;
  }>,
  trends: TrendResult
): TrendMatchResult[] {
  if (trends.trendKeywords.length === 0) return [];

  const results: TrendMatchResult[] = [];

  for (const p of products) {
    const keywords  = Array.isArray(p.keywords) ? (p.keywords as string[]) : [];
    const tags      = Array.isArray(p.tags)     ? (p.tags     as string[]) : [];
    const nameWords = p.name.toLowerCase().split(/\s+/);

    const matched = trends.trendKeywords.filter(tw => {
      const twLower = tw.toLowerCase();
      return (
        p.name.toLowerCase().includes(twLower) ||
        keywords.some(k => k.toLowerCase().includes(twLower)) ||
        tags.some(t => t.toLowerCase().includes(twLower)) ||
        nameWords.some(w => w.includes(twLower))
      );
    });

    if (matched.length > 0) {
      const boostScore = Math.min(matched.length * 5, 20);
      results.push({ productId: p.id, productName: p.name, matchedKeywords: matched, boostScore });
    }
  }

  return results.sort((a, b) => b.boostScore - a.boostScore);
}

// ── 꼬띠 소싱 v2 §3-0: rising-rate / volatility (pure, unit-testable) ──────
// Thresholds tuned conservative and documented (no magic numbers) — mirrors
// the tunables style of naver/category-score.ts.
const RISING_RATE_THRESHOLD = 15;   // % — first-half→second-half avg change to call "rising"
const STABLE_VOLATILITY_MAX = 20;   // % coefficient of variation — below this = "steady"
const MIN_POINTS_FOR_SIGNAL = 4;    // fewer daily points than this = too thin to trust (#231)

/** % change from the window's first-half average to its second-half average. */
export function computeRisingRate(ratios: number[]): number {
  if (ratios.length < 2) return 0;
  const mid = Math.floor(ratios.length / 2);
  const firstHalf = ratios.slice(0, mid);
  const secondHalf = ratios.slice(mid);
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const before = avg(firstHalf);
  const after = avg(secondHalf);
  if (before <= 0) return after > 0 ? 100 : 0;
  return Math.round(((after - before) / before) * 1000) / 10; // 1 decimal
}

/** Coefficient of variation (stddev/mean * 100) — lower = steadier demand. */
export function computeVolatility(ratios: number[]): number {
  if (ratios.length < 2) return 0;
  const mean = ratios.reduce((s, v) => s + v, 0) / ratios.length;
  if (mean <= 0) return 0;
  const variance = ratios.reduce((s, v) => s + (v - mean) ** 2, 0) / ratios.length;
  const stddev = Math.sqrt(variance);
  return Math.round((stddev / mean) * 1000) / 10; // 1 decimal
}

/** PURE. Derive a CategoryTrendSignal from one category's raw daily series. */
export function classifyTrendSignal(
  name: string,
  data: Array<{ period: string; ratio: number }>,
): CategoryTrendSignal {
  const ratios = data.map(d => d.ratio);
  const latestRatio = ratios.length > 0 ? ratios[ratios.length - 1] : 0;
  const risingRate = computeRisingRate(ratios);
  const volatility = computeVolatility(ratios);
  const enoughData = ratios.length >= MIN_POINTS_FOR_SIGNAL;
  return {
    name,
    latestRatio,
    risingRate,
    volatility,
    points: ratios.length,
    isRising: enoughData && risingRate >= RISING_RATE_THRESHOLD,
    // Stability needs BOTH low volatility and no rising/falling trend — a
    // steady seller isn't spiking OR crashing.
    isStable: enoughData && volatility <= STABLE_VOLATILITY_MAX && Math.abs(risingRate) < RISING_RATE_THRESHOLD,
  };
}

/**
 * Fetch per-D1-category rising-rate/volatility signals from the SAME 7-day
 * DataLab window fetchNaverTrends() already pulls (no extra API call — reuses
 * fetchRawCategorySeries()). Returns [] when DataLab is unavailable (cold
 * start / missing credentials) so callers degrade gracefully, same pattern
 * as fetchNaverTrends()'s silent fallback.
 */
export async function fetchCategoryTrendSignals(): Promise<CategoryTrendSignal[]> {
  const series = await fetchRawCategorySeries();
  if (!series) return [];
  return series.map(s => classifyTrendSignal(s.title, s.data));
}
