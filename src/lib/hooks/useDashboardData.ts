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
