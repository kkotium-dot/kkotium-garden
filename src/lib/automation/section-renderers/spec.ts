// src/lib/automation/section-renderers/spec.ts
//
// Sprint 7-M2 Phase 2-a — "spec" section renderer.
// Used by S1/S3/S6. Two-column spec table with alternating row tint.

import {
  createCanvas,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { generateSpecRows } from './section-copy';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

export const specRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generateSpecRows(spec, ctx);

  const tableX = 60;
  const tableWidth = size.width - 120;
  const rowHeight = 72;
  const labelColWidth = 200;
  const headerH = 80;
  const tableTop = Math.max(100, Math.round((size.height - (headerH + copy.value.rows.length * rowHeight)) / 2));

  // Header
  const headerSvg = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="${tableX}" y="${tableTop}" width="${tableWidth}" height="${headerH}" rx="12" ry="12" fill="${spec.colorTokens.accent}" />` +
      `<text x="${tableX + 28}" y="${tableTop + 52}" fill="white" font-size="28" font-weight="700" ` +
      `font-family="-apple-system, sans-serif">상품 정보</text>` +
      '</svg>',
  );

  // Rows with zebra striping
  const rowLayers: Buffer[] = [];
  for (let i = 0; i < copy.value.rows.length; i++) {
    const row = copy.value.rows[i];
    const y = tableTop + headerH + i * rowHeight;
    const stripFill = i % 2 === 0 ? spec.colorTokens.secondary : '#FFFFFF';
    const strip = Buffer.from(
      `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
        `<rect x="${tableX}" y="${y}" width="${tableWidth}" height="${rowHeight}" fill="${stripFill}" />` +
        `<line x1="${tableX + labelColWidth}" y1="${y + 12}" x2="${tableX + labelColWidth}" y2="${y + rowHeight - 12}" stroke="${spec.colorTokens.primary}" stroke-width="2" />` +
        '</svg>',
    );
    const label = await renderTextOverlay(size, {
      text: row.label,
      x: tableX + 28,
      y: y + 46,
      fontSizePx: 22,
      color: spec.colorTokens.accent,
      maxWidth: labelColWidth - 56,
      fontWeight: 600,
    });
    const value = await renderTextOverlay(size, {
      text: row.value,
      x: tableX + labelColWidth + 28,
      y: y + 46,
      fontSizePx: 22,
      color: spec.colorTokens.accent,
      maxWidth: tableWidth - labelColWidth - 56,
      fontWeight: 400,
    });
    rowLayers.push(strip, label, value);
  }

  const composed = await overlayOnto(canvas, [headerSvg, ...rowLayers]);

  const copyOut: Record<string, string> = {};
  copy.value.rows.forEach((r, i) => {
    copyOut[`row${i + 1}_label`] = r.label;
    copyOut[`row${i + 1}_value`] = r.value;
  });

  return {
    buffer: composed,
    copy: copyOut,
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
