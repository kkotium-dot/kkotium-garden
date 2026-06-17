// Mood-Camera Spec System — shared types (2026-06-16, session8).
// Authority: docs/design/MOOD_CAMERA_SPEC_SYSTEM.md. All-products image system:
// score 6 mood axes -> look up a camera spec -> assemble an English prompt ->
// guards -> generate -> rating/favorite learning. No per-product hardcoding
// (#55). English-only prompt fragments; Korean lives only in display labels.

// The six conversion-driven mood axes (authority §1). Stable English-ish keys —
// the Korean display names live on MoodAxisData.nameKo, never in the literal.
export type MoodCode = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6';

// The camera spec the decision table returns for a mood (authority §2). Every
// field is an English prompt fragment so the assembler can splice it directly.
export interface CameraSpecData {
  cameraArchetype: string; // e.g. "full-frame camera"
  lens: string;            // e.g. "50mm lens"
  aperture: string;        // e.g. "f/2.8"
  lighting: string;        // e.g. "warm side window light"
  colorGrade: string;      // e.g. "warm amber, matte"
  realismCues: string;     // e.g. "soft falloff"
  resolution: string;      // "2K" | "4K"
  aspectRatio: string;     // "1:1" | "4:5"
}

// A full mood axis: conversion job, benchmark DNA, the variable subject template
// (carries [product] / [palette] placeholders) and the looked-up camera spec.
export interface MoodAxisData {
  code: MoodCode;
  nameKo: string;
  conversionJob: string;
  benchmarkDna: string[];
  // English reference-aesthetic clause (#62 E4). benchmarkDna is Korean display
  // tags (never injected into the English prompt); this is the English aesthetic
  // those benchmarks embody, spliced into the prompt to deliver the "selling
  // tone" without a competitor crawl. All-products (#55).
  referenceAesthetic: string;
  // Subject + surface + light only (camera clause is appended by the assembler
  // from the camera spec, so a single default camera can never be baked in #84).
  subjectTemplate: string;
  camera: CameraSpecData;
}

// Variable inputs for one assembly — the only product-specific knobs.
export interface AssembleInput {
  moodCode: MoodCode;
  product: string;     // subject noun (e.g. "ceramic diffuser")
  palette?: string;    // palette descriptor (e.g. "warm beige")
  categoryTags?: string[];
}

export interface AssembledPrompt {
  moodCode: MoodCode;
  prompt: string;
  camera: CameraSpecData;
  benchmarkDna: string[];
  // Always false: Gemini / Nano Banana have no negativePrompt field, so the
  // exclusion is carried positively inside the prompt (#86). Kept as a literal
  // false so any caller that reads it cannot accidentally enable the field.
  usesNegativePromptField: false;
}

// The five Layer-3 guards (authority §4). Each true = that guard passes.
export interface MoodGuards {
  cameraVarietyApplied: boolean; // batch cameras differ per mood (no single default)
  referenceCleared: boolean;     // reference 0/N before generate (edit-mode contamination)
  settingsVerified: boolean;     // ratio / resolution / grounding match the spec
  exclusionsPresent: boolean;    // positive exclusion block present in the prompt
  benchmarkDnaSet: boolean;      // mood axis carries benchmark DNA
}
