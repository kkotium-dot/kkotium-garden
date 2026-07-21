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
import { countLeadingNegatives, isSourceGoneFromCount } from '@/lib/products/source-gone';

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
  // 공급처 단절(소싱처 소멸) 신호. qty=-1(조회 실패 센티널·#260)이 최근 연속
  // SOURCE_GONE_MIN회 이상 지속되면 일시적 폴링 실패가 아니라 공급사가 도매꾹에서
  // 상품을 내린 것으로 판정한다(#270 실측 근거: 파서 정상화 후 살아있는 상품은
  // 다음 폴에서 실재고로 복구되지만, 하차된 상품은 -1이 무한 지속). 전상품 범용(#55).
  sourceGone: boolean;
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

  // 공급처 단절 판정은 source-gone.ts가 단일 권위(#271/#62) — 임계값·계산을
  // 여기서 재구현하지 않는다. snapshots는 이미 polledAt desc 정렬.
  const consecutiveNeg1 = countLeadingNegatives(snapshots);

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
      sourceGone: isSourceGoneFromCount(consecutiveNeg1.get(product.id)),
    };
  }

  return NextResponse.json({ data });
}
