// src/lib/seo/seo-text-generator.ts
// ============================================================================
// SEO text auto-fill — product name + tags + attribute summary, with brand_line
// templates. Phase 3, handoff task 7.
// Authority: docs/research/KKOTIUM_ADAPTIVE_SEO_IMAGE_SYSTEM_2026-06-06.md §2/§3.
//
// Pure normalization + validation. Korean only ever flows through as DATA
// (keywords, scent names, attribute values from the caller) — there are NO
// Korean string literals in this module (#3-1). The brand_line "template" is
// ordering/weighting policy, not hardcoded copy:
//   SEED       (seed line, low-involvement)       : functional/use keywords first
//   GREENHOUSE (greenhouse line, high-involvement) : brand/emotional longtail first
//
// Name validation reuses detectNameRules (banned words / dup / special chars).
// Tag-dictionary verification is async + network → done by the route via
// verifyTags(), not here, so this stays pure/testable.
// ============================================================================

import { detectNameRules, type RuleFinding } from '../honey-name-rules';

export type BrandLine = 'SEED' | 'GREENHOUSE';

export const NAVER_NAME_MAX = 50;   // Naver product-name soft cap (chars)
export const MAX_TAGS = 10;

// Structured source attributes (all optional; Korean values are data).
export interface SeoSourceAttrs {
  categoryCode?: string | null;
  scents?: string[];          // scent variants
  form?: string | null;       // formulation (liquid/refill ...)
  volume?: string | null;     // capacity
  origin?: string | null;     // country of manufacture
  seller?: string | null;     // seller of record
  use?: string | null;        // intended use
}

export interface SeoTextInput {
  baseName: string;                 // current product name (tokens reused)
  brandLine: BrandLine;
  attrs?: SeoSourceAttrs;
  // Caller-provided keyword groups. The brand_line decides ordering precedence.
  functionalKeywords?: string[];    // practical / use / spec
  emotionalKeywords?: string[];     // emotional / gift / longtail
  brandToken?: string | null;       // optional leading brand token (GREENHOUSE)
}

export interface SeoTextDraft {
  brandLine: BrandLine;
  productName: string;
  productNameLength: number;
  nameFindings: RuleFinding[];      // banned/dup/special/length from detectNameRules
  tags: string[];                   // <= MAX_TAGS, deduped
  attributes: Record<string, string>;  // English keys; UI maps to Korean
}

/** Whitespace tokenizer (collapses runs, drops empties). */
function tokenize(s: string): string[] {
  return s.trim().split(/\s+/).filter(Boolean);
}

/**
 * Dedupe tokens preserving order: drop exact repeats AND any token that is a
 * proper substring of a longer kept token (collapses a short token when a longer
 * token that contains it is present, e.g. a generic word inside a compound word).
 * Longer/earlier tokens win.
 */
export function dedupeTokens(tokens: string[]): string[] {
  const kept: string[] = [];
  for (const t of tokens) {
    if (kept.some((k) => k === t || k.includes(t))) continue;
    // If this token is longer and contains an already-kept token, replace it.
    const idx = kept.findIndex((k) => t.includes(k) && t !== k);
    if (idx >= 0) { kept[idx] = t; continue; }
    kept.push(t);
  }
  return kept;
}

/** Join tokens into a name, dropping trailing tokens to stay within maxChars. */
function joinWithinLimit(tokens: string[], maxChars: number): string {
  const out: string[] = [];
  let len = 0;
  for (const t of tokens) {
    const add = (out.length ? 1 : 0) + t.length; // +1 for the joining space
    if (len + add > maxChars) break;
    out.push(t);
    len += add;
  }
  return out.join(' ');
}

/** Dedupe a string list preserving order (exact match, trimmed, non-empty). */
function uniqueList(items: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const v = (raw ?? '').trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

/**
 * Generate an SEO text draft. brand_line decides keyword precedence; the result
 * is deduped, length-capped, and rule-checked. Deterministic + pure.
 */
export function generateSeoText(input: SeoTextInput): SeoTextDraft {
  const { brandLine, attrs = {} } = input;
  const baseTokens = tokenize(input.baseName);
  const functional = input.functionalKeywords ?? [];
  const emotional = input.emotionalKeywords ?? [];

  // Name token order by brand_line policy.
  const ordered: string[] =
    brandLine === 'GREENHOUSE'
      ? [input.brandToken ?? '', ...baseTokens, ...emotional, ...functional]
      : [...baseTokens, ...functional, ...emotional];

  const nameTokens = dedupeTokens(ordered.map((t) => t.trim()).filter(Boolean));
  const productName = joinWithinLimit(nameTokens, NAVER_NAME_MAX);
  const nameRules = detectNameRules(productName);

  // Tags: keyword groups (brand_line order) + a few attribute-derived seeds.
  const attrSeeds = uniqueList([...(attrs.scents ?? []), attrs.use]);
  const tagSource =
    brandLine === 'GREENHOUSE'
      ? [...emotional, ...functional, ...attrSeeds]
      : [...functional, ...emotional, ...attrSeeds];
  const tags = uniqueList(tagSource).slice(0, MAX_TAGS);

  // Attribute summary (English keys; values are source data).
  const attributes: Record<string, string> = {};
  if (attrs.scents && attrs.scents.length) attributes.scents = attrs.scents.join(', ');
  if (attrs.form) attributes.form = attrs.form;
  if (attrs.volume) attributes.volume = attrs.volume;
  if (attrs.origin) attributes.origin = attrs.origin;
  if (attrs.seller) attributes.seller = attrs.seller;
  if (attrs.use) attributes.use = attrs.use;
  if (attrs.categoryCode) attributes.categoryCode = attrs.categoryCode;

  return {
    brandLine,
    productName,
    productNameLength: productName.length,
    nameFindings: nameRules.findings,
    tags,
    attributes,
  };
}
