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
  fetchImageBuffer,
  fitImage,
  renderTextOverlay,
  renderBadgeOverlay,
  overlayOnto,
  applyBottomVignette,
  exportJpeg,
  renderSweep,
  renderRadialGlow,
  renderEllipseShadow,
  makeReflection,
  applyEdgeVignette,
  type CanvasSize,
} from './sharp-composite';
import type { ConceptTone, SkeletonId } from '../diagnosis/concept-tone-inference';
import type { SkeletonSpec } from './layout-skeletons';
import { getSkeleton } from './layout-skeletons';
import { pickArtDirection, type ArtDirection } from './thumbnail-art-direction';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThumbnailVariant = 'clean' | 'price' | 'badge' | 'lifestyle';

export interface ThumbnailRequest {
  /** Product display name. Required. */
  productName: string;
  /** Sale price in KRW. Required for the price variant; ignored otherwise. */
  salePrice?: number;
  /** Free-text category, used by badge + copy prompts + tone mapping. Optional. */
  category?: string;
  /** Naver numeric category code — secondary hint for category-tone-mapper. */
  naverCategoryCode?: string | null;
  /** Short context phrase like "4종 세트". Optional. */
  highlight?: string;
  /** ConceptTone (output of CTI). Required. */
  conceptTone: ConceptTone;
  /** Source product image URL. Required. */
  sourceImageUrl: string;
  /** Optional transparent product cutout PNG (background removed). When present
   *  every variant composites this over its background so the original square
   *  product backdrop no longer leaks through — the core G8-ENGINE fix for the
   *  "4 variants look identical" defect. When omitted, renderers fall back to
   *  fitImage(sourceImageUrl) (source='fallback'). Resolved upstream by
   *  asset-source-resolver (manual > Storage cache). */
  cutoutUrl?: string | null;
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
  /** Present when the product source resolution is at or below the low-res
   *  threshold (<=760px long side). Non-blocking warning — aligns with the
   *  diagnose L4 "reshoot / upscale" UX so the seller knows the cutout/source
   *  is below ideal print/thumbnail quality. Undefined when the source is
   *  large enough or the probe failed. */
  lowResolution?: { width: number; height: number; threshold: number };
  /** G8-ENGINE-Q1: the conceptTone-derived art direction used for all variants
   *  (palette + craft params). Surfaced for debugging / UI hinting. */
  artDirection: ArtDirection;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CANVAS: CanvasSize = { width: 1080, height: 1080 };

/** Long-side pixel threshold at/below which the product source is flagged as
 *  low resolution (warning only). Mirrors the diagnose upscale guidance. */
const LOWRES_WARN_PX = 760;

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
// Product layer loader
// ---------------------------------------------------------------------------

/** Resolve the product image buffer and fit it into `slot`. When a transparent
 *  cutout is available, the product is padded with transparency so the variant
 *  background shows through cleanly; otherwise the raw source image is
 *  letterboxed with the variant background color (legacy fallback path). */
async function loadProductFitted(
  req: ThumbnailRequest,
  slot: CanvasSize,
  variantBg: string,
): Promise<Buffer> {
  const cutout = req.cutoutUrl ? req.cutoutUrl.trim() : '';
  const url = cutout || req.sourceImageUrl;
  const buffer = await fetchImageBuffer(url);
  // Transparent pad for cutouts so the canvas/backdrop is visible around the
  // product; otherwise pad with the variant background to letterbox the photo.
  const fitBg = cutout ? '#FFFFFF00' : variantBg;
  return fitImage(buffer, slot, fitBg);
}

/** The URL actually used as the product source (cutout when present). Recorded
 *  in the output for informational/debug purposes. */
function productPreviewUrl(req: ThumbnailRequest): string {
  const cutout = req.cutoutUrl ? req.cutoutUrl.trim() : '';
  return cutout || req.sourceImageUrl;
}

// ---------------------------------------------------------------------------
// Premium scene builder (G8-ENGINE-Q1)
// ---------------------------------------------------------------------------

/** Base product footprint (px) before the art-direction productScale. */
const SCENE_SLOT = 720;

function rgbToHex(rgb: [number, number, number]): string {
  const h = (c: number) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
  return `#${h(rgb[0])}${h(rgb[1])}${h(rgb[2])}`;
}

/** Compose the shared premium product scene used by every variant: a cyclorama
 *  sweep (or supplied lifestyle backdrop) + soft spotlight + two-layer ground
 *  shadow + floor reflection + the product, all driven by the art direction.
 *  Variants add their own text overlays on top of the returned scene. */
async function buildProductScene(
  req: ThumbnailRequest,
  art: ArtDirection,
  baseOverride?: Buffer | null,
): Promise<Buffer> {
  const scaled = Math.round(SCENE_SLOT * art.productScale);
  const slot: CanvasSize = { width: scaled, height: scaled };
  // Always pad transparent here: the product sits over the sweep/backdrop so
  // any letterbox must be see-through (cutouts already are).
  const productFitted = await loadProductFitted(req, slot, '#FFFFFF00');

  const left = Math.round((CANVAS.width - scaled) / 2);
  const horizonPx = Math.round(CANVAS.height * art.horizon);
  const top = Math.round(horizonPx - scaled * 0.82);

  // Base layer: a supplied lifestyle backdrop wins; otherwise the sweep.
  const base = baseOverride
    ? await fitImage(baseOverride, CANVAS, rgbToHex(art.palette.floorRgb))
    : await renderSweep(CANVAS, art.palette.topRgb, art.palette.floorRgb, art.horizon);

  const layers: Buffer[] = [];
  // Spotlight only on the studio sweep — a photographic backdrop carries its
  // own lighting and a glow would wash it out.
  if (!baseOverride) {
    layers.push(
      renderRadialGlow(
        CANVAS,
        CANVAS.width / 2,
        top + scaled * 0.42,
        scaled * 0.62,
        art.palette.spotlight,
        art.spotlightStrength,
      ),
    );
  }
  // Ground: wide soft cast shadow + tight dark contact shadow (kills float).
  layers.push(
    await renderEllipseShadow(CANVAS, CANVAS.width / 2, horizonPx + scaled * 0.02, scaled * 0.34, scaled * 0.06, 0.2, 22),
  );
  layers.push(
    await renderEllipseShadow(CANVAS, CANVAS.width / 2, horizonPx + scaled * 0.01, scaled * 0.22, scaled * 0.028, 0.3, 8),
  );
  // Floor reflection directly below the product.
  const reflection = await makeReflection(productFitted, 0.2);
  layers.push(await offsetLayer(reflection, { x: left, y: top + scaled }, CANVAS));
  // Product on top.
  layers.push(await offsetLayer(productFitted, { x: left, y: top }, CANVAS));

  let scene = await overlayOnto(base, layers);
  if (art.vignette) {
    scene = await applyEdgeVignette(scene, CANVAS, 0.16);
  }
  return scene;
}

// ---------------------------------------------------------------------------
// Variant renderers
// ---------------------------------------------------------------------------

async function renderClean(
  _spec: SkeletonSpec,
  req: ThumbnailRequest,
  art: ArtDirection,
): Promise<ThumbnailOutput> {
  // clean = 네이버 대표이미지 후보 -> text/watermark 0. Premium studio scene only.
  const scene = await buildProductScene(req, art);
  const buffer = await exportJpeg(scene);

  return {
    variant: 'clean',
    buffer,
    copy: {},
    cloudinaryPreviewUrl: productPreviewUrl(req),
    size: CANVAS,
  };
}

async function renderPrice(
  spec: SkeletonSpec,
  req: ThumbnailRequest,
  art: ArtDirection,
): Promise<ThumbnailOutput> {
  const scene = await buildProductScene(req, art);

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
    fillColor: art.palette.accent,
    textColor: '#FFFFFF',
    fontSizePx: Math.round(44 * art.typeScale),
    paddingXPx: 32,
    paddingYPx: 18,
    radius: 16,
  });

  const composed = await overlayOnto(scene, [priceBadge]);
  const buffer = await exportJpeg(composed);

  return {
    variant: 'price',
    buffer,
    copy: { priceBadge: priceCopy.text },
    cloudinaryPreviewUrl: productPreviewUrl(req),
    size: CANVAS,
  };
}

async function renderBadge(
  spec: SkeletonSpec,
  req: ThumbnailRequest,
  art: ArtDirection,
): Promise<ThumbnailOutput> {
  const scene = await buildProductScene(req, art);

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
    fillColor: art.palette.accent,
    textColor: '#FFFFFF',
    fontSizePx: Math.round(40 * art.typeScale),
    paddingXPx: 28,
    paddingYPx: 14,
    radius: 14,
  });

  const composed = await overlayOnto(scene, [badge]);
  const buffer = await exportJpeg(composed);

  return {
    variant: 'badge',
    buffer,
    copy: { categoryBadge: badgeCopy.text },
    cloudinaryPreviewUrl: productPreviewUrl(req),
    size: CANVAS,
  };
}

async function renderLifestyle(
  spec: SkeletonSpec,
  req: ThumbnailRequest,
  art: ArtDirection,
): Promise<ThumbnailOutput> {
  // Lifestyle backdrop (Storage scene) wins as the scene base; otherwise the
  // product scene falls back to the palette sweep. The product still gets the
  // ground shadow + reflection craft for a grounded studio look.
  const backdropUrl = req.lifestyleBackdropUrl;
  const backdropBuffer = backdropUrl
    ? await fetchImageBuffer(backdropUrl).catch(() => null)
    : null;

  const scene = await buildProductScene(req, art, backdropBuffer);

  // Darken the bottom so the white headline reads against any backdrop.
  const vignetted = await applyBottomVignette(scene, CANVAS, 0.5);

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
    fontSizePx: Math.round(38 * art.typeScale),
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
    cloudinaryPreviewUrl: productPreviewUrl(req),
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

const RENDERERS: Record<
  ThumbnailVariant,
  (s: SkeletonSpec, r: ThumbnailRequest, art: ArtDirection) => Promise<ThumbnailOutput>
> = {
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

  // G8-ENGINE-Q3: 2-step art direction — category trust signal (step 1) then
  // persona/price modulation (step 2). Data-driven, not designer intuition.
  // All variants share one direction.
  const art = pickArtDirection(req.conceptTone, {
    category: req.category,
    naverCategoryCode: req.naverCategoryCode,
    productName: req.productName,
  });

  // Low-resolution guard: probe the product source once and flag when its long
  // side is at/below the threshold. Non-fatal — a probe failure leaves the flag
  // undefined and the per-variant renderers surface their own fetch errors.
  let lowResolution: ThumbnailGenerationResult['lowResolution'];
  try {
    const probeBuffer = await fetchImageBuffer(productPreviewUrl(req));
    const meta = await sharp(probeBuffer).metadata();
    const longSide = Math.max(meta.width ?? 0, meta.height ?? 0);
    if (longSide > 0 && longSide <= LOWRES_WARN_PX) {
      lowResolution = {
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        threshold: LOWRES_WARN_PX,
      };
    }
  } catch {
    // probe failure is non-fatal
  }

  const variants: ThumbnailVariant[] = req.variants ?? ['clean', 'price', 'badge', 'lifestyle'];
  const outputs: ThumbnailOutput[] = [];
  const errors: ThumbnailVariantError[] = [];

  // Render sequentially so a single failing variant doesn't poison the
  // others. Each renderer fetches its own image so they don't share state.
  for (const v of variants) {
    try {
      const out = await RENDERERS[v](spec, req, art);
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
    lowResolution,
    artDirection: art,
  };
}
