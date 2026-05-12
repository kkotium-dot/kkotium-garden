// src/lib/automation/section-renderers/cta.ts
//
// Sprint 7-M2 Phase 1 — "cta" section renderer.
// Used by S2/S3/S4/S5/S6/S7/S8/S10/S11. The same renderer handles the
// shipping + return + reassurance closer for every skeleton that needs
// a standard fair-trade CTA. Skeletons with non-standard CTAs (S1/S9/S12
// use a shipping section instead) skip this renderer entirely.
//
// Layout (860 × section.height):
//   - Reassurance headline at top, accent color
//   - Two side-by-side info cards: shipping (left), return (right)
//   - Optional good-service badge stripe at the bottom
//   - All copy strings come from generateCtaCopy (Groq + filter)

import {
  createCanvas,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { generateCtaCopy } from './section-copy';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

export const ctaRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generateCtaCopy(spec, ctx);

  const reassuranceLayer = await renderTextOverlay(size, {
    text: copy.value.reassurance,
    x: 60,
    y: 110,
    fontSizePx: 36,
    color: spec.colorTokens.accent,
    maxWidth: size.width - 120,
    fontWeight: 700,
  });

  // Two side-by-side info cards
  const cardWidth = 360;
  const cardHeight = 140;
  const cardGap = 20;
  const cardsY = 200;
  const cardsTotalWidth = cardWidth * 2 + cardGap;
  const cardsX = Math.round((size.width - cardsTotalWidth) / 2);

  const cardsSvg = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="${cardsX}" y="${cardsY}" width="${cardWidth}" height="${cardHeight}" rx="14" ry="14" fill="white" stroke="${spec.colorTokens.secondary}" stroke-width="2" />` +
      `<rect x="${cardsX + cardWidth + cardGap}" y="${cardsY}" width="${cardWidth}" height="${cardHeight}" rx="14" ry="14" fill="white" stroke="${spec.colorTokens.secondary}" stroke-width="2" />` +
      `<text x="${cardsX + 24}" y="${cardsY + 38}" fill="${spec.colorTokens.primary}" font-size="20" font-weight="700" font-family="-apple-system, sans-serif">SHIPPING</text>` +
      `<text x="${cardsX + cardWidth + cardGap + 24}" y="${cardsY + 38}" fill="${spec.colorTokens.primary}" font-size="20" font-weight="700" font-family="-apple-system, sans-serif">RETURN</text>` +
      '</svg>',
  );

  const shippingText = await renderTextOverlay(size, {
    text: copy.value.shippingLine,
    x: cardsX + 24,
    y: cardsY + 84,
    fontSizePx: 22,
    color: spec.colorTokens.accent,
    maxWidth: cardWidth - 48,
    fontWeight: 500,
  });

  const returnText = await renderTextOverlay(size, {
    text: copy.value.returnLine,
    x: cardsX + cardWidth + cardGap + 24,
    y: cardsY + 84,
    fontSizePx: 22,
    color: spec.colorTokens.accent,
    maxWidth: cardWidth - 48,
    fontWeight: 500,
  });

  // Bottom strip: good-service / fair-trade marker
  const stripeY = cardsY + cardHeight + 60;
  const stripe = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="60" y="${stripeY}" width="${size.width - 120}" height="56" rx="12" ry="12" fill="${spec.colorTokens.primary}" />` +
      `<text x="${size.width / 2}" y="${stripeY + 36}" text-anchor="middle" fill="white" font-size="22" font-weight="700" font-family="-apple-system, sans-serif">GOOD SERVICE  ·  FAIR TRADE</text>` +
      '</svg>',
  );

  const composed = await overlayOnto(canvas, [
    reassuranceLayer,
    cardsSvg,
    shippingText,
    returnText,
    stripe,
  ]);

  return {
    buffer: composed,
    copy: {
      reassurance: copy.value.reassurance,
      shippingLine: copy.value.shippingLine,
      returnLine: copy.value.returnLine,
    },
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
