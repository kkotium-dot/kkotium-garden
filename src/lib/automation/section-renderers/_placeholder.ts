// src/lib/automation/section-renderers/_placeholder.ts
//
// Sprint 7-M2 Phase 1 — fallback renderer for section ids that have no
// dedicated renderer yet (Phase 2/3 work). Produces a deterministic
// dashed-border canvas at the section's declared size with a label that
// names the section so the designer can see what's still pending.
//
// Critical to keep this build-safe: section-builder.ts maps every
// SkeletonSpec.sections[].id through the registry. Without a placeholder
// the builder would throw on any skeleton whose section ids aren't all
// implemented yet, which would block production deploys.

import {
  createCanvas,
  renderTextOverlay,
  overlayOnto,
} from '../sharp-composite';
import type { SectionRenderer } from './types';
import { resolveBgColor, CANONICAL_WIDTH } from './types';

export const placeholderRenderer: SectionRenderer = async (spec, section) => {
  const bg = resolveBgColor(spec, section.bgColorToken);
  const size = { width: CANONICAL_WIDTH, height: section.height };

  const canvas = await createCanvas(size, bg);

  const dashedBorder = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="40" y="40" width="${size.width - 80}" height="${size.height - 80}" ` +
      `fill="none" stroke="${spec.colorTokens.accent}" stroke-width="3" ` +
      `stroke-dasharray="12 8" rx="16" ry="16" />` +
      '</svg>',
  );

  const label = await renderTextOverlay(size, {
    text: `[${spec.id} :: ${section.id}]  pending renderer`,
    x: 80,
    y: Math.round(size.height / 2),
    fontSizePx: 36,
    color: spec.colorTokens.accent,
    fontWeight: 600,
  });

  const layoutHint = await renderTextOverlay(size, {
    text: section.layout,
    x: 80,
    y: Math.round(size.height / 2) + 56,
    fontSizePx: 24,
    color: spec.colorTokens.accent,
    fontWeight: 400,
  });

  const buffer = await overlayOnto(canvas, [dashedBorder, label, layoutHint]);

  return {
    buffer,
    copy: { placeholder: `${spec.id}::${section.id} pending` },
    sectionId: section.id,
    height: section.height,
    copyFiltered: false,
  };
};
