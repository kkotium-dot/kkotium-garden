// src/lib/products/lifecycle.ts
// ============================================================================
// Product lifecycle state — SINGLE authority (principle #295, #296).
// Authority doc: docs/design/LIFECYCLE_BRIDGE_V2_2026-07-23.md §2-3.
//
// Derives one of 7 states from the actual schema atoms only (naverProductId /
// status / naverStatusType / consecutiveNegatives / hasSalesAssets). This
// function owns the STATE axis (diagnosis: "what is this right now") only.
// The RECOMMENDATION axis (prescription: "what to do next") stays in
// disposition.ts (#300 axis separation) — do not fold that logic in here.
//
// Reuses source-gone.ts / sales-assets.ts as the single authority for their
// respective sub-judgments (#295 no duplicate judgment). Callers compute
// consecutiveNegatives (countLeadingNegatives) and hasSalesAssets
// (hasSalesAssets()) themselves and pass the results in — this function does
// not touch prisma so it stays usable from client components too.
// ============================================================================

import { isSourceGoneFromCount } from './source-gone';

export type LifecycleState =
  | 'DRAFT_INCOMPLETE'
  | 'READY_UNPUBLISHED'
  | 'SOURCE_GONE_RESOURCE'
  | 'SOURCE_GONE_DELETABLE'
  | 'SUSPENDED'
  | 'OUT_OF_STOCK'
  | 'ON_SALE';

export interface LifecycleInput {
  /** Publish gate (1st-class axis). non-null = published to Naver. */
  naverProductId?: string | null;
  /** Product.status — DRAFT / ACTIVE / OUT_OF_STOCK / INACTIVE. */
  status?: string | null;
  /** Product.naver_status_type — SALE / SUSPENSION / OUTOFSTOCK / null. */
  naverStatusType?: string | null;
  /** Leading consecutive qty<0 snapshot count (countLeadingNegatives()). */
  consecutiveNegatives?: number | null;
  /** hasSalesAssets() result — reviews/rank/sales history to protect. */
  hasSalesAssets?: boolean | null;
  /**
   * Long-out-of-stock day count (countLeadingOutOfStockDays()). Not consumed
   * by state derivation — kept here only so callers can pass one shared
   * atom bag into both lifecycle.ts and disposition.ts.
   */
  daysOutOfStock?: number | null;
}

const NAVER_SUSPENDED = 'SUSPENSION';
const STATUS_DRAFT = 'DRAFT';
const STATUS_OUT_OF_STOCK = 'OUT_OF_STOCK';

/**
 * Derive the single lifecycle state for a product. Priority order is fixed
 * (§3 of the authority doc) — do not reorder without updating the doc:
 *
 *   [0] publish gate: naverProductId null -> unpublished track
 *   [1] sourceGone -> hasSalesAssets ? SOURCE_GONE_RESOURCE : SOURCE_GONE_DELETABLE
 *   [2] naverStatusType = SUSPENSION -> SUSPENDED
 *   [3] status = OUT_OF_STOCK -> OUT_OF_STOCK
 *   [4] else -> ON_SALE
 *
 * [1] outranks [2]: a supplier delisting is an unresolved disposition
 * question regardless of whether the listing was already suspended.
 */
export function deriveLifecycleState(p: LifecycleInput): LifecycleState {
  if (!p.naverProductId) {
    return p.status === STATUS_DRAFT ? 'DRAFT_INCOMPLETE' : 'READY_UNPUBLISHED';
  }

  if (isSourceGoneFromCount(p.consecutiveNegatives ?? undefined)) {
    return p.hasSalesAssets ? 'SOURCE_GONE_RESOURCE' : 'SOURCE_GONE_DELETABLE';
  }

  if (p.naverStatusType === NAVER_SUSPENDED) return 'SUSPENDED';

  if (p.status === STATUS_OUT_OF_STOCK) return 'OUT_OF_STOCK';

  return 'ON_SALE';
}

/** Whether a state belongs to the published track (surfaces in 꽃밭돌보기, work queues eligible). */
export function isPublishedLifecycleState(state: LifecycleState): boolean {
  return state !== 'DRAFT_INCOMPLETE' && state !== 'READY_UNPUBLISHED';
}
