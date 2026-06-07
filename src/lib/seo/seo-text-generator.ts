// src/lib/seo/seo-text-generator.ts
// ============================================================================
// SEO text auto-fill — product name + tag candidate pool + attribute summary,
// with brand_line templates. Phase 3, handoff task 7 (rework).
// Authority: docs/research/KKOTIUM_ADAPTIVE_SEO_IMAGE_SYSTEM_2026-06-06.md §2/§3.
//
// REAL generation (prior version only reordered caller input → empty on empty
// body). Now:
//   - roots are extracted from the product's own keywords + name (stopwords /
//     restricted seller-tags removed),
//   - a candidate tag POOL is expanded: roots + scents + modifier×nounRoot
//     compounds + synonyms + situational tags (restricted filtered, deduped),
//   - the route runs verifyTags() over the pool and keeps verified>weak (the
//     LIVE tag dictionary is the quality gate — weak tags are substituted),
//   - the product NAME collapses a repeated leading morpheme (two compound
//     tokens that share the same prefix word keep that prefix only once).
//
// Korean only flows as DATA (product values + the tag-expansion dict JSON);
// no Korean string literals in this module (#3-1). Pure + deterministic.
// ============================================================================

import { detectNameRules, type RuleFinding } from '../honey-name-rules';
import { RESTRICTED_SELLER_TAGS } from '../naver/product-builder';
import dict from './tag-expansion.ko.json';

export type BrandLine = 'SEED' | 'GREENHOUSE';

export const NAVER_NAME_MAX = 50;   // Naver product-name soft cap (chars)
export const MAX_TAGS = 10;
export const TAG_POOL_MAX = 24;     // pool size cap before tag-dictionary verify
const TAG_MAX_CHARS = 20;           // Naver sellerTag max length

interface ExpansionDict {
  stopwords: string[];
  nounRoots: string[];
  modifiers: string[];
  situational: string[];
  synonyms: Record<string, string[]>;
}
const DICT = dict as unknown as ExpansionDict;

// Structured source attributes (all optional; Korean values are data).
export interface SeoSourceAttrs {
  categoryCode?: string | null;
  scents?: string[];          // scent variants
  form?: string | null;       // formulation (liquid/refill ...)
  volume?: string | null;     // capacity
  origin?: string | null;     // country of manufacture
  seller?: string | null;     // seller of record
  use?: string | null;        // intended use
  material?: string | null;   // body material
  color?: string | null;
}

export interface SeoTextInput {
  baseName: string;                 // current product name (tokens reused)
  brandLine: BrandLine;
  attrs?: SeoSourceAttrs;
  seedKeywords?: string[];          // product keywords/tags/targetKeywords (roots)
  brandToken?: string | null;       // optional leading brand/line token
  // Test/override hooks (default to the shared dict + restricted set).
  restricted?: ReadonlySet<string>;
  expansion?: ExpansionDict;
}

export interface SeoTextDraft {
  brandLine: BrandLine;
  productName: string;
  productNameLength: number;
  nameFindings: RuleFinding[];      // banned/dup/special/length from detectNameRules
  tagCandidates: string[];          // ordered pool (restricted-filtered, pre-verify)
  tags: string[];                   // FINAL selected tags — filled by the route after verifyTags
  attributes: Record<string, string>;  // English keys; UI maps to Korean
}

function tokenize(s: string): string[] {
  return s.trim().split(/\s+/).filter(Boolean);
}

function uniquePush(out: string[], raw: string, restricted: ReadonlySet<string>): void {
  const v = raw.trim();
  if (!v || v.length > TAG_MAX_CHARS) return;
  if (restricted.has(v) || out.includes(v)) return;
  out.push(v);
}

/** Join tokens into a string, dropping trailing tokens to stay within maxChars. */
function joinWithinLimit(tokens: string[], maxChars: number): string {
  const out: string[] = [];
  let len = 0;
  for (const t of tokens) {
    const add = (out.length ? 1 : 0) + t.length;
    if (len + add > maxChars) break;
    out.push(t);
    len += add;
  }
  return out.join(' ');
}

/**
 * Compose a product name from the product's OWN tokens only — brand_line ordering,
 * then collapse a repeated leading morpheme. A token of length >= 4 contributes
 * its first 3 chars as a "concept prefix"; a later token with the same prefix is
 * dropped (so two compounds that begin with the same word keep it once). Also
 * drops a token contained in a kept one. NEVER pads with tag keywords (no keyword
 * stuffing) — situational/expansion terms belong in tags, not the name.
 */
export function composeName(
  brandLine: BrandLine,
  brandToken: string | null,
  baseTokens: string[],
  maxChars: number,
): string {
  const ordered = brandLine === 'GREENHOUSE'
    ? [brandToken ?? '', ...baseTokens]
    : [...baseTokens];

  const seenPrefix = new Set<string>();
  const kept: string[] = [];
  for (const t0 of ordered) {
    const t = t0.trim();
    if (!t || kept.includes(t)) continue;
    if (kept.some((k) => k.includes(t))) continue;   // substring of a kept token
    if (t.length >= 4) {
      const pref = t.slice(0, 3);
      if (seenPrefix.has(pref)) continue;            // repeated leading morpheme
      seenPrefix.add(pref);
    }
    kept.push(t);
  }
  return joinWithinLimit(kept, maxChars);
}

/**
 * Extract noun-ish root keywords from the product's own keywords + name tokens:
 * drop stopwords, restricted seller-tags, and single-char noise.
 */
export function extractRoots(
  seedKeywords: string[],
  baseName: string,
  expansion: ExpansionDict,
  restricted: ReadonlySet<string>,
): string[] {
  const stop = new Set(expansion.stopwords);
  const roots: string[] = [];
  const consider = [...seedKeywords, ...tokenize(baseName)];
  for (const raw of consider) {
    const v = raw.trim();
    if (v.length < 2 || stop.has(v) || restricted.has(v)) continue;
    if (!roots.includes(v)) roots.push(v);
  }
  return roots;
}

/**
 * Build an ordered candidate tag pool (restricted-filtered, deduped, capped).
 * Order = relevance: product roots → scents → present-modifier compounds →
 * other-modifier compounds → root synonyms → situational. The route then runs
 * the live tag dictionary over this pool and keeps the best MAX_TAGS.
 */
export function expandTagCandidates(
  roots: string[],
  attrs: SeoSourceAttrs,
  expansion: ExpansionDict,
  restricted: ReadonlySet<string>,
): string[] {
  const out: string[] = [];
  const haystack = roots.join(' ');

  // 1. product roots themselves.
  for (const r of roots) uniquePush(out, r, restricted);
  // 2. scent variants (searchable on their own).
  for (const s of attrs.scents ?? []) uniquePush(out, s, restricted);

  // 3. modifier × nounRoot compounds — modifiers already present in the product
  //    first (more relevant), then the rest.
  const present = expansion.modifiers.filter((m) => haystack.includes(m));
  const others = expansion.modifiers.filter((m) => !present.includes(m));
  for (const m of [...present, ...others]) {
    for (const n of expansion.nounRoots) uniquePush(out, m + n, restricted);
  }
  // 4. brand token x nounRoot (brand line prefix + product noun).
  const brandTok = roots.find((r) => r.length >= 2 && !expansion.nounRoots.includes(r));
  if (brandTok) for (const n of expansion.nounRoots) uniquePush(out, brandTok + n, restricted);
  // 5. synonyms of roots.
  for (const r of roots) for (const syn of expansion.synonyms[r] ?? []) uniquePush(out, syn, restricted);
  // 6. situational tags.
  for (const s of expansion.situational) uniquePush(out, s, restricted);

  return out.slice(0, TAG_POOL_MAX);
}

/**
 * Generate an SEO text draft (pure). Tag verification is async + network, so it
 * is done by the route over `tagCandidates`; this returns the candidate pool.
 */
export function generateSeoText(input: SeoTextInput): SeoTextDraft {
  const { brandLine, attrs = {} } = input;
  const expansion = input.expansion ?? DICT;
  const restricted = input.restricted ?? RESTRICTED_SELLER_TAGS;
  const seedKeywords = input.seedKeywords ?? [];

  const roots = extractRoots(seedKeywords, input.baseName, expansion, restricted);

  // Name: the product's OWN tokens only (deduped). No tag-keyword stuffing.
  const baseTokens = tokenize(input.baseName);
  const productName = composeName(
    brandLine, input.brandToken ?? null, baseTokens, NAVER_NAME_MAX,
  );
  const nameRules = detectNameRules(productName);

  const tagCandidates = expandTagCandidates(roots, attrs, expansion, restricted);

  // Attribute summary (English keys; values are source data).
  const attributes: Record<string, string> = {};
  if (attrs.scents && attrs.scents.length) attributes.scents = attrs.scents.join(', ');
  if (attrs.form) attributes.form = attrs.form;
  if (attrs.volume) attributes.volume = attrs.volume;
  if (attrs.origin) attributes.origin = attrs.origin;
  if (attrs.seller) attributes.seller = attrs.seller;
  if (attrs.use) attributes.use = attrs.use;
  if (attrs.material) attributes.material = attrs.material;
  if (attrs.color) attributes.color = attrs.color;
  if (attrs.categoryCode) attributes.categoryCode = attrs.categoryCode;

  return {
    brandLine,
    productName,
    productNameLength: productName.length,
    nameFindings: nameRules.findings,
    tagCandidates,
    tags: [],            // FINAL tags are filled by the route after verifyTags
    attributes,
  };
}
