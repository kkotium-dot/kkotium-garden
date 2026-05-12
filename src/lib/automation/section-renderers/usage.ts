// src/lib/automation/section-renderers/usage.ts
//
// Sprint 7-M2 Phase 1 — "usage" section renderer.
// Used by S2 (workhorse) — and re-used later by S5/S6/S8/S9/S10/S12 once
// Phase 2 lands their unique tweaks. The S2 variant pairs an optional
// lifestyle backdrop with a centered caption.
//
// Layout (860 × section.height):
//   - Lifestyle backdrop covers full canvas if provided, else
//     skeleton secondary color
//   - Bottom vignette so caption stays legible against busy backdrops
//   - Caption at bottom-center, 30px medium, white

import {
  createCanvas,
  fetchImageBuffer,
  fitImage,
  renderTextOverlay,
  applyBottomVignette,
  overlayOnto,
} from '../sharp-composite';
import { generateUsageCaption } from './section-copy';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

export const usageRenderer: SectionRenderer = async (spec, section, ctx) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  // Backdrop: lifestyle asset if available, else flat skeleton secondary.
  let backdrop: Buffer;
  let usedLifestyle = false;
  if (ctx.lifestyleAssetUrl) {
    try {
      const buf = await fetchImageBuffer(ctx.lifestyleAssetUrl);
      backdrop = await fitImage(buf, size, bg);
      usedLifestyle = true;
    } catch {
      backdrop = await createCanvas(size, bg);
    }
  } else {
    backdrop = await createCanvas(size, bg);
  }

  // Vignette for caption legibility — only when lifestyle backdrop used.
  const vignetted = usedLifestyle
    ? await applyBottomVignette(backdrop, size, 0.55)
    : backdrop;

  const caption = await generateUsageCaption(spec, ctx);

  const captionLayer = await renderTextOverlay(size, {
    text: caption.value,
    x: 60,
    y: size.height - 100,
    fontSizePx: 30,
    color: usedLifestyle ? '#FFFFFF' : spec.colorTokens.accent,
    maxWidth: size.width - 120,
    fontWeight: 500,
  });

  const composed = await overlayOnto(vignetted, [captionLayer]);

  return {
    buffer: composed,
    copy: { caption: caption.value },
    sectionId: section.id,
    height: section.height,
    copyFiltered: caption.filtered,
  };
};
