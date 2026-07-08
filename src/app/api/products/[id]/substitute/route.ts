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

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
  const map = await readSubstituteInfo([id]);
  return NextResponse.json({ success: true, substitute: map.get(id) ?? null });
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
