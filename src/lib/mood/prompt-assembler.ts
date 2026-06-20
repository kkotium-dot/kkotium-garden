// Mood-Camera Spec System — Layer 2 prompt assembler (2026-06-16, session8).
// Composes [variable subject/palette/light] + [Layer-1 camera/realism] +
// [fixed grade + positive exclusion] into one English prompt (authority §3).
// Order: Subject -> Surface -> Light -> Lens/Camera -> Finish.
//
// ★ The exclusion is positive prose only — no negativePrompt field is ever
//   produced (Gemini / Nano Banana have none; #86). AssembledPrompt carries
//   usesNegativePromptField: false as a literal guard.

import { selectMoodAxis } from './decision-table';
import {
  EXCLUSION_BLOCK,
  FIXED_GRADE_BLOCK,
  BACKDROP_EXCLUSION_BLOCK,
  PRODUCT_MARGIN_BLOCK,
  REALISM_CAMERA_BLOCK,
  REFERENCE_COMPOSITE_BLOCK,
} from './spec-data';
import type { AssembledPrompt, AssembleInput } from './types';

/** Fill [product] / [palette] placeholders in a subject template. */
function fillSubject(template: string, product: string, palette: string): string {
  return template
    .split('[product]').join(product)
    .split('[palette]').join(palette);
}

// C20: several mood palettes already end with "tones" (e.g. "soft wood tones").
// Compose the scene palette clause without the "... tones tones" duplicate.
function paletteToneClause(palette: string): string {
  return /tones?$/i.test(palette.trim()) ? palette : `${palette} tones`;
}

/**
 * Assemble the full English prompt for one mood + product. Variable knobs
 * (product, palette) are the only product-specific inputs; everything else is
 * looked up from the mood spec (no per-product hardcoding #55).
 */
export function assemblePrompt(input: AssembleInput): AssembledPrompt {
  const axis = selectMoodAxis(input.moodCode);
  const product = (input.product || '').trim() || 'product';
  // E5 defect A: fall back to the mood's English palette descriptor — never the
  // bare "natural" default (which dropped every per-variant palette).
  const palette = (input.palette || '').trim() || axis.palette || 'neutral tones';

  const conceptText = (input.concept || '').trim();
  // C6 (#107): reference-composite is the PRIMARY composite mode — the attached
  // product cutout is placed by the model (form/label/caps preserved). It takes
  // precedence over the empty-space margin path (reserveProductMargin), which is
  // now the explicit local-paste FALLBACK. Both require a concept scene.
  const referenceComposite = !!input.referenceComposite && !!conceptText;
  // E5 (#62): a per-variant backdrop scene — the concept IS the subject and the
  // product is reserved as empty compositing space (not drawn). Only when NOT in
  // reference-composite mode.
  const backdrop = !referenceComposite && !!input.reserveProductMargin && !!conceptText;
  const subject = referenceComposite
    ? `A photorealistic still-life scene of the attached product placed in ${conceptText}, in ${paletteToneClause(palette)}`
    : backdrop
    ? `A photorealistic still-life scene of ${conceptText} in ${paletteToneClause(palette)}`
    : fillSubject(axis.subjectTemplate, product, palette);

  // Lens / Camera (Layer 1 lookup) — never a single baked default (#84). E1:
  // resolution is now spliced in (was encoded in the spec but never reaching the
  // prompt — the resolution knob was lost at the last mile).
  const c = axis.camera;
  const cameraClause =
    `shot on a ${c.cameraArchetype} with a ${c.lens} at ${c.aperture}, ${c.realismCues}, ${c.resolution} resolution`;

  // E4: reference-aesthetic clause — the English "selling tone" the mood's
  // benchmarks embody (benchmarkDna itself is Korean display tags, never
  // injected). Delivers reference-driven tone with no competitor crawl. Defect A:
  // when empty, DROP the clause entirely (never emit a bare "in " token).
  const refAesthetic = (axis.referenceAesthetic || '').trim();
  const referenceClause = refAesthetic ? `in ${refAesthetic},` : '';

  // Finish: subject -> reference aesthetic -> camera -> fixed grade -> exclusion.
  // Empty fragments (e.g. dropped reference clause) are filtered out so no stray
  // separators survive. Backdrop slots reserve product margin and use the
  // product-free exclusion (#62 E5).
  // C6 (#107): REALISM-CAMERA-BLOCK on EVERY slot prompt. Reference-composite
  // slots add the "place the attached product exactly" instruction and use the
  // product-free backdrop exclusion (the product is placed from the reference, not
  // reserved as empty space).
  const prompt = [
    `${subject},`,
    referenceClause,
    `${cameraClause}.`,
    `${FIXED_GRADE_BLOCK}.`,
    `${REALISM_CAMERA_BLOCK}.`,
    referenceComposite ? `${REFERENCE_COMPOSITE_BLOCK}.` : '',
    backdrop ? `${PRODUCT_MARGIN_BLOCK}.` : '',
    referenceComposite || backdrop ? BACKDROP_EXCLUSION_BLOCK : EXCLUSION_BLOCK,
  ]
    .filter((frag) => frag.trim().length > 0)
    .join(' ');

  return {
    moodCode: input.moodCode,
    prompt,
    camera: c,
    benchmarkDna: axis.benchmarkDna,
    usesNegativePromptField: false,
  };
}
