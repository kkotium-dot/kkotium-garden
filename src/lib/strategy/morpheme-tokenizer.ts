// src/lib/strategy/morpheme-tokenizer.ts
//
// Sprint 7-M2 5-B — Rule-based Korean noun extractor for product titles.
//
// Why rule-based and not Mecab/Khaiii
//   Production runtime is Vercel serverless (workflow principle #28). Mecab
//   ships a 30 MB C++ binary + dictionary that explodes cold-start time and
//   is unreliable inside a serverless function. Khaiii has the same problem.
//
//   Product titles are noun-heavy and whitespace-separated by Korean
//   wholesale convention (도매꾹/오너클랜 listings always look like
//   "디자인 복 달항아리 도어벨 개업선물 ..."). A protect-then-split-then-strip
//   pipeline gets us to ~95% precision on this corpus with zero dependencies.
//
// Pipeline
//   1. Protect every COMPOUND_NOUNS span with a sentinel so naive split
//      cannot break "달항아리" into ["달", "항아리"].
//   2. Replace bracket / paren / dash separators with spaces.
//   3. Whitespace-split.
//   4. Strip particle / ending tails from each token.
//   5. Drop empty / numeric / single-char tokens, GENERIC_MODIFIERS,
//      STOP_NOUNS, and tokens that look like SKU numbers.
//   6. Restore sentinels to their original Korean compound nouns.
//   7. Dedupe preserving first-seen order.

import {
  COMPOUND_NOUNS,
  GENERIC_MODIFIERS_SET,
  PARTICLE_SUFFIXES,
  STOP_NOUNS_SET,
} from './identity-dictionary';

// ---------------------------------------------------------------------------
// Sentinel scheme — protect compound nouns before splitting
// ---------------------------------------------------------------------------
//
// We replace each compound noun match with a sentinel of the form §N§
// where N is the index into a lookup array. The § character (U+00A7) is not
// Hangul, not ASCII alphanumeric, and survives every regex/split downstream.

const SENTINEL_OPEN = '§';
const SENTINEL_CLOSE = '§';

interface ProtectResult {
  text: string;
  lookup: string[];
}

function protectCompounds(input: string): ProtectResult {
  const lookup: string[] = [];
  let text = input;

  // Sort by descending length so a longer compound (잠옷세트) is matched
  // before a shorter prefix (잠옷). Otherwise the greedy replace eats the
  // prefix first and the longer span is lost.
  const sorted = [...COMPOUND_NOUNS].sort((a, b) => b.length - a.length);

  for (const noun of sorted) {
    if (!text.includes(noun)) continue;
    const escaped = noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escaped, 'g');
    text = text.replace(pattern, () => {
      const idx = lookup.length;
      lookup.push(noun);
      return `${SENTINEL_OPEN}${idx}${SENTINEL_CLOSE}`;
    });
  }

  return { text, lookup };
}

function restoreSentinels(token: string, lookup: ReadonlyArray<string>): string {
  // Whole-token sentinel (most common case after split).
  const whole = token.match(/^§(\d+)§$/);
  if (whole) {
    const idx = Number(whole[1]);
    return lookup[idx] ?? token;
  }
  // Embedded sentinel — replace every occurrence.
  return token.replace(/§(\d+)§/g, (_match, indexStr) => {
    const idx = Number(indexStr);
    return lookup[idx] ?? '';
  });
}

// ---------------------------------------------------------------------------
// Particle / ending stripper
// ---------------------------------------------------------------------------
//
// Greedy longest-first strip — checks longer particles first so "에서" wins
// over "에". Applied repeatedly until no further trim happens (some titles
// stack particles: "친구에게로").

function stripParticleTail(token: string): string {
  // Never trim particles from a sentinel-protected compound — its tail is
  // a digit + § character, not a real Korean ending.
  if (token.endsWith(SENTINEL_CLOSE)) return token;

  const sorted = [...PARTICLE_SUFFIXES].sort((a, b) => b.length - a.length);
  let current = token;
  for (let i = 0; i < 3; i += 1) {
    let trimmed = current;
    for (const p of sorted) {
      if (trimmed.length > p.length + 1 && trimmed.endsWith(p)) {
        trimmed = trimmed.slice(0, -p.length);
        break;
      }
    }
    if (trimmed === current) break;
    current = trimmed;
  }
  return current;
}

// ---------------------------------------------------------------------------
// Token validity
// ---------------------------------------------------------------------------

/** True when the token is worth probing as a category-identity candidate. */
function isUsableNoun(token: string): boolean {
  if (!token || token.length < 2) return false;
  // Pure numeric / model-code tokens — never useful as nouns.
  if (/^[\d\-\s]+$/.test(token)) return false;
  // SKU-ish (mix of digits + non-Hangul) — drop.
  if (/^[A-Za-z0-9\-_]+$/.test(token)) return false;
  // Sentinel residue — should have been restored already.
  if (token.includes(SENTINEL_OPEN)) return false;
  if (GENERIC_MODIFIERS_SET.has(token)) return false;
  if (STOP_NOUNS_SET.has(token)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Public entries
// ---------------------------------------------------------------------------

export interface ExtractedNouns {
  /** Dedup-preserving-order noun list. Compounds are restored verbatim. */
  nouns: string[];
  /** Which compound nouns from the dictionary fired (for debugging /
   *  Phase 2 dictionary growth analytics). */
  matchedCompounds: string[];
}

/** Extract candidate Korean nouns from a product title. */
export function extractNouns(productName: string): ExtractedNouns {
  if (!productName || typeof productName !== 'string') {
    return { nouns: [], matchedCompounds: [] };
  }

  // Step 1: protect compound nouns.
  const { text: protectedText, lookup } = protectCompounds(productName);

  // Step 2: normalise separators.
  const normalised = protectedText
    .replace(/[()[\]{}<>·,/|]/g, ' ')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Step 3: whitespace split.
  const rawTokens = normalised.split(/\s+/);

  // Step 4+5+6: strip tails, validate, restore sentinels.
  const nouns: string[] = [];
  const seen = new Set<string>();
  for (const raw of rawTokens) {
    // Strip particles BEFORE restoring so a sentinel-tailed token is left
    // untouched (its real Korean form has no Korean particle attached).
    const stripped = stripParticleTail(raw).trim();
    const restored = restoreSentinels(stripped, lookup).trim();
    if (!isUsableNoun(restored)) continue;
    if (seen.has(restored)) continue;
    seen.add(restored);
    nouns.push(restored);
  }

  return {
    nouns,
    matchedCompounds: lookup.slice(),
  };
}

// ---------------------------------------------------------------------------
// Exports for testing
// ---------------------------------------------------------------------------

export const _internals = {
  protectCompounds,
  restoreSentinels,
  stripParticleTail,
  isUsableNoun,
  SENTINEL_OPEN,
};
