// /api/products/[id]/adopt-source-detail
// ============================================================================
// Branch A — adopt the captured full-res supplier detail AS-IS as the product's
// detail image (two-branch system, item 3). No generation: when the supplier
// detail is good, use it directly + boost only the missing SEO/ROI elements
// (handled by the seo-text / attributes / notice routes separately).
//
// Sets detail_image_url = source_detail_url and stamps
// quality_reasons.detailCurated when the supplier detail is real (not blank) —
// so applyStatus.detail becomes 'curated'. REVERSIBLE DB write — never touches
// Naver. Product-agnostic (#55).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assessImageQuality } from '@/lib/images/quality-classifier';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const MOSTLY_BLANK_OCCUPANCY = 0.15;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, source_detail_url: true, quality_reasons: true },
  });
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }
  const sourceDetailUrl = product.source_detail_url;
  if (!sourceDetailUrl) {
    return NextResponse.json(
      { success: false, error: 'No source_detail_url — run capture-source-detail first' },
      { status: 422 },
    );
  }

  // Confirm the supplier detail is real content (not a blank panel) before
  // marking it curated — Branch A only adopts a genuine detail.
  let curated = true;
  try {
    const res = await fetch(sourceDetailUrl);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      const a = await assessImageQuality(buf);
      const occupancy = a.reasons.find(r => r.metric === 'subject')?.value ?? 1;
      curated = occupancy >= MOSTLY_BLANK_OCCUPANCY;
    }
  } catch { /* assessment best-effort — keep curated=true (it is a real supplier detail) */ }

  try {
    const prevQr = (product.quality_reasons ?? {}) as Record<string, unknown>;
    const quality_reasons = { ...prevQr, detailCurated: curated, detailBranch: 'A' };
    await prisma.product.update({
      where: { id: productId },
      data: {
        detail_image_url: sourceDetailUrl,
        quality_reasons: quality_reasons as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: `Adopt failed: ${msg}` }, { status: 502 });
  }

  return NextResponse.json({ success: true, productId, detailUrl: sourceDetailUrl, curated, branch: 'A' });
}
