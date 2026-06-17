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

export interface VariantConcept {
  /** English scene subject (no product, no time-of-day — mood supplies grade). */
  concept: string;
}

const VARIANT_CONCEPTS: Record<string, VariantConcept> = {
  '레몬유칼립': { concept: 'fresh lemons and eucalyptus sprigs on a pale stone ledge with dewdrops and soft natural mist' },
  '에이프릴 후레쉬': { concept: 'soft pastel spring blossoms with clean water droplets on the petals on a misty surface' },
  '블랙체리': { concept: 'ripe dark cherries with subtle woody branches on a rustic surface' },
  // Cotton is stock 0 (excluded from active coverage) but mapped for completeness.
  '코튼어라운드': { concept: 'crisp folded white linen and cotton fabric on a sunlit wooden surface near a bright window' },
  '코튼 어라운드': { concept: 'crisp folded white linen and cotton fabric on a sunlit wooden surface near a bright window' },
};

/** Scene concept for a variant option value, or null when none is configured. */
export function variantConceptFor(optionValue: string | null | undefined): VariantConcept | null {
  return VARIANT_CONCEPTS[(optionValue ?? '').trim()] ?? null;
}
