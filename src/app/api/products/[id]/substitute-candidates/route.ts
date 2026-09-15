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

// SUBSTITUTE_CANDIDATE_STATUS_FIX_2026-09-15 (원본메모: "품절 안전망에서
// 앱상품 검색이 아무것도 안 됨") — 근본원인 확정: 이전엔 ACTIVE/READY(발행
// 완료 상품)만 검색 대상이었는데, DB 실측 결과 전체 28개 중 21개(75%)가
// DRAFT(정원창고, 미발행)라 대부분의 상품이 검색에서 완전히 제외되고
// 있었다. DOMAIN_FACTS.md의 대체소싱(RESOURCE) 개념상 대체 상품은
// "이미 발행돼 있어야" 하는 게 아니라 — 오히려 정원창고에 미리 준비해둔
// 후보를 품절 시 빠르게 승격시키는 게 자연스러운 실무 흐름이다. 발행
// 여부와 무관하게 검색 가능하게 하되, INACTIVE(비활성/삭제 처리)만 제외
// (대체 후보로 죽은 상품을 연결하면 안 되므로 이것만은 유지).
const EXCLUDED_STATUS = ['INACTIVE'];

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
        status: { notIn: EXCLUDED_STATUS },
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
      status: { notIn: EXCLUDED_STATUS },
    },
    select: { id: true, name: true, salePrice: true, mainImage: true, naver_status_type: true, status: true },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });
  return NextResponse.json({ success: true, items });
}
