// src/lib/automation/section-renderers/hero.ts
//
// Sprint 7-M2 Phase 1 — "hero" section renderer.
//
// Used by S1/S2/S3/S4/S5/S6/S7/S9/S10/S11/S12 (every skeleton except S8
// which uses seasonalHook instead). The same renderer handles all of
// them by reading the skeleton's color tokens + section bg token —
// designer-grade variations (background photography, brand watermark
// placement) are deferred to later sprints.
//
// Layout (860 × section.height):
//   - Background fill from section.bgColorToken
//   - Optional contained product image at top-center (max 560×560)
//   - Hero title at left, 56px bold, accent color
//   - Subtitle 32px below title, 32px medium weight, secondary color
//   - 4px brand accent stripe on the bottom edge
//
// 2026-06-04 (detail-builder-hybrid task 2): mood-background compositing.
// When ctx.lifestyleAssetUrl is present, the background becomes a cover-fit mood
// photo (A) with the product cutout (C) floated on top (transparent letterbox),
// plus a semi-transparent white panel behind the text block for legibility.
// ★ Regression guard (P0): when lifestyleAssetUrl is absent, every operation and
// argument is byte-identical to the prior solid-color path — the mood additions
// are strictly gated on `usedLifestyle`, so existing PNG output is unchanged.

import {
  createCanvas,
  fetchImageBuffer,
  fitImage,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
// Phase 3-C-3-h (2026-05-15): bypass Cloudinary fetch (account-restricted),
// fetch source URL directly. Sharp fitImage handles resize + bg below.
import sharp from 'sharp';
import { generateHeroCopy } from './section-copy';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

async function offsetLayer(
  innerBuffer: Buffer,
  offset: { x: number; y: number },
  outerSize: { width: number; height: number },
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

// Cover-fit a mood photo to the full canvas (fills the frame, crops overflow —
// no letterbox bars). Used only for the lifestyle-background path.
async function coverFitToCanvas(
  imageBuffer: Buffer,
  size: { width: number; height: number },
): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(size.width, size.height, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();
}

export const heroRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  // Reserve top portion for product image, bottom for text.
  const imageBlockHeight = Math.min(560, Math.round(size.height * 0.62));
  const textBlockTop = imageBlockHeight + 40;

  // Background: cover-fit mood photo when a lifestyle asset is supplied, else
  // the original solid skeleton color. The solid path is byte-identical to the
  // prior behavior (regression guard for P0 publish assets).
  let canvas: Buffer;
  let usedLifestyle = false;
  if (ctx.lifestyleAssetUrl) {
    try {
      const bgBuf = await fetchImageBuffer(ctx.lifestyleAssetUrl);
      canvas = await coverFitToCanvas(bgBuf, size);
      usedLifestyle = true;
    } catch {
      canvas = await createCanvas(size, bg);
    }
  } else {
    canvas = await createCanvas(size, bg);
  }

  // Optional product image (skip silently on fetch error — the build
  // shouldn't break the moment a single source image is missing).
  let withImage: Buffer = canvas;
  try {
    const buf = await fetchImageBuffer(ctx.sourceImageUrl);
    // On a mood background, letterbox the cutout transparently so the photo
    // shows through; on the solid path keep the original bg-filled fit.
    const fitted = usedLifestyle
      ? await sharp(buf)
          .resize(560, imageBlockHeight - 40, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toBuffer()
      : await fitImage(buf, { width: 560, height: imageBlockHeight - 40 }, bg);
    const placed = await offsetLayer(
      fitted,
      { x: Math.round((size.width - 560) / 2), y: 40 },
      size,
    );
    withImage = await overlayOnto(canvas, [placed]);
  } catch {
    // Keep `withImage = canvas` — hero degrades to text-only.
  }

  const copy = await generateHeroCopy(spec, ctx);

  const titleLayer = await renderTextOverlay(size, {
    text: copy.value.title,
    x: 60,
    y: textBlockTop + 40,
    fontSizePx: 56,
    color: spec.colorTokens.accent,
    maxWidth: size.width - 120,
    fontWeight: 700,
  });

  const subtitleLayer = copy.value.subtitle
    ? await renderTextOverlay(size, {
        text: copy.value.subtitle,
        x: 60,
        y: textBlockTop + 100,
        fontSizePx: 30,
        color: spec.colorTokens.primary,
        maxWidth: size.width - 120,
        fontWeight: 500,
      })
    : null;

  const stripe = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="0" y="${size.height - 4}" width="${size.width}" height="4" fill="${spec.colorTokens.primary}" />` +
      '</svg>',
  );

  // Readability guard: a semi-transparent white panel behind the text block so
  // the dark title/subtitle stays legible over a mood photo. Only on the
  // lifestyle path — the solid path adds no extra layer (regression guard).
  const readabilityPanel = usedLifestyle
    ? Buffer.from(
        `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
          `<rect x="40" y="${textBlockTop + 10}" width="${size.width - 80}" height="${Math.max(0, size.height - (textBlockTop + 10) - 20)}" rx="20" ry="20" fill="rgba(255,255,255,0.72)" />` +
          '</svg>',
      )
    : null;

  const layers: Buffer[] = [];
  if (readabilityPanel) layers.push(readabilityPanel);
  layers.push(titleLayer);
  if (subtitleLayer) layers.push(subtitleLayer);
  layers.push(stripe);

  const composed = await overlayOnto(withImage, layers);

  return {
    buffer: composed,
    copy: {
      title: copy.value.title,
      subtitle: copy.value.subtitle,
    },
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
