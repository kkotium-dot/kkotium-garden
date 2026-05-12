// src/lib/automation/layout-skeletons/index.ts
//
// Sprint 7-Skel (v3.1 FINAL Smart Asset Workflow) — 12-skeleton library.
//
// Each skeleton is a static SkeletonSpec object that downstream pipelines read:
//   - Sprint 7-M2 5-section builder composes a detail page from `sections`.
//   - Sprint 7-M1 thumbnail generator pulls accent colors from `colorTokens`.
//   - Sprint 7-Lib lifestyle picker filters assets by tone signature.
//
// Source of truth for the matrix: docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md
// Section 4 (matrix + S2 YAML example + 4-A distribution + 4-C verification cases).
//
// Section IDs MUST mirror grading.ts SKELETON_SECTIONS entries 1:1 so that the
// grading pipeline's recommendedSections and the layout-skeletons spec stay
// in lockstep. The runtime invariant check at the bottom of this file fails
// fast if a future edit drifts the two lists apart.

import type {
  Persona,
  Context,
  PricePosition,
  ProductType,
  EmotionalTone,
  Genre,
  SkeletonId,
} from '../../diagnosis/concept-tone-inference';
import type { ColorMood, PhotoStyle } from '../../diagnosis/image-quality';
import { SKELETON_SECTIONS } from '../../diagnosis/grading';

// ---------------------------------------------------------------------------
// Type contracts
// ---------------------------------------------------------------------------

/**
 * A subset of the enum values that this skeleton accepts on the given axis.
 * Omitted or empty array means "any value matches" — the matcher should treat
 * the axis as a wildcard.
 */
export interface ConceptSignature {
  persona?: Persona[];
  context?: Context[];
  pricePosition?: PricePosition[];
  productType?: ProductType[];
}

export interface ToneSignature {
  colorMood?: ColorMood[];
  emotionalTone?: EmotionalTone[];
  photoStyle?: PhotoStyle[];
  genre?: Genre[];
}

export interface MatchSignature {
  concept: ConceptSignature;
  tone: ToneSignature;
}

/**
 * One vertical band of the detail page. `id` is the section key used by
 * grading.SKELETON_SECTIONS and downstream Sprint 7-M2 builders.
 */
export interface SectionSpec {
  id: string;
  /** Pixel height at the canonical 860px-wide canvas. */
  height: number;
  /** Layout slot description, e.g. "centered_product + tagline". */
  layout: string;
  /** Hint to copy-writer.ts (Sprint 7-M2). Kept in English so the Groq
   *  prompt can paste it verbatim into a system message. */
  copyTone: string;
  /** Tailwind color token reference. Resolved at composite time. */
  bgColorToken?: string;
}

export interface ColorTokens {
  primary: string;
  secondary: string;
  accent: string;
}

export interface FontTokens {
  title: string;
  body: string;
}

export interface SkeletonSpec {
  id: SkeletonId;
  /** English short label, e.g. "budget-daily-single minimal". */
  description: string;
  matchSignature: MatchSignature;
  sections: SectionSpec[];
  totalHeight: number;
  width: number;
  colorTokens: ColorTokens;
  fonts: FontTokens;
  /** Global copy hint sent to copy-writer.ts as a system-prompt prefix. */
  copyGlobalTone: string;
}

// ---------------------------------------------------------------------------
// Skeleton collection
// ---------------------------------------------------------------------------

import { S1 } from './s1-budget-daily-single';
import { S2 } from './s2-standard-daily-options';
import { S3 } from './s3-premium-gift-set';
import { S4 } from './s4-standard-pro-single';
import { S5 } from './s5-budget-daily-set';
import { S6 } from './s6-standard-gift-single';
import { S7 } from './s7-premium-pro-single';
import { S8 } from './s8-standard-event-set';
import { S9 } from './s9-budget-daily-natural';
import { S10 } from './s10-premium-daily-options';
import { S11 } from './s11-standard-event-vintage';
import { S12 } from './s12-budget-pro-options';

export {
  S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12,
};

export const SKELETONS: Record<SkeletonId, SkeletonSpec> = {
  S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12,
};

export type { SkeletonId } from '../../diagnosis/concept-tone-inference';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Lookup a skeleton spec by id. Throws on unknown ids so callers can rely on
 *  a non-null return without optional chaining. */
export function getSkeleton(id: SkeletonId): SkeletonSpec {
  const spec = SKELETONS[id];
  if (!spec) {
    throw new Error(`getSkeleton: unknown skeleton id "${id}"`);
  }
  return spec;
}

/** Return only the section id list for a skeleton — useful for diffing with
 *  grading.SKELETON_SECTIONS. */
export function listSectionIds(id: SkeletonId): string[] {
  return getSkeleton(id).sections.map((s) => s.id);
}

// ---------------------------------------------------------------------------
// Invariant: each skeleton's section ids must match grading.SKELETON_SECTIONS.
// Runs once at module load — cheap, and fails fast if drift is introduced.
// ---------------------------------------------------------------------------

(function assertSectionIdAlignment() {
  const ids: SkeletonId[] = [
    'S1', 'S2', 'S3', 'S4', 'S5', 'S6',
    'S7', 'S8', 'S9', 'S10', 'S11', 'S12',
  ];
  for (const id of ids) {
    const fromGrading = SKELETON_SECTIONS[id];
    const fromSpec = SKELETONS[id].sections.map((s) => s.id);
    if (fromGrading.length !== fromSpec.length) {
      throw new Error(
        `layout-skeletons: ${id} section count drift — ` +
          `grading.ts has ${fromGrading.length}, spec has ${fromSpec.length}`,
      );
    }
    for (let i = 0; i < fromGrading.length; i++) {
      if (fromGrading[i] !== fromSpec[i]) {
        throw new Error(
          `layout-skeletons: ${id} section[${i}] drift — ` +
            `grading.ts="${fromGrading[i]}" vs spec="${fromSpec[i]}"`,
        );
      }
    }
  }
})();
