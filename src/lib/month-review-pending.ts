// src/lib/month-review-pending.ts
// Workflow Redesign Sprint Part A3-4a (2026-05-05) — One-Month Review Reminder
//
// Purpose
//   Identify orders that are eligible for a one-month-use review reminder.
//   Power-seller research shows that a second review prompt at D+28~32 after
//   purchase confirmation lifts overall review volume by ~2x (initial review
//   at D+1~3 + one-month review at D+28~32). The one-month review surfaces
//   long-term satisfaction signals (durability, repeat-use), which Naver's
//   ranking algorithm and good-service score reward heavily.
//
// Detection strategy
//   1. Primary signal: Order.status === 'COMPLETED' (purchase confirmed)
//      AND updatedAt within [D+REVIEW_WINDOW_MIN, D+REVIEW_WINDOW_MAX] days
//      from now. status flipping to COMPLETED is what bumps updatedAt in
//      the sync route, so updatedAt acts as the confirmation timestamp.
//   2. No fallback signal needed — the COMPLETED transition is always
//      written by the same code path (unlike DELIVERED which sometimes
//      lands without deliveredAt populated).
//   3. Exclude orders that have moved on to CANCELLED / RETURNED states
//      after confirmation (rare but possible via claim API).
//
// Output
//   Each eligible order carries the metadata the UI / alimtalk template
//   needs (productOrderId, customerName masked, productName, daysSince*,
//   suggested reminder copy) so widgets and the future Solapi POST
//   handler can consume the same shape as the confirmation-pending lib.
//
// Pairing
//   Mirror of src/lib/confirmation-pending.ts (A3-1a). Together the two
//   libraries define the two-stage review collection pipeline:
//     - confirmation-pending  : D+3~5 after delivery (drive purchase confirm)
//     - month-review-pending  : D+28~32 after confirm (drive long-term review)

import { prisma } from '@/lib/prisma';
import type { Order } from '@prisma/client';

// ─── Policy constants ───────────────────────────────────────────────────────
// Window relative to purchase confirmation timestamp (Order.updatedAt when
// status transitioned to COMPLETED). Aligned with orders/page.tsx Stage 3
// review badge (E-2B) so the dashboard widget and the orders table agree on
// who is in the one-month-review window.
export const REVIEW_WINDOW_MIN_DAYS = 28;
export const REVIEW_WINDOW_MAX_DAYS = 32;

// Hard cutoff for the scan — bounds the query so we never look further back
// than roughly the review window plus a short tail. 60 days is generous and
// keeps the index scan small even when the orders table grows.
const SCAN_LOOKBACK_DAYS = 60;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ─── Public types ───────────────────────────────────────────────────────────
export type MonthReviewSignal = 'completed_at';

export interface MonthReviewEligibleOrder {
  /** Naver productOrderId (also used as DB primary key). */
  productOrderId: string;
  /** Order number for display (same as productOrderId in current sync). */
  orderNumber: string;
  /** Masked customer name for privacy in UI (full name reserved for alimtalk template binding). */
  customerNameMasked: string;
  /** Customer phone for alimtalk delivery (raw — only consumed by Solapi POST handler). */
  customerPhone: string;
  /** Product display name. */
  productName: string;
  /** Quantity ordered. */
  quantity: number;
  /** Total payment amount in KRW. */
  totalAmount: number;
  /** Days elapsed since purchase confirmation (Order.updatedAt when status flipped to COMPLETED). */
  daysSinceConfirmation: number;
  /** Which signal placed this order in the eligible window. */
  signal: MonthReviewSignal;
  /** Reference timestamp used for the daysSinceConfirmation calculation. */
  referenceDate: string;
  /** Suggested alimtalk message preview (Korean — for UI only, real template ID owned by Solapi). */
  reminderPreview: string;
}

export interface MonthReviewPendingResult {
  orders: MonthReviewEligibleOrder[];
  count: number;
  /** Scan window (KST start/end) used for the primary query. */
  scanWindow: {
    fromIso: string;
    toIso: string;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Mask a Korean name keeping the first character + last (e.g. 김OO 1자, 김OO 2자, 김O희). */
export function maskKoreanName(name: string): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.length === 1) return trimmed;
  if (trimmed.length === 2) return `${trimmed[0]}*`;
  // length >= 3: keep first + last, star the middle chars
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  const middle = '*'.repeat(trimmed.length - 2);
  return `${first}${middle}${last}`;
}

/** Days elapsed from `from` to now, rounded down. */
export function daysSince(from: Date | string | null | undefined, now: Date = new Date()): number {
  if (!from) return -1;
  const fromDate = from instanceof Date ? from : new Date(from);
  if (Number.isNaN(fromDate.getTime())) return -1;
  return Math.floor((now.getTime() - fromDate.getTime()) / MS_PER_DAY);
}

/**
 * Build the alimtalk-style preview text shown in the UI.
 * The real Solapi template will be bound separately at activation time
 * (E-13B) — this string is for visual confirmation only.
 *
 * Tone: warm + appreciative + subtle long-term-use prompt. Highlights
 * "한 달 사용 후" so the reviewer brings durability/repeat-use insight,
 * which is the highest-ranking-impact review category for the Naver
 * shopping algorithm.
 */
export function buildMonthReviewPreview(input: {
  customerNameMasked: string;
  productName: string;
  daysSinceConfirmation: number;
}): string {
  const { customerNameMasked, productName, daysSinceConfirmation } = input;
  // Korean message — this is user-facing copy and intentionally in Korean.
  // The template itself will be approved by Kakao for the real send path.
  return [
    `${customerNameMasked} 고객님, 꽃틔움입니다.`,
    `구매하신 '${productName}', 받아보시고 ${daysSinceConfirmation}일째 잘 사용하고 계신가요?`,
    `한 달 정도 사용 후 솔직한 후기를 남겨주시면`,
    `한달 사용 리뷰 적립금과 함께 단골 혜택을 드려요.`,
  ].join('\n');
}

// ─── Core scan ──────────────────────────────────────────────────────────────

/**
 * Find orders eligible for a one-month review reminder.
 *
 * The scan looks for orders that were purchase-confirmed (status=COMPLETED)
 * and whose confirmation timestamp (updatedAt) falls within [D+min, D+max].
 * The query is bounded by SCAN_LOOKBACK_DAYS to keep the index scan small.
 *
 * Note on `updatedAt` semantics
 *   The Order model uses Prisma's `@updatedAt`, which is automatically
 *   bumped on any field write. In practice, however, the only writes that
 *   happen post-confirmation are claim-related (CANCELLED/RETURNED), and
 *   those cases are filtered by the `status: 'COMPLETED'` predicate. For
 *   orders that simply stay in COMPLETED, updatedAt is stable and equal
 *   to the confirmation timestamp — which is exactly what this scan needs.
 */
export async function findMonthReviewEligibleOrders(now: Date = new Date()): Promise<MonthReviewPendingResult> {
  const minDays = REVIEW_WINDOW_MIN_DAYS;
  const maxDays = REVIEW_WINDOW_MAX_DAYS;

  const fromDate = new Date(now.getTime() - maxDays * MS_PER_DAY);
  const toDate   = new Date(now.getTime() - minDays * MS_PER_DAY);

  // Lookback floor — defensive bound for the index scan.
  const lookbackFloor = new Date(now.getTime() - SCAN_LOOKBACK_DAYS * MS_PER_DAY);

  const rows = await prisma.order.findMany({
    where: {
      status: 'COMPLETED',
      updatedAt: {
        gte: fromDate,
        lte: toDate,
        // Defensive — never look further back than the lookback floor.
        gt: lookbackFloor,
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });

  const seen = new Set<string>();
  const orders: MonthReviewEligibleOrder[] = [];

  const accept = (row: Order, signal: MonthReviewSignal) => {
    if (seen.has(row.id)) return;
    seen.add(row.id);

    const referenceDate = signal === 'completed_at' ? row.updatedAt : null;

    const elapsed = daysSince(referenceDate, now);
    if (elapsed < minDays || elapsed > maxDays) return;

    const customerNameMasked = maskKoreanName(row.customerName ?? '');
    const productName = (row.productName ?? '').trim() || '주문 상품';

    orders.push({
      productOrderId: row.id,
      orderNumber: row.orderNumber,
      customerNameMasked,
      customerPhone: row.customerPhone ?? '',
      productName,
      quantity: row.quantity ?? 1,
      totalAmount: row.totalAmount ?? 0,
      daysSinceConfirmation: elapsed,
      signal,
      referenceDate: referenceDate ? referenceDate.toISOString() : '',
      reminderPreview: buildMonthReviewPreview({
        customerNameMasked,
        productName,
        daysSinceConfirmation: elapsed,
      }),
    });
  };

  for (const row of rows) accept(row, 'completed_at');

  // Stable order: most-recent reference date first.
  orders.sort((a, b) => {
    if (!a.referenceDate) return 1;
    if (!b.referenceDate) return -1;
    return b.referenceDate.localeCompare(a.referenceDate);
  });

  return {
    orders,
    count: orders.length,
    scanWindow: {
      fromIso: fromDate.toISOString(),
      toIso:   toDate.toISOString(),
    },
  };
}
