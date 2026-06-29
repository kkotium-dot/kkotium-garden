// src/lib/ai/provider-profile.ts
// ============================================================================
// AI-PRIORITY-1 (#162/#155) — task-aware free-provider ordering.
//
// The AI chain has THREE providers: Groq (free, ultra-fast, weaker Korean copy),
// Gemini 2.0 Flash (free, stronger Korean nuance / emotional copy, slightly
// slower), and Anthropic (paid, last resort). This module orders only the two
// FREE providers; Anthropic is NEVER reordered here — it stays the gated paid
// last-resort (allowPaidFallback, #155) regardless of profile.
//
// Two profiles:
//   - 'speed'   → [groq, gemini]  — fast & high-frequency safe. THE DEFAULT.
//   - 'quality' → [gemini, groq]  — Korean-nuance copy first; low-frequency only
//                                    (single Gemini slot1 quota must not blow up,
//                                    so quality is reserved for low-volume tasks).
//
// Both profiles always fall back to the other free provider on failure (429 /
// timeout), so quality never strands a request — it just changes WHO goes first.
//
// ★ Activation note: this infra ships with every caller defaulting to 'speed'
// (zero behavior change). Switching copy/hook tasks to 'quality' is a SEPARATE
// commit, gated on confirming Gemini slot1 returns 200 (not 429).
// ============================================================================

export type ProviderProfile = 'speed' | 'quality';
export type FreeProvider = 'groq' | 'gemini';

const FREE_ORDER: Record<ProviderProfile, readonly FreeProvider[]> = {
  speed: ['groq', 'gemini'],
  quality: ['gemini', 'groq'],
};

/**
 * Coerce arbitrary input (e.g. a request body field) to a valid profile.
 * Anything other than the literal 'quality' resolves to 'speed' — the safe
 * default — so an absent / malformed field can never change behavior.
 */
export function normalizeProfile(input: unknown): ProviderProfile {
  return input === 'quality' ? 'quality' : 'speed';
}

/**
 * Ordered free providers to attempt for a given profile. Anthropic (paid) is
 * intentionally excluded — callers append it last behind the allowPaidFallback
 * gate (#155).
 */
export function resolveFreeProviderOrder(
  profile: ProviderProfile | undefined,
): readonly FreeProvider[] {
  return FREE_ORDER[normalizeProfile(profile)];
}
