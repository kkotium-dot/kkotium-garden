// src/app/api/naver/products/search/route.ts
// ============================================================================
// PRODUCT-LINK PL-1 — GET my Naver store product list (read-only).
//
// Proxies POST /v1/products/search (Spring Page shape) and returns a normalized
// list for the import picker, tagging which items are already linked locally.
// Naver write 0. verify-first (#181): shape/size upper bound confirmed live; add
// ?debug=1 to inspect the raw first page during recon.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { searchProducts } from '@/lib/naver/api-client';

export const dynamic = 'force-dynamic';

interface NormalizedRow {
  channelProductNo: string | null;
  originProductNo: string | null;
  name: string;
  salePrice: number;
  stockQuantity: number;
  statusType: string;
  representativeImageUrl: string | null;
  modifiedDate: string | null;
  alreadyLinked: boolean;
}

function pickImageUrl(cp: any): string | null {
  return (
    cp?.representativeImage?.url ??
    cp?.images?.representativeImage?.url ??
    cp?.representativeImageUrl ??
    (Array.isArray(cp?.images) ? cp.images[0]?.url ?? null : null) ??
    null
  );
}

// Flatten Spring Page contents → one row per channel product.
function normalize(raw: any): NormalizedRow[] {
  const contents: any[] = Array.isArray(raw?.contents) ? raw.contents : [];
  const rows: NormalizedRow[] = [];
  for (const c of contents) {
    const originNo = c?.originProductNo ?? c?.originProduct?.originProductNo ?? null;
    const channels: any[] = Array.isArray(c?.channelProducts) && c.channelProducts.length > 0
      ? c.channelProducts
      : [c]; // fallback: content itself carries the fields
    for (const cp of channels) {
      rows.push({
        channelProductNo: cp?.channelProductNo != null ? String(cp.channelProductNo) : null,
        originProductNo: (cp?.originProductNo ?? originNo) != null ? String(cp?.originProductNo ?? originNo) : null,
        name: cp?.name ?? c?.name ?? '(이름 없음)',
        salePrice: Number(cp?.salePrice ?? c?.salePrice ?? 0),
        stockQuantity: Number(cp?.stockQuantity ?? c?.stockQuantity ?? 0),
        statusType: cp?.statusType ?? cp?.channelProductDisplayStatusType ?? c?.statusType ?? 'UNKNOWN',
        representativeImageUrl: pickImageUrl(cp) ?? pickImageUrl(c),
        modifiedDate: cp?.modifiedDate ?? c?.modifiedDate ?? null,
        alreadyLinked: false,
      });
    }
  }
  return rows;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const size = Math.min(100, Math.max(1, Number(searchParams.get('size') ?? '50') || 50));
  // Accept a comma-separated status list so the connect picker can surface
  // revival candidates (품절/중지), not just SALE. Backward compatible: a single
  // value still works. Empty/blank falls back to SALE.
  const statusParam = searchParams.get('status') ?? 'SALE';
  const productStatusTypes = statusParam.split(',').map((s) => s.trim()).filter(Boolean);
  if (productStatusTypes.length === 0) productStatusTypes.push('SALE');
  const debug = searchParams.get('debug') === '1';

  try {
    const raw = await searchProducts({ page, size, productStatusTypes });
    const items = normalize(raw);

    // Tag already-linked items (naverProductId = originProductNo).
    const originNos = items.map((i) => i.originProductNo).filter((v): v is string => !!v);
    if (originNos.length > 0) {
      const linked = await prisma.product.findMany({
        where: { naverProductId: { in: originNos } },
        select: { naverProductId: true },
      });
      const linkedSet = new Set(linked.map((l) => l.naverProductId));
      for (const it of items) {
        it.alreadyLinked = it.originProductNo ? linkedSet.has(it.originProductNo) : false;
      }
    }

    return NextResponse.json({
      success: true,
      page,
      size,
      total: Number(raw?.totalElements ?? items.length),
      totalPages: Number(raw?.totalPages ?? 1),
      items,
      ...(debug ? { _raw: raw } : {}),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[naver/products/search] failed:', msg);
    return NextResponse.json({ success: false, error: msg, items: [] }, { status: 502 });
  }
}
