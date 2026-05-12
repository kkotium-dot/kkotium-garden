// src/lib/automation/section-renderers/package.ts
//
// Sprint 7-M2 Phase 2-b-3-b — "package" section renderer.
// Used by S3 (premium-gift-set). Three-step unboxing sequence with
// numbered badges, labels, and gift-handover captions. Each step
// optionally surfaces the shared product image as a backdrop crop.

import sharp from 'sharp';
import {
  createCanvas,
  fetchImageBuffer,
  fitImage,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { urlGalleryThumb } from '../cloudinary-pipeline';
import { generatePackageCopy } from './section-copy';
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

export const packageRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generatePackageCopy(spec, ctx);

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

  // 3-step horizontal sequence
  const stepsTop = 200;
  const stepGap = 18;
  const margin = 60;
  const stepW = Math.round((size.width - margin * 2 - stepGap * 2) / 3);
  const stepH = Math.min(820, size.height - stepsTop - 60);
  const stepPositions = [
    { x: margin, y: stepsTop },
    { x: margin + stepW + stepGap, y: stepsTop },
    { x: margin + (stepW + stepGap) * 2, y: stepsTop },
  ];

  // Reusable image (each step shares the source image until Sprint 7-Lib
  // supplies per-step package crops)
  let baseImage: Buffer | null = null;
  try {
    const url = urlGalleryThumb(ctx.sourceImageUrl);
    baseImage = await fetchImageBuffer(url);
  } catch {
    baseImage = null;
  }

  // Card frames with arrow connectors between steps
  const cardSvgParts: string[] = [];
  for (let i = 0; i < stepPositions.length; i++) {
    const pos = stepPositions[i];
    cardSvgParts.push(
      `<rect x="${pos.x}" y="${pos.y}" width="${stepW}" height="${stepH}" rx="16" ry="16" fill="white" stroke="${spec.colorTokens.secondary}" stroke-width="2" />`,
      // Numbered badge — circle in the top-left
      `<circle cx="${pos.x + 36}" cy="${pos.y + 36}" r="22" fill="${spec.colorTokens.primary}" />`,
      `<text x="${pos.x + 36}" y="${pos.y + 44}" fill="white" font-size="22" font-weight="700" text-anchor="middle" font-family="-apple-system, sans-serif">${i + 1}</text>`,
    );
    if (i < stepPositions.length - 1) {
      // Arrow connector
      const arrowX = pos.x + stepW + stepGap / 2;
      const arrowY = pos.y + Math.round(stepH / 2);
      cardSvgParts.push(
        `<path d="M ${arrowX - 6} ${arrowY - 8} L ${arrowX + 6} ${arrowY} L ${arrowX - 6} ${arrowY + 8} Z" fill="${spec.colorTokens.primary}" opacity="0.6" />`,
      );
    }
  }
  const cardsSvg = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">${cardSvgParts.join('')}</svg>`,
  );

  const layers: Buffer[] = [headlineLayer, cardsSvg];

  for (let i = 0; i < 3; i++) {
    const pos = stepPositions[i];
    const step = copy.value.steps[i];
    const imgH = Math.round(stepH * 0.5);
    const imgY = pos.y + 80;

    if (baseImage) {
      try {
        const fitted = await fitImage(baseImage, { width: stepW - 32, height: imgH - 16 }, '#FFFFFF');
        const placed = await offsetLayer(fitted, { x: pos.x + 16, y: imgY }, size);
        layers.push(placed);
      } catch {
        // skip image
      }
    }

    const labelY = imgY + imgH + 30;
    const label = await renderTextOverlay(size, {
      text: step.label,
      x: pos.x + 24,
      y: labelY,
      fontSizePx: 22,
      color: spec.colorTokens.accent,
      maxWidth: stepW - 48,
      fontWeight: 700,
    });
    const caption = await renderTextOverlay(size, {
      text: step.caption,
      x: pos.x + 24,
      y: labelY + 38,
      fontSizePx: 16,
      color: spec.colorTokens.primary,
      maxWidth: stepW - 48,
      fontWeight: 400,
    });
    layers.push(label, caption);
  }

  const composed = await overlayOnto(canvas, layers);

  const copyOut: Record<string, string> = { headline: copy.value.headline };
  copy.value.steps.forEach((s, i) => {
    copyOut[`step${i + 1}_label`] = s.label;
    copyOut[`step${i + 1}_caption`] = s.caption;
  });

  return {
    buffer: composed,
    copy: copyOut,
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
