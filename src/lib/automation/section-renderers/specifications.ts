// src/lib/automation/section-renderers/specifications.ts
//
// Sprint 7-M2 Phase 2-b-3-b — "specifications" section renderer.
// Used by S12 (budget-pro-options). 2x2 regulation/compliance grid.
//
// KFTC CRITICAL: certification numbers and regulatory codes are NEVER
// rendered as fabricated values. All four cards display a dict placeholder
// for the value field. An invariant caveat strip at the bottom directs
// readers to the detail page for actual cert/code information.

import {
  createCanvas,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { generateSpecificationsCopy } from './section-copy';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

export const specificationsRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generateSpecificationsCopy(spec, ctx);

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

  // 2x2 grid math (leave space for caveat strip at bottom)
  const gridTop = 200;
  const caveatHeight = 60;
  const caveatMargin = 30;
  const gridGap = 20;
  const margin = 60;
  const gridBottom = size.height - caveatHeight - caveatMargin - margin;
  const cellWidth = Math.round((size.width - margin * 2 - gridGap) / 2);
  const cellHeight = Math.round((gridBottom - gridTop - gridGap) / 2);
  const cellPositions = [
    { x: margin, y: gridTop },
    { x: margin + cellWidth + gridGap, y: gridTop },
    { x: margin, y: gridTop + cellHeight + gridGap },
    { x: margin + cellWidth + gridGap, y: gridTop + cellHeight + gridGap },
  ];

  // Card frames
  const cardSvgParts: string[] = [];
  for (const pos of cellPositions) {
    cardSvgParts.push(
      `<rect x="${pos.x}" y="${pos.y}" width="${cellWidth}" height="${cellHeight}" rx="14" ry="14" fill="white" stroke="${spec.colorTokens.secondary}" stroke-width="2" />`,
      // Small accent stripe on the left edge of each card
      `<rect x="${pos.x}" y="${pos.y}" width="6" height="${cellHeight}" rx="3" ry="3" fill="${spec.colorTokens.primary}" />`,
    );
  }
  const cardsSvg = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">${cardSvgParts.join('')}</svg>`,
  );

  const layers: Buffer[] = [headlineLayer, cardsSvg];

  for (let i = 0; i < 4; i++) {
    const pos = cellPositions[i];
    const item = copy.value.items[i];
    if (!item) continue;

    const label = await renderTextOverlay(size, {
      text: item.label,
      x: pos.x + 28,
      y: pos.y + 56,
      fontSizePx: 24,
      color: spec.colorTokens.accent,
      maxWidth: cellWidth - 56,
      fontWeight: 700,
    });
    const value = await renderTextOverlay(size, {
      text: item.value,
      x: pos.x + 28,
      y: pos.y + cellHeight - 36,
      fontSizePx: 16,
      color: spec.colorTokens.primary,
      maxWidth: cellWidth - 56,
      fontWeight: 500,
    });
    layers.push(label, value);
  }

  // Invariant caveat strip at the bottom
  const caveatY = size.height - caveatHeight - caveatMargin;
  const caveatStrip = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="60" y="${caveatY}" width="${size.width - 120}" height="${caveatHeight}" rx="14" ry="14" fill="${spec.colorTokens.accent}" />` +
      '</svg>',
  );
  const caveatText = await renderTextOverlay(size, {
    text: copy.value.caveat,
    x: 86,
    y: caveatY + 38,
    fontSizePx: 18,
    color: '#FFFFFF',
    maxWidth: size.width - 172,
    fontWeight: 500,
  });
  layers.push(caveatStrip, caveatText);

  const composed = await overlayOnto(canvas, layers);

  const copyOut: Record<string, string> = {
    headline: copy.value.headline,
    caveat: copy.value.caveat,
  };
  copy.value.items.forEach((it, i) => {
    copyOut[`item${i + 1}_label`] = it.label;
    copyOut[`item${i + 1}_value`] = it.value;
  });

  return {
    buffer: composed,
    copy: copyOut,
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
