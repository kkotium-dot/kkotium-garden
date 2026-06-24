// src/lib/seo/match.ts
// ============================================================================
// SEO-MATCH-1 (#154 / #151) — shared PURE keyword-match normalizer. Naver
// treats "차량용방향제" and "차량용 방향제" as the same keyword, but a naive
// substring check is whitespace-sensitive and false-negatives when the copy
// spaces the words and the golden keyword doesn't (or vice-versa). Normalizing
// both sides (lowercase + strip ALL whitespace) before substring matching fixes
// it. Whitespace-insensitive substring is enough — token partial-overlap would
// be over-engineering (#147).

/** Lowercase + remove all whitespace, for whitespace-insensitive matching. */
export function normalizeForMatch(s: string): string {
  return (s ?? '').toLowerCase().replace(/\s+/g, '');
}

/** Does `haystack` contain `needle`, ignoring case and whitespace? */
export function includesNormalized(haystack: string, needle: string): boolean {
  const n = normalizeForMatch(needle);
  return n.length > 0 && normalizeForMatch(haystack).includes(n);
}
