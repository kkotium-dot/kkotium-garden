// /api/products/[id]/assess-quality
// ============================================================================
// QUALITY_ASSESS execution. Phase 3, handoff task 2/3.
//   POST — runs the quantitative classifier on the product's candidate image and
//          writes quality_score + recommended_mode + quality_reasons. DB-only;
//          never touches Naver. Optional body { imageUrl } overrides which image
//          to assess (default: representative candidate from the product row).
//
// Fetches an already-stored asset (Supabase/Cloudinary) — NOT an external image
// API (#38 is about runtime image-generation calls; reading a stored asset to
// analyze it is the same as the thumbnail route). Node runtime (Sharp).
//
// Migration-safe: Phase 3 columns absent (P2021/P2022) → { migrationPending }.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assessImageQuality } from '@/lib/images/quality-classifier';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isMissingColumn(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  const msg = e instanceof Error ? e.message : String(e);
  return code === 'P2021' || code === 'P2022' || /does not exist|column .* does not exist/i.test(msg);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;

  let body: { imageUrl?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — fall back to the product's stored image.
  }

  let product: {
    id: string;
    main_image_url: string | null;
    detail_image_url: string | null;
    mainImage: string | null;
    images: string[];
  } | null;
  try {
    product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, main_image_url: true, detail_image_url: true, mainImage: true, images: true },
    });
  } catch (e) {
    if (isMissingColumn(e)) {
      return NextResponse.json({ success: false, migrationPending: true }, { status: 503 });
    }
    throw e;
  }
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  const url =
    body.imageUrl ||
    product.main_image_url ||
    product.mainImage ||
    product.detail_image_url ||
    (product.images && product.images[0]) ||
    null;
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json(
      { success: false, error: 'No assessable image URL (http/https) on this product' },
      { status: 422 },
    );
  }

  // Fetch the stored asset → Buffer.
  let buffer: Buffer;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Image fetch failed (${res.status})`, url },
        { status: 502 },
      );
    }
    buffer = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: `Image fetch error: ${msg}`, url }, { status: 502 });
  }

  // Score it.
  const assessment = await assessImageQuality(buffer);

  // Persist. quality_reasons carries the per-metric breakdown + provenance.
  const quality_reasons = {
    modeSource: 'auto',
    score: assessment.score,
    needsVlm: assessment.needsVlm,
    assessedImage: url,
    metrics: assessment.reasons,
    meta: assessment.meta,
  };

  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        quality_score: assessment.score,
        recommended_mode: assessment.recommendedMode,
        quality_reasons: quality_reasons as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    if (isMissingColumn(e)) {
      return NextResponse.json({ success: false, migrationPending: true }, { status: 503 });
    }
    throw e;
  }

  return NextResponse.json({
    success: true,
    productId,
    score: assessment.score,
    recommendedMode: assessment.recommendedMode,
    needsVlm: assessment.needsVlm,
    reasons: assessment.reasons,
  });
}
