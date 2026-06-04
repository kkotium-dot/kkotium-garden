// src/lib/automation/section-renderers/problem.ts
//
// Sprint 7-M2 Phase 1 — "problem" section renderer.
// Used by S2 (workhorse). Lays out an empathic question at the top and
// three pain-point bullets stacked below.
//
// Layout (860 × section.height):
//   - Background fill (typically warm_50 for S2)
//   - Question line at top, 40px medium, accent color
//   - Three bullet cards, each 720×~120, centered
//   - Bullet dot 16px brand-primary on the left, label text right

import {
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { generateProblemCopy } from './section-copy';
import { resolveEmotionalBackdrop } from './emotional-bg';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

export const problemRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const { canvas } = await resolveEmotionalBackdrop(ctx, size, bg);

  const copy = await generateProblemCopy(spec, ctx);

  const questionLayer = await renderTextOverlay(size, {
    text: copy.value.question,
    x: 60,
    y: 120,
    fontSizePx: 40,
    color: spec.colorTokens.accent,
    maxWidth: size.width - 120,
    fontWeight: 700,
  });

  // Bullet cards
  const cardWidth = 720;
  const cardHeight = 120;
  const cardGap = 40;
  const cardStartY = 240;
  const cardX = Math.round((size.width - cardWidth) / 2);

  const bulletLayers: Buffer[] = [];
  for (let i = 0; i < 3; i++) {
    const y = cardStartY + i * (cardHeight + cardGap);
    const card = Buffer.from(
      `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
        `<rect x="${cardX}" y="${y}" width="${cardWidth}" height="${cardHeight}" ` +
        `rx="16" ry="16" fill="white" stroke="${spec.colorTokens.secondary}" stroke-width="2" />` +
        `<circle cx="${cardX + 40}" cy="${y + cardHeight / 2}" r="14" fill="${spec.colorTokens.primary}" />` +
        '</svg>',
    );
    const bulletText = await renderTextOverlay(size, {
      text: copy.value.bullets[i],
      x: cardX + 80,
      y: y + cardHeight / 2 + 10,
      fontSizePx: 28,
      color: spec.colorTokens.accent,
      maxWidth: cardWidth - 100,
      fontWeight: 500,
    });
    bulletLayers.push(card, bulletText);
  }

  const composed = await overlayOnto(canvas, [questionLayer, ...bulletLayers]);

  return {
    buffer: composed,
    copy: {
      question: copy.value.question,
      bullet1: copy.value.bullets[0],
      bullet2: copy.value.bullets[1],
      bullet3: copy.value.bullets[2],
    },
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
