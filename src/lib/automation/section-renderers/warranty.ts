// src/lib/automation/section-renderers/warranty.ts
//
// Sprint 7-M2 Phase 2-a — "warranty" section renderer.
// Used by S4 (standard pro) / S7 (premium pro). Headline + three line
// items, each prefixed by a circular check mark. Skeleton.primary is used
// for the check fill so palette swap propagates.

import {
  createCanvas,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { generateWarrantyCopy } from './section-copy';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

export const warrantyRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generateWarrantyCopy(spec, ctx);

  // Headline
  const headlineLayer = await renderTextOverlay(size, {
    text: copy.value.headline,
    x: 60,
    y: 110,
    fontSizePx: 38,
    color: spec.colorTokens.accent,
    maxWidth: size.width - 120,
    fontWeight: 700,
  });

  // Lines with circle check icons
  const lineStartY = 220;
  const lineGap = 110;
  const cardX = 60;
  const cardW = size.width - 120;
  const cardH = 88;

  const lineLayers: Buffer[] = [];
  for (let i = 0; i < copy.value.lines.length; i++) {
    const y = lineStartY + i * lineGap;
    const cardSvg = Buffer.from(
      `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
        `<rect x="${cardX}" y="${y}" width="${cardW}" height="${cardH}" rx="14" ry="14" fill="white" stroke="${spec.colorTokens.secondary}" stroke-width="2" />` +
        `<circle cx="${cardX + 44}" cy="${y + cardH / 2}" r="22" fill="${spec.colorTokens.primary}" />` +
        `<path d="M ${cardX + 32} ${y + cardH / 2} l 10 10 l 18 -20" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" />` +
        '</svg>',
    );
    const text = await renderTextOverlay(size, {
      text: copy.value.lines[i],
      x: cardX + 90,
      y: y + cardH / 2 + 8,
      fontSizePx: 24,
      color: spec.colorTokens.accent,
      maxWidth: cardW - 130,
      fontWeight: 500,
    });
    lineLayers.push(cardSvg, text);
  }

  const composed = await overlayOnto(canvas, [headlineLayer, ...lineLayers]);

  return {
    buffer: composed,
    copy: {
      headline: copy.value.headline,
      line1: copy.value.lines[0],
      line2: copy.value.lines[1],
      line3: copy.value.lines[2],
    },
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
