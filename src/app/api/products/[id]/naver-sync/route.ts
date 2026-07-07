// src/app/api/products/[id]/naver-sync/route.ts
// ============================================================================
// PRODUCT-LINK PL-1 — read-only diff: Naver current value vs app value.
//
// Reuses diffNaverProduct (GET-only). PL-1 is display only — no resolve button.
// Stock is shown as the Naver value (SoR = Naver, #197). Naver write 0.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { diffNaverProduct } from '@/lib/naver/api-client';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: {
      id: true, name: true, salePrice: true, naverProductId: true,
      mainImage: true, naver_status_type: true, status: true,
    },
  });
  if (!product) {
    return NextResponse.json({ success: false, error: '상품을 찾을 수 없습니다.' }, { status: 404 });
  }
  if (!product.naverProductId) {
    return NextResponse.json(
      { success: false, error: '네이버에 연동되지 않은 상품입니다.' },
      { status: 400 },
    );
  }

  try {
    const diff = await diffNaverProduct(product.naverProductId, {
      name: product.name,
      salePrice: product.salePrice,
      statusType: product.naver_status_type ?? undefined,
      representativeImageUrl: product.mainImage ?? undefined,
    });
    return NextResponse.json({
      success: true,
      inSync: diff.inSync,
      diffs: diff.diffs,
      naverSnapshot: diff.naverSnapshot,
      app: {
        name: product.name,
        salePrice: product.salePrice,
        statusType: product.naver_status_type,
        representativeImageUrl: product.mainImage,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '알 수 없는 오류';
    console.error('[products/naver-sync] failed:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
