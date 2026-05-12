// src/lib/automation/section-renderers/corePerformance.ts
//
// Sprint 7-M2 Phase 2-b-1 — "corePerformance" section renderer.
// Used by S4 (standard pro). 4 metric cards laid out 2x2, each showing
// label + numeric value placeholder + unit + qualitative caption.
//
// KFTC discipline: Groq never fills the numeric value. The caller (Sprint
// 7-Lib) is responsible for stitching product-spec data into ctx; absent
// that, the value renders as "상세 참조" placeholder.

import {
  createCanvas,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { generateCoreMetrics } from './section-copy';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

export const corePerformanceRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generateCoreMetrics(spec, ctx);

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

  // 2x2 grid of metric cards
  const gridGap = 24;
  const gridTop = 200;
  const cardWidth = Math.round((size.width - 120 - gridGap) / 2);
  const cardHeight = Math.min(300, Math.round((size.height - gridTop - 60 - gridGap) / 2));

  const cardPositions = [
    { x: 60, y: gridTop },
    { x: 60 + cardWidth + gridGap, y: gridTop },
    { x: 60, y: gridTop + cardHeight + gridGap },
    { x: 60 + cardWidth + gridGap, y: gridTop + cardHeight + gridGap },
  ];

  const cardLayers: Buffer[] = [];

  // Card backgrounds
  const cardsBgSvgParts = cardPositions.map((pos) =>
    `<rect x="${pos.x}" y="${pos.y}" width="${cardWidth}" height="${cardHeight}" rx="16" ry="16" fill="white" stroke="${spec.colorTokens.secondary}" stroke-width="2" />` +
    `<rect x="${pos.x}" y="${pos.y}" width="${cardWidth}" height="6" rx="16" ry="16" fill="${spec.colorTokens.primary}" />`,
  );
  cardLayers.push(Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">${cardsBgSvgParts.join('')}</svg>`,
  ));

  for (let i = 0; i < 4; i++) {
    const pos = cardPositions[i];
    const card = copy.value.cards[i];

    // Label
    const label = await renderTextOverlay(size, {
      text: card.label,
      x: pos.x + 24,
      y: pos.y + 48,
      fontSizePx: 22,
      color: spec.colorTokens.primary,
      maxWidth: cardWidth - 48,
      fontWeight: 700,
    });
    cardLayers.push(label);

    // Value + unit (large)
    const valueText = card.unit ? `${card.value} ${card.unit}` : card.value;
    const value = await renderTextOverlay(size, {
      text: valueText,
      x: pos.x + 24,
      y: pos.y + Math.round(cardHeight * 0.55),
      fontSizePx: 40,
      color: spec.colorTokens.accent,
      maxWidth: cardWidth - 48,
      fontWeight: 700,
    });
    cardLayers.push(value);

    // Caption
    const caption = await renderTextOverlay(size, {
      text: card.caption,
      x: pos.x + 24,
      y: pos.y + cardHeight - 28,
      fontSizePx: 18,
      color: spec.colorTokens.accent,
      maxWidth: cardWidth - 48,
      fontWeight: 400,
    });
    cardLayers.push(caption);
  }

  const composed = await overlayOnto(canvas, [headlineLayer, ...cardLayers]);

  const copyOut: Record<string, string> = { headline: copy.value.headline };
  copy.value.cards.forEach((c, i) => {
    copyOut[`card${i + 1}_label`] = c.label;
    copyOut[`card${i + 1}_value`] = c.value;
    copyOut[`card${i + 1}_unit`] = c.unit;
    copyOut[`card${i + 1}_caption`] = c.caption;
  });

  return {
    buffer: composed,
    copy: copyOut,
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
