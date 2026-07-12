// src/app/api/products/linked/route.ts
// ============================================================================
// PRODUCT-LINK PL-1 — linked product list for the "상품 연동" board (zone 2).
//
// Returns app products that carry a naverProductId, each enriched with link
// metadata via the P2022-guarded helper. Before Desktop's ALTER the helper
// returns nothing and resolveLinkDisplay derives safe defaults (source=NATIVE,
// linkStatus from naverProductId). Read-only.
//
// filter: all | active | suspended | zombie (#256 P4 — 판매중/판매중지/좀비발견
// 3버킷으로 정리. 이전 native/imported/conflict/drift 필터는 통합/은퇴).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readLinkFields, resolveLinkDisplay, readSubstituteInfo, hasSubstitutePlan } from '@/lib/product-link';
import { loadTuningScores } from '@/lib/products/tuning-signals';

export const dynamic = 'force-dynamic';

const LIVE_NAVER_STATUS = new Set(['SALE', 'ON_SALE']);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') ?? 'all';
  const q = (searchParams.get('q') ?? '').trim();
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10) || 20));

  // 꽃밭 돌보기 P2 (#256) — 연동+앱등록 통합 목록에 상품번호·상품명 검색.
  const where: Record<string, unknown> = { naverProductId: { not: null } };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { naverProductId: { contains: q } },
      { id: { contains: q } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true, name: true, salePrice: true, supplierPrice: true, naverProductId: true,
      mainImage: true, naver_status_type: true, status: true, updatedAt: true,
      naverCategoryCode: true, category: true, keywords: true, tags: true,
      lastSaleDate: true, supplier_product_code: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 2000,
  });

  const linkMap = await readLinkFields(products.map((p) => p.id));
  // SUBSTITUTE (#210) — per-product stock-out safety net for the row indicator.
  const subMap = await readSubstituteInfo(products.map((p) => p.id));
  // 튜닝 필요도 지수 (#256 P4) — batched, best-effort (#82).
  const tuningMap = await loadTuningScores(products);

  const allRows = products.map((p) => {
    const link = resolveLinkDisplay(p, linkMap.get(p.id));
    const substitute = subMap.get(p.id) ?? null;
    const tuning = tuningMap.get(p.id) ?? null;
    const statusType = p.naver_status_type ?? p.status;
    const isLive = LIVE_NAVER_STATUS.has(p.naver_status_type ?? '') || (!p.naver_status_type && p.status === 'ACTIVE');
    return {
      id: p.id,
      name: p.name,
      salePrice: p.salePrice,
      naverProductId: p.naverProductId,
      channelProductNo: link.channelProductNo,
      representativeImageUrl: p.mainImage,
      statusType,
      isLive,
      source: link.source,
      linkStatus: link.linkStatus,
      syncState: link.syncState,
      driftFields: link.driftFields,
      lastSyncedAt: link.lastSyncedAt,
      naverModifiedAt: link.naverModifiedAt,
      substituteInfo: substitute,
      hasSubstitute: hasSubstitutePlan(substitute),
      tuningScore: tuning?.score ?? null,
      tuningTier: tuning?.tier ?? null,
      isZombie: tuning?.isZombie ?? false,
      zombieReason: tuning?.zombieReason ?? null,
    };
  });

  const counts = {
    all: allRows.length,
    active: allRows.filter((r) => r.isLive).length,
    suspended: allRows.filter((r) => !r.isLive).length,
    zombie: allRows.filter((r) => r.isZombie).length,
    // PL-5a — 필터 pill은 아니지만(#256 §3 정리 대상 아님) 동기화 배너가 여전히 참조.
    drift: allRows.filter((r) => r.syncState === 'DRIFT').length,
  };

  let rows = allRows;
  if (filter === 'active')    rows = allRows.filter((r) => r.isLive);
  if (filter === 'suspended') rows = allRows.filter((r) => !r.isLive);
  if (filter === 'zombie')    rows = allRows.filter((r) => r.isZombie);

  // 서버 페이지네이션 (#256 §2) — 수백 개 대비, 클라이언트에는 현재 페이지분만 전달.
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize);

  return NextResponse.json({
    success: true, filter, q, page: safePage, pageSize, total, totalPages,
    count: paged.length, counts, items: paged,
  });
}
