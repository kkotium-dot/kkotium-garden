// src/lib/automation/section-renderers/specTable.ts
//
// Sprint 7-M2 Phase 2-b-3-b — "specTable" section renderer.
// Used by S12 (budget-pro-options). Full-width 3-column technical spec
// table with parameter / value / unit columns. KFTC strict: value column
// is always a "상세 페이지 참조" placeholder until ctx supplies real
// product spec values (Sprint 7-Lib follow-up).

import {
  createCanvas,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { generateSpecTableCopy } from './section-copy';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

export const specTableRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generateSpecTableCopy(spec, ctx);

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

  // 3-column layout
  const tableX = 60;
  const tableW = size.width - 120;
  const paramColW = 240;
  const unitColW = 120;
  const valueColW = tableW - paramColW - unitColW;
  const headerH = 56;
  const rowH = 64;
  const tableTop = 200;

  // Header bar
  const headerSvg = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="${tableX}" y="${tableTop}" width="${tableW}" height="${headerH}" rx="10" ry="10" fill="${spec.colorTokens.accent}" />` +
      '</svg>',
  );

  const paramHeaderLayer = await renderTextOverlay(size, {
    text: copy.value.columnHeaders.parameter,
    x: tableX + 24,
    y: tableTop + 36,
    fontSizePx: 18,
    color: '#FFFFFF',
    maxWidth: paramColW - 40,
    fontWeight: 700,
  });
  const valueHeaderLayer = await renderTextOverlay(size, {
    text: copy.value.columnHeaders.value,
    x: tableX + paramColW + 24,
    y: tableTop + 36,
    fontSizePx: 18,
    color: '#FFFFFF',
    maxWidth: valueColW - 40,
    fontWeight: 700,
  });
  const unitHeaderLayer = await renderTextOverlay(size, {
    text: copy.value.columnHeaders.unit,
    x: tableX + paramColW + valueColW + 24,
    y: tableTop + 36,
    fontSizePx: 18,
    color: '#FFFFFF',
    maxWidth: unitColW - 40,
    fontWeight: 700,
  });

  // Body rows (zebra stripe)
  const rowLayers: Buffer[] = [];
  for (let i = 0; i < copy.value.rows.length; i++) {
    const row = copy.value.rows[i];
    const y = tableTop + headerH + i * rowH;
    const stripFill = i % 2 === 0 ? '#FFFFFF' : spec.colorTokens.secondary;

    const stripSvg = Buffer.from(
      `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
        `<rect x="${tableX}" y="${y}" width="${tableW}" height="${rowH}" fill="${stripFill}" stroke="${spec.colorTokens.secondary}" stroke-width="1" />` +
        `<line x1="${tableX + paramColW}" y1="${y + 10}" x2="${tableX + paramColW}" y2="${y + rowH - 10}" stroke="${spec.colorTokens.accent}" stroke-width="1" opacity="0.25" />` +
        `<line x1="${tableX + paramColW + valueColW}" y1="${y + 10}" x2="${tableX + paramColW + valueColW}" y2="${y + rowH - 10}" stroke="${spec.colorTokens.accent}" stroke-width="1" opacity="0.25" />` +
        '</svg>',
    );

    const param = await renderTextOverlay(size, {
      text: row.parameter,
      x: tableX + 24,
      y: y + 40,
      fontSizePx: 20,
      color: spec.colorTokens.accent,
      maxWidth: paramColW - 40,
      fontWeight: 600,
    });
    const value = await renderTextOverlay(size, {
      text: row.value,
      x: tableX + paramColW + 24,
      y: y + 40,
      fontSizePx: 18,
      color: spec.colorTokens.accent,
      maxWidth: valueColW - 40,
      fontWeight: 400,
    });
    const unit = await renderTextOverlay(size, {
      text: row.unit,
      x: tableX + paramColW + valueColW + 24,
      y: y + 40,
      fontSizePx: 18,
      color: spec.colorTokens.primary,
      maxWidth: unitColW - 40,
      fontWeight: 500,
    });
    rowLayers.push(stripSvg, param, value, unit);
  }

  const composed = await overlayOnto(canvas, [
    headlineLayer,
    headerSvg,
    paramHeaderLayer,
    valueHeaderLayer,
    unitHeaderLayer,
    ...rowLayers,
  ]);

  const copyOut: Record<string, string> = { headline: copy.value.headline };
  copy.value.rows.forEach((r, i) => {
    copyOut[`row${i + 1}_parameter`] = r.parameter;
    copyOut[`row${i + 1}_value`] = r.value;
    copyOut[`row${i + 1}_unit`] = r.unit;
  });

  return {
    buffer: composed,
    copy: copyOut,
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
