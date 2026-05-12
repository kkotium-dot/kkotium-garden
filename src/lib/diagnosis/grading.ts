// src/lib/diagnosis/grading.ts
//
// Sprint 7-Diag MVP (v3.1 FINAL Smart Asset Workflow) — L1~L4 grading +
// confidence branching + skeleton-driven recommended sections. Pure library:
// no DB, no env-dependent IO.
//
// Decision tree mirrors SMART_ASSET_WORKFLOW Section 3 (etiquette).
// confidenceLevel branching follows PDF Part 2 #5 spec.
//
// L1 Light    qualityScore >= 80 AND roiScore <  0
// L2 Medium   qualityScore >= 60 AND competitionScore < 0.8
// L3 Heavy    roiScore     >  0  AND competitionScore >= 0.8
// L4 Custom   qualityScore <  40 OR margin >= 5 (high-margin catalog hero)
//
// confidenceLevel (per inferenceConfidence)
//   >= 90  auto      proceed without human review
//   70-89 review     surface to designer for one-screen confirmation
//   <  70 designer   designer must hand-select skeleton + tone

import type { SkeletonId, ConceptTone } from './concept-tone-inference';

// ---------------------------------------------------------------------------
// Type contracts
// ---------------------------------------------------------------------------

export type Grade = 'L1' | 'L2' | 'L3' | 'L4';
export type ConfidenceLevel = 'auto' | 'review' | 'designer';

export interface RoiInputs {
  /** Margin as multiplier of supplier price. >=5 marks catalog-hero L4. */
  margin?: number | null;
  /** 30-day sales count, used as a velocity proxy. */
  salesCount?: number | null;
  /** Optional pre-computed ROI score; if provided, supersedes the heuristic. */
  precomputedRoiScore?: number | null;
}

export interface GradingInput {
  qualityScore: number;
  competitionScore: number;
  conceptTone: ConceptTone;
  skeletonId: SkeletonId;
  inferenceConfidence: number;
  roi: RoiInputs;
}

export interface GradingResult {
  grade: Grade;
  confidenceLevel: ConfidenceLevel;
  roiScore: number;
  roiBreakdown: {
    margin: number | null;
    salesCount: number | null;
    velocityProxy: number;
    adCostEstimate: number;
    source: 'precomputed' | 'heuristic';
  };
  recommendedSections: string[];
  rationale: string;
}

// ---------------------------------------------------------------------------
// Skeleton -> recommended sections matrix
// Names align with SMART_ASSET_WORKFLOW Section 4 "골격 매트릭스" column "섹션 수".
// Used by Sprint 7-M2 5-section builder to compose detail pages.
// ---------------------------------------------------------------------------

export const SKELETON_SECTIONS: Record<SkeletonId, string[]> = {
  S1:  ['hero', 'spec', 'shipping'],
  S2:  ['hero', 'problem', 'solution', 'usage', 'cta'],
  S3:  ['hero', 'story', 'product', 'package', 'spec', 'cta'],
  S4:  ['hero', 'corePerformance', 'comparison', 'warranty', 'cta'],
  S5:  ['hero', 'optionIntro', 'usage', 'cta'],
  S6:  ['hero', 'story', 'styledShot', 'spec', 'cta'],
  S7:  ['hero', 'technology', 'clinical', 'comparison', 'warranty', 'cta'],
  S8:  ['seasonalHook', 'product', 'options', 'usage', 'cta'],
  S9:  ['hero', 'material', 'usage', 'shipping'],
  S10: ['hero', 'philosophy', 'detail', 'usage', 'reviews', 'cta'],
  S11: ['hero', 'eventDetails', 'benefits', 'cta'],
  S12: ['hero', 'specTable', 'specifications', 'usage', 'shipping'],
};

// ---------------------------------------------------------------------------
// ROI heuristic (placeholder until Sprint 7-M4 brings live ROAS data)
// ---------------------------------------------------------------------------

function computeRoiScore(roi: RoiInputs): {
  score: number;
  velocityProxy: number;
  adCostEstimate: number;
  source: 'precomputed' | 'heuristic';
} {
  if (typeof roi.precomputedRoiScore === 'number') {
    return {
      score: roi.precomputedRoiScore,
      velocityProxy: 0,
      adCostEstimate: 0,
      source: 'precomputed',
    };
  }
  const margin = roi.margin ?? 0;
  const sales = roi.salesCount ?? 0;
  // Velocity proxy: 0 sales -> 0, 5 sales -> 1.0, 20+ sales -> 2.0 (capped)
  const velocityProxy = Math.min(2, sales / 10);
  // Ad-cost placeholder: assumes ~₩300 per click target, scaled to margin band
  const adCostEstimate = margin > 2 ? 0.5 : 1.2;
  const score = margin * velocityProxy - adCostEstimate;
  return { score, velocityProxy, adCostEstimate, source: 'heuristic' };
}

// ---------------------------------------------------------------------------
// Grade decision tree
// ---------------------------------------------------------------------------

function decideGrade(
  qualityScore: number,
  competitionScore: number,
  roiScore: number,
  margin: number,
): Grade {
  // L4 Custom — either bad image OR a high-margin hero worth full-manual care
  if (qualityScore < 40) return 'L4';
  if (margin >= 5) return 'L4';
  // L3 Heavy — positive ROI on a competitive shelf, deserves designer touch
  if (roiScore > 0 && competitionScore >= 0.8) return 'L3';
  // L2 Medium — decent shot + favorable competition
  if (qualityScore >= 60 && competitionScore < 0.8) return 'L2';
  // L1 Light — fast lane for non-ROI items with usable images
  if (qualityScore >= 80 && roiScore < 0) return 'L1';
  // Default safety net: send to L2 (workhorse track) when nothing clearly fits
  return 'L2';
}

function decideConfidenceLevel(inferenceConfidence: number): ConfidenceLevel {
  if (inferenceConfidence >= 90) return 'auto';
  if (inferenceConfidence >= 70) return 'review';
  return 'designer';
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export function gradeProduct(input: GradingInput): GradingResult {
  if (input.qualityScore < 0 || input.qualityScore > 100) {
    throw new Error(`grading: qualityScore out of range (${input.qualityScore})`);
  }
  if (input.competitionScore < 0 || input.competitionScore > 2) {
    throw new Error(`grading: competitionScore out of range (${input.competitionScore})`);
  }

  const roi = computeRoiScore(input.roi);
  const margin = input.roi.margin ?? 0;
  const grade = decideGrade(input.qualityScore, input.competitionScore, roi.score, margin);
  const confidenceLevel = decideConfidenceLevel(input.inferenceConfidence);
  const recommendedSections = SKELETON_SECTIONS[input.skeletonId];

  const rationale =
    `${grade} (quality ${input.qualityScore.toFixed(1)} / competition ` +
    `${input.competitionScore.toFixed(2)} / roi ${roi.score.toFixed(2)} / margin ${margin}) ` +
    `-> skeleton ${input.skeletonId} (${input.conceptTone.persona}+${input.conceptTone.context}` +
    `+${input.conceptTone.pricePosition})`;

  return {
    grade,
    confidenceLevel,
    roiScore: Math.round(roi.score * 1000) / 1000,
    roiBreakdown: {
      margin: input.roi.margin ?? null,
      salesCount: input.roi.salesCount ?? null,
      velocityProxy: Math.round(roi.velocityProxy * 1000) / 1000,
      adCostEstimate: Math.round(roi.adCostEstimate * 1000) / 1000,
      source: roi.source,
    },
    recommendedSections,
    rationale,
  };
}
