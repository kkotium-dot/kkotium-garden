// /api/products/[id]/thumbnail-assess
// ============================================================================
// C19 (#56, P1) — operator assessment of the representative image (대표이미지).
//   POST   — the operator ATTESTS the representative meets Naver's 대표이미지
//            policy (single product, no on-image text, no promo/price/border
//            overlays). Stamps Product.thumbnail_assessed_at/_by; the
//            publish-readiness gate then injects the attested-pass signals and
//            flips thumbnailAssessed -> true (and thumbnailPass).
//   DELETE — clears the assessment (operator re-edits / un-approves).
//
// REVERSIBLE (DB columns only), never touches Naver (#37/#38). Guarded: a
// not-yet-migrated column returns 503 (apply MIGRATION_c19_thumbnail_assess).
// Body (POST, optional): { by?: string }  (defaults to 'operator').
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setThumbnailAssessed, clearThumbnailAssessed } from '@/lib/automation/thumbnail-assessment';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MIGRATION_PENDING = {
  success: false,
  error: 'thumbnail_assessed_* columns not migrated yet (apply MIGRATION_c19_thumbnail_assess)',
  stage: 'MIGRATION_PENDING',
} as const;

async function ensureProduct(productId: string): Promise<boolean> {
  const p = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  return !!p;
}

interface Body {
  by?: string;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;
  if (!(await ensureProduct(productId))) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  let body: Body = {};
  try { body = await req.json(); } catch { /* empty body → default operator */ }
  const by = (body.by ?? '').trim() || 'operator';

  const r = await setThumbnailAssessed(productId, by);
  if (r === 'migration_pending') {
    return NextResponse.json(MIGRATION_PENDING, { status: 503 });
  }
  return NextResponse.json({ success: true, productId, thumbnailAssessed: true, assessedBy: by });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;
  if (!(await ensureProduct(productId))) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  const r = await clearThumbnailAssessed(productId);
  if (r === 'migration_pending') {
    return NextResponse.json(MIGRATION_PENDING, { status: 503 });
  }
  return NextResponse.json({ success: true, productId, thumbnailAssessed: false });
}
