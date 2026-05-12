// src/lib/automation/section-renderers/reviews.ts
//
// Sprint 7-M2 Phase 2-b-3-a — "reviews" section renderer.
// Used by S10 (premium-daily-options).
//
// KFTC CRITICAL: the renderer NEVER displays fabricated review quotes.
// All three cards render with the same dict placeholder text until Sprint
// 7-Lib supplies real review data from ctx. Attribution is numbered to
// make the placeholder nature obvious to readers. Star icons render as
// neutral grey dots (visual cue only — never a fabricated rating).

import {
  createCanvas,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { generateReviewsCopy } from './section-copy';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

function wrapKorean(text: string, charsPerLine: number): string[] {
  const lines: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    lines.push(text.slice(cursor, cursor + charsPerLine));
    cursor += charsPerLine;
  }
  return lines;
}

export const reviewsRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generateReviewsCopy(spec, ctx);

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

  // 3 placeholder cards laid out horizontally
  const cardGap = 18;
  const margin = 60;
  const cardW = Math.round((size.width - margin * 2 - cardGap * 2) / 3);
  const cardH = Math.min(640, size.height - 280);
  const cardsY = 200;
  const cardPositions = [
    { x: margin, y: cardsY },
    { x: margin + cardW + cardGap, y: cardsY },
    { x: margin + (cardW + cardGap) * 2, y: cardsY },
  ];

  // Background cards + neutral 5-dot strip (NOT a rating — pure visual cue)
  const cardSvgParts: string[] = [];
  for (const pos of cardPositions) {
    cardSvgParts.push(
      `<rect x="${pos.x}" y="${pos.y}" width="${cardW}" height="${cardH}" rx="16" ry="16" fill="white" stroke="${spec.colorTokens.secondary}" stroke-width="2" />`,
      `<circle cx="${pos.x + 24}" cy="${pos.y + 40}" r="6" fill="${spec.colorTokens.primary}" opacity="0.3" />`,
      `<circle cx="${pos.x + 42}" cy="${pos.y + 40}" r="6" fill="${spec.colorTokens.primary}" opacity="0.3" />`,
      `<circle cx="${pos.x + 60}" cy="${pos.y + 40}" r="6" fill="${spec.colorTokens.primary}" opacity="0.3" />`,
      `<circle cx="${pos.x + 78}" cy="${pos.y + 40}" r="6" fill="${spec.colorTokens.primary}" opacity="0.3" />`,
      `<circle cx="${pos.x + 96}" cy="${pos.y + 40}" r="6" fill="${spec.colorTokens.primary}" opacity="0.3" />`,
    );
  }
  const cardsSvg = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">${cardSvgParts.join('')}</svg>`,
  );

  const layers: Buffer[] = [headlineLayer, cardsSvg];

  for (let i = 0; i < 3; i++) {
    const pos = cardPositions[i];
    // Quote — wrapped within card width
    const quoteLines = wrapKorean(copy.value.placeholderQuote, 14);
    const quoteStartY = pos.y + 100;
    for (let j = 0; j < Math.min(quoteLines.length, 5); j++) {
      const line = await renderTextOverlay(size, {
        text: quoteLines[j],
        x: pos.x + 22,
        y: quoteStartY + j * 32,
        fontSizePx: 18,
        color: spec.colorTokens.accent,
        maxWidth: cardW - 44,
        fontWeight: 400,
      });
      layers.push(line);
    }
    // Attribution at bottom of card — placeholder + numeric index
    const attribution = await renderTextOverlay(size, {
      text: `${copy.value.placeholderAttribution} ${i + 1}`,
      x: pos.x + 22,
      y: pos.y + cardH - 36,
      fontSizePx: 16,
      color: spec.colorTokens.primary,
      maxWidth: cardW - 44,
      fontWeight: 600,
    });
    layers.push(attribution);
  }

  const composed = await overlayOnto(canvas, layers);

  return {
    buffer: composed,
    copy: {
      headline: copy.value.headline,
      placeholderQuote: copy.value.placeholderQuote,
      placeholderAttribution: copy.value.placeholderAttribution,
    },
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
