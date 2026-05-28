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
import {
  pickLifestyleAsset,
  markLifestyleAssetUsed,
} from '@/lib/automation/lifestyle-picker';
import { matchSkeleton } from '@/lib/automation/skeleton-matcher';
import {
  resolveAssetSources,
  type AssetSource,
} from '@/lib/automation/asset-source-resolver';
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
  /** Optional lifestyle backdrop URL for the lifestyle variant (legacy alias
   *  of manualBackdropUrl). */
  lifestyleBackdropUrl?: string;
  /** G8-ENGINE B-layer override: designer-supplied transparent product cutout
   *  PNG URL. Highest priority cutout source. */
  manualCutoutUrl?: string;
  /** G8-ENGINE B-layer override: designer-supplied lifestyle backdrop URL.
   *  Highest priority backdrop source. */
  manualBackdropUrl?: string;
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
      sku: true,
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

  // G8-ENGINE: resolve the skeleton id deterministically (same logic the
  // generator uses) so the backdrop cache key (backdrop-{skeletonId}.png)
  // matches the skeleton the generator will render with. matchSkeleton is a
  // pure function, so this never diverges from generateThumbnails.
  const skeletonId: SkeletonId = body.overrideSkeletonId ?? matchSkeleton(conceptTone).skeletonId;

  // G8-ENGINE Source Priority Resolver: cutout (manual > Storage cache) and
  // backdrop (manual > Storage cache). The legacy lifestyleBackdropUrl body
  // field is accepted as a manual backdrop alias.
  const resolved = await resolveAssetSources({
    productId: product.id,
    skeletonId,
    manualCutoutUrl: body.manualCutoutUrl,
    manualBackdropUrl: body.manualBackdropUrl ?? body.lifestyleBackdropUrl,
  });

  // Backdrop fallback chain: resolver (manual/cache) > curated lifestyle
  // library picker (Phase 2-c-1) > brand-color (inside generator).
  let pickedLifestyleAssetId: string | null = null;
  let lifestyleBackdropUrl: string | undefined = resolved.backdropUrl ?? undefined;
  let backdropSource: AssetSource = resolved.backdropSource;
  if (!lifestyleBackdropUrl) {
    try {
      const picked = await pickLifestyleAsset({
        conceptTone,
        productCategory: product.category ?? undefined,
        sku: product.sku,
      });
      if (picked) {
        pickedLifestyleAssetId = picked.assetId;
        lifestyleBackdropUrl = picked.storageUrl;
        // Curated-library pick is an automatic cached source for badge purposes.
        backdropSource = 'auto-cache';
      }
    } catch (err) {
      // Picker failure is non-fatal — log and continue with brand-color
      // fallback. Don't break the entire thumbnail render over a DB
      // hiccup in the lifestyle library.
      // eslint-disable-next-line no-console
      console.warn('[thumbnail/route] pickLifestyleAsset failed (non-fatal):', err);
    }
  }

  const req: ThumbnailRequest = {
    productName: product.name,
    salePrice:
      typeof product.salePrice === 'number' ? product.salePrice : undefined,
    category: product.category ?? undefined,
    highlight: body.highlight,
    conceptTone,
    sourceImageUrl,
    cutoutUrl: resolved.cutoutUrl,
    lifestyleBackdropUrl,
    overrideSkeletonId: body.overrideSkeletonId,
    variants: body.variants,
  };

  try {
    const result = await generateThumbnails(req);

    // Phase 2-c-1: lazy-mark the picked asset as used only after the
    // generator returns a lifestyle variant in outputs. If lifestyle
    // failed (partial outputs without 'lifestyle'), the asset stays
    // available for the next attempt — no wasted cooldown.
    if (pickedLifestyleAssetId) {
      const lifestyleSucceeded = result.outputs.some((o) => o.variant === 'lifestyle');
      if (lifestyleSucceeded) {
        try {
          await markLifestyleAssetUsed(pickedLifestyleAssetId, product.sku);
        } catch (err) {
          // Mark-used failure is non-fatal; log only.
          // eslint-disable-next-line no-console
          console.warn('[thumbnail/route] markLifestyleAssetUsed failed (non-fatal):', err);
        }
      }
    }

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
      // Phase 2-c-1: surface which lifestyle asset was used (or null when
      // the brand-color fallback was taken) for debugging + UI hinting.
      lifestyleAssetId: pickedLifestyleAssetId,
      // G8-ENGINE: surface where the cutout + backdrop came from so the UI
      // can render a source badge (manual / auto-cache / fallback).
      assetSource: {
        cutout: resolved.cutoutSource,
        backdrop: backdropSource,
      },
      // G8-ENGINE: non-blocking low-resolution warning (<=760px long side).
      lowResolution: result.lowResolution ?? null,
      // G8-ENGINE-Q1: conceptTone-derived art direction (palette + craft) used
      // for all variants. Surfaced so the UI / Desktop can confirm the palette
      // matches the diagnosis colorMood (data-driven, not designer intuition).
      artDirection: {
        colorMood: conceptTone.colorMood,
        palette: result.artDirection.palette,
        productScale: result.artDirection.productScale,
        typeScale: result.artDirection.typeScale,
        spotlightStrength: result.artDirection.spotlightStrength,
        vignette: result.artDirection.vignette,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return jsonError('thumbnail generation failed', 500, { msg });
  }
}
