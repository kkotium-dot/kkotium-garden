// src/lib/automation/section-renderers/seasonalHook.ts
//
// Sprint 7-M2 Phase 2-b-2 — "seasonalHook" section renderer.
// Used by S8 (standard-event-set, sensory/vivid/korean).
//
// KFTC discipline: this section is the *first* thing buyers see on a
// limited-drop product page. The renderer enforces explicit date window
// disclosure (start + end labels) — when actual dates aren't available
// from product data the labels render as "상세 페이지 참조" rather than
// disappearing. KFTC requires time-bound campaigns to surface the window.

import {
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import { generateSeasonalHookCopy } from './section-copy';
import { resolveEmotionalBackdrop } from './emotional-bg';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

export const seasonalHookRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const { canvas } = await resolveEmotionalBackdrop(ctx, size, bg);

  const copy = await generateSeasonalHookCopy(spec, ctx);

  // Top banner stripe (brand-primary)
  const bannerTop = 60;
  const bannerHeight = 96;
  const bannerSvg = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="60" y="${bannerTop}" width="${size.width - 120}" height="${bannerHeight}" rx="20" ry="20" fill="${spec.colorTokens.primary}" />` +
      '</svg>',
  );
  const bannerLayer = await renderTextOverlay(size, {
    text: copy.value.banner,
    x: 100,
    y: bannerTop + bannerHeight / 2 + 14,
    fontSizePx: 44,
    color: '#FFFFFF',
    maxWidth: size.width - 200,
    fontWeight: 700,
  });

  // Hook line below banner
  const hookLayer = await renderTextOverlay(size, {
    text: copy.value.hookLine,
    x: 60,
    y: bannerTop + bannerHeight + 80,
    fontSizePx: 30,
    color: spec.colorTokens.accent,
    maxWidth: size.width - 120,
    fontWeight: 500,
  });

  // KFTC date window — two stacked rounded cards (always rendered, even
  // with placeholder text, so the disclosure is never accidentally hidden).
  const dateBlockY = bannerTop + bannerHeight + 160;
  const dateCardH = 80;
  const dateCardGap = 20;
  const dateBlockSvg = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="60" y="${dateBlockY}" width="${size.width - 120}" height="${dateCardH}" rx="14" ry="14" ` +
      `fill="white" stroke="${spec.colorTokens.accent}" stroke-width="2" />` +
      `<rect x="60" y="${dateBlockY + dateCardH + dateCardGap}" width="${size.width - 120}" height="${dateCardH}" rx="14" ry="14" ` +
      `fill="white" stroke="${spec.colorTokens.accent}" stroke-width="2" />` +
      `<text x="84" y="${dateBlockY + 30}" fill="${spec.colorTokens.primary}" font-size="16" font-weight="700" font-family="-apple-system, sans-serif">START</text>` +
      `<text x="84" y="${dateBlockY + dateCardH + dateCardGap + 30}" fill="${spec.colorTokens.primary}" font-size="16" font-weight="700" font-family="-apple-system, sans-serif">END</text>` +
      '</svg>',
  );
  const startTextLayer = await renderTextOverlay(size, {
    text: copy.value.startLabel,
    x: 84,
    y: dateBlockY + 62,
    fontSizePx: 22,
    color: spec.colorTokens.accent,
    maxWidth: size.width - 168,
    fontWeight: 500,
  });
  const endTextLayer = await renderTextOverlay(size, {
    text: copy.value.endLabel,
    x: 84,
    y: dateBlockY + dateCardH + dateCardGap + 62,
    fontSizePx: 22,
    color: spec.colorTokens.accent,
    maxWidth: size.width - 168,
    fontWeight: 500,
  });

  const composed = await overlayOnto(canvas, [
    bannerSvg,
    bannerLayer,
    hookLayer,
    dateBlockSvg,
    startTextLayer,
    endTextLayer,
  ]);

  return {
    buffer: composed,
    copy: {
      banner: copy.value.banner,
      hookLine: copy.value.hookLine,
      startLabel: copy.value.startLabel,
      endLabel: copy.value.endLabel,
    },
    sectionId: section.id,
    height: section.height,
    copyFiltered: copy.filtered,
  };
};
