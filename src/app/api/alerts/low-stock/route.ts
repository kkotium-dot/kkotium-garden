// /api/alerts/low-stock
// ============================================================================
// Sprint 6-A UI Phase 2: list unresolved low-stock alerts for dashboard widget.
//
// Filters: resolvedAt IS NULL.
// Sort: level priority (red > orange > yellow) DESC, then triggeredAt DESC.
// Limit: 50 (dashboard widget is for triage, not full history).
//
// Each row includes the linked product summary (name, sku, salePrice,
// supplier name, naverProductId, supplier trust flag, latest snapshot qty)
// so the widget can render and route actions without a second round-trip.
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export interface LowStockAlertRow {
  id: string;
  level: 'yellow' | 'orange' | 'red';
  threshold: number;
  currentQty: number;
  statusReason: string | null;
  triggeredAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
    salePrice: number;
    supplierName: string | null;
    naverProductId: string | null;
    supplierProductCode: string | null;
    isTrustworthy: boolean;
    latestQty: number | null;
    latestPolledAt: string | null;
  };
}

// Numeric priority for sort: red highest, then orange, then yellow.
const LEVEL_PRIORITY: Record<string, number> = { red: 3, orange: 2, yellow: 1 };

export async function GET() {
  const alerts = await prisma.lowStockAlert.findMany({
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

  if (alerts.length === 0) {
    return NextResponse.json({ data: [] satisfies LowStockAlertRow[] });
  }

  // Bulk fetch latest snapshot + trust flag for involved products.
  const productIds = alerts.map((a) => a.product.id);
  const productNos = alerts
    .map((a) => a.product.supplier_product_code)
    .filter((n): n is string => !!n);

  const snapshots = await prisma.inventorySnapshot.findMany({
    where: { productId: { in: productIds } },
    orderBy: { polledAt: 'desc' },
    select: { productId: true, qty: true, polledAt: true },
  });
  const latestByProduct = new Map<string, (typeof snapshots)[number]>();
  for (const s of snapshots) {
    if (!latestByProduct.has(s.productId)) latestByProduct.set(s.productId, s);
  }

  const profiles = productNos.length > 0
    ? await prisma.supplierStockProfile.findMany({
        where: { productNo: { in: productNos } },
        select: { productNo: true, isTrustworthy: true },
      })
    : [];
  const trustByProductNo = new Map<string, boolean>();
  for (const p of profiles) trustByProductNo.set(p.productNo, p.isTrustworthy);

  const rows: LowStockAlertRow[] = alerts.map((a) => {
    const snap = latestByProduct.get(a.product.id);
    const trust = a.product.supplier_product_code
      ? trustByProductNo.get(a.product.supplier_product_code) ?? true
      : true;
    return {
      id: a.id,
      level: a.level as 'yellow' | 'orange' | 'red',
      threshold: a.threshold,
      currentQty: a.currentQty,
      statusReason: a.statusReason,
      triggeredAt: a.triggeredAt.toISOString(),
      product: {
        id: a.product.id,
        name: a.product.name,
        sku: a.product.sku,
        salePrice: a.product.salePrice,
        supplierName: a.product.supplier?.name ?? null,
        naverProductId: a.product.naverProductId,
        supplierProductCode: a.product.supplier_product_code,
        isTrustworthy: trust,
        latestQty: snap?.qty ?? null,
        latestPolledAt: snap?.polledAt.toISOString() ?? null,
      },
    };
  });

  // Final sort: level priority DESC, then triggeredAt DESC (already from DB).
  rows.sort((a, b) => {
    const dp = (LEVEL_PRIORITY[b.level] ?? 0) - (LEVEL_PRIORITY[a.level] ?? 0);
    if (dp !== 0) return dp;
    return b.triggeredAt.localeCompare(a.triggeredAt);
  });

  return NextResponse.json({ data: rows });
}
