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
  zScore: number | null;  // (latest - own window mean) / own window stddev — null when 표본<6 (§3-1)
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
// 카테고리 편중 근본수정(2026-08-11, #338): 기존엔 "최신일자 절대 ratio" 상위
// 3개를 매일 그대로 반환했다 — ratio는 카테고리의 절대 검색 볼륨을 반영하므로
// 베이스라인이 큰 카테고리(실측: "생활/건강")가 거의 매일 1~3위를 독식해
// 9개 사전 중 사실상 1개만 노출되는 편중이 발생했다(운영자 신고).
// 수정: 같은 7일 시리즈(fetchRawCategorySeries, 추가 API 호출 0)에서 이미
// 계산 가능한 risingRate(전반부→후반부 평균 변화율, classifyTrendSignal)로
// 재정렬한다 — "지금 막 뜨는 카테고리"를 우선하므로 절대 볼륨이 큰 카테고리에
// 영구 고정되지 않는다. 그래도 상위 2개는 여전히 특정 카테고리가 매일
// 반복될 수 있어(꾸준히 상승세인 카테고리), 3번째 슬롯은 상위 2개를 제외한
// 나머지에서 날짜 기반으로 순환 선택해 9개 카테고리가 며칠 내로 골고루
// 노출되게 한다(#338 — 로드맵1b 8렌즈 전체 연결은 스코프 아웃, 근거는
// 결과문서 참조).
async function fetchDataLabTrends(): Promise<TrendResult | null> {
  try {
    const results = await fetchRawCategorySeries();
    if (!results || results.length === 0) return null;

    const signals = results.map(r => classifyTrendSignal(r.title, r.data));

    // z-score 정규화(#설계 2026-08-27): 절대 risingRate로 정렬하면 변동성 기저가
    // 큰 카테고리(패션의류·스포츠/레저)가 구조적으로 상위를 독식한다(프로덕션
    // 실측 70%). zScore(자기 이력 대비 이례치)가 있는 카테고리는 그걸로 우선
    // 정렬하고, 표본<6이라 zScore가 없는 카테고리만 기존 절대값으로 폴백해
    // 뒤에 붙인다(정직표시 — 전체 랭킹을 왜곡하지 않음).
    const withZ = signals.filter(s => s.zScore !== null);
    const withoutZ = signals.filter(s => s.zScore === null);
    withZ.sort((a, b) => (b.zScore as number) - (a.zScore as number));
    withoutZ.sort((a, b) => b.risingRate - a.risingRate);
    const byRisingRate = [...withZ, ...withoutZ];
    const top2 = byRisingRate.slice(0, 2).map(s => s.name);

    const remaining = signals.filter(s => !top2.includes(s.name));
    const dayIndex = Math.floor(Date.now() / 86_400_000);
    const rotatedPick = remaining.length > 0 ? remaining[dayIndex % remaining.length].name : null;

    const trendCategories = rotatedPick ? [...top2, rotatedPick] : top2;

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

// ── z-score 정규화 (docs/design/SOURCING_ZSCORE_NORMALIZATION_2026-08-27.md §3-1) ──
const Z_SCORE_MIN_POINTS = 6;       // 표본<6 → 절대값 폴백(§5 — 정직표시)
const Z_RISING_THRESHOLD = 1.0;     // 자기 이력 평균보다 1 표준편차 이상 높으면 "이례적으로 뜨는 중"

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

/**
 * z = (최신값 − 이 카테고리 자기 이력 평균) / 자기 이력 stddev. 같은 창의
 * ratios[]를 재사용(추가 API 호출 0, 비용0) — "절대 변동폭"이 아니라 "이
 * 카테고리 기준으로 지금이 얼마나 이례적인가"를 측정해, 변동성 기저가 큰
 * 카테고리(패션의류·스포츠/레저)가 구조적으로 상위를 독식하는 걸 막는다
 * (§3-1). 표본<6이거나 stddev=0(전부 동일값)이면 null — 호출부는 절대값
 * risingRate로 폴백한다(정직표시, §5).
 */
export function computeZScore(ratios: number[]): number | null {
  if (ratios.length < Z_SCORE_MIN_POINTS) return null;
  const mean = ratios.reduce((s, v) => s + v, 0) / ratios.length;
  const variance = ratios.reduce((s, v) => s + (v - mean) ** 2, 0) / ratios.length;
  const stddev = Math.sqrt(variance);
  if (stddev === 0) return null;
  const latest = ratios[ratios.length - 1];
  return Math.round(((latest - mean) / stddev) * 100) / 100; // 2 decimals
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
  const zScore = computeZScore(ratios);
  const enoughData = ratios.length >= MIN_POINTS_FOR_SIGNAL;
  return {
    name,
    latestRatio,
    risingRate,
    volatility,
    zScore,
    points: ratios.length,
    // z-score 가용 시 자기 이력 대비 이상치로 판정(§3-1) — 표본 부족(zScore
    // null)일 때만 기존 절대값 임계치로 폴백(정직표시, §5).
    isRising: zScore !== null ? zScore >= Z_RISING_THRESHOLD : enoughData && risingRate >= RISING_RATE_THRESHOLD,
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
