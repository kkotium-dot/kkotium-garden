// src/lib/automation/section-renderers/story.ts
//
// Sprint 7-M2 Phase 2-a — "story" section renderer.
// Used by S3 (premium gift set) / S6 (sensory gift) / S10 (premium daily).
// Editorial paragraph + attribution + optional signature image strip.

import sharp from 'sharp';
import {
  createCanvas,
  fetchImageBuffer,
  fitImage,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { urlGalleryThumb } from '../cloudinary-pipeline';
import { generateStoryParagraph } from './section-copy';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

async function offsetLayer(
  innerBuffer: Buffer,
  offset: { x: number; y: number },
  outerSize: { width: number; height: number },
): Promise<Buffer> {
  return sharp({
    create: {
      width: outerSize.width,
      height: outerSize.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: innerBuffer, top: offset.y, left: offset.x }])
    .png()
    .toBuffer();
}

/** Crude line wrapper at ~26 Korean chars per line for 26px font, 720px width. */
function wrapKorean(text: string, charsPerLine: number): string[] {
  const lines: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    lines.push(text.slice(cursor, cursor + charsPerLine));
    cursor += charsPerLine;
  }
  return lines;
}

export const storyRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  // Optional signature image — small strip on the right side.
  let withImage: Buffer = canvas;
  try {
    const url = urlGalleryThumb(ctx.sourceImageUrl);
    const buf = await fetchImageBuffer(url);
    const fitted = await fitImage(buf, { width: 260, height: 260 }, bg);
    const placed = await offsetLayer(
      fitted,
      { x: size.width - 260 - 60, y: Math.max(100, Math.round(size.height / 2) - 130) },
      size,
    );
    withImage = await overlayOnto(canvas, [placed]);
  } catch {
    // text-only fallback
  }

  const copy = await generateStoryParagraph(spec, ctx);

  // Body paragraph wrapped to fit left two-thirds.
  const bodyX = 60;
  const bodyWidth = size.width - 260 - 60 - 60; // leave room for the image strip
  const charsPerLine = Math.max(14, Math.floor(bodyWidth / 30));
  const lines = wrapKorean(copy.value.paragraph, charsPerLine);

  const startY = Math.max(120, Math.round((size.height - lines.length * 44) / 2));
  const paragraphLayers: Buffer[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = await renderTextOverlay(size, {
      text: lines[i],
      x: bodyX,
      y: startY + i * 44,
      fontSizePx: 26,
      color: spec.colorTokens.accent,
      maxWidth: bodyWidth,
      fontWeight: 400,
    });
    paragraphLayers.push(line);
  }

  // Attribution line at bottom.
  const attribution = await renderTextOverlay(size, {
    text: copy.value.attribution,
    x: bodyX,
    y: size.height - 60,
    fontSizePx: 20,
    color: spec.colorTokens.primary,
    maxWidth: bodyWidth,
    fontWeight: 600,
  });

  const composed = await overlayOnto(withImage, [...paragraphLayers, attribution]);

  return {
    buffer: composed,
    copy: {
      paragraph: copy.value.paragraph,
      attribution: copy.value.attribution,
    },
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
