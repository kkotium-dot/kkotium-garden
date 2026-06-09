// src/lib/design/category-preset-map.ts
//
// Coarse category -> preset family hint (Phase B-3). FALLBACK ONLY: a product's
// concept_preset column (operator-assigned) is authoritative; this just feeds
// recommendPreset() so generate-detail can suggest a default and flag drift when
// the stored preset differs from the category recommendation.
//
// Intentionally a thin keyword scan (CONCEPT §6-D, no over-engineering) — the full
// 4,993-row Naver tree mapping is deferred. Korean match tokens live in
// category-preset-keywords.ko.json (CLAUDE.md §3-1).

import type { CategoryFamily } from './concept-presets';
import KEYWORDS from './category-preset-keywords.ko.json';

type FamilyKey = Exclude<CategoryFamily, 'living' | 'digital'>;

// Priority order: more specific moods first, generic kitchen last.
const FAMILY_ORDER: FamilyKey[] = ['fragrance', 'craft', 'pet', 'gift', 'kitchen'];

const KEYWORD_MAP = KEYWORDS as unknown as Record<FamilyKey, string[]>;

export interface CategoryFamilyInput {
  productName?: string | null;
  categoryLeaf?: string | null;
  naverCategoryCode?: string | null;
}

/**
 * Resolve a coarse CategoryFamily from product text. Scans productName +
 * categoryLeaf for the family keyword sets in priority order; unknown -> 'kitchen'
 * (the default family, mapping to the kitchen preset via recommendPreset).
 */
export function categoryToFamily(input: CategoryFamilyInput): CategoryFamily {
  const haystack = `${input.productName ?? ''} ${input.categoryLeaf ?? ''}`.toLowerCase();
  for (const family of FAMILY_ORDER) {
    const tokens = KEYWORD_MAP[family] ?? [];
    if (tokens.some((t) => t && haystack.includes(t.toLowerCase()))) {
      return family;
    }
  }
  return 'kitchen';
}
