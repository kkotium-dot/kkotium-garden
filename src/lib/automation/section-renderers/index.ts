// src/lib/automation/section-renderers/index.ts
//
// Sprint 7-M2 Phase 1 — section renderer registry.
//
// Maps a section id (from SectionSpec.id) to its renderer function. Phase 1
// implements the five workhorse sections used by S2 (the default skeleton)
// plus the shipping section variant used by S1/S9/S12. Every other section
// id falls back to placeholderRenderer so section-builder always produces
// a complete page even with partial Phase 2 coverage.
//
// Adding a renderer in Phase 2/3 is one line: import + entry. No other
// callsite changes — section-builder.ts dispatches through this map.

import type { SectionRenderer } from './types';
import { placeholderRenderer } from './_placeholder';
import { heroRenderer } from './hero';
import { problemRenderer } from './problem';
import { solutionRenderer } from './solution';
import { usageRenderer } from './usage';
import { ctaRenderer } from './cta';
import { specRenderer } from './spec';
import { storyRenderer } from './story';
import { productRenderer } from './product';
import { comparisonRenderer } from './comparison';
import { warrantyRenderer } from './warranty';
import { shippingRenderer } from './shipping';
import { corePerformanceRenderer } from './corePerformance';
import { technologyRenderer } from './technology';
import { clinicalRenderer } from './clinical';
import { optionIntroRenderer } from './optionIntro';
import { seasonalHookRenderer } from './seasonalHook';
import { optionsRenderer } from './options';
import { eventDetailsRenderer } from './eventDetails';
import { benefitsRenderer } from './benefits';
import { materialRenderer } from './material';
import { styledShotRenderer } from './styledShot';
import { philosophyRenderer } from './philosophy';
import { detailRenderer } from './detail';
import { reviewsRenderer } from './reviews';

const REGISTRY: Record<string, SectionRenderer> = {
  // Phase 1 (S2 workhorse)
  hero:            heroRenderer,
  problem:         problemRenderer,
  solution:        solutionRenderer,
  usage:           usageRenderer,
  cta:             ctaRenderer,
  // Phase 2-a (shared renderers used by multiple skeletons)
  spec:            specRenderer,
  story:           storyRenderer,
  product:         productRenderer,
  comparison:      comparisonRenderer,
  warranty:        warrantyRenderer,
  shipping:        shippingRenderer,
  // Phase 2-b-1 (trust track: S4 / S7)
  corePerformance: corePerformanceRenderer,
  technology:      technologyRenderer,
  clinical:        clinicalRenderer,
  // Phase 2-b-2 (event/set track: S5 / S8 / S11)
  optionIntro:     optionIntroRenderer,
  seasonalHook:    seasonalHookRenderer,
  options:         optionsRenderer,
  eventDetails:    eventDetailsRenderer,
  benefits:        benefitsRenderer,
  // Phase 2-b-3-a (sensory track: S6 / S9 / S10)
  material:        materialRenderer,
  styledShot:      styledShotRenderer,
  philosophy:      philosophyRenderer,
  detail:          detailRenderer,
  reviews:         reviewsRenderer,
};

/** Look up the renderer for a section id. Returns the placeholder
 *  renderer for any id without a dedicated implementation. */
export function getSectionRenderer(sectionId: string): SectionRenderer {
  return REGISTRY[sectionId] ?? placeholderRenderer;
}

/** True when the section id has a dedicated renderer (i.e. not falling
 *  back to placeholder). Useful for designer-facing badges that mark
 *  "this section is automated end-to-end". */
export function hasDedicatedRenderer(sectionId: string): boolean {
  return sectionId in REGISTRY;
}

/** List of section ids with dedicated renderers. Stable iteration order
 *  matches REGISTRY definition. */
export function listDedicatedSections(): string[] {
  return Object.keys(REGISTRY);
}

export { placeholderRenderer };
export type { SectionRenderer, SectionRenderContext, SectionRenderResult } from './types';
export { resolveBgColor, CANONICAL_WIDTH } from './types';
