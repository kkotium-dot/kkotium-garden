// src/lib/hooks/useInventoryBadges.ts
// Sprint 6-A UI hook — fetches latest inventory snapshot + open alert per product.
// Single bulk fetch from /api/products/inventory-badges, keyed by productId.
// Empty map when no products have been polled yet (cold start safe).

import useSWR from 'swr';
import { DASHBOARD_SWR_DEFAULTS } from './useDashboardData';
import type { InventoryBadgeData } from '@/app/api/products/inventory-badges/route';

interface InventoryBadgesResponse {
  data?: Record<string, InventoryBadgeData>;
}

const fetcher = (url: string): Promise<InventoryBadgesResponse> =>
  fetch(url).then((r) => r.json() as Promise<InventoryBadgesResponse>);

export function useInventoryBadges(options?: { enabled?: boolean }): {
  byProductId: Record<string, InventoryBadgeData>;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const enabled = options?.enabled ?? true;
  const key = enabled ? '/api/products/inventory-badges' : null;

  const { data, isLoading, mutate, error } = useSWR<InventoryBadgesResponse>(
    key,
    fetcher,
    DASHBOARD_SWR_DEFAULTS,
  );

  return {
    byProductId: data?.data ?? {},
    isLoading,
    error: error instanceof Error ? error.message : null,
    refresh: () => { void mutate(); },
  };
}

export type { InventoryBadgeData };
