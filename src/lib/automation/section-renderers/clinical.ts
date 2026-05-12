// src/lib/automation/section-renderers/clinical.ts
//
// Sprint 7-M2 Phase 2-b-1 — "clinical" section renderer.
// Used by S7 (premium pro / clinical-evidence track).
//
// KFTC SAFETY (CRITICAL): The renderer NEVER displays fabricated clinical
// numbers. Every numeric bar comes from "상세 페이지 참조" placeholders
// until a future Sprint 7-Lib pass populates ctx.clinicalData from real
// product data. An invariant caveat line ("임상 데이터 출처: 상세 페이지
// 참조") is always rendered at the bottom so the section can be safely
// included in any S7 detail page without legal exposure.
//
// Layout (860 × section.height):
//   - Headline + study meta line at top
//   - Outcome metric label centered
//   - Two-bar chart: "본 상품" placeholder vs "비교 기준" placeholder
//     (both rendered as dashed-outline bars when actual data missing —
//     designer must verify before publish)
//   - Caveat strip at the bottom in brand-accent color

import {
  createCanvas,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { generateClinicalCopy } from './section-copy';
import { STRINGS } from './strings';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

export const clinicalRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generateClinicalCopy(spec, ctx);

  // Headline + meta
  const headlineLayer = await renderTextOverlay(size, {
    text: copy.value.headline,
    x: 60,
    y: 110,
    fontSizePx: 36,
    color: spec.colorTokens.accent,
    maxWidth: size.width - 120,
    fontWeight: 700,
  });
  const metaLayer = await renderTextOverlay(size, {
    text: copy.value.studyMeta,
    x: 60,
    y: 158,
    fontSizePx: 22,
    color: spec.colorTokens.primary,
    maxWidth: size.width - 120,
    fontWeight: 500,
  });

  // Outcome label centered above chart
  const outcomeLabelLayer = await renderTextOverlay(size, {
    text: copy.value.outcomeLabel,
    x: 60,
    y: 240,
    fontSizePx: 26,
    color: spec.colorTokens.accent,
    maxWidth: size.width - 120,
    fontWeight: 600,
  });

  // Bar chart geometry — placeholder bars (dashed outline). Designer must
  // verify numeric values before publish.
  const chartX = 100;
  const chartY = 300;
  const chartWidth = size.width - 200;
  const barHeight = 80;
  const barGap = 30;
  const labelColumnWidth = 140;
  const valueColumnWidth = 120;
  const barColumnWidth = chartWidth - labelColumnWidth - valueColumnWidth - 20;

  // Bar A — "본 상품" (placeholder fill at 70% width with dashed border)
  const barAY = chartY;
  const barASvg = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="${chartX + labelColumnWidth}" y="${barAY}" ` +
      `width="${Math.round(barColumnWidth * 0.7)}" height="${barHeight}" rx="8" ry="8" ` +
      `fill="${spec.colorTokens.primary}" opacity="0.18" stroke="${spec.colorTokens.primary}" ` +
      `stroke-width="2" stroke-dasharray="8 6" />` +
      '</svg>',
  );
  const barALabel = await renderTextOverlay(size, {
    text: STRINGS.clinicalRenderer.barALabel,
    x: chartX,
    y: barAY + barHeight / 2 + 8,
    fontSizePx: 22,
    color: spec.colorTokens.accent,
    maxWidth: labelColumnWidth - 12,
    fontWeight: 700,
  });
  const barAValue = await renderTextOverlay(size, {
    text: STRINGS.common.detailsReferenceShort,
    x: chartX + labelColumnWidth + barColumnWidth + 12,
    y: barAY + barHeight / 2 + 8,
    fontSizePx: 20,
    color: spec.colorTokens.primary,
    maxWidth: valueColumnWidth - 12,
    fontWeight: 600,
  });

  // Bar B — "비교 기준"
  const barBY = chartY + barHeight + barGap;
  const barBSvg = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="${chartX + labelColumnWidth}" y="${barBY}" ` +
      `width="${Math.round(barColumnWidth * 0.5)}" height="${barHeight}" rx="8" ry="8" ` +
      `fill="${spec.colorTokens.secondary}" stroke="${spec.colorTokens.accent}" ` +
      `stroke-width="2" stroke-dasharray="8 6" opacity="0.7" />` +
      '</svg>',
  );
  const barBLabel = await renderTextOverlay(size, {
    text: STRINGS.clinicalRenderer.barBLabel,
    x: chartX,
    y: barBY + barHeight / 2 + 8,
    fontSizePx: 22,
    color: spec.colorTokens.accent,
    maxWidth: labelColumnWidth - 12,
    fontWeight: 700,
  });
  const barBValue = await renderTextOverlay(size, {
    text: STRINGS.common.detailsReferenceShort,
    x: chartX + labelColumnWidth + barColumnWidth + 12,
    y: barBY + barHeight / 2 + 8,
    fontSizePx: 20,
    color: spec.colorTokens.accent,
    maxWidth: valueColumnWidth - 12,
    fontWeight: 500,
  });

  // Invariant caveat strip at the bottom — never sourced from Groq.
  const caveatY = size.height - 80;
  const caveatStrip = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="60" y="${caveatY}" width="${size.width - 120}" height="48" rx="12" ry="12" fill="${spec.colorTokens.accent}" />` +
      '</svg>',
  );
  const caveatText = await renderTextOverlay(size, {
    text: copy.value.caveat,
    x: 84,
    y: caveatY + 32,
    fontSizePx: 18,
    color: '#FFFFFF',
    maxWidth: size.width - 168,
    fontWeight: 500,
  });

  const composed = await overlayOnto(canvas, [
    headlineLayer,
    metaLayer,
    outcomeLabelLayer,
    barASvg,
    barALabel,
    barAValue,
    barBSvg,
    barBLabel,
    barBValue,
    caveatStrip,
    caveatText,
  ]);

  return {
    buffer: composed,
    copy: {
      headline: copy.value.headline,
      studyMeta: copy.value.studyMeta,
      outcomeLabel: copy.value.outcomeLabel,
      ourValue: STRINGS.common.detailsReferenceShort,
      baselineValue: STRINGS.common.detailsReferenceShort,
      caveat: copy.value.caveat,
    },
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
