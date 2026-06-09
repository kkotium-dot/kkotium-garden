// src/lib/images/composite.ts
// ============================================================================
// In-app SIMPLE mood composite (C-7).
// Authority: docs/plan/CUTOUT_CROP_FEATURE_BUILD_PLAN.md (C-7) +
//   docs/handoff/HANDOFF_myeonghwa_composite_recipe_2026-06-09.md +
//   ADAPTIVE_IMAGE_SEO_ENGINE.md (A background mood + C foreground object).
//
// Places a product CUTOUT (transparent PNG) onto a mood BACKGROUND and applies a
// light "harmonize" pass — a warm color grade + a soft CONTACT shadow so the
// product reads as grounded, not floating. Output is an ADDITIONAL-image (slots
// 2..9) / detail S2 hero, NOT the white-bg representative (§9).
//
// HONESTY (#46): sharp cannot truly relight or cast a shape-accurate drop shadow
// — that fidelity is the Firefly/Photoshop path (recipe §3/§5), recovered via
// the apply-composite route's compositeUrl input. This module is the SIMPLE
// (single-tone / quick) approximation: positional composite + warm grade +
// contact shadow.
//
// Pure Buffer transforms. No DB, no Naver. Node runtime (sharp).
// ============================================================================

import sharp from 'sharp';

export type ExtraFormat = '1x1' | '4x5';

const DIMS: Record<ExtraFormat, { w: number; h: number }> = {
  '1x1': { w: 1000, h: 1000 },
  '4x5': { w: 1000, h: 1250 },
};

export interface CompositeOptions {
  format?: ExtraFormat;  // canvas ratio (default '1x1')
  scale?: number;        // cutout height as a fraction of canvas height (default 0.55)
  posX?: number;         // cutout center X as a fraction of canvas width (default 0.42)
  bottomMargin?: number; // base gap as a fraction of canvas height (default 0.08)
  harmonize?: boolean;   // warm grade + contact shadow (default true)
  warmth?: number;       // warm grade strength 0..1 (default 0.14)
}

export interface CompositeResult {
  buffer: Buffer;
  width: number;
  height: number;
  hasBackground: boolean; // a mood background was supplied (vs the warm gradient)
  harmonized: boolean;
}

function warmGradientSvg(w: number, h: number): Buffer {
  // Default mood when no background is supplied: a warm golden gradient (recipe
  // §1 "golden afternoon" tone) so the in-app path still produces a usable scene.
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#F3E6D2"/>` +
    `<stop offset="0.55" stop-color="#E8D3B8"/>` +
    `<stop offset="1" stop-color="#D8BE98"/>` +
    `</linearGradient></defs>` +
    `<rect width="100%" height="100%" fill="url(#g)"/></svg>`,
  );
}

function contactShadowSvg(w: number, h: number, cx: number, baseY: number, rx: number, ry: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<ellipse cx="${Math.round(cx)}" cy="${Math.round(baseY)}" rx="${Math.round(rx)}" ry="${Math.round(ry)}" ` +
    `fill="rgba(34,26,16,0.40)"/></svg>`,
  );
}

function warmGradeSvg(w: number, h: number, alpha: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<rect width="100%" height="100%" fill="rgba(255,196,120,${alpha.toFixed(3)})"/></svg>`,
  );
}

/**
 * Composite a product cutout onto a mood background (or a warm gradient when no
 * background is given) with a contact shadow + warm grade.
 */
export async function compositeMood(
  cutout: Buffer,
  background: Buffer | null,
  opts: CompositeOptions = {},
): Promise<CompositeResult> {
  const format = opts.format ?? '1x1';
  const { w: W, h: H } = DIMS[format];
  const scale = Math.min(Math.max(opts.scale ?? 0.55, 0.2), 0.9);
  const posX = Math.min(Math.max(opts.posX ?? 0.42, 0.1), 0.9);
  const bottomMargin = Math.min(Math.max(opts.bottomMargin ?? 0.08, 0), 0.3);
  const harmonize = opts.harmonize !== false;
  const warmth = Math.min(Math.max(opts.warmth ?? 0.14, 0), 0.6);

  // Background base layer: cover-resize the supplied mood, else a warm gradient.
  const base = background
    ? await sharp(background).resize(W, H, { fit: 'cover' }).toColorspace('srgb').png().toBuffer()
    : await sharp(warmGradientSvg(W, H)).png().toBuffer();

  // Cutout, resized by height to the requested fraction of the canvas.
  const targetH = Math.round(H * scale);
  const cutBuf = await sharp(cutout).resize({ height: targetH }).png().toBuffer();
  const cutMeta = await sharp(cutBuf).metadata();
  const cw = cutMeta.width ?? targetH;
  const ch = cutMeta.height ?? targetH;

  const centerX = Math.round(W * posX);
  const cutLeft = Math.max(0, Math.min(W - cw, Math.round(centerX - cw / 2)));
  const cutTop = Math.max(0, Math.round(H - ch - H * bottomMargin));
  const baseY = cutTop + ch;

  const layers: sharp.OverlayOptions[] = [];

  // Contact shadow under the product base (grounding).
  if (harmonize) {
    const contact = await sharp(contactShadowSvg(W, H, cutLeft + cw / 2, baseY, cw * 0.42, ch * 0.05))
      .blur(18)
      .png()
      .toBuffer();
    layers.push({ input: contact, top: 0, left: 0 });
  }

  // The product cutout.
  layers.push({ input: cutBuf, top: cutTop, left: cutLeft });

  // Warm grade over the whole scene to unify product + background.
  if (harmonize && warmth > 0) {
    layers.push({ input: warmGradeSvg(W, H, warmth), top: 0, left: 0, blend: 'soft-light' });
  }

  const buffer = await sharp(base)
    .composite(layers)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .toColorspace('srgb')
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();

  return { buffer, width: W, height: H, hasBackground: !!background, harmonized: harmonize };
}

/**
 * Normalize an already-composed scene (e.g. a Firefly recovery result) to the
 * additional-image format — cover-resize + sRGB JPEG. No compositing.
 */
export async function normalizeExtraImage(
  buf: Buffer,
  format: ExtraFormat = '1x1',
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const { w: W, h: H } = DIMS[format];
  const buffer = await sharp(buf)
    .resize(W, H, { fit: 'cover' })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .toColorspace('srgb')
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  return { buffer, width: W, height: H };
}
