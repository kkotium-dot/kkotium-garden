// /api/products/[id]/apply-detail
// ============================================================================
// Apply a built detail page as the product's detail image (Track 2 — detail
// page builder). The operator previews the generated detail in the studio
// (DetailPageCard) and confirms "이 상세로 적용"; this uploads that exact PNG to
// the app's automation storage (product-assets) and sets detail_image_url.
//
// REVERSIBLE DB write only — never touches Naver. The new URL is in the curated
// bucket, so applyStatus.detail becomes 'curated' (a proper app-made detail,
// not a supplier-original passthrough). The publish builder reads
// detail_image_url, so the next register/update PUT uses the built detail.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadAutomationAsset } from '@/lib/storage/automation-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

interface Body {
  base64?: string;       // the previewed detail PNG (DetailResult.detailBase64)
  skeletonId?: string;   // for the storage variant label (audit trail)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;

  let body: Body = {};
  try { body = await req.json(); } catch { /* validated below */ }

  if (!body.base64 || body.base64.length < 32) {
    return NextResponse.json({ success: false, error: 'base64 detail image is required' }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    // Accept a raw base64 or a data: URL.
    const raw = body.base64.includes(',') ? body.base64.split(',')[1] : body.base64;
    buffer = Buffer.from(raw, 'base64');
    if (buffer.length < 64) throw new Error('decoded image too small');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: `Invalid base64: ${msg}` }, { status: 400 });
  }

  // sanitize the variant label (storage path segment) — alnum/dash only.
  const variant = (body.skeletonId ?? 'built').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 24) || 'built';

  let detailUrl: string;
  try {
    const uploaded = await uploadAutomationAsset({
      productId,
      kind: 'detail',
      variant,
      buffer,
      contentType: 'image/png',
    });
    detailUrl = uploaded.publicUrl;
    await prisma.product.update({
      where: { id: productId },
      data: { detail_image_url: detailUrl },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: `Apply failed: ${msg}`, stage: 'APPLY' }, { status: 502 });
  }

  return NextResponse.json({ success: true, productId, detailUrl, applied: true });
}
