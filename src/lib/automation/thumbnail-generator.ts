// src/lib/automation/thumbnail-generator.ts
//
// Sprint 7-M1 (v3.1 FINAL Smart Asset Workflow) — 4-variant orchestrator.
//
// Inputs: ConceptTone + product context + source image URL.
// Outputs: 4 thumbnail Buffers (`clean`, `price`, `badge`, `lifestyle`) +
// metadata. Returns Buffers — the caller decides where to persist
// (Supabase Storage, base64 response, etc.). This separation keeps the
// generator pure / unit-testable and keeps storage credentials out of
// this module.
//
// Variant matrix:
//   clean      White-bg padded fit + product name + skeleton accent stripe
//   price      Brand-color bg + product image + price badge (Groq copy)
//   badge      White-bg padded fit + category badge (Groq copy)
//   lifestyle  Optional lifestyle backdrop + product overlay + bottom caption
//
// Variant suitability is driven by the matched skeleton — see VARIANT_HINTS.

import { matchSkeleton } from './skeleton-matcher';
import { generateCopy } from './copy-writer';
// Phase 3-C-3-h hardening (2026-05-15): Cloudinary fetch mode is restricted
// at the account level (returns 401 "Images of type fetch are restricted").
// We bypass the Cloudinary preprocessing layer and let Sharp handle resize +
// background fill directly. fitImage() below produces the same canonical
// 1080x1080 padded output without any external dependency, in line with
// workflow principle #38 (production runtime = no external image API calls
// that can disappear or rate-limit silently).
import {
  createCanvas,
  fetchImageBuffer,
  fitImage,
  renderTextOverlay,
  renderBadgeOverlay,
  overlayOnto,
  applyBottomVignette,
  exportJpeg,
  type CanvasSize,
} from './sharp-composite';
import type { ConceptTone, SkeletonId } from '../diagnosis/concept-tone-inference';
import type { SkeletonSpec } from './layout-skeletons';
import { getSkeleton } from './layout-skeletons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThumbnailVariant = 'clean' | 'price' | 'badge' | 'lifestyle';

export interface ThumbnailRequest {
  /** Product display name. Required. */
  productName: string;
  /** Sale price in KRW. Required for the price variant; ignored otherwise. */
  salePrice?: number;
  /** Free-text category, used by badge + copy prompts. Optional. */
  category?: string;
  /** Short context phrase like "4종 세트". Optional. */
  highlight?: string;
  /** ConceptTone (output of CTI). Required. */
  conceptTone: ConceptTone;
  /** Source product image URL. Required. */
  sourceImageUrl: string;
  /** Optional lifestyle backdrop URL for the lifestyle variant. When omitted,
   *  the lifestyle variant falls back to a soft brand-color backdrop. */
  lifestyleBackdropUrl?: string;
  /** Override the chosen skeleton (designer 1-click swap). Optional. */
  overrideSkeletonId?: SkeletonId;
  /** Variants to render. Defaults to all four. */
  variants?: ThumbnailVariant[];
}

export interface ThumbnailOutput {
  variant: ThumbnailVariant;
  /** Output JPEG buffer at the canonical 1080x1080 size. */
  buffer: Buffer;
  /** Copy strings used in this variant. */
  copy: Record<string, string>;
  /** Cloudinary delivery URL used for the source image preview (informational). */
  cloudinaryPreviewUrl: string;
  /** Width + height in pixels. */
  size: CanvasSize;
}

export interface ThumbnailVariantError {
  variant: ThumbnailVariant;
  message: string;
}

export interface ThumbnailGenerationResult {
  skeletonId: SkeletonId;
  skeleton: SkeletonSpec;
  matchScore: number;
  matchAmbiguous: boolean;
  outputs: ThumbnailOutput[];
  /** Per-variant errors collected during the render loop. Present even when
   *  some variants succeed — clients can surface partial-failure warnings. */
  errors: ThumbnailVariantError[];
  /** Total wall-clock milliseconds spent across all variants. */
  elapsedMs: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CANVAS: CanvasSize = { width: 1080, height: 1080 };
const PRODUCT_SLOT: CanvasSize = { width: 780, height: 780 };
const PRODUCT_OFFSET = { x: 150, y: 90 };

/** Some skeletons fit some variants better than others. The variant matrix
 *  always returns all four buffers; this map is exposed as metadata so
 *  downstream UIs can mark a recommended variant. */
export const VARIANT_HINTS: Record<SkeletonId, ThumbnailVariant> = {
  S1:  'clean',
  S2:  'lifestyle',
  S3:  'badge',
  S4:  'clean',
  S5:  'price',
  S6:  'lifestyle',
  S7:  'clean',
  S8:  'badge',
  S9:  'lifestyle',
  S10: 'lifestyle',
  S11: 'badge',
  S12: 'clean',
};

// ---------------------------------------------------------------------------
// Variant renderers
// ---------------------------------------------------------------------------

async function renderClean(
  spec: SkeletonSpec,
  req: ThumbnailRequest,
): Promise<ThumbnailOutput> {
  const previewUrl = req.sourceImageUrl;
  const productBuffer = await fetchImageBuffer(previewUrl);

  const canvas = await createCanvas(CANVAS, '#FFFFFF');
  const productFitted = await fitImage(productBuffer, PRODUCT_SLOT, '#FFFFFF');

  const productLayer = await overlayOnto(canvas, [
    await offsetLayer(productFitted, PRODUCT_OFFSET, CANVAS),
  ]);

  const hookCopy = await generateCopy({
    slot: 'hook',
    skeleton: spec,
    productName: req.productName,
    category: req.category,
    highlight: req.highlight,
  });

  const titleLayer = await renderTextOverlay(CANVAS, {
    text: hookCopy.text,
    x: 60,
    y: 970,
    fontSizePx: 56,
    color: spec.colorTokens.accent,
    maxWidth: 960,
    fontWeight: 700,
  });

  // Skeleton accent stripe along the bottom edge.
  const stripeLayer = Buffer.from(
    `<svg width="${CANVAS.width}" height="${CANVAS.height}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="0" y="${CANVAS.height - 6}" width="${CANVAS.width}" height="6" fill="${spec.colorTokens.primary}" />` +
    '</svg>',
  );

  const composed = await overlayOnto(productLayer, [titleLayer, stripeLayer]);
  const buffer = await exportJpeg(composed);

  return {
    variant: 'clean',
    buffer,
    copy: { hook: hookCopy.text },
    cloudinaryPreviewUrl: previewUrl,
    size: CANVAS,
  };
}

async function renderPrice(
  spec: SkeletonSpec,
  req: ThumbnailRequest,
): Promise<ThumbnailOutput> {
  const previewUrl = req.sourceImageUrl;
  const productBuffer = await fetchImageBuffer(previewUrl);

  const canvas = await createCanvas(CANVAS, spec.colorTokens.secondary);
  const productFitted = await fitImage(
    productBuffer,
    PRODUCT_SLOT,
    spec.colorTokens.secondary,
  );

  const productLayer = await overlayOnto(canvas, [
    await offsetLayer(productFitted, PRODUCT_OFFSET, CANVAS),
  ]);

  const priceCopy = await generateCopy({
    slot: 'priceBadge',
    skeleton: spec,
    productName: req.productName,
    salePrice: req.salePrice,
    category: req.category,
  });

  const priceBadge = await renderBadgeOverlay(CANVAS, {
    label: priceCopy.text,
    x: 60,
    y: 60,
    fillColor: spec.colorTokens.primary,
    textColor: '#FFFFFF',
    fontSizePx: 44,
    paddingXPx: 32,
    paddingYPx: 18,
    radius: 16,
  });

  const composed = await overlayOnto(productLayer, [priceBadge]);
  const buffer = await exportJpeg(composed);

  return {
    variant: 'price',
    buffer,
    copy: { priceBadge: priceCopy.text },
    cloudinaryPreviewUrl: previewUrl,
    size: CANVAS,
  };
}

async function renderBadge(
  spec: SkeletonSpec,
  req: ThumbnailRequest,
): Promise<ThumbnailOutput> {
  const previewUrl = req.sourceImageUrl;
  const productBuffer = await fetchImageBuffer(previewUrl);

  const canvas = await createCanvas(CANVAS, '#FFFFFF');
  const productFitted = await fitImage(productBuffer, PRODUCT_SLOT, '#FFFFFF');

  const productLayer = await overlayOnto(canvas, [
    await offsetLayer(productFitted, PRODUCT_OFFSET, CANVAS),
  ]);

  const badgeCopy = await generateCopy({
    slot: 'categoryBadge',
    skeleton: spec,
    productName: req.productName,
    category: req.category,
    highlight: req.highlight,
  });

  const badge = await renderBadgeOverlay(CANVAS, {
    label: badgeCopy.text,
    x: 60,
    y: 920,
    fillColor: spec.colorTokens.accent,
    textColor: '#FFFFFF',
    fontSizePx: 40,
    paddingXPx: 28,
    paddingYPx: 14,
    radius: 14,
  });

  const composed = await overlayOnto(productLayer, [badge]);
  const buffer = await exportJpeg(composed);

  return {
    variant: 'badge',
    buffer,
    copy: { categoryBadge: badgeCopy.text },
    cloudinaryPreviewUrl: previewUrl,
    size: CANVAS,
  };
}

async function renderLifestyle(
  spec: SkeletonSpec,
  req: ThumbnailRequest,
): Promise<ThumbnailOutput> {
  const productPreviewUrl = req.sourceImageUrl;
  const productBuffer = await fetchImageBuffer(productPreviewUrl);

  const backdropUrl = req.lifestyleBackdropUrl;
  const backdropBuffer = backdropUrl
    ? await fetchImageBuffer(backdropUrl).catch(() => null)
    : null;

  // Lifestyle backdrop fills the canvas. If unavailable, fall back to the
  // skeleton's secondary brand color.
  const canvas = backdropBuffer
    ? await fitImage(backdropBuffer, CANVAS, spec.colorTokens.secondary)
    : await createCanvas(CANVAS, spec.colorTokens.secondary);

  // Smaller product slot for lifestyle layouts (leaves more room for bg).
  const lifestyleProductSlot: CanvasSize = { width: 580, height: 580 };
  const lifestyleProductOffset = { x: 250, y: 200 };
  const productFitted = await fitImage(productBuffer, lifestyleProductSlot, '#FFFFFF00');

  const withProduct = await overlayOnto(canvas, [
    await offsetLayer(productFitted, lifestyleProductOffset, CANVAS),
  ]);

  const vignetted = await applyBottomVignette(withProduct, CANVAS, 0.5);

  const caption = await generateCopy({
    slot: 'lifestyleCaption',
    skeleton: spec,
    productName: req.productName,
    category: req.category,
    highlight: req.highlight,
  });

  const captionLayer = await renderTextOverlay(CANVAS, {
    text: caption.text,
    x: 60,
    y: 1000,
    fontSizePx: 38,
    color: '#FFFFFF',
    maxWidth: 960,
    fontWeight: 600,
  });

  const composed = await overlayOnto(vignetted, [captionLayer]);
  const buffer = await exportJpeg(composed);

  return {
    variant: 'lifestyle',
    buffer,
    copy: { lifestyleCaption: caption.text },
    cloudinaryPreviewUrl: productPreviewUrl,
    size: CANVAS,
  };
}

// ---------------------------------------------------------------------------
// Layer placement helper
// ---------------------------------------------------------------------------

import sharp from 'sharp';

/** Place a smaller image at the given offset on a transparent canvas of the
 *  target size, returning a Buffer suitable for sharp.composite(). */
async function offsetLayer(
  innerBuffer: Buffer,
  offset: { x: number; y: number },
  outerSize: CanvasSize,
): Promise<Buffer> {
  return sharp({
    create: {
      width: outerSize.width,
      height: outerSize.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: innerBuffer, top: offset.y, left: offset.x }])
    .png()
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

const RENDERERS: Record<ThumbnailVariant, (s: SkeletonSpec, r: ThumbnailRequest) => Promise<ThumbnailOutput>> = {
  clean:     renderClean,
  price:     renderPrice,
  badge:     renderBadge,
  lifestyle: renderLifestyle,
};

export async function generateThumbnails(
  req: ThumbnailRequest,
): Promise<ThumbnailGenerationResult> {
  const start = Date.now();
  const match = matchSkeleton(req.conceptTone);
  const skeletonId = req.overrideSkeletonId ?? match.skeletonId;
  const spec = getSkeleton(skeletonId);

  const variants: ThumbnailVariant[] = req.variants ?? ['clean', 'price', 'badge', 'lifestyle'];
  const outputs: ThumbnailOutput[] = [];
  const errors: ThumbnailVariantError[] = [];

  // Render sequentially so a single failing variant doesn't poison the
  // others. Each renderer fetches its own image so they don't share state.
  for (const v of variants) {
    try {
      const out = await RENDERERS[v](spec, req);
      outputs.push(out);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error(`[thumbnail-generator] variant ${v} failed:`, err);
      errors.push({ variant: v, message });
    }
  }

  // Phase 3-C-3-h2 (2026-05-15): when *every* variant fails, treat the call
  // itself as a failure so the API route can return 5xx instead of HTTP 200
  // with outputs:[]. The earlier silent-fail behavior masked the Cloudinary
  // restriction for hours; clients now see a structured error immediately.
  if (outputs.length === 0 && variants.length > 0) {
    const summary = errors.map((e) => `${e.variant}: ${e.message}`).join(' | ');
    throw new Error(
      `all ${variants.length} thumbnail variants failed (${summary})`,
    );
  }

  return {
    skeletonId,
    skeleton: spec,
    matchScore: req.overrideSkeletonId ? 100 : match.score,
    matchAmbiguous: match.ambiguous,
    outputs,
    errors,
    elapsedMs: Date.now() - start,
  };
}
