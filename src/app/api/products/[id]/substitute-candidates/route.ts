// src/app/api/products/[id]/substitute-candidates/route.ts
// ============================================================================
// SUBSTITUTE (#210 확장, #256 P4-5) — 대체상품 후보 조회. SubstituteEditor의
// 3가지 입력 방식 중 ⓐ 앱 상품 선택(mode=search) / ⓒ 카테고리 자동추천
// (mode=category)을 뒷받침한다. ⓑ 도매매 코드는 이미 sourcingCode 자유입력
// 필드로 존재(신규 불요). Read-only, Naver 무접촉.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 대체 후보는 "지금 팔 수 있는 상품"만 — 품절/작성중/비활성은 제외.
const SELLABLE_STATUS = ['ACTIVE', 'READY'];

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') === 'category' ? 'category' : 'search';
  const q = (searchParams.get('q') ?? '').trim();

  if (mode === 'search') {
    if (q.length < 1) return NextResponse.json({ success: true, items: [] });
    const items = await prisma.product.findMany({
      where: {
        id: { not: id },
        status: { in: SELLABLE_STATUS },
        name: { contains: q, mode: 'insensitive' },
      },
      select: { id: true, name: true, salePrice: true, mainImage: true, naver_status_type: true, status: true },
      orderBy: { updatedAt: 'desc' },
      take: 8,
    });
    return NextResponse.json({ success: true, items });
  }

  // mode === 'category' — 같은 카테고리 자동추천 (#211 체크리스트 §1 "같은 카테고리"와 정합).
  const self = await prisma.product.findUnique({
    where: { id },
    select: { naverCategoryCode: true },
  });
  if (!self?.naverCategoryCode) return NextResponse.json({ success: true, items: [] });

  const items = await prisma.product.findMany({
    where: {
      id: { not: id },
      naverCategoryCode: self.naverCategoryCode,
      status: { in: SELLABLE_STATUS },
    },
    select: { id: true, name: true, salePrice: true, mainImage: true, naver_status_type: true, status: true },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });
  return NextResponse.json({ success: true, items });
}
