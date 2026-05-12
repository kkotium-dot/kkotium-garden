// src/lib/automation/section-renderers/technology.ts
//
// Sprint 7-M2 Phase 2-b-1 — "technology" section renderer.
// Used by S7 (premium pro / clinical-evidence track). Renders a horizontal
// 3-step pipeline diagram followed by a caption paragraph.
//
// Diagram layout: [step1] -> [step2] -> [step3], each step is a rounded
// brand-primary chip with white label text, joined by arrow paths.

import {
  createCanvas,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { generateTechnologyCopy } from './section-copy';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

export const technologyRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generateTechnologyCopy(spec, ctx);

  // Headline + mechanism subtitle
  const headlineLayer = await renderTextOverlay(size, {
    text: copy.value.headline,
    x: 60,
    y: 110,
    fontSizePx: 36,
    color: spec.colorTokens.accent,
    maxWidth: size.width - 120,
    fontWeight: 700,
  });
  const subtitleLayer = await renderTextOverlay(size, {
    text: copy.value.mechanismLabel,
    x: 60,
    y: 160,
    fontSizePx: 22,
    color: spec.colorTokens.primary,
    maxWidth: size.width - 120,
    fontWeight: 500,
  });

  // Pipeline diagram: 3 chips horizontally centered.
  const chipWidth = 200;
  const chipHeight = 100;
  const arrowWidth = 60;
  const totalDiagramWidth = chipWidth * 3 + arrowWidth * 2;
  const diagramStartX = Math.round((size.width - totalDiagramWidth) / 2);
  const diagramY = Math.max(240, Math.round(size.height * 0.45));

  const svgParts: string[] = [];
  for (let i = 0; i < 3; i++) {
    const chipX = diagramStartX + i * (chipWidth + arrowWidth);
    // Chip rectangle
    svgParts.push(
      `<rect x="${chipX}" y="${diagramY}" width="${chipWidth}" height="${chipHeight}" rx="20" ry="20" fill="${spec.colorTokens.primary}" />`,
    );
    // Step number circle
    svgParts.push(
      `<circle cx="${chipX + 28}" cy="${diagramY + chipHeight / 2}" r="18" fill="white" />` +
      `<text x="${chipX + 28}" y="${diagramY + chipHeight / 2 + 7}" text-anchor="middle" fill="${spec.colorTokens.primary}" ` +
      `font-size="18" font-weight="700" font-family="-apple-system, sans-serif">${i + 1}</text>`,
    );

    // Arrow between chips (except after last)
    if (i < 2) {
      const arrowStartX = chipX + chipWidth;
      const arrowMidY = diagramY + chipHeight / 2;
      svgParts.push(
        `<line x1="${arrowStartX + 8}" y1="${arrowMidY}" x2="${arrowStartX + arrowWidth - 18}" y2="${arrowMidY}" ` +
        `stroke="${spec.colorTokens.accent}" stroke-width="3" />` +
        `<polygon points="${arrowStartX + arrowWidth - 18},${arrowMidY - 8} ${arrowStartX + arrowWidth - 6},${arrowMidY} ${arrowStartX + arrowWidth - 18},${arrowMidY + 8}" fill="${spec.colorTokens.accent}" />`,
      );
    }
  }

  const diagramSvg = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">${svgParts.join('')}</svg>`,
  );

  // Step labels (text overlays — easier to handle Korean than embedding in SVG)
  const stepLabelLayers: Buffer[] = [];
  for (let i = 0; i < 3; i++) {
    const chipX = diagramStartX + i * (chipWidth + arrowWidth);
    const label = await renderTextOverlay(size, {
      text: copy.value.steps[i],
      x: chipX + 60,
      y: diagramY + chipHeight / 2 + 8,
      fontSizePx: 22,
      color: '#FFFFFF',
      maxWidth: chipWidth - 80,
      fontWeight: 600,
    });
    stepLabelLayers.push(label);
  }

  // Caption beneath diagram
  const captionLayer = await renderTextOverlay(size, {
    text: copy.value.caption,
    x: 60,
    y: diagramY + chipHeight + 80,
    fontSizePx: 22,
    color: spec.colorTokens.accent,
    maxWidth: size.width - 120,
    fontWeight: 400,
  });

  const composed = await overlayOnto(canvas, [
    headlineLayer,
    subtitleLayer,
    diagramSvg,
    ...stepLabelLayers,
    captionLayer,
  ]);

  return {
    buffer: composed,
    copy: {
      headline: copy.value.headline,
      mechanismLabel: copy.value.mechanismLabel,
      step1: copy.value.steps[0],
      step2: copy.value.steps[1],
      step3: copy.value.steps[2],
      caption: copy.value.caption,
    },
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
