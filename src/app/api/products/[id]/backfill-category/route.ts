// src/app/api/products/[id]/backfill-category/route.ts
// ============================================================================
// IMPORTED_PRODUCT_DATA_GAPS_2026-09-06 §Code 인계(B) — naverCategoryCode 백필.
//
// 역import 상품(source=IMPORTED)은 초기 import route가 naverCategoryCode를
// 안 채운 채 들어온 경우가 있다(발행 6개 중 5개 실측 확인). 네이버엔 실제
// 카테고리가 있으므로(발행돼 판매중) getProduct(GET)으로 가져와 채운다.
//
// applyNaverStateDefense(naver/products/update/route.ts)는 "수정 시 덮어쓰기
// 방지"일 뿐 능동 백필이 아니다 — 이 라우트가 그 개입점. leafCategoryId가
// 유효(6~10자리 숫자, VALID_LEAF_CATEGORY_ID와 동일 규칙)하지 않으면 절대
// 쓰지 않는다(#231 정직 — 억지로 빈 값/무효 값을 채우지 않음).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProduct } from '@/lib/naver/api-client';

export const dynamic = 'force-dynamic';

// naver/products/update/route.ts VALID_LEAF_CATEGORY_ID와 동일 규칙(#62).
const VALID_LEAF_CATEGORY_ID = /^\d{6,10}$/;

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { id: true, naverProductId: true, naverCategoryCode: true },
    });
    if (!product) {
      return NextResponse.json({ success: false, error: '상품을 찾을 수 없습니다.' }, { status: 404 });
    }
    if (!product.naverProductId) {
      return NextResponse.json({ success: false, error: '네이버 미발행 상품입니다 — 가져올 카테고리가 없습니다.' }, { status: 400 });
    }
    if (product.naverCategoryCode) {
      return NextResponse.json({ success: true, matched: true, code: product.naverCategoryCode, source: 'already_set' });
    }

    let raw: any;
    try {
      raw = await getProduct(product.naverProductId);
    } catch (getErr) {
      // 네이버 GET 실패(#231 정직) — 억지로 채우지 않고 명확한 실패 사유를 준다.
      return NextResponse.json({
        success: true, matched: false, code: null,
        error: '네이버에서 못 가져옴 — 수동 확인 필요',
      });
    }

    const leafCategoryId = raw?.originProduct?.leafCategoryId;
    const code = typeof leafCategoryId === 'string'
      ? leafCategoryId
      : typeof leafCategoryId === 'number' ? String(leafCategoryId) : '';

    if (!VALID_LEAF_CATEGORY_ID.test(code)) {
      return NextResponse.json({ success: true, matched: false, code: null, error: '네이버에서 못 가져옴 — 수동 확인 필요' });
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { naverCategoryCode: code },
    });

    return NextResponse.json({ success: true, matched: true, code, source: 'naver_get' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
