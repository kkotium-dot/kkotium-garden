// src/app/api/products/[id]/generate-detail/route.ts
//
// Sprint 7-M2 Phase 3-A — POST /api/products/[id]/generate-detail
//
// Composes the full 5-section detail page for a Product. Resolves the
// ConceptTone from the most recent Diagnosis row, runs the skeleton
// matcher (or honors the overrideSkeletonId), then dispatches each
// section id to its dedicated renderer via section-builder.buildDetailPage.
//
// Response: JSON with base64-encoded PNG buffer + per-section metadata.
// The caller (Studio UI at /studio) uploads to Supabase Storage via the
// follow-up POST /api/products/[id]/save-assets.
//
// Notes
//   - runtime = 'nodejs' is mandatory: Sharp requires Node runtime.
//   - dynamic = 'force-dynamic' per workrule #11.
//   - No Korean strings in this route (workrule #29).

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildDetailPage } from '@/lib/automation/section-builder';
import type {
  ConceptTone,
  SkeletonId,
} from '@/lib/diagnosis/concept-tone-inference';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GenerateDetailBody {
  /** Designer 1-click skeleton swap. Bypasses skeleton-matcher when present. */
  overrideSkeletonId?: SkeletonId;
  /** Optional lifestyle backdrop URL (passed into SectionRenderContext). */
  lifestyleAssetUrl?: string;
  /** Optional brand name override (defaults to Product.brand). */
  brandName?: string;
  /** Optional highlight phrase ("4종 세트", "한정", etc). */
  highlight?: string;
}

function jsonError(message: string, status: number, detail?: unknown) {
  return NextResponse.json(
    { ok: false, error: message, detail: detail ?? null },
    { status },
  );
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const productId = params.id;
  if (!productId) {
    return jsonError('product id required', 400);
  }

  let body: GenerateDetailBody = {};
  try {
    const raw = await req.text();
    body = raw.length > 0 ? (JSON.parse(raw) as GenerateDetailBody) : {};
  } catch (err) {
    return jsonError('invalid JSON body', 400, String(err));
  }

  // Fetch product
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      mainImage: true,
      category: true,
      brand: true,
      supplierPrice: true,
    },
  });
  if (!product) {
    return jsonError('product not found', 404, { productId });
  }
  if (!product.mainImage) {
    return jsonError('product mainImage missing', 422, { productId });
  }

  // Fetch latest Diagnosis (for ConceptTone). Skip when overrideSkeletonId
  // is provided — buildDetailPage will use the override directly.
  let conceptTone: ConceptTone | undefined;
  if (!body.overrideSkeletonId) {
    const diag = await prisma.diagnosis.findUnique({
      where: { productId },
      select: { conceptTone: true, skeletonId: true },
    });
    if (!diag) {
      return jsonError(
        'no diagnosis row (call POST /api/diagnose first or supply overrideSkeletonId)',
        422,
        { productId },
      );
    }
    conceptTone = diag.conceptTone as unknown as ConceptTone;
  }

  // Determine sale price from a saved field if available — Product table
  // stores supplierPrice; salePrice is derived elsewhere (margin builder).
  // For now we pass supplierPrice into both supplierPrice and salePrice
  // slots since renderers only use them for KFTC disclosure context.
  try {
    const result = await buildDetailPage({
      productName: product.name,
      supplierPrice: product.supplierPrice,
      category: product.category ?? undefined,
      sourceImageUrl: product.mainImage,
      lifestyleAssetUrl: body.lifestyleAssetUrl,
      highlight: body.highlight,
      brandName: body.brandName ?? product.brand,
      conceptTone,
      overrideSkeletonId: body.overrideSkeletonId,
    });

    return NextResponse.json({
      ok: true,
      skeletonId: result.skeletonId,
      matchScore: result.matchScore,
      matchAmbiguous: result.matchAmbiguous,
      sections: result.sections.map((s) => ({
        sectionId: s.sectionId,
        dedicated: s.dedicated,
        height: s.height,
        offsetY: s.offsetY,
        copyFiltered: s.copyFiltered,
        copyKeys: Object.keys(s.copy),
      })),
      detailBase64: result.buffer.toString('base64'),
      detailWidth: result.skeleton.width,
      detailHeight: result.skeleton.totalHeight,
      elapsedMs: result.elapsedMs,
    });
  } catch (err) {
    return jsonError('detail generation failed', 500, String(err));
  }
}
