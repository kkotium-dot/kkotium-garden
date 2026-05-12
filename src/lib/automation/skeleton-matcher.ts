// src/lib/automation/skeleton-matcher.ts
//
// Sprint 7-M1 (v3.1 FINAL Smart Asset Workflow) — skeleton matcher.
//
// Consumes the SKELETONS collection (12 SkeletonSpec objects, each with a
// matchSignature on 8 axes) and a ConceptTone (the output of CTI inference).
// Returns the best-matching SkeletonId together with a per-skeleton score
// breakdown so downstream UIs (designer panel, A/B/C/D simulator) can
// surface "why this skeleton, not that one".
//
// This module supersedes the inline if/else tree previously embedded in
// concept-tone-inference.ts. That tree is preserved for fallback symmetry,
// but the public entry point of CTI now delegates here.
//
// Scoring model
//   For each of the 8 axes, a skeleton's matchSignature can be:
//     - undefined or empty array  -> wildcard, contributes 0.5 (half-credit)
//     - includes the input value  -> contributes 1.0
//     - omits the input value     -> contributes 0.0
//   axisScore is summed across all 8 axes and divided by 8 to land in [0, 1].
//   The exposed numeric score is rounded to 3 decimals.
//
// Wildcards earn half-credit (rather than full) so a specialised skeleton
// that explicitly lists the input value beats a generalist that says
// "anything goes". Without this asymmetry every skeleton would tie at the
// most permissive wildcard.
//
// Tie-breaking falls back to S2 (the default workhorse). The fallback is
// documented in v3.1 Section 4 of SMART_ASSET_WORKFLOW.

import type {
  ConceptTone,
  SkeletonId,
} from '../diagnosis/concept-tone-inference';
import { SKELETONS, type SkeletonSpec } from './layout-skeletons';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface MatchAxisDetail {
  axis: string;
  inputValue: string;
  signatureValues: readonly string[] | undefined;
  /** 0.0 / 0.5 / 1.0 — see scoring model above. */
  score: number;
  /** Brief reason for the score (used by designer-facing panels). */
  reason: 'wildcard' | 'match' | 'mismatch';
}

export interface SkeletonScore {
  skeletonId: SkeletonId;
  /** 0..100 weighted percentage. */
  score: number;
  axes: MatchAxisDetail[];
}

export interface MatchResult {
  /** Best-scoring skeleton. Ties broken by the FALLBACK list order. */
  skeletonId: SkeletonId;
  /** Score of the winning skeleton (0..100). */
  score: number;
  /** Sorted from highest to lowest score. Useful for designer review UI. */
  ranked: SkeletonScore[];
  /** True when the winner only beat the runner-up by < CONFIDENCE_MARGIN. */
  ambiguous: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** When the top two scores are within this many percentage points, the match
 *  is flagged as ambiguous and downstream UIs should surface a designer
 *  override prompt. */
const CONFIDENCE_MARGIN = 5;

/** Tie-breaking order: S2 first (default workhorse per v3.1 Section 4),
 *  then matrix order. Only used when two skeletons share the exact top score. */
const FALLBACK_ORDER: SkeletonId[] = [
  'S2', 'S1', 'S5', 'S4', 'S6', 'S3',
  'S7', 'S10', 'S8', 'S9', 'S11', 'S12',
];

// ---------------------------------------------------------------------------
// Per-axis scoring
// ---------------------------------------------------------------------------

function scoreAxis<T extends string>(
  axisName: string,
  inputValue: T,
  signatureValues: readonly T[] | undefined,
): MatchAxisDetail {
  if (!signatureValues || signatureValues.length === 0) {
    return {
      axis: axisName,
      inputValue,
      signatureValues,
      score: 0.5,
      reason: 'wildcard',
    };
  }
  if (signatureValues.includes(inputValue)) {
    return {
      axis: axisName,
      inputValue,
      signatureValues,
      score: 1.0,
      reason: 'match',
    };
  }
  return {
    axis: axisName,
    inputValue,
    signatureValues,
    score: 0.0,
    reason: 'mismatch',
  };
}

function scoreSkeleton(spec: SkeletonSpec, tone: ConceptTone): SkeletonScore {
  const axes: MatchAxisDetail[] = [
    scoreAxis('persona',       tone.persona,       spec.matchSignature.concept.persona),
    scoreAxis('context',       tone.context,       spec.matchSignature.concept.context),
    scoreAxis('pricePosition', tone.pricePosition, spec.matchSignature.concept.pricePosition),
    scoreAxis('productType',   tone.productType,   spec.matchSignature.concept.productType),
    scoreAxis('colorMood',     tone.colorMood,     spec.matchSignature.tone.colorMood),
    scoreAxis('emotionalTone', tone.emotionalTone, spec.matchSignature.tone.emotionalTone),
    scoreAxis('photoStyle',    tone.photoStyle,    spec.matchSignature.tone.photoStyle),
    scoreAxis('genre',         tone.genre,         spec.matchSignature.tone.genre),
  ];
  const sum = axes.reduce((acc, a) => acc + a.score, 0);
  const score = Math.round((sum / axes.length) * 1000) / 10; // -> 0..100, 1 decimal
  return { skeletonId: spec.id, score, axes };
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export function matchSkeleton(tone: ConceptTone): MatchResult {
  const ranked = (Object.values(SKELETONS) as SkeletonSpec[])
    .map((spec) => scoreSkeleton(spec, tone))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Exact tie: prefer earlier entry in FALLBACK_ORDER
      return FALLBACK_ORDER.indexOf(a.skeletonId) - FALLBACK_ORDER.indexOf(b.skeletonId);
    });

  const winner = ranked[0];
  const runnerUp = ranked[1];
  const ambiguous = !!runnerUp && winner.score - runnerUp.score < CONFIDENCE_MARGIN;

  return {
    skeletonId: winner.skeletonId,
    score: winner.score,
    ranked,
    ambiguous,
  };
}

/** Convenience: drop the per-axis detail for callers that only need the
 *  winner. Mirrors the public surface of the legacy inline matcher. */
export function pickSkeletonId(tone: ConceptTone): SkeletonId {
  return matchSkeleton(tone).skeletonId;
}
