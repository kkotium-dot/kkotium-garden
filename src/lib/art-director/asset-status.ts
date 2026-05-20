// src/lib/art-director/asset-status.ts
//
// Sprint 7-M2 5-B — Asset status classifier for the art director.
//
// Decides which of three states a generated lifestyle-image prompt is in:
//   auto_bloomed     — "알아서 폈어요" (high confidence, ship as-is)
//   lets_refine      — "같이 다듬을까요" (medium, draft + seller refines)
//   needs_your_magic — "당신의 손길 대기 중" (low, seller directs)
//
// Inputs
//   - inferenceConfidence (0..100) from concept-tone-inference
//   - imageAnalysisConfidence (0..1) from image-analyzer
//   - StrategicRole + designerEffortMultiplier from role-engine
//
// Role-aware threshold shift
//   ace / battleground roles WIN from designer input → we bias toward
//   needs_your_magic (multiplier 1.5/1.6).
//   trend roles WIN from speed → we bias toward auto_bloomed (multiplier 0.8).
//   The multiplier scales how aggressively the "needs_your_magic" band
//   eats into the "lets_refine" band.
//
// Source: docs/research/SPRINT_7_M2_5B_ART_DIRECTOR_2026_05.md §4
//   Replaces the previous hardcoded "value-judgment category" list — the
//   role engine now decides automation intensity numerically.

import type { StrategicRole } from '@/lib/strategy/role-engine';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type AssetStatus = 'auto_bloomed' | 'lets_refine' | 'needs_your_magic';

export interface AssetStatusInput {
  /** CTI confidence 0..100. */
  inferenceConfidence: number;
  /** Image analyzer confidence 0..1. Pass 0 if image analysis was skipped. */
  imageAnalysisConfidence: number;
  /** Strategic role from role-engine.classifyRole. */
  role: StrategicRole;
  /** Multiplier (1.0 = standard) from RoleClassification.designerEffortMultiplier. */
  designerEffortMultiplier: number;
}

export interface AssetStatusResult {
  status: AssetStatus;
  /** Effective threshold for auto_bloomed AFTER role adjustment. */
  autoBloomFloor: number;
  /** Effective threshold for needs_your_magic AFTER role adjustment. */
  needsMagicCeiling: number;
  /** Composite score actually used to decide (0..100). */
  compositeScore: number;
  /** Short rationale tokens for downstream debugging / UI tooltips. */
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Base thresholds (mirror design doc §4.1) — adjusted per-role at runtime
// ---------------------------------------------------------------------------

const BASE_AUTO_BLOOM_FLOOR = 75;
const BASE_NEEDS_MAGIC_CEILING = 60;

// ---------------------------------------------------------------------------
// Composite score
// ---------------------------------------------------------------------------

/** Blend CTI confidence (text-only signal) with image analysis confidence
 *  (visual signal). Weight CTI 70 / image 30 — text always present, image
 *  often absent. */
function blendScore(
  inferenceConfidence: number,
  imageAnalysisConfidence: number,
): number {
  const ic = Math.max(0, Math.min(100, inferenceConfidence));
  const ia = Math.max(0, Math.min(1, imageAnalysisConfidence)) * 100;
  return Math.round(ic * 0.7 + ia * 0.3);
}

// ---------------------------------------------------------------------------
// Role-aware threshold shift
// ---------------------------------------------------------------------------

/**
 * Shift the auto_bloom floor and needs_magic ceiling based on the role's
 * designerEffortMultiplier. Higher multiplier (ace/battleground) raises the
 * auto_bloom floor (harder to skip designer) AND raises the needs_magic
 * ceiling (more likely to ask for direction). Lower multiplier (trend) does
 * the opposite.
 *
 * The shift is anchored at multiplier=1.0 (no change) and clamped so the
 * bands never cross.
 */
interface ShiftedThresholds {
  autoBloomFloor: number;
  needsMagicCeiling: number;
}

function shiftThresholds(multiplier: number): ShiftedThresholds {
  const safeMul = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  // Every 0.1 of multiplier above 1.0 raises floors by 3 points (and vice versa).
  // So ace (1.5) → +15, trend (0.8) → -6, niche (1.2) → +6.
  const delta = Math.round((safeMul - 1) * 30);
  let autoBloomFloor = BASE_AUTO_BLOOM_FLOOR + delta;
  let needsMagicCeiling = BASE_NEEDS_MAGIC_CEILING + delta;

  // Clamp into [50, 95] so we never make all products needs_magic or all auto.
  autoBloomFloor = Math.max(50, Math.min(95, autoBloomFloor));
  needsMagicCeiling = Math.max(35, Math.min(85, needsMagicCeiling));
  // Keep at least 8 points of separation so 'lets_refine' band is non-empty.
  if (autoBloomFloor - needsMagicCeiling < 8) {
    autoBloomFloor = needsMagicCeiling + 8;
  }

  return { autoBloomFloor, needsMagicCeiling };
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export function classifyAssetStatus(input: AssetStatusInput): AssetStatusResult {
  const reasons: string[] = [];
  const compositeScore = blendScore(
    input.inferenceConfidence,
    input.imageAnalysisConfidence,
  );

  const { autoBloomFloor, needsMagicCeiling } = shiftThresholds(
    input.designerEffortMultiplier,
  );

  reasons.push(`role:${input.role}`);
  reasons.push(`composite:${compositeScore}`);
  reasons.push(`floors:auto>=${autoBloomFloor},magic<${needsMagicCeiling}`);

  // Image analysis missing entirely — push toward needs_your_magic regardless
  // of CTI confidence (we don't have enough visual signal).
  if (input.imageAnalysisConfidence === 0) {
    reasons.push('image_analysis_missing');
    if (compositeScore >= autoBloomFloor) {
      // Strong text signal alone — still demote one step to lets_refine.
      return {
        status: 'lets_refine',
        autoBloomFloor,
        needsMagicCeiling,
        compositeScore,
        reasons,
      };
    }
  }

  if (compositeScore >= autoBloomFloor && input.imageAnalysisConfidence > 0) {
    return {
      status: 'auto_bloomed',
      autoBloomFloor,
      needsMagicCeiling,
      compositeScore,
      reasons,
    };
  }
  if (compositeScore < needsMagicCeiling) {
    return {
      status: 'needs_your_magic',
      autoBloomFloor,
      needsMagicCeiling,
      compositeScore,
      reasons,
    };
  }
  return {
    status: 'lets_refine',
    autoBloomFloor,
    needsMagicCeiling,
    compositeScore,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// Exports for testing
// ---------------------------------------------------------------------------

export const _internals = {
  blendScore,
  shiftThresholds,
  thresholds: { BASE_AUTO_BLOOM_FLOOR, BASE_NEEDS_MAGIC_CEILING },
};
