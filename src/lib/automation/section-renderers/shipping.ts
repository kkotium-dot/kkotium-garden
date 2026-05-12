// src/lib/automation/section-renderers/shipping.ts
//
// Sprint 7-M2 Phase 2-a — "shipping" section renderer.
// Used by S1 / S9 / S12. These three skeletons end on a shipping section
// instead of the heavier S2-style CTA — the renderer is a leaner variant
// that reuses generateCtaCopy() (shipping line + return line) and drops
// the reassurance headline + good-service strip.
//
// S9 (natural) adds a small "recyclable packaging" badge on the right
// when section.layout mentions "recyclable_packaging" — purely a visual
// affordance, not a verified claim (KFTC-safe phrasing handled in
// copy-writer's filter).

import {
  createCanvas,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { generateCtaCopy } from './section-copy';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

export const shippingRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generateCtaCopy(spec, ctx);

  // Two info cards stacked vertically (better fit for the shorter shipping
  // section heights — S1/S9 use 700-800px tall sections).
  const cardX = 60;
  const cardW = size.width - 120;
  const cardH = 110;
  const gap = 24;
  const blockTop = Math.max(80, Math.round((size.height - (cardH * 2 + gap)) / 2));

  const cardsSvg = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="${cardX}" y="${blockTop}" width="${cardW}" height="${cardH}" rx="14" ry="14" fill="white" stroke="${spec.colorTokens.secondary}" stroke-width="2" />` +
      `<rect x="${cardX}" y="${blockTop + cardH + gap}" width="${cardW}" height="${cardH}" rx="14" ry="14" fill="white" stroke="${spec.colorTokens.secondary}" stroke-width="2" />` +
      `<text x="${cardX + 24}" y="${blockTop + 34}" fill="${spec.colorTokens.primary}" font-size="20" font-weight="700" font-family="-apple-system, sans-serif">SHIPPING</text>` +
      `<text x="${cardX + 24}" y="${blockTop + cardH + gap + 34}" fill="${spec.colorTokens.primary}" font-size="20" font-weight="700" font-family="-apple-system, sans-serif">RETURN</text>` +
      '</svg>',
  );

  const shipText = await renderTextOverlay(size, {
    text: copy.value.shippingLine,
    x: cardX + 24,
    y: blockTop + 78,
    fontSizePx: 22,
    color: spec.colorTokens.accent,
    maxWidth: cardW - 48,
    fontWeight: 500,
  });
  const returnText = await renderTextOverlay(size, {
    text: copy.value.returnLine,
    x: cardX + 24,
    y: blockTop + cardH + gap + 78,
    fontSizePx: 22,
    color: spec.colorTokens.accent,
    maxWidth: cardW - 48,
    fontWeight: 500,
  });

  // Recyclable-packaging affordance for S9 (natural) — purely visual.
  const layers: Buffer[] = [cardsSvg, shipText, returnText];
  if (section.layout.includes('recyclable_packaging')) {
    const badgeX = cardX + cardW - 200;
    const badgeY = blockTop + cardH + gap + cardH - 44;
    const ecoBadge = Buffer.from(
      `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
        `<rect x="${badgeX}" y="${badgeY}" width="180" height="36" rx="18" ry="18" fill="${spec.colorTokens.primary}" />` +
        `<text x="${badgeX + 90}" y="${badgeY + 24}" text-anchor="middle" fill="white" font-size="16" font-weight="700" font-family="-apple-system, sans-serif">RECYCLABLE PACK</text>` +
        '</svg>',
    );
    layers.push(ecoBadge);
  }

  const composed = await overlayOnto(canvas, layers);

  return {
    buffer: composed,
    copy: {
      shippingLine: copy.value.shippingLine,
      returnLine: copy.value.returnLine,
    },
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
