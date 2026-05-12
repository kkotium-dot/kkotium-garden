// src/lib/dome-competitor-tracker.ts
// ============================================================================
// Sprint 6-C (Session E-2 Phase 4): Competitor Tracker
// ============================================================================
//
// For each ACTIVE product we hold, search domeggook with the product's
// keyword tokens. Capture page-1 statistics (competitor count, price range,
// our rank on page 1) as a CompetitorSnapshot row.
//
// Why same-cron piggy-back (not separate cron):
//   Like Sprint 6-B, we run this inside the inventory poller's active loop
//   so a single Vercel daily cron covers 6-A inventory + 6-B price + 6-C
//   competitor. Cost: +1 search API call per active product per day.
//   At 100 active products that's 100 calls/day vs 15000 daily cap.
//
// Keyword strategy:
//   First 3 tokens of the product name (whitespace-split). Domeggook search
//   ranks by relevance/popularity; first 3 tokens of a curated product name
//   typically returns the canonical category page-1.
//
// Our-rank computation:
//   We linearly scan the search results, matching by productNo against our
//   product. If found within page-1, ourRank = index+1. If not, ourRank=null.
//
// Median computation:
//   Sort competitor prices ascending; pick the middle index. Even-count
//   medians take the lower of the two middles for simplicity.
//
// Failure mode:
//   Search API errors are swallowed per-product (logged as errorNote in the
//   snapshot row). One product's failure does not break the loop.
// ============================================================================

import { prisma } from '@/lib/prisma';
import type { SourceAdapter, ItemSummary } from '@/lib/sources';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface ProductMeta {
  id: string;
  productNo: string;
  name: string;
}

export interface CompetitorEvaluation {
  snapshotSaved: boolean;
  competitorCount: number;
  ourRank: number | null;
  error?: string;
}

const PAGE_SIZE = 20;
const KEYWORD_TOKEN_LIMIT = 3;

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Run one competitor tracking cycle for a single product. Caller (inventory
 * poller) provides the adapter and the latest supplierPrice (for our_price
 * column on the snapshot). Saves exactly one CompetitorSnapshot row.
 *
 * `ourPrice` is optional — passing null is acceptable when the latest inventory
 * snapshot has no supplierPrice yet (cold start). The row still gets saved with
 * our_price = null, useful for cohort analysis later.
 */
export async function evaluateCompetitor(
  adapter: SourceAdapter,
  meta: ProductMeta,
  ourPrice: number | null,
): Promise<CompetitorEvaluation> {
  const keyword = buildKeyword(meta.name);
  if (!keyword) {
    await prisma.competitorSnapshot.create({
      data: {
        productId: meta.id,
        productNo: meta.productNo,
        searchKeyword: '',
        competitorCount: 0,
        ourPrice,
        errorNote: 'empty_keyword',
      },
    });
    return { snapshotSaved: true, competitorCount: 0, ourRank: null, error: 'empty_keyword' };
  }

  let items: ItemSummary[];
  try {
    const result = await adapter.searchItems({
      keyword,
      sortBy: 'popular',
      page: 1,
      pageSize: PAGE_SIZE,
    });
    items = result.items;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.competitorSnapshot.create({
      data: {
        productId: meta.id,
        productNo: meta.productNo,
        searchKeyword: keyword,
        competitorCount: 0,
        ourPrice,
        errorNote: msg.slice(0, 200),
      },
    });
    return { snapshotSaved: true, competitorCount: 0, ourRank: null, error: msg };
  }

  // Find our listing on page 1 (1-based rank)
  let ourRank: number | null = null;
  for (let i = 0; i < items.length; i++) {
    if (items[i].productNo === meta.productNo) {
      ourRank = i + 1;
      break;
    }
  }

  // Competitors = all items except our own listing
  const competitors = items.filter((it) => it.productNo !== meta.productNo);
  const competitorCount = competitors.length;

  let minPrice: number | null = null;
  let maxPrice: number | null = null;
  let medianPrice: number | null = null;

  if (competitorCount > 0) {
    const prices = competitors
      .map((c) => c.supplierPrice)
      .filter((p): p is number => typeof p === 'number' && p > 0)
      .sort((a, b) => a - b);
    if (prices.length > 0) {
      minPrice = prices[0];
      maxPrice = prices[prices.length - 1];
      medianPrice = prices[Math.floor((prices.length - 1) / 2)];
    }
  }

  await prisma.competitorSnapshot.create({
    data: {
      productId: meta.id,
      productNo: meta.productNo,
      searchKeyword: keyword,
      competitorCount,
      minPrice,
      maxPrice,
      medianPrice,
      ourRank,
      ourPrice,
    },
  });

  return { snapshotSaved: true, competitorCount, ourRank };
}

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

/**
 * Build a domeggook search keyword from the product name. Takes the first
 * KEYWORD_TOKEN_LIMIT whitespace tokens and joins with a space. Returns empty
 * string when the name has no usable tokens.
 */
function buildKeyword(name: string): string {
  return name
    .replace(/[\[\]【】()()<>《》"']/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .slice(0, KEYWORD_TOKEN_LIMIT)
    .join(' ');
}
