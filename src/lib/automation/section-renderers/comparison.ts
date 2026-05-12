// src/lib/automation/section-renderers/comparison.ts
//
// Sprint 7-M2 Phase 2-a — "comparison" section renderer.
// Used by S4 (standard pro) / S7 (premium pro). Three-column table:
// feature label | ours | baseline. KFTC dark-pattern filter rejects
// superlatives and fabricated competitor names — generated copy is
// constrained to objective category baselines.

import {
  createCanvas,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { generateComparisonCopy } from './section-copy';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

export const comparisonRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generateComparisonCopy(spec, ctx);

  // Headline at top
  const headlineLayer = await renderTextOverlay(size, {
    text: copy.value.headline,
    x: 60,
    y: 100,
    fontSizePx: 36,
    color: spec.colorTokens.accent,
    maxWidth: size.width - 120,
    fontWeight: 700,
  });

  // Table geometry
  const tableX = 60;
  const tableW = size.width - 120;
  const headerH = 64;
  const rowH = 76;
  const featureColW = 180;
  const dataColW = Math.round((tableW - featureColW) / 2);
  const tableTop = 180;

  // Header bar
  const headerSvg = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="${tableX}" y="${tableTop}" width="${tableW}" height="${headerH}" rx="10" ry="10" fill="${spec.colorTokens.accent}" />` +
      `<text x="${tableX + 20}" y="${tableTop + 42}" fill="white" font-size="20" font-weight="700" font-family="-apple-system, sans-serif">항목</text>` +
      `<text x="${tableX + featureColW + 20}" y="${tableTop + 42}" fill="white" font-size="20" font-weight="700" font-family="-apple-system, sans-serif">본 상품</text>` +
      `<text x="${tableX + featureColW + dataColW + 20}" y="${tableTop + 42}" fill="white" font-size="20" font-weight="700" font-family="-apple-system, sans-serif">${copy.value.baselineLabel}</text>` +
      '</svg>',
  );

  // Body rows
  const rowLayers: Buffer[] = [];
  for (let i = 0; i < copy.value.rows.length; i++) {
    const row = copy.value.rows[i];
    const y = tableTop + headerH + i * rowH;
    const stripFill = i % 2 === 0 ? '#FFFFFF' : spec.colorTokens.secondary;

    const stripSvg = Buffer.from(
      `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
        `<rect x="${tableX}" y="${y}" width="${tableW}" height="${rowH}" fill="${stripFill}" stroke="${spec.colorTokens.secondary}" stroke-width="1" />` +
        // Highlight stripe under "ours" column
        `<rect x="${tableX + featureColW}" y="${y}" width="${dataColW}" height="${rowH}" fill="${spec.colorTokens.primary}" opacity="0.08" />` +
        '</svg>',
    );

    const feat = await renderTextOverlay(size, {
      text: row.feature,
      x: tableX + 20,
      y: y + 48,
      fontSizePx: 22,
      color: spec.colorTokens.accent,
      maxWidth: featureColW - 40,
      fontWeight: 600,
    });
    const ours = await renderTextOverlay(size, {
      text: row.ours,
      x: tableX + featureColW + 20,
      y: y + 48,
      fontSizePx: 20,
      color: spec.colorTokens.primary,
      maxWidth: dataColW - 40,
      fontWeight: 600,
    });
    const base = await renderTextOverlay(size, {
      text: row.baseline,
      x: tableX + featureColW + dataColW + 20,
      y: y + 48,
      fontSizePx: 20,
      color: spec.colorTokens.accent,
      maxWidth: dataColW - 40,
      fontWeight: 400,
    });
    rowLayers.push(stripSvg, feat, ours, base);
  }

  const composed = await overlayOnto(canvas, [headlineLayer, headerSvg, ...rowLayers]);

  const copyOut: Record<string, string> = {
    headline: copy.value.headline,
    baselineLabel: copy.value.baselineLabel,
  };
  copy.value.rows.forEach((r, i) => {
    copyOut[`row${i + 1}_feature`] = r.feature;
    copyOut[`row${i + 1}_ours`] = r.ours;
    copyOut[`row${i + 1}_baseline`] = r.baseline;
  });

  return {
    buffer: composed,
    copy: copyOut,
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
