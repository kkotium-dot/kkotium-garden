// src/lib/automation/section-renderers/material.ts
//
// Sprint 7-M2 Phase 2-b-3-a — "material" section renderer.
// Used by S9 (budget-daily-natural). Material macro shot with origin and
// certification disclosure rows. KFTC-safe: origin and certification lines
// always render as dict placeholders until ctx supplies real values from
// product data (Sprint 7-Lib follow-up).

import sharp from 'sharp';
import {
  createCanvas,
  fetchImageBuffer,
  fitImage,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { urlGalleryThumb } from '../cloudinary-pipeline';
import { generateMaterialCopy } from './section-copy';
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

export const materialRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generateMaterialCopy(spec, ctx);

  // Headline at top
  const headlineLayer = await renderTextOverlay(size, {
    text: copy.value.headline,
    x: 60,
    y: 110,
    fontSizePx: 38,
    color: spec.colorTokens.accent,
    maxWidth: size.width - 120,
    fontWeight: 700,
  });

  // Macro shot region — large, centered
  const macroW = size.width - 120;
  const macroH = Math.min(660, Math.round(size.height * 0.5));
  const macroX = 60;
  const macroY = 180;
  let imageLayer: Buffer | null = null;
  try {
    const url = urlGalleryThumb(ctx.lifestyleAssetUrl ?? ctx.sourceImageUrl);
    const buf = await fetchImageBuffer(url);
    const fitted = await fitImage(buf, { width: macroW, height: macroH }, bg);
    imageLayer = await offsetLayer(fitted, { x: macroX, y: macroY }, size);
  } catch {
    imageLayer = null;
  }

  // Macro caption below image
  const captionLayer = await renderTextOverlay(size, {
    text: copy.value.macroCaption,
    x: 60,
    y: macroY + macroH + 50,
    fontSizePx: 22,
    color: spec.colorTokens.accent,
    maxWidth: size.width - 120,
    fontWeight: 500,
  });

  // Two disclosure cards (origin + cert) — always present, always placeholder-safe
  const cardsY = macroY + macroH + 110;
  const cardW = Math.round((size.width - 120 - 24) / 2);
  const cardH = 120;
  const cardsSvg = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="60" y="${cardsY}" width="${cardW}" height="${cardH}" rx="12" ry="12" fill="white" stroke="${spec.colorTokens.secondary}" stroke-width="2" />` +
      `<rect x="${60 + cardW + 24}" y="${cardsY}" width="${cardW}" height="${cardH}" rx="12" ry="12" fill="white" stroke="${spec.colorTokens.secondary}" stroke-width="2" />` +
      '</svg>',
  );
  const originLayer = await renderTextOverlay(size, {
    text: copy.value.originLabel,
    x: 80,
    y: cardsY + 64,
    fontSizePx: 20,
    color: spec.colorTokens.accent,
    maxWidth: cardW - 40,
    fontWeight: 600,
  });
  const certLayer = await renderTextOverlay(size, {
    text: copy.value.certLine,
    x: 80 + cardW + 24,
    y: cardsY + 64,
    fontSizePx: 20,
    color: spec.colorTokens.accent,
    maxWidth: cardW - 40,
    fontWeight: 600,
  });

  const layers: Buffer[] = [headlineLayer];
  if (imageLayer) layers.push(imageLayer);
  layers.push(captionLayer, cardsSvg, originLayer, certLayer);

  const composed = await overlayOnto(canvas, layers);

  return {
    buffer: composed,
    copy: {
      headline: copy.value.headline,
      originLabel: copy.value.originLabel,
      macroCaption: copy.value.macroCaption,
      certLine: copy.value.certLine,
    },
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
