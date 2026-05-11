// src/lib/hooks/useLowStockAlerts.ts
// Sprint 6-A UI Phase 2 hook — fetches unresolved LowStockAlerts for dashboard.
// Same SWR defaults as inventory badges (60s poll, focus revalidation).

import useSWR from 'swr';
import { DASHBOARD_SWR_DEFAULTS } from './useDashboardData';
import type { LowStockAlertRow } from '@/app/api/alerts/low-stock/route';

interface LowStockAlertsResponse {
  data?: LowStockAlertRow[];
}

const fetcher = (url: string): Promise<LowStockAlertsResponse> =>
  fetch(url).then((r) => r.json() as Promise<LowStockAlertsResponse>);

export function useLowStockAlerts(options?: { enabled?: boolean }): {
  alerts: LowStockAlertRow[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const enabled = options?.enabled ?? true;
  const key = enabled ? '/api/alerts/low-stock' : null;

  const { data, isLoading, mutate, error } = useSWR<LowStockAlertsResponse>(
    key,
    fetcher,
    DASHBOARD_SWR_DEFAULTS,
  );

  return {
    alerts: data?.data ?? [],
    isLoading,
    error: error instanceof Error ? error.message : null,
    refresh: () => { void mutate(); },
  };
}

export type { LowStockAlertRow };
