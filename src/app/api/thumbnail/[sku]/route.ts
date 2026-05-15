// src/app/api/thumbnail/[sku]/route.ts
//
// Sprint 7-M1 (v3.1 FINAL Smart Asset Workflow) — POST /api/thumbnail/[sku]
//
// Generates the four thumbnail variants (clean / price / badge / lifestyle)
// for a product. The route looks up the product + the most recent Diagnosis
// row (for ConceptTone), then calls thumbnail-generator.
//
// Response: JSON with base64-encoded buffers. The caller (curation UI or
// /api/products/[id]/save-assets path landing in Sprint 7-Lib) is
// responsible for actual Supabase Storage uploads.
//
// Notes:
//   - runtime = 'nodejs' is mandatory: Sharp is incompatible with Edge.
//   - dynamic = 'force-dynamic' to bypass route caching.
//   - The `sku` param accepts either a Product.id or Product.sku (we look up
//     both, the schema doesn't enforce uniqueness on sku alone in every
//     install). Diagnosis is matched by productId.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  generateThumbnails,
  type ThumbnailRequest,
  type ThumbnailVariant,
} from '@/lib/automation/thumbnail-generator';
import type {
  ConceptTone,
  SkeletonId,
} from '@/lib/diagnosis/concept-tone-inference';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ThumbnailBody {
  /** Optional override of the ConceptTone (designer pre-edit). */
  conceptTone?: ConceptTone;
  /** Optional override of the skeleton (designer 1-click swap). */
  overrideSkeletonId?: SkeletonId;
  /** Subset of variants to render. Defaults to all four. */
  variants?: ThumbnailVariant[];
  /** Optional lifestyle backdrop URL for the lifestyle variant. */
  lifestyleBackdropUrl?: string;
  /** Optional override of the source image URL. */
  sourceImageUrl?: string;
  /** Optional highlight phrase to feed copy-writer. */
  highlight?: string;
}

function jsonError(message: string, status: number, detail?: unknown) {
  return NextResponse.json(
    detail !== undefined ? { error: message, detail } : { error: message },
    { status },
  );
}

function isConceptTone(v: unknown): v is ConceptTone {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.persona === 'string' &&
    typeof obj.context === 'string' &&
    typeof obj.pricePosition === 'string' &&
    typeof obj.productType === 'string' &&
    typeof obj.colorMood === 'string' &&
    typeof obj.emotionalTone === 'string' &&
    typeof obj.photoStyle === 'string' &&
    typeof obj.genre === 'string'
  );
}

export async function POST(
  request: Request,
  { params }: { params: { sku: string } },
) {
  if (!params?.sku) {
    return jsonError('sku param required', 400);
  }

  let body: ThumbnailBody = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is allowed — we then rely entirely on DB lookups.
  }

  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { id: params.sku },
        { sku: params.sku },
      ],
    },
    select: {
      id: true,
      name: true,
      category: true,
      salePrice: true,
      images: true,
      mainImage: true,
      main_image_url: true,
    },
  });

  if (!product) {
    return jsonError('product not found', 404, { sku: params.sku });
  }

  const firstImage = Array.isArray(product.images) && product.images.length > 0
    ? (product.images[0] as string)
    : null;
  const sourceImageUrl =
    body.sourceImageUrl ||
    product.mainImage ||
    product.main_image_url ||
    firstImage;

  if (!sourceImageUrl) {
    return jsonError('source image url required (no DB image, no body override)', 400);
  }

  // Pull the most recent Diagnosis for ConceptTone. Body override takes
  // precedence so designers can preview alternative tones without re-running
  // the diagnose pipeline.
  let conceptTone: ConceptTone | null = null;
  if (body.conceptTone && isConceptTone(body.conceptTone)) {
    conceptTone = body.conceptTone;
  } else {
    const diagnosis = await prisma.diagnosis.findUnique({
      where: { productId: product.id },
      select: { conceptTone: true },
    });
    if (diagnosis && isConceptTone(diagnosis.conceptTone)) {
      conceptTone = diagnosis.conceptTone;
    }
  }

  if (!conceptTone) {
    return jsonError(
      'conceptTone required — run /api/diagnose first or include in body',
      400,
      { productId: product.id },
    );
  }

  const req: ThumbnailRequest = {
    productName: product.name,
    salePrice:
      typeof product.salePrice === 'number' ? product.salePrice : undefined,
    category: product.category ?? undefined,
    highlight: body.highlight,
    conceptTone,
    sourceImageUrl,
    lifestyleBackdropUrl: body.lifestyleBackdropUrl,
    overrideSkeletonId: body.overrideSkeletonId,
    variants: body.variants,
  };

  try {
    const result = await generateThumbnails(req);
    return NextResponse.json({
      productId: product.id,
      skeletonId: result.skeletonId,
      matchScore: result.matchScore,
      matchAmbiguous: result.matchAmbiguous,
      elapsedMs: result.elapsedMs,
      outputs: result.outputs.map((o) => ({
        variant: o.variant,
        size: o.size,
        copy: o.copy,
        cloudinaryPreviewUrl: o.cloudinaryPreviewUrl,
        base64: o.buffer.toString('base64'),
        mimeType: 'image/jpeg',
      })),
      // Phase 3-C-3-h2: surface partial-failure info even on HTTP 200 so
      // clients can flag warnings (e.g., 3/4 variants succeeded).
      errors: result.errors,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return jsonError('thumbnail generation failed', 500, { msg });
  }
}
