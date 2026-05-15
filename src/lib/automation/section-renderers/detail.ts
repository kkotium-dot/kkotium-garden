// src/lib/automation/section-renderers/detail.ts
//
// Sprint 7-M2 Phase 2-b-3-a — "detail" section renderer.
// Used by S10 (premium-daily-options). 2x2 macro detail grid. Distinct
// from "product" (which is 2x2 product attributes) — detail focuses on
// tactile/visual macros (material grain / stitching / lining / edge).
//
// Each cell shares the same source image until Sprint 7-Lib supplies
// per-cell detail crops.

import sharp from 'sharp';
import {
  createCanvas,
  fetchImageBuffer,
  fitImage,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
// Phase 3-C-3-h (2026-05-15): bypass Cloudinary fetch (account-restricted),
// fetch source URL directly.
import { generateDetailGridCopy } from './section-copy';
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

export const detailRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generateDetailGridCopy(spec, ctx);

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

  // 2x2 grid math
  const gridTop = 210;
  const gridGap = 24;
  const margin = 60;
  const cellWidth = Math.round((size.width - margin * 2 - gridGap) / 2);
  const cellHeight = Math.round((size.height - gridTop - margin - gridGap) / 2);
  const cellPositions = [
    { x: margin, y: gridTop },
    { x: margin + cellWidth + gridGap, y: gridTop },
    { x: margin, y: gridTop + cellHeight + gridGap },
    { x: margin + cellWidth + gridGap, y: gridTop + cellHeight + gridGap },
  ];

  // Reusable macro image
  let baseImage: Buffer | null = null;
  try {
    baseImage = await fetchImageBuffer(ctx.lifestyleAssetUrl ?? ctx.sourceImageUrl);
  } catch {
    baseImage = null;
  }

  // Background cards
  const cardSvgParts: string[] = [];
  for (const pos of cellPositions) {
    cardSvgParts.push(
      `<rect x="${pos.x}" y="${pos.y}" width="${cellWidth}" height="${cellHeight}" rx="14" ry="14" fill="white" stroke="${spec.colorTokens.secondary}" stroke-width="2" />`,
    );
  }
  const cardsSvg = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">${cardSvgParts.join('')}</svg>`,
  );

  const layers: Buffer[] = [headlineLayer, cardsSvg];

  for (let i = 0; i < 4; i++) {
    const pos = cellPositions[i];
    const cell = copy.value.cells[i];
    const imgH = Math.round(cellHeight * 0.62);

    if (baseImage) {
      try {
        const fitted = await fitImage(baseImage, { width: cellWidth - 32, height: imgH - 32 }, '#FFFFFF');
        const placed = await offsetLayer(fitted, { x: pos.x + 16, y: pos.y + 16 }, size);
        layers.push(placed);
      } catch {
        // skip image
      }
    }

    const titleY = pos.y + imgH + 24;
    const title = await renderTextOverlay(size, {
      text: cell.title,
      x: pos.x + 22,
      y: titleY,
      fontSizePx: 24,
      color: spec.colorTokens.primary,
      maxWidth: cellWidth - 44,
      fontWeight: 700,
    });
    const body = await renderTextOverlay(size, {
      text: cell.body,
      x: pos.x + 22,
      y: titleY + 38,
      fontSizePx: 18,
      color: spec.colorTokens.accent,
      maxWidth: cellWidth - 44,
      fontWeight: 400,
    });
    layers.push(title, body);
  }

  const composed = await overlayOnto(canvas, layers);

  const copyOut: Record<string, string> = { headline: copy.value.headline };
  copy.value.cells.forEach((c, i) => {
    copyOut[`cell${i + 1}_title`] = c.title;
    copyOut[`cell${i + 1}_body`] = c.body;
  });

  return {
    buffer: composed,
    copy: copyOut,
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
