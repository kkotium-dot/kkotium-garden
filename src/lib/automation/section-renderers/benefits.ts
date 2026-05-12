// src/lib/automation/section-renderers/benefits.ts
//
// Sprint 7-M2 Phase 2-b-2 — "benefits" section renderer.
// Used by S11 (vintage event-single). Three perk cards with simple
// SVG glyphs derived from iconHint. KFTC discipline: a disclosure line
// at the bottom always surfaces eligibility window or quantity
// requirements ("혜택 적용 조건: 상세 페이지 참조" by default).

import {
  createCanvas,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { generateBenefitsCopy } from './section-copy';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

/** Minimal SVG path glyphs keyed by iconHint. Kept inline so the renderer
 *  has zero file-system dependencies (matches the rest of the Sprint 7
 *  asset-free render pipeline). */
function iconPath(hint: string, cx: number, cy: number, color: string): string {
  switch (hint) {
    case 'gift':
      return `<rect x="${cx - 16}" y="${cy - 6}" width="32" height="22" rx="3" fill="${color}" />` +
             `<rect x="${cx - 18}" y="${cy - 12}" width="36" height="8" rx="2" fill="${color}" />` +
             `<line x1="${cx}" y1="${cy - 12}" x2="${cx}" y2="${cy + 16}" stroke="white" stroke-width="2" />`;
    case 'star':
      return `<polygon points="${cx},${cy - 16} ${cx + 5},${cy - 5} ${cx + 16},${cy - 4} ${cx + 7},${cy + 4} ${cx + 9},${cy + 15} ${cx},${cy + 9} ${cx - 9},${cy + 15} ${cx - 7},${cy + 4} ${cx - 16},${cy - 4} ${cx - 5},${cy - 5}" fill="${color}" />`;
    case 'shield':
      return `<path d="M ${cx} ${cy - 16} L ${cx + 16} ${cy - 10} L ${cx + 16} ${cy + 4} Q ${cx + 16} ${cy + 14} ${cx} ${cy + 18} Q ${cx - 16} ${cy + 14} ${cx - 16} ${cy + 4} L ${cx - 16} ${cy - 10} Z" fill="${color}" />`;
    case 'tag':
      return `<path d="M ${cx - 14} ${cy - 14} L ${cx + 6} ${cy - 14} L ${cx + 16} ${cy - 4} L ${cx + 4} ${cy + 14} L ${cx - 14} ${cy + 14} Z" fill="${color}" />` +
             `<circle cx="${cx - 8}" cy="${cy - 8}" r="3" fill="white" />`;
    case 'sparkle':
      return `<path d="M ${cx} ${cy - 16} L ${cx + 4} ${cy - 4} L ${cx + 16} ${cy} L ${cx + 4} ${cy + 4} L ${cx} ${cy + 16} L ${cx - 4} ${cy + 4} L ${cx - 16} ${cy} L ${cx - 4} ${cy - 4} Z" fill="${color}" />`;
    case 'truck':
      return `<rect x="${cx - 16}" y="${cy - 8}" width="20" height="14" rx="2" fill="${color}" />` +
             `<polygon points="${cx + 4},${cy - 2} ${cx + 16},${cy - 2} ${cx + 16},${cy + 6} ${cx + 4},${cy + 6}" fill="${color}" />` +
             `<circle cx="${cx - 10}" cy="${cy + 10}" r="4" fill="${color}" />` +
             `<circle cx="${cx + 8}" cy="${cy + 10}" r="4" fill="${color}" />`;
    default:
      return `<circle cx="${cx}" cy="${cy}" r="14" fill="${color}" />`;
  }
}

export const benefitsRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const copy = await generateBenefitsCopy(spec, ctx);

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

  // 3 perk cards stacked vertically
  const cardX = 60;
  const cardW = size.width - 120;
  const cardH = 130;
  const cardGap = 18;
  const cardsTop = 180;

  const layers: Buffer[] = [headlineLayer];
  for (let i = 0; i < 3; i++) {
    const perk = copy.value.perks[i];
    const y = cardsTop + i * (cardH + cardGap);
    const iconBoxSize = 80;
    const iconCx = cardX + 24 + iconBoxSize / 2;
    const iconCy = y + cardH / 2;
    const cardSvg = Buffer.from(
      `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
        `<rect x="${cardX}" y="${y}" width="${cardW}" height="${cardH}" rx="16" ry="16" fill="white" stroke="${spec.colorTokens.secondary}" stroke-width="2" />` +
        `<rect x="${cardX + 24}" y="${iconCy - iconBoxSize / 2}" width="${iconBoxSize}" height="${iconBoxSize}" rx="14" ry="14" fill="${spec.colorTokens.primary}" />` +
        iconPath(perk.iconHint, iconCx, iconCy, '#FFFFFF') +
        '</svg>',
    );
    const titleLayer = await renderTextOverlay(size, {
      text: perk.title,
      x: cardX + 24 + iconBoxSize + 24,
      y: y + cardH / 2 - 8,
      fontSizePx: 26,
      color: spec.colorTokens.accent,
      maxWidth: cardW - iconBoxSize - 80,
      fontWeight: 700,
    });
    const bodyLayer = await renderTextOverlay(size, {
      text: perk.body,
      x: cardX + 24 + iconBoxSize + 24,
      y: y + cardH / 2 + 28,
      fontSizePx: 20,
      color: spec.colorTokens.accent,
      maxWidth: cardW - iconBoxSize - 80,
      fontWeight: 400,
    });
    layers.push(cardSvg, titleLayer, bodyLayer);
  }

  // KFTC disclosure strip at the bottom — always rendered
  const discY = cardsTop + 3 * (cardH + cardGap) + 12;
  const disclosureSvg = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="60" y="${discY}" width="${size.width - 120}" height="56" rx="12" ry="12" fill="${spec.colorTokens.accent}" />` +
      '</svg>',
  );
  const disclosureLayer = await renderTextOverlay(size, {
    text: copy.value.disclosure,
    x: 84,
    y: discY + 36,
    fontSizePx: 18,
    color: '#FFFFFF',
    maxWidth: size.width - 168,
    fontWeight: 500,
  });
  layers.push(disclosureSvg, disclosureLayer);

  const composed = await overlayOnto(canvas, layers);

  const copyOut: Record<string, string> = {
    headline: copy.value.headline,
    disclosure: copy.value.disclosure,
  };
  copy.value.perks.forEach((p, i) => {
    copyOut[`perk${i + 1}_title`] = p.title;
    copyOut[`perk${i + 1}_body`] = p.body;
    copyOut[`perk${i + 1}_iconHint`] = p.iconHint;
  });

  return {
    buffer: composed,
    copy: copyOut,
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
