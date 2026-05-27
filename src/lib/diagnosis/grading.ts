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
  /**
   * B-10: P-Filter pre-verdict on raw image health. When the pre-filter has
   * already cleared the photo (L1/L2), grading honors that as a floor so
   * borderline-but-clean photos (e.g. qualityScore 47.6 / 명화송풍구) land in
   * the explicit L2 path instead of the default-safety-net branch.
   */
  pFilterGrade?: Grade | null;
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
  pFilterGrade: Grade | null,
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
  // B-10: P-Filter L1/L2 floor — the pre-filter has already verified the
  // photo is automation-ready (uniform background, object ratio, white-balance,
  // watermark check). Honor that signal rather than dropping to the unlabeled
  // default branch, which made qualityScore=47.6 / pFilter=L2 land in L2 only
  // by accident.
  if (pFilterGrade === 'L1' || pFilterGrade === 'L2') return 'L2';
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

// B-4: clamp pathological inputs instead of throwing. Upstream sources (Sharp
// stats, Naver competition score) can legitimately produce NaN on edge images
// or empty market segments; failing the whole diagnose request for that is
// worse than degrading to a safe default.
function safeClamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function gradeProduct(input: GradingInput): GradingResult {
  const qualityScore = safeClamp(input.qualityScore, 0, 100, 0);
  const competitionScore = safeClamp(input.competitionScore, 0, 2, 1);

  const roi = computeRoiScore(input.roi);
  const margin = Number.isFinite(input.roi.margin ?? NaN) ? (input.roi.margin as number) : 0;
  const roiScore = Number.isFinite(roi.score) ? roi.score : 0;
  const grade = decideGrade(
    qualityScore,
    competitionScore,
    roiScore,
    margin,
    input.pFilterGrade ?? null,
  );
  const confidenceLevel = decideConfidenceLevel(
    Number.isFinite(input.inferenceConfidence) ? input.inferenceConfidence : 0,
  );
  const recommendedSections = SKELETON_SECTIONS[input.skeletonId] ?? SKELETON_SECTIONS.S2;

  const rationale =
    `${grade} (quality ${qualityScore.toFixed(1)} / competition ` +
    `${competitionScore.toFixed(2)} / roi ${roiScore.toFixed(2)} / margin ${margin}) ` +
    `-> skeleton ${input.skeletonId} (${input.conceptTone.persona}+${input.conceptTone.context}` +
    `+${input.conceptTone.pricePosition})`;

  return {
    grade,
    confidenceLevel,
    roiScore: Math.round(roiScore * 1000) / 1000,
    roiBreakdown: {
      margin: Number.isFinite(input.roi.margin ?? NaN) ? (input.roi.margin as number) : null,
      salesCount: Number.isFinite(input.roi.salesCount ?? NaN) ? (input.roi.salesCount as number) : null,
      velocityProxy: Math.round((Number.isFinite(roi.velocityProxy) ? roi.velocityProxy : 0) * 1000) / 1000,
      adCostEstimate: Math.round((Number.isFinite(roi.adCostEstimate) ? roi.adCostEstimate : 0) * 1000) / 1000,
      source: roi.source,
    },
    recommendedSections,
    rationale,
  };
}
