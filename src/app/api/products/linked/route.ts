// src/app/api/products/linked/route.ts
// ============================================================================
// PRODUCT-LINK PL-1 — linked product list for the "상품 연동" board (zone 2).
//
// Returns app products that carry a naverProductId, each enriched with link
// metadata via the P2022-guarded helper. Before Desktop's ALTER the helper
// returns nothing and resolveLinkDisplay derives safe defaults (source=NATIVE,
// linkStatus from naverProductId). Read-only.
//
// filter: all | native | imported | conflict
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readLinkFields, resolveLinkDisplay, readSubstituteInfo, hasSubstitutePlan } from '@/lib/product-link';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') ?? 'all';

  const products = await prisma.product.findMany({
    where: { naverProductId: { not: null } },
    select: {
      id: true, name: true, salePrice: true, naverProductId: true,
      mainImage: true, naver_status_type: true, status: true, updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 500,
  });

  const linkMap = await readLinkFields(products.map((p) => p.id));
  // SUBSTITUTE (#210) — per-product stock-out safety net for the row indicator.
  const subMap = await readSubstituteInfo(products.map((p) => p.id));

  const allRows = products.map((p) => {
    const link = resolveLinkDisplay(p, linkMap.get(p.id));
    const substitute = subMap.get(p.id) ?? null;
    return {
      id: p.id,
      name: p.name,
      salePrice: p.salePrice,
      naverProductId: p.naverProductId,
      channelProductNo: link.channelProductNo,
      representativeImageUrl: p.mainImage,
      statusType: p.naver_status_type ?? p.status,
      source: link.source,
      linkStatus: link.linkStatus,
      syncState: link.syncState,
      driftFields: link.driftFields,
      lastSyncedAt: link.lastSyncedAt,
      naverModifiedAt: link.naverModifiedAt,
      substituteInfo: substitute,
      hasSubstitute: hasSubstitutePlan(substitute),
    };
  });

  const counts = {
    all: allRows.length,
    native: allRows.filter((r) => r.source === 'NATIVE').length,
    imported: allRows.filter((r) => r.source === 'IMPORTED').length,
    conflict: allRows.filter((r) => r.syncState === 'CONFLICT').length,
    // PL-5a — products whose last drift-scan found app-SoR fields out of sync.
    drift: allRows.filter((r) => r.syncState === 'DRIFT').length,
  };

  let rows = allRows;
  if (filter === 'native')   rows = allRows.filter((r) => r.source === 'NATIVE');
  if (filter === 'imported') rows = allRows.filter((r) => r.source === 'IMPORTED');
  if (filter === 'conflict') rows = allRows.filter((r) => r.syncState === 'CONFLICT');
  if (filter === 'drift')    rows = allRows.filter((r) => r.syncState === 'DRIFT');

  return NextResponse.json({ success: true, filter, count: rows.length, counts, items: rows });
}
