// /api/alerts/price-movements
// ============================================================================
// Sprint 6-B (Session E-2 Phase 3): list unresolved price movement alerts
// for the dashboard Inbox widget.
//
// Filters: resolvedAt IS NULL.
// Sort: level priority (red > orange > yellow) DESC, then triggeredAt DESC.
// Limit: 50 (dashboard widget is for triage, not full history).
//
// Each row includes the linked product summary so the Inbox row can render
// without a second round-trip.
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export interface PriceMovementAlertRow {
  id: string;
  level: 'yellow' | 'orange' | 'red';
  direction: 'up' | 'down';
  baselinePrice: number;
  currentPrice: number;
  deltaPct: number;
  reason: string | null;
  triggeredAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
    salePrice: number;
    supplierName: string | null;
    naverProductId: string | null;
    supplierProductCode: string | null;
  };
}

const LEVEL_PRIORITY: Record<string, number> = { red: 3, orange: 2, yellow: 1 };

export async function GET() {
  const alerts = await prisma.priceMovementAlert.findMany({
    where: { resolvedAt: null },
    orderBy: { triggeredAt: 'desc' },
    take: 50,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          salePrice: true,
          naverProductId: true,
          supplier_product_code: true,
          supplier: { select: { name: true } },
        },
      },
    },
  });

  const rows: PriceMovementAlertRow[] = alerts.map((a) => ({
    id: a.id,
    level: a.level as 'yellow' | 'orange' | 'red',
    direction: a.direction as 'up' | 'down',
    baselinePrice: a.baselinePrice,
    currentPrice: a.currentPrice,
    deltaPct: a.deltaPct,
    reason: a.reason,
    triggeredAt: a.triggeredAt.toISOString(),
    product: {
      id: a.product.id,
      name: a.product.name,
      sku: a.product.sku,
      salePrice: a.product.salePrice,
      supplierName: a.product.supplier?.name ?? null,
      naverProductId: a.product.naverProductId,
      supplierProductCode: a.product.supplier_product_code,
    },
  }));

  // Sort by level priority then triggeredAt
  rows.sort((a, b) => {
    const lp = (LEVEL_PRIORITY[b.level] ?? 0) - (LEVEL_PRIORITY[a.level] ?? 0);
    if (lp !== 0) return lp;
    return b.triggeredAt.localeCompare(a.triggeredAt);
  });

  return NextResponse.json({ data: rows });
}
