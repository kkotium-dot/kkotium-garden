// src/lib/automation/section-renderers/product.ts
//
// Sprint 7-M2 Phase 2-a — "product" section renderer.
// Used by S3 (premium gift set) / S8 (seasonal event set). 2x2 grid where
// each cell pairs a labeled attribute with the same product image (Sprint
// 7-Lib will swap per-cell detail crops in a follow-up).

import sharp from 'sharp';
import {
  createCanvas,
  fetchImageBuffer,
  fitImage,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { urlGalleryThumb } from '../cloudinary-pipeline';
import { generateProductGrid } from './section-copy';
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

export const productRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generateProductGrid(spec, ctx);

  // Grid math — 2x2, with margins.
  const gridGap = 24;
  const margin = 60;
  const cellWidth = Math.round((size.width - margin * 2 - gridGap) / 2);
  const cellHeight = Math.round((size.height - margin * 2 - gridGap) / 2);
  const cellPositions = [
    { x: margin, y: margin },
    { x: margin + cellWidth + gridGap, y: margin },
    { x: margin, y: margin + cellHeight + gridGap },
    { x: margin + cellWidth + gridGap, y: margin + cellHeight + gridGap },
  ];

  // Fetch product image once and reuse — Sprint 7-Lib will swap per-cell crops.
  let productImage: Buffer | null = null;
  try {
    const url = urlGalleryThumb(ctx.sourceImageUrl);
    productImage = await fetchImageBuffer(url);
  } catch {
    productImage = null;
  }

  // Each cell: white card, optional image (top 60%), title + caption (bottom 40%)
  const cardSvgParts: string[] = [];
  for (const pos of cellPositions) {
    cardSvgParts.push(
      `<rect x="${pos.x}" y="${pos.y}" width="${cellWidth}" height="${cellHeight}" rx="16" ry="16" fill="white" stroke="${spec.colorTokens.secondary}" stroke-width="2" />`,
    );
  }
  const cardsSvg = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">${cardSvgParts.join('')}</svg>`,
  );

  const cellLayers: Buffer[] = [cardsSvg];

  for (let i = 0; i < 4; i++) {
    const pos = cellPositions[i];
    const cell = copy.value.cells[i];
    const imgH = Math.round(cellHeight * 0.55);

    // Image inside the cell, if available
    if (productImage) {
      try {
        const fitted = await fitImage(productImage, { width: cellWidth - 40, height: imgH - 40 }, '#FFFFFF');
        const placed = await offsetLayer(
          fitted,
          { x: pos.x + 20, y: pos.y + 20 },
          size,
        );
        cellLayers.push(placed);
      } catch {
        // Skip image, keep card
      }
    }

    // Text below image
    const textY = pos.y + imgH + 20;
    const title = await renderTextOverlay(size, {
      text: cell.title,
      x: pos.x + 24,
      y: textY + 24,
      fontSizePx: 22,
      color: spec.colorTokens.primary,
      maxWidth: cellWidth - 48,
      fontWeight: 700,
    });
    const caption = await renderTextOverlay(size, {
      text: cell.caption,
      x: pos.x + 24,
      y: textY + 60,
      fontSizePx: 18,
      color: spec.colorTokens.accent,
      maxWidth: cellWidth - 48,
      fontWeight: 400,
    });
    cellLayers.push(title, caption);
  }

  const composed = await overlayOnto(canvas, cellLayers);

  const copyOut: Record<string, string> = {};
  copy.value.cells.forEach((cell, i) => {
    copyOut[`cell${i + 1}_title`] = cell.title;
    copyOut[`cell${i + 1}_caption`] = cell.caption;
  });

  return {
    buffer: composed,
    copy: copyOut,
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
