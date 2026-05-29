// composition-reference.ts
//
// Sprint 7-M2 Phase G8-ENGINE-Q4 — Firefly Composition Reference planner.
//
// Authority: docs/research/KKOTIUM_ADOBE_WORKFLOW_RESEARCH_2026-05-29.md §7
// (Composition/Style/Seed references) + docs/handoff/HANDOFF_g8_engine_q4_
// 2026-05-29.md §2-C.
//
// Produces a *plan* describing how to composite a product cutout onto a
// tone-matched AI backdrop in Firefly: which model, what backdrop prompt, the
// composition-reference strength, and a deterministic seed so all four variants
// of a product render with one consistent tone (research §7-C). It performs no
// IO and calls no image API at runtime (workrule #38) — Firefly generation is a
// Desktop/Claude-app step; this only emits the recipe.

import type { FireflyModel } from './adobe-tool-router';
import { planAdobeWorkflow } from './adobe-tool-router';
import type { ToneDirective } from './category-tone-mapper';
import type { ThumbnailVariant } from './thumbnail-generator';

/** A designer/Storage-deposited transparent product cutout. */
export interface CutoutAsset {
  /** Public URL of the cutout PNG (Supabase Storage). */
  url: string;
}

/** Minimal product shape needed to derive a stable seed. */
export interface CompositionProductInput {
  id: string;
}

export interface CompositionReferencePlan {
  /** Transparent product cutout PNG used as the structure reference. */
  cutoutAssetUrl: string;
  /** Tone-derived backdrop generation prompt (English; no faces, no text). */
  backdropPrompt: string;
  /** Model that should generate/compose the scene (reused from the router). */
  model: FireflyModel;
  /** Composition-reference strength, 0..1 — higher fixes product position. */
  strength: number;
  /** Deterministic seed: identical across a product's variants for tone
   *  consistency (research §7-C). */
  seed: number;
  /** Optional brand-tone moodboard style reference. */
  styleReferenceUrl?: string;
}

// Tone -> backdrop prompt (research §3-D sunlit fragrance / §4 category tones).
// Concise English prompts; the full library lives in art_director_prompts.
const BACKDROP_PROMPT: Record<ToneDirective['baseTone'], string> = {
  'foreign-cinematic-sunlit':
    'warm oak wood desk by a large window, soft morning sunlight and gentle shadows, minimal Scandinavian interior, dried pampas grass, shallow depth of field, warm color grade, photorealistic',
  'foreign-cinematic':
    'cinematic low-key interior, moody warm reflections, premium fragrance mood, soft rim light, photorealistic',
  'korean-traditional':
    'serene Korean minimalist interior, hanji paper texture wall, beige empty space, natural side light, quiet elegance, photorealistic',
  kinfolk:
    'kinfolk lifestyle scene, abundant negative space, muted earth tones, soft window light, calm sensory mood, photorealistic',
  'modern-minimal':
    'clean modern minimal studio, soft diffused light, light neutral surface, gentle shadow gradient, photorealistic',
  'pastel-friendly':
    'soft pastel scene, gentle warm light, friendly cozy mood, rounded clean composition, photorealistic',
};

const COMMON_NEGATIVE = 'no text, no watermark, no human face, no people, no logos';

/** Stable non-negative 31-bit seed from a string (deterministic, no Math.random). */
function stableSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h | 0) % 2147483647;
}

/**
 * Build the Firefly composition-reference plan for one product/variant. The
 * model mirrors the lifestyle decision in adobe-tool-router so the workflow and
 * composition stay consistent. Korean-traditional uses a higher strength to pin
 * the porcelain product against a partner-model background.
 */
export function buildCompositionPlan(
  product: CompositionProductInput,
  variant: ThumbnailVariant,
  toneDirective: ToneDirective,
  cutout: CutoutAsset,
  styleReferenceUrl?: string,
): CompositionReferencePlan {
  // Reuse the router's lifestyle model pick so there is one source of truth.
  const model = planAdobeWorkflow('lifestyle', toneDirective).model ?? 'firefly-image-5';
  const base = BACKDROP_PROMPT[toneDirective.baseTone] ?? BACKDROP_PROMPT['modern-minimal'];
  const strength = toneDirective.baseTone === 'korean-traditional' ? 0.8 : 0.75;

  return {
    cutoutAssetUrl: cutout.url,
    backdropPrompt: `${base}. ${COMMON_NEGATIVE}`,
    model,
    strength,
    // One seed per product so clean/price/badge/lifestyle share a tone.
    seed: stableSeed(product.id),
    styleReferenceUrl,
  };
}
