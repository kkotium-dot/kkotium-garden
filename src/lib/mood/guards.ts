// Mood-Camera Spec System — Layer 3 guards (2026-06-16, session8).
// Returns the five subchecks (authority §4) surfaced as a firefly_auto card
// (#56 natural intervention). Derives what it can from the assembled batch
// (camera variety / exclusion presence / benchmark DNA); the two runtime
// signals the driver must confirm (referenceCleared / settingsVerified) are
// passed in.

import { cameraSpecKey } from './decision-table';
import { EXCLUSION_BLOCK } from './spec-data';
import type { AssembledPrompt, MoodGuards } from './types';

// The exclusion block's marker phrase — its presence proves the positive
// exclusion (not a negativePrompt field) made it into the prompt (#86).
const EXCLUSION_MARKER = 'realistic photograph only';

export interface GuardInput {
  // The assembled prompts for this generation batch (1..N cuts).
  batch: AssembledPrompt[];
  // Driver-confirmed: reference panel was 0/N right before generate (#83).
  referenceCleared?: boolean;
  // Driver-confirmed: ratio / resolution / grounding match the mood spec (#77).
  settingsVerified?: boolean;
}

/**
 * Evaluate the five mood guards. A single-cut batch is variety-exempt (there is
 * nothing to vary against); a multi-cut batch fails cameraVarietyApplied only
 * when every cut shares one camera spec — the "all Sony" single-default failure
 * mode (#84).
 */
export function evaluateGuards(input: GuardInput): MoodGuards {
  const batch = input.batch ?? [];

  const cameraKeys = new Set(batch.map((b) => cameraSpecKey(b.camera)));
  const cameraVarietyApplied = batch.length <= 1 ? batch.length === 1 : cameraKeys.size >= 2;

  const exclusionsPresent =
    batch.length > 0 && batch.every((b) => b.prompt.includes(EXCLUSION_MARKER) || b.prompt.includes(EXCLUSION_BLOCK));

  const benchmarkDnaSet = batch.length > 0 && batch.every((b) => b.benchmarkDna.length > 0);

  return {
    cameraVarietyApplied,
    referenceCleared: input.referenceCleared === true,
    settingsVerified: input.settingsVerified === true,
    exclusionsPresent,
    benchmarkDnaSet,
  };
}

/** True only when all five guards pass — gates the firefly_auto summary. */
export function allGuardsPass(g: MoodGuards): boolean {
  return (
    g.cameraVarietyApplied &&
    g.referenceCleared &&
    g.settingsVerified &&
    g.exclusionsPresent &&
    g.benchmarkDnaSet
  );
}
