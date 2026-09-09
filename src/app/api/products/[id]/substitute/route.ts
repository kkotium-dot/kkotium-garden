// src/app/api/products/[id]/substitute/route.ts
// ============================================================================
// SUBSTITUTE (#210, SUBSTITUTE_STOCKOUT_SPEC) — read/write a product's stock-out
// safety net (Product.substitute_info jsonb). App-side input only, no Naver write.
//   GET → { success, substitute }
//   PUT → persist the SubstituteInfo body, returns the normalized result.
// Used by the shared SubstituteEditor (products/link zone 3 + SEED).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { readSubstituteInfo, writeSubstituteInfo, normalizeSubstituteInfo } from '@/lib/product-link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
  const map = await readSubstituteInfo([id]);
  // B13 — 옵션별 매칭 섹션은 이 상품의 optionValues가 있을 때만 노출한다.
  // SubstituteEditor는 자기완결(#3-1 "Self-contained: loads via GET")이라
  // 별도 API 추가 없이 이 GET에 얹어 내려준다.
  let optionName: string | null = null;
  let optionValues: string[] = [];
  try {
    const p = await prisma.product.findUnique({
      where: { id },
      select: { optionName: true, optionValues: true },
    });
    optionName = p?.optionName ?? null;
    optionValues = Array.isArray(p?.optionValues)
      ? (p!.optionValues as unknown[]).filter((v): v is string => typeof v === 'string')
      : [];
  } catch {
    // best-effort — 옵션 정보가 없어도 대체상품 편집 자체는 막지 않는다.
  }
  return NextResponse.json({ success: true, substitute: map.get(id) ?? null, optionName, optionValues });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'invalid JSON body' }, { status: 400 });
  }
  const info = normalizeSubstituteInfo(body);
  const ok = await writeSubstituteInfo(id, info);
  if (!ok) {
    return NextResponse.json({ success: false, error: 'substitute_info column unavailable' }, { status: 503 });
  }
  return NextResponse.json({ success: true, substitute: info });
}
