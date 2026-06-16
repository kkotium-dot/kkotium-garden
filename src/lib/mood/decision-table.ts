// Mood-Camera Spec System — Layer 1 decision table (2026-06-16, session8).
// Pure lookup: input = mood axis (+ optional category tags), output = the camera
// spec row. Fully decoupled from any product (authority §2). Category tags are
// accepted for signature stability + future per-category refinement, but the
// camera is decided by the mood today (the mood IS the conversion job).

import { MOOD_AXES } from './spec-data';
import type { CameraSpecData, MoodAxisData, MoodCode } from './types';

/** Resolve the full mood axis (camera spec + subject template + benchmark DNA). */
export function selectMoodAxis(moodCode: MoodCode): MoodAxisData {
  return MOOD_AXES[moodCode];
}

/**
 * Layer 1 — resolve the camera spec for a mood. categoryTags is reserved for
 * future per-category tuning; it does not alter the mood->camera mapping today.
 */
export function selectCameraSpec(
  moodCode: MoodCode,
  _categoryTags?: string[],
): CameraSpecData {
  return MOOD_AXES[moodCode].camera;
}

/**
 * A stable identity key for a camera spec — used by the cameraVarietyApplied
 * guard to detect a single default camera reused across a batch (#84).
 */
export function cameraSpecKey(spec: CameraSpecData): string {
  return `${spec.cameraArchetype}|${spec.lens}|${spec.aperture}`;
}
