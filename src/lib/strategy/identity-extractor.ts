// src/lib/strategy/identity-extractor.ts
//
// Sprint 7-M2 5-B — Product identity keyword extractor (Phase 1).
//
// Five-step pipeline (design doc IDENTITY_EXTRACTOR_PHASE1_SPEC §1):
//   1. Extract candidate nouns via morpheme-tokenizer.
//   2. Single-noun Naver Shopping search → top-result leaf category per noun.
//   3. Match each noun's leaf against THIS product's leaf category.
//      Identity = leaf-matching nouns. Modifier = leaf-mismatching nouns.
//   4. Generate 2-3 token combos (identity + nearest modifier) → re-verify.
//   5. Modifiers retained as a long-tail pool for product-name tail / tags.
//
// Crucial guards (verified against PlayMCP probes in the research session):
//   - Leaf comparison ONLY on category4. category3 ("인테리어소품") would
//     falsely match 도어벨 against 개업선물.
//   - Competitor count uses uniqueSellers from top-40 mallNames, NOT raw
//     total. Naver Shopping total includes bundle/import/used items.
//
// 24h cache lives in strategy_signals (Senior-created table) keyed by the
// product name. We persist on miss; reads from the cache are best-effort.

import { searchShopping, type ShoppingItem } from '@/lib/naver/shopping-search';
import { prisma } from '@/lib/prisma';
import { extractNouns } from './morpheme-tokenizer';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface IdentityExtractionInput {
  productName: string;
  /** Leaf category of THIS product (category4). Required for matching —
   *  if unknown, pass empty string and the extractor will return all nouns
   *  as modifiers (no identity match possible). */
  myLeafCategory: string;
  /** Optional override — when category4 was not crawled, the caller can
   *  pass a category3 fallback and acknowledge `isExact=false`. */
  myLeafIsExact?: boolean;
}

export interface ModifierEntry {
  token: string;
  leafCategory: string;
  productCount: number;
}

export interface BestCombo {
  combo: string;
  productCount: number;
  uniqueSellers: number;
  categoryMatch: boolean;
}

export interface IdentityExtractionResult {
  /** Nouns whose top-result leaf matched the product's leaf. */
  identityKeywords: string[];
  /** 2-3 token combos that re-verified against the leaf category. */
  bestCombos: BestCombo[];
  /** Nouns whose leaf did NOT match — useful for tail / tags / SEO. */
  modifierKeywords: ModifierEntry[];
  /** The combo we recommend feeding to signal-collector. Falls back to the
   *  first identityKeyword, then the first noun, then the original product
   *  name. Always non-empty. */
  primaryIdentity: string;
  /** 0..1 — share of nouns that resolved cleanly + leaf exactness flag. */
  confidence: number;
  /** Number of Naver Shopping calls actually made (post-cache). */
  apiCalls: number;
  /** True when a cached row in strategy_signals served the result. */
  cached: boolean;
}

// ---------------------------------------------------------------------------
// Leaf-category helpers
// ---------------------------------------------------------------------------

/** Shopping items in @types declare category1..3 + brand/maker; category4
 *  arrives on the wire but isn't in the type. We tolerate either shape. */
type RawShoppingItem = ShoppingItem & {
  category4?: string;
  category3?: string;
  mallName?: string;
};

function getLeafCategory(item: RawShoppingItem): { leaf: string; isExact: boolean } {
  const c4 = (item.category4 ?? '').trim();
  if (c4.length > 0) return { leaf: c4, isExact: true };
  const c3 = (item.category3 ?? '').trim();
  return { leaf: c3, isExact: false };
}

function categoryMatch(probedLeaf: string, productLeaf: string): boolean {
  if (!probedLeaf || !productLeaf) return false;
  return probedLeaf === productLeaf;
}

function countUniqueSellers(items: ReadonlyArray<RawShoppingItem>): number {
  const mallNames = items
    .map((it) => (it.mallName ?? '').trim())
    .filter((s) => s.length > 0);
  return new Set(mallNames).size;
}

// ---------------------------------------------------------------------------
// Single-query Shopping probe
// ---------------------------------------------------------------------------

interface ShoppingProbeResult {
  query: string;
  total: number;
  uniqueSellers: number;
  topLeaf: string;
  topLeafIsExact: boolean;
}

async function probeShopping(query: string): Promise<ShoppingProbeResult | null> {
  try {
    const result = await searchShopping(query, { display: 40, sort: 'sim' });
    const items = result.items as RawShoppingItem[];
    if (items.length === 0) {
      return { query, total: result.total, uniqueSellers: 0, topLeaf: '', topLeafIsExact: false };
    }
    const top = getLeafCategory(items[0]);
    return {
      query,
      total: result.total,
      uniqueSellers: countUniqueSellers(items),
      topLeaf: top.leaf,
      topLeafIsExact: top.isExact,
    };
  } catch (err) {
    console.warn(`[identity-extractor] shopping probe failed for "${query}":`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cache layer — best-effort read/write against strategy_signals
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function readCache(
  signalKey: string,
): Promise<IdentityExtractionResult | null> {
  try {
    const row = await prisma.strategySignal.findFirst({
      where: { signalKey },
      orderBy: { computedAt: 'desc' },
    });
    if (!row) return null;
    const age = Date.now() - row.computedAt.getTime();
    if (age > CACHE_TTL_MS) return null;
    if (!row.primaryIdentity) return null;

    const identityKeywords = Array.isArray(row.identityKeywords)
      ? row.identityKeywords.filter((v): v is string => typeof v === 'string')
      : [];
    const modifierKeywords = Array.isArray(row.modifierKeywords)
      ? (row.modifierKeywords as unknown[]).filter(
          (v): v is ModifierEntry =>
            typeof v === 'object' && v !== null && 'token' in v,
        )
      : [];

    return {
      identityKeywords,
      modifierKeywords,
      bestCombos: [],
      primaryIdentity: row.primaryIdentity,
      confidence: 1,
      apiCalls: 0,
      cached: true,
    };
  } catch (err) {
    console.warn('[identity-extractor] cache read skipped:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function writeCache(
  signalKey: string,
  result: IdentityExtractionResult,
  uniqueSellers: number,
  productCount: number,
): Promise<void> {
  try {
    await prisma.strategySignal.create({
      data: {
        signalKey,
        searchVolume: 0,
        productCount,
        opportunityIndex: 0,
        trendSlope: 0,
        competitionIdx: 'unknown',
        honeyScore: 0,
        strategicRole: 'pending',
        identityKeywords: result.identityKeywords,
        modifierKeywords: JSON.parse(JSON.stringify(result.modifierKeywords)),
        primaryIdentity: result.primaryIdentity,
        uniqueSellers,
      },
    });
  } catch (err) {
    console.warn('[identity-extractor] cache write skipped:', err instanceof Error ? err.message : err);
  }
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

const COMBO_LIMIT = 3;
const MAX_NOUN_PROBES = 10;

export async function extractIdentity(
  input: IdentityExtractionInput,
): Promise<IdentityExtractionResult> {
  const { productName, myLeafCategory } = input;

  // ---- 0. Cache lookup -----------------------------------------------------
  const cacheHit = await readCache(productName);
  if (cacheHit) return cacheHit;

  // ---- 1. Noun extraction --------------------------------------------------
  const { nouns } = extractNouns(productName);
  if (nouns.length === 0) {
    return {
      identityKeywords: [],
      bestCombos: [],
      modifierKeywords: [],
      primaryIdentity: productName,
      confidence: 0,
      apiCalls: 0,
      cached: false,
    };
  }

  // ---- 2. Per-noun shopping probe ------------------------------------------
  const limited = nouns.slice(0, MAX_NOUN_PROBES);
  const probes: ShoppingProbeResult[] = [];
  for (const noun of limited) {
    // eslint-disable-next-line no-await-in-loop
    const r = await probeShopping(noun);
    if (r) probes.push(r);
  }

  // ---- 3. Identity vs modifier classification ------------------------------
  const identityKeywords: string[] = [];
  const modifierKeywords: ModifierEntry[] = [];
  for (const p of probes) {
    if (categoryMatch(p.topLeaf, myLeafCategory)) {
      identityKeywords.push(p.query);
    } else {
      modifierKeywords.push({
        token: p.query,
        leafCategory: p.topLeaf,
        productCount: p.total,
      });
    }
  }

  // ---- 4. 2-3 token combos + re-verification -------------------------------
  // Combo strategy: pair each identity keyword with up to (COMBO_LIMIT-1)
  // modifiers (modifiers add specificity; pure identity-only combos are
  // covered when modifierKeywords is empty).
  const bestCombos: BestCombo[] = [];
  const comboPairs: string[] = [];
  if (identityKeywords.length === 0) {
    // No identity — fall back: pair the first two nouns and probe.
    if (nouns.length >= 2) comboPairs.push(`${nouns[0]} ${nouns[1]}`);
  } else {
    for (const ident of identityKeywords) {
      // Always probe the bare identity as a baseline combo.
      comboPairs.push(ident);
      for (const mod of modifierKeywords.slice(0, COMBO_LIMIT - 1)) {
        comboPairs.push(`${mod.token} ${ident}`);
      }
    }
  }
  // Dedupe and trim.
  const uniqueCombos = Array.from(new Set(comboPairs)).slice(0, COMBO_LIMIT + 2);

  for (const combo of uniqueCombos) {
    // eslint-disable-next-line no-await-in-loop
    const r = await probeShopping(combo);
    if (!r) continue;
    bestCombos.push({
      combo,
      productCount: r.total,
      uniqueSellers: r.uniqueSellers,
      categoryMatch: categoryMatch(r.topLeaf, myLeafCategory),
    });
  }
  // Rank: leaf-matching combos first, then by lower productCount (less
  // competition is better for finding the true identity expression).
  bestCombos.sort((a, b) => {
    if (a.categoryMatch !== b.categoryMatch) return a.categoryMatch ? -1 : 1;
    return a.productCount - b.productCount;
  });
  const trimmedCombos = bestCombos.slice(0, COMBO_LIMIT);

  // ---- 5. Primary identity ------------------------------------------------
  let primaryIdentity = productName;
  const matchingCombo = trimmedCombos.find((c) => c.categoryMatch);
  if (matchingCombo) {
    primaryIdentity = matchingCombo.combo;
  } else if (identityKeywords.length > 0) {
    primaryIdentity = identityKeywords[0];
  } else if (nouns.length > 0) {
    primaryIdentity = nouns[0];
  }

  // ---- 6. Confidence ------------------------------------------------------
  const resolvedShare = probes.length / Math.max(limited.length, 1);
  const exactnessBonus = input.myLeafIsExact === false ? -0.1 : 0;
  const confidence = Math.max(
    0,
    Math.min(1, Math.round((resolvedShare + exactnessBonus) * 100) / 100),
  );

  // Aggregate competitor count for the primary identity.
  const primaryProbe = trimmedCombos[0];
  const uniqueSellers = primaryProbe?.uniqueSellers ?? 0;
  const productCount = primaryProbe?.productCount ?? 0;

  const apiCalls = limited.length + uniqueCombos.length;
  const result: IdentityExtractionResult = {
    identityKeywords,
    bestCombos: trimmedCombos,
    modifierKeywords,
    primaryIdentity,
    confidence,
    apiCalls,
    cached: false,
  };

  // ---- 7. Cache write (best-effort) ---------------------------------------
  await writeCache(productName, result, uniqueSellers, productCount);

  return result;
}

// ---------------------------------------------------------------------------
// Exports for testing
// ---------------------------------------------------------------------------

export const _internals = {
  getLeafCategory,
  categoryMatch,
  countUniqueSellers,
  probeShopping,
};
