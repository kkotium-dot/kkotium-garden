// src/lib/naver/category-sync.ts
// ============================================================================
// Category re-sync helper (#62). When a product's naverCategoryCode is corrected
// (re-classified), its human-readable `category` text field must follow — or the
// two drift (e.g. naverCategoryCode says car-diffuser but the category text still
// reads the old indoor-diffuser leaf). The leaf name is derived from the LOCAL
// category dataset only (no Naver API, #3-3). All-product universal (#55) — no
// per-product branch; the mapping is data.
//
// `category` text feeds deriveProductSignals + display; it does NOT feed the
// Naver payload (that uses naverCategoryCode → leafCategoryId), so this sync is
// fully reversible and Naver-touch-free.
// ============================================================================

import { prisma } from '@/lib/prisma';
import { NAVER_CATEGORIES_FULL } from './naver-categories-full';

// code -> entry, built once from the local dataset (O(1) lookup).
const BY_CODE = new Map(NAVER_CATEGORIES_FULL.map((c) => [c.code, c]));

/**
 * The deepest non-empty depth label for a category code (the leaf the product
 * UI shows, e.g. the d4 name). Returns null for an unknown code.
 */
export function leafCategoryName(code: string | null | undefined): string | null {
  const entry = BY_CODE.get((code ?? '').trim());
  if (!entry) return null;
  return entry.d4 || entry.d3 || entry.d2 || entry.d1 || null;
}

/** Full path label for a code (the d1 > d2 > d3 > d4 join) or null. */
export function categoryFullPath(code: string | null | undefined): string | null {
  const entry = BY_CODE.get((code ?? '').trim());
  return entry?.fullPath ?? null;
}

export interface CategorySyncResult {
  updated: boolean;
  /** Reason when not updated: code unknown / already in sync / product missing. */
  reason?: 'unknown_code' | 'already_synced' | 'product_not_found' | 'no_code';
  from?: string | null;
  to?: string | null;
}

/**
 * Re-sync ONE product's `category` text to match the leaf of its current
 * naverCategoryCode. Idempotent — a no-op when already in sync. DB-only,
 * Naver-untouched. Use after any re-classification (naverCategoryCode change).
 */
export async function syncProductCategory(productId: string): Promise<CategorySyncResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, category: true, naverCategoryCode: true },
  });
  if (!product) return { updated: false, reason: 'product_not_found' };
  const code = product.naverCategoryCode?.trim();
  if (!code) return { updated: false, reason: 'no_code', from: product.category };
  const leaf = leafCategoryName(code);
  if (!leaf) return { updated: false, reason: 'unknown_code', from: product.category };
  if (product.category === leaf) {
    return { updated: false, reason: 'already_synced', from: product.category, to: leaf };
  }
  await prisma.product.update({ where: { id: productId }, data: { category: leaf } });
  return { updated: true, from: product.category, to: leaf };
}
