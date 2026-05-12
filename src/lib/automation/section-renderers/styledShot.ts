// src/lib/automation/section-renderers/styledShot.ts
//
// Sprint 7-M2 Phase 2-b-3-a — "styledShot" section renderer.
// Used by S6 (standard-gift-single sensory). Three lifestyle shots stacked
// vertically with one-line mood-led captions. Each shot uses the same
// product image until Sprint 7-Lib supplies per-shot lifestyle crops.

import sharp from 'sharp';
import {
  createCanvas,
  fetchImageBuffer,
  fitImage,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { urlGalleryThumb } from '../cloudinary-pipeline';
import { generateStyledShotCopy } from './section-copy';
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

export const styledShotRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generateStyledShotCopy(spec, ctx);

  // Headline
  const headlineLayer = await renderTextOverlay(size, {
    text: copy.value.headline,
    x: 60,
    y: 110,
    fontSizePx: 36,
    color: spec.colorTokens.accent,
    maxWidth: size.width - 120,
    fontWeight: 700,
  });

  // Stacked shots region
  const shotW = size.width - 120;
  const shotsRegionTop = 200;
  const shotsRegionHeight = size.height - shotsRegionTop - 60;
  const shotGap = 60;
  const shotH = Math.floor((shotsRegionHeight - shotGap * 2) / 3);
  const captionPad = 30;

  // Try product image once — reused across all three shots
  let baseImage: Buffer | null = null;
  try {
    const url = urlGalleryThumb(ctx.lifestyleAssetUrl ?? ctx.sourceImageUrl);
    baseImage = await fetchImageBuffer(url);
  } catch {
    baseImage = null;
  }

  const layers: Buffer[] = [headlineLayer];

  for (let i = 0; i < 3; i++) {
    const shotY = shotsRegionTop + i * (shotH + shotGap);

    if (baseImage) {
      try {
        const fitted = await fitImage(baseImage, { width: shotW, height: shotH }, bg);
        const placed = await offsetLayer(fitted, { x: 60, y: shotY }, size);
        layers.push(placed);
      } catch {
        // skip image, continue with caption
      }
    }

    const captionLayer = await renderTextOverlay(size, {
      text: copy.value.captions[i],
      x: 60,
      y: shotY + shotH + captionPad,
      fontSizePx: 20,
      color: spec.colorTokens.accent,
      maxWidth: shotW,
      fontWeight: 500,
    });
    layers.push(captionLayer);
  }

  const composed = await overlayOnto(canvas, layers);

  return {
    buffer: composed,
    copy: {
      headline: copy.value.headline,
      caption1: copy.value.captions[0],
      caption2: copy.value.captions[1],
      caption3: copy.value.captions[2],
    },
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
