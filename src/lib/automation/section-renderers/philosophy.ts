// src/lib/automation/section-renderers/philosophy.ts
//
// Sprint 7-M2 Phase 2-b-3-a — "philosophy" section renderer.
// Used by S10 (premium-daily-options). Editorial paragraph + brand
// signature line. Restrained, value-led — no efficacy claims allowed
// in the prompt (filterDarkPatterns blocks superlatives separately).

import {
  createCanvas,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { generatePhilosophyCopy } from './section-copy';
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

export const philosophyRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generatePhilosophyCopy(spec, ctx);

  // Headline
  const headlineLayer = await renderTextOverlay(size, {
    text: copy.value.headline,
    x: 60,
    y: 130,
    fontSizePx: 40,
    color: spec.colorTokens.accent,
    maxWidth: size.width - 120,
    fontWeight: 700,
  });

  // Body wrapped at ~28 Korean chars per line
  const bodyX = 60;
  const bodyW = size.width - 120;
  const charsPerLine = 28;
  const lines = wrapKorean(copy.value.paragraph, charsPerLine);
  const lineHeight = 46;
  const bodyStart = Math.max(230, Math.round((size.height - lines.length * lineHeight) / 2));

  const paragraphLayers: Buffer[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = await renderTextOverlay(size, {
      text: lines[i],
      x: bodyX,
      y: bodyStart + i * lineHeight,
      fontSizePx: 26,
      color: spec.colorTokens.accent,
      maxWidth: bodyW,
      fontWeight: 400,
    });
    paragraphLayers.push(line);
  }

  // Signature line near bottom
  const signatureLayer = await renderTextOverlay(size, {
    text: copy.value.signature,
    x: bodyX,
    y: size.height - 88,
    fontSizePx: 20,
    color: spec.colorTokens.primary,
    maxWidth: bodyW,
    fontWeight: 600,
  });

  // Brand accent stripe at the very bottom
  const stripeSvg = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="60" y="${size.height - 40}" width="80" height="3" rx="2" ry="2" fill="${spec.colorTokens.primary}" />` +
      '</svg>',
  );

  const composed = await overlayOnto(canvas, [headlineLayer, ...paragraphLayers, signatureLayer, stripeSvg]);

  return {
    buffer: composed,
    copy: {
      headline: copy.value.headline,
      paragraph: copy.value.paragraph,
      signature: copy.value.signature,
    },
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
