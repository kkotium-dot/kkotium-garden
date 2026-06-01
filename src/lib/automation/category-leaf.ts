// src/lib/automation/category-leaf.ts
//
// SSOT for category leaf resolution. Replaces three scattered helpers
// (copy-writer.deriveCategoryBadge inline leaf extract, section-copy.leafOf,
// generate-detail route leafOf + inline crawl_logs fallback) so every screen
// surfaces the same category label for a given product.
//
// The previous fix (commit 650c477) added sentinel filtering only to
// generate-detail, leaving the thumbnail badge path showing "uncategorized"
// (Desktop 2026-05-31 verdict on 달항아리 badge variant). This module is the
// single function both paths now call.

import { prisma } from '@/lib/prisma';

/** Placeholder labels that must NOT surface as a category — they are stand-ins
 *  for missing data, not real categories. Treated as null so the caller falls
 *  through to the next source. */
const CATEGORY_SENTINELS = new Set(['uncategorized', '-', '_']);

/**
 * Pure synchronous leaf extractor. Splits on > and /, drops empties, picks
 * the last segment, and rejects sentinel placeholders. Returns null when no
 * usable leaf exists. This is the deepest building block — used by callers
 * that already have a known-good category string (deriveCategoryBadge, the
 * spec table grounded path) and by resolveCategoryLeaf below.
 */
export function pickLeafFromCategory(category: string | null | undefined): string | null {
  const raw = (category ?? '').trim();
  if (!raw) return null;
  const leaf = raw
    .split(/[>/]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .pop();
  if (!leaf) return null;
  if (CATEGORY_SENTINELS.has(leaf.toLowerCase())) return null;
  return leaf;
}

/** First whitespace-separated token of a product name. Used as the deepest
 *  fallback so the badge / spec slot always renders SOMETHING honest rather
 *  than a placeholder string. */
export function firstNameToken(productName: string | null | undefined): string {
  const t = (productName ?? '').trim().split(/\s+/)[0] ?? '';
  return t;
}

export interface ResolveCategoryLeafInput {
  /** Optional product id — enables the crawl_logs fallback when category text
   *  is empty or a sentinel. */
  productId?: string;
  /** The product's stored category string (path or leaf). */
  category?: string | null;
  /** Product name — final fallback token source. */
  productName?: string | null;
}

/**
 * Async SSOT used by every route that needs to render or store a category
 * label. Precedence:
 *
 *   1. pickLeafFromCategory(category)        — direct, sync, sentinel-filtered
 *   2. pickLeafFromCategory(crawl_logs.category_name) — DB fallback
 *   3. firstNameToken(productName)           — never-empty terminal fallback
 *
 * Routes that already pre-fetched crawl_logs data can call
 * pickLeafFromCategory directly to avoid the extra round-trip. This function
 * exists for the common-case "give me the best label" path.
 */
export async function resolveCategoryLeaf(input: ResolveCategoryLeafInput): Promise<string> {
  const direct = pickLeafFromCategory(input.category);
  if (direct) return direct;

  if (input.productId) {
    try {
      const rows: { category_name: string | null }[] = await prisma.$queryRawUnsafe(
        `SELECT category_name FROM crawl_logs WHERE product_id = $1 AND status = 'success' ORDER BY id DESC LIMIT 1`,
        input.productId,
      );
      const fromCrawl = rows[0]?.category_name?.trim();
      if (fromCrawl) {
        const leaf = pickLeafFromCategory(fromCrawl);
        if (leaf) return leaf;
      }
    } catch {
      // crawl_logs unreadable -> proceed to terminal fallback. Never throw.
    }
  }

  return firstNameToken(input.productName);
}
