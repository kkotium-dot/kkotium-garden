// src/lib/pareto-analyzer.ts
// ============================================================================
// Sprint 7 P0-C (리서치 10번): Pareto (80/20) analyzer for top-revenue products
// ============================================================================
//
// At SKU 30~50 stage the top-5 products typically capture 70-80% of revenue
// (power law). Surfacing this lets the seller focus ad budget on proven
// winners instead of spreading evenly.
//
// Computation (over the last LOOKBACK_DAYS):
//   1. Sum OrderItem.price * OrderItem.quantity grouped by productId
//      (excluding cancelled / returned orders).
//   2. Sort DESC by revenue. Top 20% by count = "효자 상품" (Pareto winners).
//   3. Top 5 of those are returned for the dashboard TopProductsCard.
//
// Output:
//   • `paretoSlice` — top 20% of products (always at least 1 when revenue > 0)
//   • `topFive` — first 5 of paretoSlice for the dashboard card
//   • `paretoShare` — share of total revenue captured by the slice (0..1)
//   • `totalRevenue` — total over the window (so UI can show %)
//
// Cold start: 0 orders → returns empty arrays + totalRevenue 0.
// ============================================================================

import { prisma } from '@/lib/prisma';

const LOOKBACK_DAYS = 30;
const EXCLUDED_STATUS = new Set([
  'CANCELLED',
  'CANCEL_REQUESTED',
  'RETURNED',
  'RETURN_REQUESTED',
]);

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface ParetoProduct {
  productId: string;
  productName: string;
  productSku: string;
  naverProductId: string | null;
  revenue: number;
  unitsSold: number;
  /** Rank within the lookback window (1-based). */
  rank: number;
  /** Share of total window revenue (0..1). */
  share: number;
}

export interface ParetoSummary {
  totalRevenue: number;
  totalOrders: number;
  lookbackDays: number;
  paretoSlice: ParetoProduct[];
  topFive: ParetoProduct[];
  paretoShare: number;
  computedAt: string;
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export async function computePareto(): Promise<ParetoSummary> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  // Pull eligible order items in one round trip.
  const items = await prisma.orderItem.findMany({
    where: {
      order: { createdAt: { gte: since }, status: { notIn: Array.from(EXCLUDED_STATUS) } },
    },
    select: {
      productId: true,
      quantity: true,
      price: true,
      product: {
        select: { name: true, sku: true, naverProductId: true },
      },
    },
  });

  const computedAt = new Date().toISOString();

  if (items.length === 0) {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      lookbackDays: LOOKBACK_DAYS,
      paretoSlice: [],
      topFive: [],
      paretoShare: 0,
      computedAt,
    };
  }

  // Aggregate by productId
  const agg = new Map<string, {
    productId: string;
    productName: string;
    productSku: string;
    naverProductId: string | null;
    revenue: number;
    unitsSold: number;
  }>();
  for (const it of items) {
    const key = it.productId;
    const prev = agg.get(key);
    const rev = it.price * it.quantity;
    if (prev) {
      prev.revenue += rev;
      prev.unitsSold += it.quantity;
    } else {
      agg.set(key, {
        productId: it.productId,
        productName: it.product?.name ?? '(unknown)',
        productSku: it.product?.sku ?? '',
        naverProductId: it.product?.naverProductId ?? null,
        revenue: rev,
        unitsSold: it.quantity,
      });
    }
  }

  const sorted = Array.from(agg.values()).sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = sorted.reduce((sum, p) => sum + p.revenue, 0);

  // Pareto slice = top 20% by count (rounded up, min 1)
  const sliceCount = Math.max(1, Math.ceil(sorted.length * 0.2));
  const paretoSliceRaw = sorted.slice(0, sliceCount);

  const paretoSlice: ParetoProduct[] = paretoSliceRaw.map((p, i) => ({
    productId: p.productId,
    productName: p.productName,
    productSku: p.productSku,
    naverProductId: p.naverProductId,
    revenue: p.revenue,
    unitsSold: p.unitsSold,
    rank: i + 1,
    share: totalRevenue > 0 ? p.revenue / totalRevenue : 0,
  }));

  const topFive = paretoSlice.slice(0, 5);
  const paretoShare = paretoSlice.reduce((s, p) => s + p.share, 0);

  return {
    totalRevenue,
    totalOrders: items.length,
    lookbackDays: LOOKBACK_DAYS,
    paretoSlice,
    topFive,
    paretoShare,
    computedAt,
  };
}
