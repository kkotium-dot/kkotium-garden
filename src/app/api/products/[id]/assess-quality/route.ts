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
import { assessImageQuality, deriveImageTier, type QualityAssessment } from '@/lib/images/quality-classifier';

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

  // Source-aware (item 3): assess the supplier REPRESENTATIVE and the DETAIL
  // page separately so the strategy tier can branch by source.
  // 2026-06-07 fix (#46): the representative MUST be the field the publish
  // builder sends as representativeImage = product.mainImage (Cloudinary), NOT
  // main_image_url (legacy thumb-clean). Assessing the wrong image produced an
  // untrustworthy tier. Prefer mainImage; main_image_url is a fallback only.
  const repUrl = body.imageUrl || product.mainImage || product.main_image_url || null;
  const detailUrl = product.detail_image_url || null;
  const fallbackUrl = repUrl || detailUrl || (product.images && product.images[0]) || null;
  if (!fallbackUrl || !/^https?:\/\//i.test(fallbackUrl)) {
    return NextResponse.json(
      { success: false, error: 'No assessable image URL (http/https) on this product' },
      { status: 422 },
    );
  }

  // Fetch + assess one stored asset → QualityAssessment (null on fetch failure).
  async function fetchAndAssess(u: string | null): Promise<{ url: string; assessment: QualityAssessment } | null> {
    if (!u || !/^https?:\/\//i.test(u)) return null;
    try {
      const res = await fetch(u);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return { url: u, assessment: await assessImageQuality(buf) };
    } catch {
      return null;
    }
  }

  const rep = await fetchAndAssess(repUrl);
  // Avoid a duplicate fetch when detail === rep (some products share the URL).
  const detail = detailUrl && detailUrl !== repUrl ? await fetchAndAssess(detailUrl) : null;

  // Primary assessment drives the legacy score/mode (representative first).
  const primary = rep ?? detail ?? (await fetchAndAssess(fallbackUrl));
  if (!primary) {
    return NextResponse.json(
      { success: false, error: 'Image fetch failed for all candidate URLs', repUrl, detailUrl },
      { status: 502 },
    );
  }
  const assessment = primary.assessment;

  // Image strategy tier (T0..T3) from the representative + detail assessments.
  const strategy = deriveImageTier(rep?.assessment ?? null, detail?.assessment ?? null);

  // Persist. quality_reasons carries the per-metric breakdown + provenance +
  // the image strategy. Deep plain-clone via JSON round-trip → serializable.
  const quality_reasons = JSON.parse(JSON.stringify({
    modeSource: 'auto',
    score: assessment.score,
    needsVlm: assessment.needsVlm,
    assessedImage: primary.url,
    metrics: assessment.reasons,
    meta: assessment.meta,
    // item 3 — image strategy tier + per-source scores.
    imageTier: strategy.tier,
    imageStrategy: strategy,
    sources: {
      representative: rep ? { url: rep.url, score: rep.assessment.score } : null,
      detail: detail ? { url: detail.url, score: detail.assessment.score } : null,
    },
  }));

  let storedReasonsCount = 0;
  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        quality_score: assessment.score,
        recommended_mode: assessment.recommendedMode,
        quality_reasons: quality_reasons as Prisma.InputJsonValue,
      },
    });
    // Read-back self-verify (#46): prove quality_reasons actually persisted, so
    // the caller gets a definitive signal instead of trusting the write blindly.
    const after = await prisma.product.findUnique({
      where: { id: productId },
      select: { quality_reasons: true },
    });
    const stored = (after?.quality_reasons ?? null) as { metrics?: unknown[] } | null;
    storedReasonsCount = Array.isArray(stored?.metrics) ? stored.metrics.length : 0;
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
    imageTier: strategy.tier,
    imageStrategy: strategy,
    sources: {
      representative: rep ? { url: rep.url, score: rep.assessment.score } : null,
      detail: detail ? { url: detail.url, score: detail.assessment.score } : null,
    },
    // Self-verify: persisted=true means the metrics array round-tripped to the DB.
    persisted: storedReasonsCount === assessment.reasons.length,
    storedReasonsCount,
  });
}
