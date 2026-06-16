// Mood-Camera Spec System — Layer 2 prompt assembler (2026-06-16, session8).
// Composes [variable subject/palette/light] + [Layer-1 camera/realism] +
// [fixed grade + positive exclusion] into one English prompt (authority §3).
// Order: Subject -> Surface -> Light -> Lens/Camera -> Finish.
//
// ★ The exclusion is positive prose only — no negativePrompt field is ever
//   produced (Gemini / Nano Banana have none; #86). AssembledPrompt carries
//   usesNegativePromptField: false as a literal guard.

import { selectMoodAxis } from './decision-table';
import { EXCLUSION_BLOCK, FIXED_GRADE_BLOCK } from './spec-data';
import type { AssembledPrompt, AssembleInput } from './types';

/** Fill [product] / [palette] placeholders in a subject template. */
function fillSubject(template: string, product: string, palette: string): string {
  return template
    .split('[product]').join(product)
    .split('[palette]').join(palette);
}

/**
 * Assemble the full English prompt for one mood + product. Variable knobs
 * (product, palette) are the only product-specific inputs; everything else is
 * looked up from the mood spec (no per-product hardcoding #55).
 */
export function assemblePrompt(input: AssembleInput): AssembledPrompt {
  const axis = selectMoodAxis(input.moodCode);
  const product = (input.product || '').trim() || 'product';
  const palette = (input.palette || '').trim() || 'natural';

  // Subject -> Surface -> Light (all carried in the subject template).
  const subject = fillSubject(axis.subjectTemplate, product, palette);

  // Lens / Camera (Layer 1 lookup) — never a single baked default (#84).
  const c = axis.camera;
  const cameraClause = `shot on a ${c.cameraArchetype} with a ${c.lens} at ${c.aperture}, ${c.realismCues}`;

  // Finish: fixed common grade + positive exclusion.
  const prompt = [
    `${subject},`,
    `${cameraClause}.`,
    `${FIXED_GRADE_BLOCK}.`,
    EXCLUSION_BLOCK,
  ].join(' ');

  return {
    moodCode: input.moodCode,
    prompt,
    camera: c,
    benchmarkDna: axis.benchmarkDna,
    usesNegativePromptField: false,
  };
}
