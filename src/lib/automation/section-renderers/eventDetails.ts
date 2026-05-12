// src/lib/automation/section-renderers/eventDetails.ts
//
// Sprint 7-M2 Phase 2-b-2 — "eventDetails" section renderer.
// Used by S11 (vintage event-single, friendly/vivid/vintage).
//
// KFTC discipline: limited drops are scarcity-adjacent by nature, so KFTC
// requires explicit *edition number*, *drop date*, and *quantity* to be
// surfaced on the page. The renderer enforces all three by always
// drawing three rounded info cards — even when the data is unknown the
// cards display "상세 페이지 참조" placeholders rather than disappearing.

import {
  createCanvas,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { generateEventDetailsCopy } from './section-copy';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

export const eventDetailsRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generateEventDetailsCopy(spec, ctx);

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

  // Three info cards stacked vertically: edition / drop date / quantity
  const infoCards = [
    { label: 'EDITION', text: copy.value.editionLabel },
    { label: 'DROP DATE', text: copy.value.dropDateLabel },
    { label: 'QUANTITY', text: copy.value.quantityLabel },
  ];

  const cardX = 60;
  const cardW = size.width - 120;
  const cardH = 88;
  const cardGap = 20;
  const cardsTop = 170;

  const layers: Buffer[] = [headlineLayer];
  for (let i = 0; i < infoCards.length; i++) {
    const y = cardsTop + i * (cardH + cardGap);
    const cardSvg = Buffer.from(
      `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
        `<rect x="${cardX}" y="${y}" width="${cardW}" height="${cardH}" rx="14" ry="14" fill="white" stroke="${spec.colorTokens.primary}" stroke-width="2" />` +
        `<text x="${cardX + 24}" y="${y + 32}" fill="${spec.colorTokens.primary}" font-size="16" font-weight="700" font-family="-apple-system, sans-serif">${infoCards[i].label}</text>` +
        '</svg>',
    );
    const text = await renderTextOverlay(size, {
      text: infoCards[i].text,
      x: cardX + 24,
      y: y + 66,
      fontSizePx: 22,
      color: spec.colorTokens.accent,
      maxWidth: cardW - 48,
      fontWeight: 600,
    });
    layers.push(cardSvg, text);
  }

  // Story paragraph at the bottom
  const storyY = cardsTop + infoCards.length * (cardH + cardGap) + 20;
  const storyLayer = await renderTextOverlay(size, {
    text: copy.value.story,
    x: 60,
    y: storyY + 24,
    fontSizePx: 20,
    color: spec.colorTokens.accent,
    maxWidth: size.width - 120,
    fontWeight: 400,
  });
  layers.push(storyLayer);

  const composed = await overlayOnto(canvas, layers);

  return {
    buffer: composed,
    copy: {
      headline: copy.value.headline,
      editionLabel: copy.value.editionLabel,
      dropDateLabel: copy.value.dropDateLabel,
      quantityLabel: copy.value.quantityLabel,
      story: copy.value.story,
    },
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
