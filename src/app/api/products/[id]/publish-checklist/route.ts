// src/app/api/products/[id]/publish-checklist/route.ts
//
// 2026-07-10 — Publish-readiness SURFACE endpoint (spec: PUBLISH_READINESS_
//   SURFACE_SPEC_2026-07-10, 원칙 #240). Returns the STRUCTURED 8-item gate
//   verdict (getPublishReadiness) so the product-detail checklist can show which
//   requirements pass / fail / na ahead of a publish attempt. Read-only.
//
// Named `publish-checklist` (not `publish-readiness`) so the pre-existing
// `/publish-readiness` SEO-eval contract stays untouched. Shares the register/
// update loader (loadNaverUpdateContext) so the checklist reflects the SAME
// LocalProduct + shipping/address context the irreversible PUT would build.

import { NextResponse } from 'next/server';
import { loadNaverUpdateContext } from '@/lib/naver/load-update-context';
import { getPublishReadiness } from '@/lib/naver/publish-readiness';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const productId = params.id;
  if (!productId) {
    return NextResponse.json({ success: false, error: 'product id required' }, { status: 400 });
  }

  try {
    const ctx = await loadNaverUpdateContext(productId);
    if (!ctx) {
      return NextResponse.json({ success: false, error: 'product not found' }, { status: 404 });
    }

    const registered = !!ctx.dbProduct.naverProductId;
    const readiness = getPublishReadiness(ctx.product, ctx.hasShippingTemplate, !!ctx.addresses, {
      registered,
      statusType: ctx.dbProduct.naver_status_type ?? null,
    });

    return NextResponse.json({ success: true, registered, readiness });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
