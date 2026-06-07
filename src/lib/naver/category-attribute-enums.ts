// src/lib/naver/category-attribute-enums.ts
// ============================================================================
// Category required-attribute enum mapping. Phase 3, handoff task 1.
// Authority: docs/handoff/MYEONGHWA_PUBLISH_READINESS_2026-06-07.md §1.
//
// Maps a free-text attribute value (e.g. a "glass bottle" phrase) to a curated
// allowed enum (e.g. the "glass" value) so naver_material / naver_color are NEVER
// free text. Resolves the internal completeness warning (missing material/color)
// for category 50003356 (the Furniture/Interior D1 requires brand/material/color).
//
// NOTE scope honesty (#46): this normalizes to display-value enums for the
//   INTERNAL completeness gate. Full structured Naver submission
//   (attributeId/valueId) needs the LIVE category attribute schema — a Desktop
//   API lookup, not here.
// Korean is DATA only (the enum JSON); English keys avoid Korean type literals.
// ============================================================================

import enums from './category-attribute-enums.ko.json';

export type AttrKey = 'material' | 'color';

interface AttrEnum { allowed: string[]; synonyms: Record<string, string> }
const ENUMS = enums as unknown as Record<AttrKey, AttrEnum>;
const FALLBACK = '기타';

export type MatchKind = 'exact' | 'synonym' | 'substring' | 'fallback' | 'empty';

export interface NormalizedAttr {
  attr: AttrKey;
  input: string | null;
  value: string | null;   // enum-valid value, or null when input was empty
  matched: MatchKind;
}

/** Allowed enum values for an attribute (includes the fallback value). */
export function getAllowedValues(attr: AttrKey): string[] {
  return [...ENUMS[attr].allowed];
}

/**
 * Normalize a raw value to an allowed enum. Empty stays null (caller decides).
 * Order: exact → synonym → substring (raw contains an enum word or vice versa)
 * → fallback value. Never returns free text.
 */
export function normalizeAttributeValue(attr: AttrKey, raw: string | null | undefined): NormalizedAttr {
  const e = ENUMS[attr];
  const input = (raw ?? '').trim();
  if (!input) return { attr, input: null, value: null, matched: 'empty' };

  if (e.allowed.includes(input)) return { attr, input, value: input, matched: 'exact' };

  const syn = e.synonyms[input] ?? e.synonyms[input.toLowerCase()];
  if (syn) return { attr, input, value: syn, matched: 'synonym' };

  // Substring either direction (a raw phrase containing an enum word, or vice versa).
  const hit = e.allowed.find((a) => a !== FALLBACK && (input.includes(a) || a.includes(input)));
  if (hit) return { attr, input, value: hit, matched: 'substring' };

  return { attr, input, value: FALLBACK, matched: 'fallback' };
}
