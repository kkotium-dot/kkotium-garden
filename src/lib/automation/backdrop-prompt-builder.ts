// src/lib/automation/backdrop-prompt-builder.ts
//
// Track B Phase 1 — unmanned backdrop adoption spine (2026-05-30).
//
// Authority: docs/research/FIREFLY_AUTOMATION_RESEARCH_2026-05-30.md §6
// (recommended end-to-end: app -> backdrop_jobs row holding a Firefly request
// spec -> worker/manual generation -> ingest -> verify -> resolver auto-cache).
//
// This module turns (productId + skeletonId + baseTone + chosen model) into a
// firefly_request jsonb payload aligned with the Firefly Services v3 API shape
// (research §2). It is pure: no IO, no network. The seed is derived
// deterministically from productId so all four thumbnail variants of a product
// share one consistent backdrop tone (mirrors composition-reference.ts).
//
// Workrule #38: this builder NEVER calls a generation API. Generation is a
// human-triggered (or future worker-triggered) step downstream.

import type { BaseTone } from './category-tone-mapper';
import type { FireflyModel } from './adobe-tool-router';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FireflyRequest {
  /** Positive prompt. English; describes the backdrop only (no product). */
  prompt: string;
  /** Negative prompt — per Phase 1 spec: people,humans,product,text,watermark. */
  negativePrompt: string;
  /** Firefly v3 contentClass — 'photo' for product-photography backdrops. */
  contentClass: 'photo' | 'art';
  /** Square 1:1 size. 1024x1024 is the smaller variant per Firefly v3 spec. */
  size: { width: number; height: number };
  /** Deterministic seed: identical across a product's variants for tone
   *  consistency (research §7-C of art-direction + composition-reference). */
  seed: number;
  /** Chosen model (informational — the worker decides whether to dispatch via
   *  Firefly Services API, partner endpoint, or surface to a human). */
  model: FireflyModel;
  /** Locale biasing (research §2 — Korean market relevance). */
  promptBiasingLocaleCode: string;
}

export interface BuildBackdropPromptInput {
  productId: string;
  skeletonId: string;
  baseTone: BaseTone;
  model: FireflyModel;
}

// ---------------------------------------------------------------------------
// Tone -> prompt body (research §3-D + art-direction §4 / §8)
// ---------------------------------------------------------------------------

const BACKDROP_PROMPT_BY_TONE: Record<BaseTone, string> = {
  // Q4 fragrance retune: sunlit oak desk / window light (Adobe workflow §3-D #1).
  'foreign-cinematic-sunlit':
    'warm oak wood desk by a large window, soft morning sunlight casting gentle shadows, minimal Scandinavian interior, dried pampas grass in ceramic vase, shallow depth of field, warm color grade, empty composition center reserved for product placement, photorealistic',
  // Legacy dark cinematic — retained for non-fragrance tones that still want it.
  'foreign-cinematic':
    'cinematic low-key interior, moody warm reflections, premium mood, soft rim light, empty composition center reserved for product placement, photorealistic',
  'korean-traditional':
    'serene Korean minimalist interior, hanji paper texture wall, beige empty space, natural side light, quiet elegance, empty composition center reserved for product placement, photorealistic',
  kinfolk:
    'kinfolk lifestyle scene, abundant negative space, muted earth tones, soft window light, calm sensory mood, empty composition center reserved for product placement, photorealistic',
  'modern-minimal':
    'clean modern minimal studio, soft diffused light, light neutral surface, gentle shadow gradient, empty composition center reserved for product placement, photorealistic',
  'pastel-friendly':
    'soft pastel scene, gentle warm light, friendly cozy mood, rounded clean composition, empty composition center reserved for product placement, photorealistic',
};

// Phase 1 spec — comma-separated single-token negatives (Firefly v3 form).
const NEGATIVE_PROMPT = 'people,humans,product,text,watermark';
const CONTENT_CLASS: FireflyRequest['contentClass'] = 'photo';
const SIZE_1_1 = { width: 1024, height: 1024 };
const LOCALE = 'ko-KR';

// ---------------------------------------------------------------------------
// Seed (deterministic, no Math.random) — mirrors composition-reference.ts
// ---------------------------------------------------------------------------

/** Stable non-negative 31-bit seed from a string. */
export function stableSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h | 0) % 2147483647;
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

/**
 * Build the Firefly request payload to store in backdrop_jobs.firefly_request.
 * The model is carried in the payload for downstream routing (worker / human)
 * but generation itself is a separate step — this builder is pure.
 */
export function buildBackdropPrompt(input: BuildBackdropPromptInput): FireflyRequest {
  const promptBody =
    BACKDROP_PROMPT_BY_TONE[input.baseTone] ?? BACKDROP_PROMPT_BY_TONE['modern-minimal'];
  return {
    prompt: promptBody,
    negativePrompt: NEGATIVE_PROMPT,
    contentClass: CONTENT_CLASS,
    size: SIZE_1_1,
    seed: stableSeed(input.productId),
    model: input.model,
    promptBiasingLocaleCode: LOCALE,
  };
}
