// src/lib/automation/section-renderers/solution.ts
//
// Sprint 7-M2 Phase 1 — "solution" section renderer.
// Used by S2 (workhorse). Pairs a product closeup with three benefit
// bullets that the copy-writer is instructed to season with at least
// one number or specification.
//
// Layout (860 × section.height):
//   - Product closeup (left side, 380×380)
//   - Headline above the benefits (right side)
//   - Three benefit rows (right side), each with index circle + text

import {
  fetchImageBuffer,
  fitImage,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { urlGalleryThumb } from '../cloudinary-pipeline';
import sharp from 'sharp';
import { generateSolutionCopy } from './section-copy';
import { resolveEmotionalBackdrop } from './emotional-bg';
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

export const solutionRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const { canvas } = await resolveEmotionalBackdrop(ctx, size, bg);

  let withImage: Buffer = canvas;
  try {
    const productUrl = urlGalleryThumb(ctx.sourceImageUrl);
    const buf = await fetchImageBuffer(productUrl);
    const fitted = await fitImage(buf, { width: 380, height: 380 }, '#FFFFFF');
    const placed = await offsetLayer(
      fitted,
      { x: 60, y: Math.round((size.height - 380) / 2) },
      size,
    );
    withImage = await overlayOnto(canvas, [placed]);
  } catch {
    // Graceful degrade — render text-only.
  }

  const copy = await generateSolutionCopy(spec, ctx);

  const textX = 500;
  const headlineY = Math.round(size.height / 2) - 200;

  const headlineLayer = await renderTextOverlay(size, {
    text: copy.value.headline,
    x: textX,
    y: headlineY,
    fontSizePx: 36,
    color: spec.colorTokens.accent,
    maxWidth: size.width - textX - 60,
    fontWeight: 700,
  });

  const benefitLayers: Buffer[] = [];
  for (let i = 0; i < 3; i++) {
    const y = headlineY + 80 + i * 100;
    const circle = Buffer.from(
      `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
        `<circle cx="${textX + 22}" cy="${y - 12}" r="22" fill="${spec.colorTokens.primary}" />` +
        `<text x="${textX + 22}" y="${y - 4}" text-anchor="middle" fill="white" font-size="24" font-weight="700" ` +
        `font-family="-apple-system, sans-serif">${i + 1}</text>` +
        '</svg>',
    );
    const text = await renderTextOverlay(size, {
      text: copy.value.benefits[i],
      x: textX + 70,
      y: y,
      fontSizePx: 26,
      color: spec.colorTokens.accent,
      maxWidth: size.width - textX - 130,
      fontWeight: 500,
    });
    benefitLayers.push(circle, text);
  }

  const composed = await overlayOnto(withImage, [headlineLayer, ...benefitLayers]);

  return {
    buffer: composed,
    copy: {
      headline: copy.value.headline,
      benefit1: copy.value.benefits[0],
      benefit2: copy.value.benefits[1],
      benefit3: copy.value.benefits[2],
    },
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
