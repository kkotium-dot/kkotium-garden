// src/lib/naver/category-deterministic-matcher.ts
// UCE-1/UCE-3 (Universal Category Engine, 2026-08-27): deterministic category
// matching against the FULL master (NAVER_CATEGORIES_FULL, 5,021 leaves) —
// no AI call, no maintenance burden. Replaces the old hand-picked
// FALLBACK_RULES (~57 entries) with a rule that covers all 5,021 leaves and
// stays correct automatically whenever the master is regenerated (UCE-3).
//
// Core insight: Naver leaf category names are themselves the best keyword
// dictionary — they're already curated, already exhaustive, and Korean
// compounds don't need spaces (e.g. "달항아리" contains "항아리", a real
// leaf name under 생활/건강>주방용품>보관/밀폐용기). So the primary signal
// is a straight substring test of the product name against every leaf name
// in the master, scored by specificity (match length, d4 > d3).
//
// This is PURE — no I/O, no AI, no DB. Runs before Groq (UCE-1: "결정론적
// 매칭 1순위, AI는 실패 시 보조로 강등").
//
// Known limitation: slash-packed labels ("필라테스/요가") can occasionally
// out-score the correct product category when a lesson/service category
// happens to pack the same two words a clothing item's name contains (e.g.
// "요가복" → 여가/생활편의>예체능레슨>필라테스/요가 out-scores the correct
// 스포츠/레저>요가/필라테스>요가복). We don't special-case this — the caller's
// existing Naver page-1 distribution check (validatePageCategory) is the
// intended corrective layer, and the correct answer still surfaces in the
// top-3 either way.

import { NAVER_CATEGORIES_FULL } from './naver-categories-full';
import { extractNouns } from '../strategy/morpheme-tokenizer';
import { GENERIC_MODIFIERS_SET, STOP_NOUNS_SET } from '../strategy/identity-dictionary';

export interface DeterministicMatch {
  d1: string;
  d2: string;
  d3: string;
  d4?: string;
  /** Which leaf/branch text actually matched — for debugging & UI trust signal. */
  matchedTerm: string;
  score: number;
}

const MIN_TERM_LEN = 2; // shorter than this is too generic to trust as a signal

/** A candidate term is unusable as a signal if it's itself a generic
 *  wholesale-listing modifier/stopword (e.g. "무선","세트") — some Naver leaf
 *  names ARE bare generic words (taxonomy quirk), which would otherwise
 *  produce confident-looking but meaningless matches on any product whose
 *  title happens to contain that common word. */
function isGenericTerm(term: string): boolean {
  return GENERIC_MODIFIERS_SET.has(term) || STOP_NOUNS_SET.has(term);
}

/** Split a "A/B/C" tree-node name into its synonym parts, dropping ones too
 *  short to be a reliable standalone signal. Naver often packs synonyms into
 *  a single d2/d3/d4 label this way (e.g. "마스크/팩", "아로마방향제/디퓨저"). */
function splitSynonyms(label: string): string[] {
  return label.split('/').map((p) => p.trim()).filter((p) => p.length >= MIN_TERM_LEN);
}

/** Score a single tree-node label against the product name. Handles both
 *  plain labels ("우산꽂이" — whole-string substring) and slash-packed labels
 *  ("아로마방향제/디퓨저" — every synonym part must appear somewhere in the
 *  name; a product rarely repeats every synonym verbatim, so this is scored
 *  by total matched length rather than requiring the packed string itself). */
function termMatchScore(label: string, name: string): number {
  if (!label || isGenericTerm(label)) return 0;
  if (label.includes('/')) {
    const parts = splitSynonyms(label);
    const matched = parts.filter((p) => !isGenericTerm(p) && name.includes(p));
    if (matched.length === 0) return 0;
    const full = matched.length === parts.length;
    const len = matched.reduce((sum, p) => sum + p.length, 0);
    return full ? len : len * 0.5; // partial synonym coverage = weaker signal
  }
  if (label.length < MIN_TERM_LEN) return 0;
  return name.includes(label) ? label.length : 0;
}

/**
 * PURE. Deterministically match a Korean product name against every leaf in
 * the Naver category master. Returns candidates sorted by score desc,
 * deduplicated by (d1,d2,d3), capped to `limit`. Empty array = genuinely no
 * lexical overlap found (caller should fall through to AI).
 */
export function matchDeterministicCategories(
  productName: string,
  limit = 3,
): DeterministicMatch[] {
  const name = productName.trim();
  if (!name) return [];

  const { nouns } = extractNouns(name);
  const byKey = new Map<string, DeterministicMatch>();

  const consider = (key: string, match: DeterministicMatch) => {
    const existing = byKey.get(key);
    if (!existing || existing.score < match.score) byKey.set(key, match);
  };

  for (const c of NAVER_CATEGORIES_FULL) {
    const leaf = c.d4 || c.d3; // deepest non-empty level
    if (!leaf) continue;
    const key = `${c.d1}|${c.d2}|${c.d3}`;
    let match: DeterministicMatch | null = null;

    // Tier 1 (strongest): the deepest leaf name matches — plain substring or
    // every synonym part of a slash-packed label ("아로마방향제/디퓨저").
    // Korean has no word-boundary requirement, so this alone catches
    // "우산꽂이"(exact), "수세미"(exact), "달항아리"→"항아리"(substring).
    const leafScore = termMatchScore(leaf, name);
    if (leafScore > 0) {
      match = { d1: c.d1, d2: c.d2, d3: c.d3, d4: c.d4 || undefined, matchedTerm: leaf, score: leafScore * 10 + (c.d4 ? 5 : 0) };
    }
    // Tier 2: d3 itself (when it differs from the leaf, i.e. d4 exists but
    // didn't match) — broader but still a real tree node. Don't guess which
    // specific d4 subtype applies (several rows can share this d3).
    else if (c.d3) {
      const d3Score = termMatchScore(c.d3, name);
      if (d3Score > 0) {
        match = { d1: c.d1, d2: c.d2, d3: c.d3, d4: undefined, matchedTerm: c.d3, score: d3Score * 8 };
      }
    }
    // Tier 3: the d2 bucket itself matches (packed or plain) — trusted only
    // down to d1+d2 (d3 left blank, per selfValidateSuggestions convention).
    if (!match && c.d2) {
      const d2Score = termMatchScore(c.d2, name);
      if (d2Score > 0) {
        consider(`${c.d1}|${c.d2}|`, { d1: c.d1, d2: c.d2, d3: '', d4: undefined, matchedTerm: c.d2, score: d2Score * 4 });
      }
      continue;
    }
    if (!match) continue;

    // Corroboration bonus: an extracted noun token also textually aligns
    // with d2 (the broader bucket) — small nudge, not a requirement.
    if (nouns.some((t) => c.d2 && t.length >= MIN_TERM_LEN && c.d2.includes(t))) {
      match.score += 1;
    }
    consider(key, match);
  }

  return Array.from(byKey.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
