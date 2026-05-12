// src/lib/automation/section-renderers/options.ts
//
// Sprint 7-M2 Phase 2-b-2 — "options" section renderer.
// Used by S8 (standard-event-set). Renders the option-spec grid that
// follows seasonalHook + product on a limited-drop page. Each row pairs
// an option name with a single-line spec description.

import {
  createCanvas,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { generateOptionsTableCopy } from './section-copy';
import { STRINGS } from './strings';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

export const optionsRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generateOptionsTableCopy(spec, ctx);

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

  // Table layout
  const tableX = 60;
  const tableW = size.width - 120;
  const nameColW = 200;
  const rowH = 72;
  const headerH = 56;
  const tableTop = 180;

  const headerSvg = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="${tableX}" y="${tableTop}" width="${tableW}" height="${headerH}" rx="10" ry="10" fill="${spec.colorTokens.primary}" />` +
      `<text x="${tableX + 20}" y="${tableTop + 36}" fill="white" font-size="18" font-weight="700" font-family="-apple-system, sans-serif">${STRINGS.optionsRenderer.nameHeader}</text>` +
      `<text x="${tableX + nameColW + 20}" y="${tableTop + 36}" fill="white" font-size="18" font-weight="700" font-family="-apple-system, sans-serif">${STRINGS.optionsRenderer.specHeader}</text>` +
      '</svg>',
  );

  const rowLayers: Buffer[] = [];
  for (let i = 0; i < copy.value.rows.length; i++) {
    const row = copy.value.rows[i];
    const y = tableTop + headerH + i * rowH;
    const stripFill = i % 2 === 0 ? '#FFFFFF' : spec.colorTokens.secondary;
    const stripSvg = Buffer.from(
      `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
        `<rect x="${tableX}" y="${y}" width="${tableW}" height="${rowH}" fill="${stripFill}" stroke="${spec.colorTokens.secondary}" stroke-width="1" />` +
        `<line x1="${tableX + nameColW}" y1="${y + 12}" x2="${tableX + nameColW}" y2="${y + rowH - 12}" stroke="${spec.colorTokens.accent}" stroke-width="1" opacity="0.3" />` +
        '</svg>',
    );
    const name = await renderTextOverlay(size, {
      text: row.name,
      x: tableX + 20,
      y: y + 46,
      fontSizePx: 22,
      color: spec.colorTokens.accent,
      maxWidth: nameColW - 40,
      fontWeight: 600,
    });
    const desc = await renderTextOverlay(size, {
      text: row.spec,
      x: tableX + nameColW + 20,
      y: y + 46,
      fontSizePx: 20,
      color: spec.colorTokens.accent,
      maxWidth: tableW - nameColW - 40,
      fontWeight: 400,
    });
    rowLayers.push(stripSvg, name, desc);
  }

  const composed = await overlayOnto(canvas, [headlineLayer, headerSvg, ...rowLayers]);

  const copyOut: Record<string, string> = { headline: copy.value.headline };
  copy.value.rows.forEach((r, i) => {
    copyOut[`row${i + 1}_name`] = r.name;
    copyOut[`row${i + 1}_spec`] = r.spec;
  });

  return {
    buffer: composed,
    copy: copyOut,
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
