// src/lib/dome-price-analyzer.ts
// ============================================================================
// Sprint 6-B: Price Movement Analyzer
// ============================================================================
//
// Responsibility:
//   Detect supplier-side price movements by comparing the latest InventorySnapshot
//   row's supplierPrice against a rolling 7-day baseline of prior snapshots.
//
// Design choice (Phase 3, 2026-05-12):
//   Phase 3 handoff originally proposed a separate price-sync cron; instead we
//   piggy-back on the 6-A inventory poller. domeggook's getItemView returns
//   basis.qty + basis.minq + price.supply in a single call, so a separate cron
//   would only duplicate work and double the daily API quota cost.
//
// Trigger semantics:
//   The price analyzer is called once per active product after the inventory
//   poller has saved snapshots. It reads the latest snapshot for the product
//   and the 7-day baseline (exclusive of the latest), computes |delta|/baseline,
//   and creates a PriceMovementAlert when |delta| >= 5%.
//
// Levels (absolute |delta|):
//   yellow:  5% <= |delta| <  10%   (dashboard only)
//   orange:  10% <= |delta| < 15%   (dashboard + Discord PRICE_CHANGE)
//   red:     |delta| >= 15%         (dashboard + Discord PRICE_CHANGE)
//
// Direction:
//   up   — current > baseline (margin risk — supplier raised price)
//   down — current < baseline (opportunity — possibly worth re-pricing)
//
// Dedupe:
//   Mirrors LowStockAlert: an "open" alert (resolvedAt = null) at the same level
//   suppresses new alerts. Level escalations resolve the open alert and create
//   a fresh one. Movement back into the safe band (<5%) auto-resolves all open
//   alerts for the product.
//
// Cold start:
//   When fewer than 2 prior snapshots with non-null supplierPrice exist, no
//   alert is fired. Cold start window is roughly the first 2 polling cycles
//   per product (~2 days at daily cron).
// ============================================================================

import { prisma } from '@/lib/prisma';
import { sendDiscord } from '@/lib/discord';
import type { InventorySnapshot as AdapterSnapshot } from '@/lib/sources';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const ROLLING_DAYS = 7;
const THRESHOLD_YELLOW = 0.05; // 5%
const THRESHOLD_ORANGE = 0.10; // 10%
const THRESHOLD_RED = 0.15;    // 15%

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type PriceLevel = 'yellow' | 'orange' | 'red';
export type PriceDirection = 'up' | 'down';

export interface PriceEvaluation {
  newAlert: {
    level: PriceLevel;
    direction: PriceDirection;
    deltaPct: number;
    baselinePrice: number;
    currentPrice: number;
  } | null;
  resolvedCount: number;
}

interface ProductMeta {
  id: string;
  productNo: string;
  name: string;
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Evaluate price movement for one product. Creates a new PriceMovementAlert when
 * |delta| crosses 5/10/15% thresholds vs a 7-day baseline. Resolves open alerts
 * when price returns to the safe band.
 *
 * Caller (inventory poller) is responsible for ensuring the latest snapshot has
 * already been persisted before this is called.
 */
export async function evaluatePriceMovement(
  meta: ProductMeta,
  snap: AdapterSnapshot,
): Promise<PriceEvaluation> {
  // No price → cannot evaluate. Adapter returns null when getItemView omitted
  // price.supply for this productNo.
  if (snap.supplierPrice == null || snap.supplierPrice <= 0) {
    return { newAlert: null, resolvedCount: 0 };
  }

  const currentPrice = snap.supplierPrice;
  const baseline = await computeBaseline(meta.id, snap.polledAt);

  // Cold start: need at least 1 prior snapshot with non-null supplierPrice.
  if (baseline == null || baseline <= 0) {
    return { newAlert: null, resolvedCount: 0 };
  }

  const deltaPct = (currentPrice - baseline) / baseline; // signed
  const absPct = Math.abs(deltaPct);

  const openAlert = await prisma.priceMovementAlert.findFirst({
    where: { productId: meta.id, resolvedAt: null },
    orderBy: { triggeredAt: 'desc' },
  });

  // Movement is within safe band — auto-resolve open alerts.
  if (absPct < THRESHOLD_YELLOW) {
    if (openAlert) {
      await prisma.priceMovementAlert.updateMany({
        where: { productId: meta.id, resolvedAt: null },
        data: {
          resolvedAt: new Date(),
          resolutionNote: `auto-resolved (delta=${(deltaPct * 100).toFixed(2)}%)`,
        },
      });
      return { newAlert: null, resolvedCount: 1 };
    }
    return { newAlert: null, resolvedCount: 0 };
  }

  const level = absPct >= THRESHOLD_RED
    ? 'red'
    : absPct >= THRESHOLD_ORANGE
      ? 'orange'
      : 'yellow';
  const direction: PriceDirection = deltaPct >= 0 ? 'up' : 'down';

  // Same level + same direction already open — suppress to avoid spam.
  if (openAlert && openAlert.level === level && openAlert.direction === direction) {
    return { newAlert: null, resolvedCount: 0 };
  }

  // Escalation or new alert: resolve old (if any), create new.
  let resolvedCount = 0;
  if (openAlert) {
    await prisma.priceMovementAlert.update({
      where: { id: openAlert.id },
      data: {
        resolvedAt: new Date(),
        resolutionNote: `superseded by ${direction}-${level}`,
      },
    });
    resolvedCount = 1;
  }

  const reason = `${direction}_${level} delta=${(deltaPct * 100).toFixed(2)}% baseline=${baseline}`;

  await prisma.priceMovementAlert.create({
    data: {
      productId: meta.id,
      level,
      direction,
      baselinePrice: baseline,
      currentPrice,
      deltaPct,
      reason: reason.slice(0, 100),
    },
  });

  // Fire Discord for orange/red only — yellow stays in dashboard widget.
  if (level === 'orange' || level === 'red') {
    await fireDiscordPriceAlert(meta, {
      level,
      direction,
      deltaPct,
      baselinePrice: baseline,
      currentPrice,
    });
  }

  return {
    newAlert: { level, direction, deltaPct, baselinePrice: baseline, currentPrice },
    resolvedCount,
  };
}

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

/**
 * Compute the rolling-7-day baseline supplierPrice for one product. Excludes
 * the latest snapshot (i.e. uses snapshots polled strictly before `latestPolledAt`).
 *
 * Returns the average of prior non-null supplierPrice values within the window,
 * or null when fewer than 1 prior data point exists (cold start).
 */
async function computeBaseline(
  productId: string,
  latestPolledAt: Date,
): Promise<number | null> {
  const since = new Date(latestPolledAt.getTime() - ROLLING_DAYS * 24 * 60 * 60 * 1000);

  const priors = await prisma.inventorySnapshot.findMany({
    where: {
      productId,
      polledAt: { gte: since, lt: latestPolledAt },
      supplierPrice: { not: null, gt: 0 },
    },
    select: { supplierPrice: true },
  });

  if (priors.length === 0) return null;

  const sum = priors.reduce((acc, r) => acc + (r.supplierPrice ?? 0), 0);
  const avg = sum / priors.length;
  return avg > 0 ? Math.round(avg) : null;
}

/**
 * Fire Discord PRICE_CHANGE channel for orange/red price alerts.
 * Yellow stays in the dashboard widget only (no Discord spam).
 */
async function fireDiscordPriceAlert(
  meta: ProductMeta,
  payload: {
    level: PriceLevel;
    direction: PriceDirection;
    deltaPct: number;
    baselinePrice: number;
    currentPrice: number;
  },
): Promise<void> {
  const colorByLevel: Record<PriceLevel, number> = {
    yellow: 0xFFD700,
    orange: 0xFFA500,
    red:    0xFF0000,
  };

  // Korean strings encoded as escapes to keep this file 0 hangul chars
  // (per principle #29). Plain ASCII keys are formatted at runtime.
  const titleUp = '공급가 상승 감지';   // 공급가 상승 감지
  const titleDown = '공급가 하락 감지'; // 공급가 하락 감지
  const labelCurrent = '현재';      // 현재
  const labelBaseline = '기준';     // 기준
  const labelDelta = '변동';        // 변동
  const directionSign = payload.direction === 'up' ? '+' : '';

  await sendDiscord('PRICE_CHANGE', '', [
    {
      title: payload.direction === 'up' ? titleUp : titleDown,
      description:
        `\`${meta.productNo}\` (${meta.name.slice(0, 40)})\n` +
        `${labelCurrent}: ${payload.currentPrice.toLocaleString()} | ` +
        `${labelBaseline}: ${payload.baselinePrice.toLocaleString()} | ` +
        `${labelDelta}: ${directionSign}${(payload.deltaPct * 100).toFixed(2)}%`,
      color: colorByLevel[payload.level],
      timestamp: new Date().toISOString(),
    },
  ]);
}
