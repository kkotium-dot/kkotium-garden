// /api/products/inventory-badges
// ============================================================================
// Sprint 6-A UI: Returns latest inventory snapshot + open alert + trustworthiness
// for every product that has supplier_product_code set (DMM mapping).
//
// Used by the garden warehouse (/products) for inline stock badges.
// Self-contained: one bulk query per table, in-memory grouping (no N+1).
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export interface InventoryBadgeData {
  productId: string;
  productNo: string;
  qty: number;
  status: string;
  minq: number;
  isTrustworthy: boolean;
  polledAt: string;
  alertLevel: 'yellow' | 'orange' | 'red' | null;
  alertThreshold: number | null;
}

export async function GET() {
  // 1. Products with supplier_product_code (= DMM productNo mapped)
  const products = await prisma.product.findMany({
    where: { supplier_product_code: { not: null } },
    select: { id: true, supplier_product_code: true },
  });

  const productIds = products.map((p) => p.id);
  const productNos = products
    .map((p) => p.supplier_product_code)
    .filter((n): n is string => !!n);

  if (productIds.length === 0) {
    return NextResponse.json({ data: {} satisfies Record<string, InventoryBadgeData> });
  }

  // 2. Latest snapshot per product (single bulk query, in-memory dedup by productId)
  const snapshots = await prisma.inventorySnapshot.findMany({
    where: { productId: { in: productIds } },
    orderBy: { polledAt: 'desc' },
    select: {
      productId: true,
      productNo: true,
      qty: true,
      status: true,
      minq: true,
      polledAt: true,
    },
  });
  const snapshotByProduct = new Map<string, (typeof snapshots)[number]>();
  for (const s of snapshots) {
    if (!snapshotByProduct.has(s.productId)) snapshotByProduct.set(s.productId, s);
  }

  // 3. Open alerts (resolvedAt IS NULL) per product
  const openAlerts = await prisma.lowStockAlert.findMany({
    where: { productId: { in: productIds }, resolvedAt: null },
    orderBy: { triggeredAt: 'desc' },
    select: { productId: true, level: true, threshold: true },
  });
  const alertByProduct = new Map<string, (typeof openAlerts)[number]>();
  for (const a of openAlerts) {
    if (!alertByProduct.has(a.productId)) alertByProduct.set(a.productId, a);
  }

  // 4. Trustworthiness from supplier_stock_profiles (keyed by productNo)
  const profiles = await prisma.supplierStockProfile.findMany({
    where: { productNo: { in: productNos } },
    select: { productNo: true, isTrustworthy: true },
  });
  const trustByProductNo = new Map<string, boolean>();
  for (const p of profiles) trustByProductNo.set(p.productNo, p.isTrustworthy);

  // 5. Compose response (only include products that have a snapshot)
  const data: Record<string, InventoryBadgeData> = {};
  for (const product of products) {
    const snap = snapshotByProduct.get(product.id);
    if (!snap) continue;

    const alert = alertByProduct.get(product.id);
    const level = (alert?.level as 'yellow' | 'orange' | 'red' | undefined) ?? null;

    data[product.id] = {
      productId: product.id,
      productNo: snap.productNo,
      qty: snap.qty,
      status: snap.status ?? 'unknown',
      minq: snap.minq,
      isTrustworthy: trustByProductNo.get(snap.productNo) ?? true,
      polledAt: snap.polledAt.toISOString(),
      alertLevel: level === 'yellow' || level === 'orange' || level === 'red' ? level : null,
      alertThreshold: alert?.threshold ?? null,
    };
  }

  return NextResponse.json({ data });
}
