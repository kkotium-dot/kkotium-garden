// src/lib/hooks/useDashboardData.ts
// Option D (2026-05-03) — shared SWR hooks for dashboard live data
//
// Design principles:
//  1. Single source of truth for SWR options across all dashboard surfaces
//     (sidebar badges + dashboard widgets) so polling cadence and focus
//     behavior stay consistent.
//  2. Each domain hook is a thin wrapper around useSWR with a typed return
//     so widgets do not have to repeat `.data?.summary?` style optional
//     chains.
//  3. Conditional fetching is supported via the `key === null` SWR contract
//     so widgets that already receive data via props (e.g. DailyPlanWidget
//     when used inside the dashboard page) can opt out of fetching.
//  4. Generalization of the pattern proven in Option C (Sidebar.tsx v10).

import useSWR, { type SWRConfiguration } from 'swr';

// ─── Defaults shared by every dashboard hook ────────────────────────────────
// These were validated end-to-end in Option C (Sidebar.tsx) — keep in sync.
export const DASHBOARD_SWR_DEFAULTS: SWRConfiguration = {
  refreshInterval: 60_000,    // poll every 60s
  revalidateOnFocus: true,    // refetch when user returns to the tab
  dedupingInterval: 10_000,   // suppress duplicate fetches within 10s
  keepPreviousData: true,     // avoid flicker on revalidation
};

// Generic JSON fetcher reused by every hook below.
const jsonFetcher = <T>(url: string): Promise<T> =>
  fetch(url).then((r) => r.json() as Promise<T>);

// ─── 1. Sidebar stats ───────────────────────────────────────────────────────
// Replaces the inline useSWR call in src/components/layout/Sidebar.tsx (v10).
// Keeps the badge counts derivation in one place so the sidebar component
// stays focused on rendering.

interface SidebarStatsApiResponse {
  success?: boolean;
  data?: {
    summary?: {
      sourcingCount?: number;
      zombieCount?: number;
      todayOrderCount?: number;
      draftProducts?: number;
      outOfStockProducts?: number;
    };
  };
}

export interface SidebarBadgeCounts {
  sourcingCount: number;
  zombieCount: number;
  ordersCount: number;
  draftCount: number;
  oosCount: number;
}

export function useSidebarStats(): {
  counts: SidebarBadgeCounts | null;
  isLoading: boolean;
} {
  const { data, isLoading } = useSWR<SidebarStatsApiResponse>(
    '/api/dashboard/stats?period=all',
    jsonFetcher,
    DASHBOARD_SWR_DEFAULTS,
  );

  const summary = data?.success ? data?.data?.summary : undefined;
  const counts: SidebarBadgeCounts | null = summary
    ? {
        sourcingCount: summary.sourcingCount       ?? 0,
        zombieCount:   summary.zombieCount         ?? 0,
        ordersCount:   summary.todayOrderCount     ?? 0,
        draftCount:    summary.draftProducts       ?? 0,
        oosCount:      summary.outOfStockProducts  ?? 0,
      }
    : null;

  return { counts, isLoading };
}

// ─── 2. Profitability ────────────────────────────────────────────────────────
// Used by ProfitabilityWidget (dashboard).

export interface ProfitabilityApiData {
  summary: {
    totalProducts: number;
    activeCount: number;
    avgMarginNormal: number;
    avgMarginMarketing: number;
    totalFeeNormal: number;
    totalFeeMarketing: number;
    totalFeeSaved: number;
    totalProfitNormal: number;
    totalProfitMarketing: number;
    monthlySimulation: {
      normal: number;
      marketing: number;
      difference: number;
    };
  };
  distribution: {
    excellent: number;
    good: number;
    normal: number;
    low: number;
    danger: number;
  };
  top5: Array<{ id: string; name: string; sku: string; profitNormal: number; marginNormal: number }>;
  bottom5: Array<{ id: string; name: string; sku: string; profitNormal: number; marginNormal: number }>;
  feeComparison: {
    normalRate: number;
    marketingRate: number;
    savedRate: number;
    salesFeeNormal: number;
    salesFeeMarketing: number;
    reformDate: string;
    reformNote: string;
  };
}

interface ProfitabilityApiResponse {
  success?: boolean;
  data?: ProfitabilityApiData;
}

export function useProfitability(): {
  data: ProfitabilityApiData | null;
  isLoading: boolean;
  isValidating: boolean;
  refresh: () => void;
} {
  const { data, isLoading, isValidating, mutate } = useSWR<ProfitabilityApiResponse>(
    '/api/profitability',
    jsonFetcher,
    DASHBOARD_SWR_DEFAULTS,
  );

  return {
    data: data?.success ? data?.data ?? null : null,
    isLoading,
    isValidating,
    refresh: () => { void mutate(); },
  };
}

// ─── 3. Products list (for DailyPlanWidget) ─────────────────────────────────
// Conditional fetch: when the parent already passes products via props the
// widget should NOT trigger a network request. SWR honours `key === null` by
// skipping the fetch entirely, which is exactly what we need.

// The shape returned by /api/products is loose (partial server-side schema),
// so we keep the type as `unknown[]` and let the widget normalize it. This
// matches the widget's existing `.map((p: any) => ...)` normalization.
type RawProductsApiResponse = {
  products?: unknown[];
  data?: unknown[];
};

export function useProductsList(options?: {
  /** Skip the SWR fetch entirely (e.g. parent provides products). */
  enabled?: boolean;
  /** Override the limit query param. Default: 200. */
  limit?: number;
}): {
  rawProducts: unknown[] | null;
  isLoading: boolean;
  refresh: () => void;
} {
  const enabled = options?.enabled ?? true;
  const limit = options?.limit ?? 200;
  const key = enabled ? `/api/products?limit=${limit}` : null;

  const { data, isLoading, mutate } = useSWR<RawProductsApiResponse>(
    key,
    jsonFetcher,
    DASHBOARD_SWR_DEFAULTS,
  );

  const rawProducts = data ? ((data.products ?? data.data ?? []) as unknown[]) : null;

  return {
    rawProducts,
    isLoading,
    refresh: () => { void mutate(); },
  };
}


// ============================================================================
// OPTION E (2026-05-03) — MID priority hooks
// 5 additional hooks for MID-priority dashboard widgets.
// Refresh intervals tuned per widget data freshness value:
//   - Good Service       : 5 min   (sales counters update gradually)
//   - DataLab Trend      : 24h     (category trend data is daily)
//   - Sourcing Recommend : 24h     (BlueOcean recommendation cached)
//   - Review Growth      : 5 min   (manual count entry, infrequent)
//   - Upload Readiness   : 60s     (DRAFT changes are frequent, HIGH equiv)
// ============================================================================

// ─── Refresh interval profiles ──────────────────────────────────────────────
const FIVE_MIN_MS    = 5 * 60 * 1000;       // 300_000
const ONE_HOUR_MS    = 60 * 60 * 1000;      // 3_600_000
const ONE_DAY_MS     = 24 * 60 * 60 * 1000; // 86_400_000

const SWR_PROFILE_5MIN: SWRConfiguration = {
  refreshInterval: FIVE_MIN_MS,
  revalidateOnFocus: true,
  dedupingInterval: 60_000,         // 1 min dedupe (5min refresh)
  keepPreviousData: true,
};

const SWR_PROFILE_24H: SWRConfiguration = {
  refreshInterval: ONE_DAY_MS,
  revalidateOnFocus: false,         // do NOT revalidate on focus for 24h-cached data
  dedupingInterval: ONE_HOUR_MS,    // 1 hour dedupe (max SWR efficiency)
  keepPreviousData: true,
};

// 60s profile reuses DASHBOARD_SWR_DEFAULTS (HIGH equivalent).

// ─── 4. Good Service score (5 min cadence) ──────────────────────────────────
export interface GoodServiceApiData {
  score: {
    orderFulfillment: number;
    deliveryQuality: number;
    customerSatisfaction: number;
    overall: number;
    grade: string;
    gradeLabel: string;
    gradeColor: string;
    tips: string[];
  };
  gradeSimulation: {
    currentGrade: string;
    nextGrade: string | null;
    gap: { salesAmount: number; salesCount: number; score: number } | null;
  };
  monthlySummary: {
    salesAmount: number;
    salesCount: number;
  };
}

interface GoodServiceApiResponse {
  success?: boolean;
  data?: GoodServiceApiData;
}

export function useGoodService(): {
  data: GoodServiceApiData | null;
  isLoading: boolean;
  isValidating: boolean;
  refresh: () => void;
} {
  const { data, isLoading, isValidating, mutate } = useSWR<GoodServiceApiResponse>(
    '/api/good-service',
    jsonFetcher,
    SWR_PROFILE_5MIN,
  );

  return {
    data: data?.success ? data?.data ?? null : null,
    isLoading,
    isValidating,
    refresh: () => { void mutate(); },
  };
}

// ─── 5. DataLab Trend (24h cadence + period as part of SWR key) ─────────────
export interface DataLabTrendPoint {
  period: string;
  ratio: number;
}
export interface DataLabCategoryTrend {
  title: string;
  latestRatio: number;
  change: number;
  data: DataLabTrendPoint[];
}
export interface DataLabApiData {
  success: boolean;
  type: string;
  period: number;
  timeUnit: string;
  startDate: string;
  endDate: string;
  trends: DataLabCategoryTrend[];
  topRising: string[];
  topDecline: string[];
  cached?: boolean;
  error?: string;
  help?: string;
}

export function useDataLabTrend(period: number): {
  data: DataLabApiData | null;
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;
  refresh: () => void;
} {
  // SWR key includes the period so changing it re-fetches.
  const { data, isLoading, isValidating, mutate, error: swrError } = useSWR<DataLabApiData>(
    `/api/datalab?period=${period}`,
    jsonFetcher,
    SWR_PROFILE_24H,
  );

  // The /api/datalab endpoint embeds success/error inside the JSON body
  // even on HTTP 200, so we surface that here for the widget.
  const apiError = data && !data.success ? (data.error ?? 'Failed to fetch') : null;
  const networkError = swrError ? 'Network error' : null;

  return {
    data: data && data.success ? data : null,
    isLoading,
    isValidating,
    error: apiError ?? networkError,
    refresh: () => { void mutate(); },
  };
}

// ─── 6. Sourcing Recommend (24h cadence + setData for POST scan) ────────────
export interface SourcingWholesaleProduct {
  platform: string;
  productNo: string;
  name: string;
  supplyPrice: number;
  minOrderQty: number;
  estimatedMargin: number;
  url: string;
}

export interface SourcingOpportunityItem {
  keyword: string;
  category: string;
  monthlySearchVolume: number;
  competition: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  totalResults: number;
  competitionLevel: string;
  suggestedSupplyPrice: number;
  estimatedMargin: number;
  blueOceanScore: number;
  reason: string;
  topSellers: string[];
  aiInsight?: string;
  wholesaleMatches?: SourcingWholesaleProduct[];
  wholesalePlatforms?: string[];
  entryBarrierLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  entryBarrierScore?: number;
  entryBarrierBonus?: number;
  blueOceanBase?: number;
  uniqueSellersInTop?: number;
  priceSpread?: number;
}

export interface SourcingRecommendApiData {
  ok: boolean;
  cached?: boolean;
  date: string;
  trendSource: string;
  trendCategories: string[];
  opportunities: SourcingOpportunityItem[];
  aiSummary?: string;
  error?: string;
}

export function useSourcingRecommend(): {
  data: SourcingRecommendApiData | null;
  isLoading: boolean;
  isValidating: boolean;
  /** Replace the SWR cache entry without refetching (e.g. after POST scan). */
  setData: (next: SourcingRecommendApiData) => void;
  refresh: () => void;
} {
  const { data, isLoading, isValidating, mutate } = useSWR<SourcingRecommendApiData>(
    '/api/sourcing-recommend',
    jsonFetcher,
    SWR_PROFILE_24H,
  );

  return {
    data: data && data.ok ? data : null,
    isLoading,
    isValidating,
    setData: (next) => { void mutate(next, { revalidate: false }); },
    refresh: () => { void mutate(); },
  };
}

// ─── 7. Review Growth (5 min cadence + refresh for POST/PUT) ────────────────
// Loose typing — the /api/review-growth response shape is owned by
// ReviewGrowthWidget. We pass it through unchanged so the widget keeps
// its own domain types.
type ReviewGrowthApiResponse = unknown;

export function useReviewGrowth<T = ReviewGrowthApiResponse>(): {
  data: T | null;
  isLoading: boolean;
  isValidating: boolean;
  /** Force a re-fetch (use after POST/PUT to /api/review-growth). */
  refresh: () => void;
} {
  const { data, isLoading, isValidating, mutate } = useSWR<T>(
    '/api/review-growth',
    jsonFetcher,
    SWR_PROFILE_5MIN,
  );

  return {
    data: data ?? null,
    isLoading,
    isValidating,
    refresh: () => { void mutate(); },
  };
}

// ─── 8. Upload Readiness (60s cadence — DRAFT churn is high) ────────────────
// Reuses the existing /api/products?status=DRAFT contract. The widget
// continues to own its Map<string, number> optimistic-score cache; this
// hook only replaces the raw fetch + state plumbing.
type UploadReadinessApiResponse = unknown;

export function useUploadReadiness<T = UploadReadinessApiResponse>(options?: {
  enabled?: boolean;
}): {
  data: T | null;
  isLoading: boolean;
  isValidating: boolean;
  refresh: () => void;
} {
  const enabled = options?.enabled ?? true;
  const key = enabled ? '/api/products?status=DRAFT&limit=200' : null;

  const { data, isLoading, isValidating, mutate } = useSWR<T>(
    key,
    jsonFetcher,
    DASHBOARD_SWR_DEFAULTS,        // 60s, same as Profitability/Sidebar
  );

  return {
    data: data ?? null,
    isLoading,
    isValidating,
    refresh: () => { void mutate(); },
  };
}

// ─── 9. Dashboard Stats (workflow redesign Part A1a — 60s cadence) ──────────
// Replaces the inline `loadStats` fetch in src/app/dashboard/page.tsx so the
// dashboard parent (which feeds props to four child widgets) participates in
// the same SWR layer as Sidebar / Profitability / GoodService etc.
//
// Response contract: matches /api/dashboard/stats?period=all summary block.
// All numeric fields are optional in the API response; the hook returns the
// raw shape so the dashboard page can read fields with optional chaining.

export interface DashboardStatsApiData {
  totalProducts?: number;
  activeProducts?: number;
  outOfStockProducts?: number;
  draftProducts?: number;
  inactiveProducts?: number;
  avgScore?: number;
  totalRevenue?: number;
  period?: string;
  sourcingCount?: number;
  zombieCount?: number;
  todayOrderCount?: number;
  todayRevenue?: number;
  todayPaidAmount?: number;
  naverApiReady?: boolean;
  // Legacy aliases — preserved for parity with the existing dashboard page
  readyProducts?: number;
  avgAiScore?: number;
}

interface DashboardStatsApiResponse {
  success?: boolean;
  data?: {
    summary?: DashboardStatsApiData;
  };
}

/**
 * Fetch dashboard summary stats with the standard 60s SWR cadence.
 * The period query param is fixed at 'all' to match the existing
 * dashboard contract; pass options.period to override if needed.
 */
export function useDashboardStats(options?: {
  /** Period filter for the stats API. Default: 'all'. */
  period?: 'all' | '7d' | '30d' | '90d';
  /** Skip the SWR fetch entirely (rare — kept for symmetry with useProductsList). */
  enabled?: boolean;
}): {
  data: DashboardStatsApiData | null;
  isLoading: boolean;
  isValidating: boolean;
  refresh: () => void;
} {
  const enabled = options?.enabled ?? true;
  const period  = options?.period ?? 'all';
  const key = enabled ? `/api/dashboard/stats?period=${period}` : null;

  const { data, isLoading, isValidating, mutate } = useSWR<DashboardStatsApiResponse>(
    key,
    jsonFetcher,
    DASHBOARD_SWR_DEFAULTS,
  );

  const summary = data?.success ? data?.data?.summary ?? null : null;

  return {
    data: summary,
    isLoading,
    isValidating,
    refresh: () => { void mutate(); },
  };
}
