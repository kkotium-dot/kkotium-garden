// src/lib/confirmation-pending.ts
// Workflow Redesign Sprint Part A3-1 (2026-05-05) — Purchase Confirmation Reminder
//
// Purpose
//   Identify orders that are eligible for a purchase-confirmation reminder
//   (DELIVERED but not yet PURCHASE_DECIDED). Naver auto-confirms at D+8;
//   power-seller research recommends reaching out at D+3~5 to lift the
//   confirmation rate (which gates settlement + review eligibility).
//
// Detection strategy
//   1. Primary signal: Order.status === 'DELIVERED' AND deliveredAt within
//      [D+REMINDER_WINDOW_MIN, D+REMINDER_WINDOW_MAX] days from now.
//   2. Fallback signal: deliveredAt missing (sync route does not always
//      populate it) — use paymentDate + a derived window assuming a typical
//      payment-to-delivery lag of ~3 days. This gives an estimated
//      [paymentDate + (3 + REMINDER_WINDOW_MIN), paymentDate + (3 + REMINDER_WINDOW_MAX)] range.
//   3. Exclude orders that have already moved to COMPLETED, CANCELLED, or
//      RETURNED states.
//
// Output
//   Each eligible order carries the metadata the UI / alimtalk template
//   needs (productOrderId, customerName masked, productName, daysSince*,
//   suggested reminder copy) so widgets and the future Solapi POST handler
//   can consume the same shape.

import { prisma } from '@/lib/prisma';
import type { Order } from '@prisma/client';

// ─── Policy constants ───────────────────────────────────────────────────────
// Window relative to delivery completion (when deliveredAt is known).
export const REMINDER_WINDOW_MIN_DAYS = 3;
export const REMINDER_WINDOW_MAX_DAYS = 5;

// Typical payment-to-delivery lag used for the fallback signal.
// Conservative — most domestic parcels arrive in 1-3 days; we use 3 to avoid
// reminding before the buyer can plausibly have received the item.
export const PAYMENT_TO_DELIVERY_LAG_DAYS = 3;

// Naver's automatic confirmation threshold (no reminder past this — buyer
// is about to be auto-confirmed anyway).
export const NAVER_AUTO_CONFIRM_DAYS = 8;

// Daily lookback for the fallback paymentDate scan (keeps the query bounded).
const FALLBACK_LOOKBACK_DAYS = NAVER_AUTO_CONFIRM_DAYS + 5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ─── Public types ───────────────────────────────────────────────────────────
export type ReminderSignal = 'delivered_at' | 'payment_date_fallback';

export interface ReminderEligibleOrder {
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
  /** Days elapsed since delivery completion (or estimated equivalent for fallback). */
  daysSinceDelivery: number;
  /** Which signal placed this order in the eligible window. */
  signal: ReminderSignal;
  /** Reference timestamp used for the daysSinceDelivery calculation. */
  referenceDate: string;
  /** Suggested alimtalk message preview (Korean — for UI only, real template ID owned by Solapi). */
  reminderPreview: string;
}

export interface ConfirmationPendingResult {
  orders: ReminderEligibleOrder[];
  count: number;
  /** Number of orders detected via primary deliveredAt signal. */
  primaryCount: number;
  /** Number of orders detected via paymentDate fallback. */
  fallbackCount: number;
  /** Range used for the scan (primary signal — KST start/end). */
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
 */
export function buildReminderPreview(input: {
  customerNameMasked: string;
  productName: string;
  daysSinceDelivery: number;
}): string {
  const { customerNameMasked, productName, daysSinceDelivery } = input;
  // Korean message — this is user-facing copy and intentionally in Korean.
  // The template itself will be approved by Kakao for the real send path.
  return [
    `${customerNameMasked} 고객님, 꽃틔움입니다.`,
    `'${productName}' 배송 완료 ${daysSinceDelivery}일째예요.`,
    `상품을 잘 받으셨다면 구매확정 부탁드려요.`,
    `구매확정 시 적립 혜택과 리뷰 작성 권한이 활성화됩니다.`,
  ].join('\n');
}

// ─── Core scan ──────────────────────────────────────────────────────────────

/**
 * Find orders eligible for a confirmation reminder.
 *
 * The scan unions two sources:
 *   - Primary: status='DELIVERED' AND deliveredAt within [D+min, D+max].
 *   - Fallback: status='DELIVERED' AND deliveredAt IS NULL AND paymentDate within
 *     [D+(lag+min), D+(lag+max)].
 *
 * Both signals exclude orders past the Naver auto-confirm horizon.
 */
export async function findReminderEligibleOrders(now: Date = new Date()): Promise<ConfirmationPendingResult> {
  const minDays = REMINDER_WINDOW_MIN_DAYS;
  const maxDays = REMINDER_WINDOW_MAX_DAYS;

  const primaryFromDate = new Date(now.getTime() - maxDays * MS_PER_DAY);
  const primaryToDate   = new Date(now.getTime() - minDays * MS_PER_DAY);

  const fallbackMinDays = PAYMENT_TO_DELIVERY_LAG_DAYS + minDays;
  const fallbackMaxDays = PAYMENT_TO_DELIVERY_LAG_DAYS + maxDays;
  const fallbackFromDate = new Date(now.getTime() - fallbackMaxDays * MS_PER_DAY);
  const fallbackToDate   = new Date(now.getTime() - fallbackMinDays * MS_PER_DAY);

  // Lookback floor for both queries — guards against unbounded scans.
  const lookbackFloor = new Date(now.getTime() - FALLBACK_LOOKBACK_DAYS * MS_PER_DAY);

  const [primaryRows, fallbackRows] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        deliveredAt: {
          gte: primaryFromDate,
          lte: primaryToDate,
        },
      },
      orderBy: { deliveredAt: 'desc' },
      take: 200,
    }),
    prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        deliveredAt: null,
        paymentDate: {
          gte: fallbackFromDate,
          lte: fallbackToDate,
          // Defensive — never look further back than the lookback floor.
          gt: lookbackFloor,
        },
      },
      orderBy: { paymentDate: 'desc' },
      take: 200,
    }),
  ]);

  const seen = new Set<string>();
  const orders: ReminderEligibleOrder[] = [];

  const accept = (row: Order, signal: ReminderSignal) => {
    if (seen.has(row.id)) return;
    seen.add(row.id);

    const referenceDate = signal === 'delivered_at'
      ? row.deliveredAt
      : (row.paymentDate ? new Date(row.paymentDate.getTime() + PAYMENT_TO_DELIVERY_LAG_DAYS * MS_PER_DAY) : null);

    const elapsed = daysSince(referenceDate, now);
    if (elapsed < minDays || elapsed > maxDays) return;
    if (elapsed >= NAVER_AUTO_CONFIRM_DAYS) return;

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
      daysSinceDelivery: elapsed,
      signal,
      referenceDate: referenceDate ? referenceDate.toISOString() : '',
      reminderPreview: buildReminderPreview({
        customerNameMasked,
        productName,
        daysSinceDelivery: elapsed,
      }),
    });
  };

  for (const row of primaryRows)  accept(row, 'delivered_at');
  for (const row of fallbackRows) accept(row, 'payment_date_fallback');

  // Stable order: most-recent reference date first.
  orders.sort((a, b) => {
    if (!a.referenceDate) return 1;
    if (!b.referenceDate) return -1;
    return b.referenceDate.localeCompare(a.referenceDate);
  });

  const primaryCount  = orders.filter((o) => o.signal === 'delivered_at').length;
  const fallbackCount = orders.filter((o) => o.signal === 'payment_date_fallback').length;

  return {
    orders,
    count: orders.length,
    primaryCount,
    fallbackCount,
    scanWindow: {
      fromIso: primaryFromDate.toISOString(),
      toIso:   primaryToDate.toISOString(),
    },
  };
}
