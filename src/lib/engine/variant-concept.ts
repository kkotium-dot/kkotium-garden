// src/lib/engine/variant-concept.ts
// ============================================================================
// Per-variant scene concept (#62 E5). A variant-bearing slot (scent_note) needs
// a DIFFERENT backdrop per option value: Lemon = lemons + eucalyptus, Black
// Cherry = ripe cherries, etc. The concept is the English SCENE SUBJECT only —
// the time-of-day / grade comes from the mood axis, so this stays stable across
// scent-narrative revisions (v5/v6). The product is composited in later, so
// these are always reserve-product-margin backdrops.
//
// Product-agnostic in structure (#55): a config map keyed by option value, with
// a null fallback (an unmapped variant just reuses the product subject). A future
// pass can LLM-derive concepts at seed time. Korean keys are option values, not
// prompt text — the concept value itself is English (never injected as Korean).
// ============================================================================

import type { MoodCode } from '@/lib/mood/types';

export interface VariantConcept {
  /** English scene subject (no product — the mood supplies the grade). */
  concept: string;
  /** Optional per-variant mood override (#62 E5 / v6). v6 confirmed each scent
   *  carries a DIFFERENT grade (Lemon warm-ripe / April airy high-key / Cherry
   *  moody low-key), so the variant picks its own mood instead of the slot's
   *  single mood. Tunable. Omitted = use the slot mood. */
  mood?: MoodCode;
}

// v6 scent grade mapping (2026-06-18 operator-confirmed): Lemon ripe-warm golden
// morning (M4 warm amber), April airy high-key (M5 bright daylight), Black Cherry
// moody low-key dusk (M6 chiaroscuro). The concept is the scene subject (stable);
// the mood now carries the v6 per-scent grade.
const VARIANT_CONCEPTS: Record<string, VariantConcept> = {
  '레몬유칼립': { concept: 'ripe sun-yellow lemons and eucalyptus sprigs on a pale travertine ledge with dewdrops', mood: 'M4' },
  '에이프릴 후레쉬': { concept: 'crisp white linen with soft white and blue spring florals by a bright rainy window', mood: 'M5' },
  '블랙체리': { concept: 'ripe deep-crimson cherries with subtle woody branches on dark walnut wood', mood: 'M6' },
  // Cotton is stock 0 (excluded from active coverage) but mapped for completeness.
  '코튼어라운드': { concept: 'crisp folded white linen and cotton fabric on a sunlit wooden surface near a bright window', mood: 'M5' },
  '코튼 어라운드': { concept: 'crisp folded white linen and cotton fabric on a sunlit wooden surface near a bright window', mood: 'M5' },
};

/** Scene concept for a variant option value, or null when none is configured. */
export function variantConceptFor(optionValue: string | null | undefined): VariantConcept | null {
  return VARIANT_CONCEPTS[(optionValue ?? '').trim()] ?? null;
}
