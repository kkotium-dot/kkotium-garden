// src/lib/automation/section-renderers/optionIntro.ts
//
// Sprint 7-M2 Phase 2-b-2 — "optionIntro" section renderer.
// Used by S5 (budget-daily-set kidsmom korean). Renders an option grid
// with color chips so multi-pack buyers can scan available options
// quickly. 4-6 items laid out in two columns.

import {
  createCanvas,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { generateOptionIntroCopy } from './section-copy';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

export const optionIntroRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generateOptionIntroCopy(spec, ctx);

  // Headline
  const headlineLayer = await renderTextOverlay(size, {
    text: copy.value.headline,
    x: 60,
    y: 100,
    fontSizePx: 36,
    color: spec.colorTokens.accent,
    maxWidth: size.width - 120,
    fontWeight: 700,
  });

  // 2-column grid of option cards
  const items = copy.value.items;
  const gridStartY = 180;
  const colGap = 24;
  const rowGap = 20;
  const colWidth = Math.round((size.width - 120 - colGap) / 2);
  const cardHeight = 110;

  const itemLayers: Buffer[] = [];
  for (let i = 0; i < items.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 60 + col * (colWidth + colGap);
    const y = gridStartY + row * (cardHeight + rowGap);

    // Card background + color chip
    const cardSvg = Buffer.from(
      `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
        `<rect x="${x}" y="${y}" width="${colWidth}" height="${cardHeight}" rx="14" ry="14" fill="white" stroke="${spec.colorTokens.secondary}" stroke-width="2" />` +
        `<circle cx="${x + 40}" cy="${y + cardHeight / 2}" r="22" fill="${items[i].chipColor}" stroke="${spec.colorTokens.accent}" stroke-width="2" />` +
        '</svg>',
    );
    const nameLayer = await renderTextOverlay(size, {
      text: items[i].name,
      x: x + 80,
      y: y + 42,
      fontSizePx: 22,
      color: spec.colorTokens.accent,
      maxWidth: colWidth - 100,
      fontWeight: 700,
    });
    const subLayer = await renderTextOverlay(size, {
      text: items[i].sub,
      x: x + 80,
      y: y + 76,
      fontSizePx: 18,
      color: spec.colorTokens.accent,
      maxWidth: colWidth - 100,
      fontWeight: 400,
    });
    itemLayers.push(cardSvg, nameLayer, subLayer);
  }

  // Helper line at the bottom
  const helperLayer = await renderTextOverlay(size, {
    text: copy.value.helperLine,
    x: 60,
    y: size.height - 60,
    fontSizePx: 22,
    color: spec.colorTokens.primary,
    maxWidth: size.width - 120,
    fontWeight: 500,
  });

  const composed = await overlayOnto(canvas, [headlineLayer, ...itemLayers, helperLayer]);

  const copyOut: Record<string, string> = {
    headline: copy.value.headline,
    helperLine: copy.value.helperLine,
  };
  items.forEach((it, i) => {
    copyOut[`option${i + 1}_name`] = it.name;
    copyOut[`option${i + 1}_sub`] = it.sub;
  });

  return {
    buffer: composed,
    copy: copyOut,
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
