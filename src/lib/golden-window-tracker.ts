// src/lib/golden-window-tracker.ts
// ============================================================================
// Sprint 7 P0-B (리서치 10번): Registration golden window tracker
// ============================================================================
//
// Naver shopping gives new-product score boost in the first 7 days after
// registration. Missing that window = permanent ranking deficit. This tracker
// evaluates each active product against D+1 / D+3 / D+7 milestones and surfaces
// products that need intervention.
//
// Stages:
//   day_0      — < 24h since createdAt   (just registered, no alert)
//   d_plus_1   — 24-72h                  (D+1 check: any click/sale?)
//   d_plus_3   — 72-168h                 (D+3 check: at least 1 sale?)
//   d_plus_7   — 168-336h (7-14 days)    (D+7 check: at least 3 sales?)
//   expired    — >= 336h (14+ days)      (golden window closed)
//
// Status flags:
//   ok           — milestone met (or too early)
//   needs_action — milestone missed (e.g. D+3 with zero sales)
//
// "Sales" proxy: Product.salesCount > 0 OR aggregated OrderItem count > 0.
// Click data is not currently fetched from Naver Commerce API (separate
// integration). The tracker leaves click checks out — sales is the harder
// metric anyway.
// ============================================================================

import { prisma } from '@/lib/prisma';
import { resolveProductMarketContext, type MarketLevel } from '@/lib/naver/category-trend-cache';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

// Stage thresholds in hours since createdAt
const T_D_PLUS_1_START = 24;
const T_D_PLUS_3_START = 72;
const T_D_PLUS_7_START = 168;
const T_EXPIRED_START = 336; // 14 days

// Sales targets per stage (cumulative)
const TARGET_D_PLUS_1 = 0; // any click — but click data unavailable, default 0
const TARGET_D_PLUS_3 = 1; // at least 1 sale by D+3
const TARGET_D_PLUS_7 = 3; // at least 3 sales by D+7

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type GoldenStage = 'day_0' | 'd_plus_1' | 'd_plus_3' | 'd_plus_7' | 'expired';
export type GoldenStatus = 'ok' | 'needs_action';
/** Higher severity = more actionable. */
export type GoldenSeverity = 'critical' | 'warning' | 'note' | 'ok';

export interface GoldenWindowRow {
  productId: string;
  productNo: string | null;
  productName: string;
  naverProductId: string | null;
  registeredAt: string; // ISO
  hoursSinceRegistration: number;
  stage: GoldenStage;
  status: GoldenStatus;
  salesCount: number;
  target: number;
  /** Korean message suitable for an Inbox row. */
  message: string;
  /** Sprint 7 P0-B enhancement: market context from DataLab cache. */
  marketLevel: MarketLevel | 'unknown';
  marketTrendScore: number;
  /** Final severity after combining stage status + market context. */
  severity: GoldenSeverity;
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Evaluate golden window status for every ACTIVE product (naverProductId set).
 * Returns sorted by "most urgent first" — needs_action before ok, then by stage.
 *
 * Cold start: when 0 active products, returns []. Widget renders empty-state.
 */
export async function evaluateGoldenWindow(): Promise<GoldenWindowRow[]> {
  const products = await prisma.product.findMany({
    where: { naverProductId: { not: null } },
    select: {
      id: true,
      name: true,
      category: true,
      supplier_product_code: true,
      naverProductId: true,
      salesCount: true,
      createdAt: true,
    },
  });

  if (products.length === 0) return [];

  const now = Date.now();

  // Resolve market context for each product (cache hit is async but small)
  const contexts = await Promise.all(
    products.map((p) => resolveProductMarketContext(p.category)),
  );

  const rows: GoldenWindowRow[] = products.map((p, i) => {
    const hoursElapsed = Math.max(0, (now - p.createdAt.getTime()) / MS_PER_HOUR);
    const stage = classifyStage(hoursElapsed);
    const target = targetForStage(stage);
    const sales = p.salesCount ?? 0;
    const status: GoldenStatus = (() => {
      if (stage === 'day_0') return 'ok';
      if (stage === 'expired') return 'ok'; // closed window — no actionable target
      return sales >= target ? 'ok' : 'needs_action';
    })();
    const ctx = contexts[i];
    const marketLevel: MarketLevel | 'unknown' = ctx?.marketLevel ?? 'unknown';
    const marketTrendScore = ctx?.trendScore ?? 0;
    const severity = computeSeverity(stage, status, marketLevel);
    return {
      productId: p.id,
      productNo: p.supplier_product_code,
      productName: p.name,
      naverProductId: p.naverProductId,
      registeredAt: p.createdAt.toISOString(),
      hoursSinceRegistration: Math.round(hoursElapsed),
      stage,
      status,
      salesCount: sales,
      target,
      message: buildMessage(stage, status, sales, target, marketLevel),
      marketLevel,
      marketTrendScore,
      severity,
    };
  });

  // Sprint 7 P0-B enhancement: sort by severity rank (critical -> warning -> note -> ok),
  // then by hours-since-registration descending (closer to expired = more urgent).
  const severityRank: Record<GoldenSeverity, number> = {
    critical: 0,
    warning: 1,
    note: 2,
    ok: 3,
  };
  rows.sort((a, b) => {
    const sa = severityRank[a.severity];
    const sb = severityRank[b.severity];
    if (sa !== sb) return sa - sb;
    return b.hoursSinceRegistration - a.hoursSinceRegistration;
  });

  return rows;
}

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

function classifyStage(hoursElapsed: number): GoldenStage {
  if (hoursElapsed < T_D_PLUS_1_START) return 'day_0';
  if (hoursElapsed < T_D_PLUS_3_START) return 'd_plus_1';
  if (hoursElapsed < T_D_PLUS_7_START) return 'd_plus_3';
  if (hoursElapsed < T_EXPIRED_START)  return 'd_plus_7';
  return 'expired';
}

function targetForStage(stage: GoldenStage): number {
  switch (stage) {
    case 'day_0':   return 0;
    case 'd_plus_1': return TARGET_D_PLUS_1;
    case 'd_plus_3': return TARGET_D_PLUS_3;
    case 'd_plus_7': return TARGET_D_PLUS_7;
    case 'expired': return TARGET_D_PLUS_7;
  }
}

function buildMessage(
  stage: GoldenStage,
  status: GoldenStatus,
  sales: number,
  target: number,
  marketLevel: MarketLevel | 'unknown',
): string {
  if (stage === 'day_0') {
    // 등록 직후 — 첫 24시간은 골든윈도우 진입 전입니다
    return '등록 직후 — 골든윈도우 진입 전';
  }
  if (stage === 'expired') {
    // 골든윈도우 종료 — 신상품 가산점 만료
    return '골든윈도우 종료 — 신상품 가산점 만료';
  }
  const stageLabel = stage === 'd_plus_1' ? 'D+1' : stage === 'd_plus_3' ? 'D+3' : 'D+7';
  if (status === 'ok') {
    // {stageLabel} 통과 — 판매 {sales}건/{target}건 목표 달성
    return `${stageLabel} 통과 — 판매 ${sales}건/${target}건 목표 달성`;
  }
  // Sprint 7 P0-B enhancement: market context shapes the recommended action.
  // hot market + zero sales = product name issue. cold market = patience.
  if (marketLevel === 'hot') {
    return `${stageLabel} 미달 — 판매 ${sales}건/${target}건 · 시장 hot인데 미달, 상품명 토큰 교체 권장`;
  }
  if (marketLevel === 'cold') {
    return `${stageLabel} 미달 — 판매 ${sales}건/${target}건 · 시장 cold라 인내 권장 (광고 ROI 낮음)`;
  }
  return `${stageLabel} 미달 — 판매 ${sales}건/${target}건 · 상품명 토큰 교체 권장`;
}

/**
 * Combine stage status with market context to produce a final severity bucket.
 *
 *   critical  needs_action + hot market    — clearest "fix the listing" signal
 *   warning   needs_action + normal/unknown — standard needs_action
 *   note      needs_action + cold market    — possibly fine, surface as info
 *   ok        status === 'ok'
 */
function computeSeverity(
  stage: GoldenStage,
  status: GoldenStatus,
  marketLevel: MarketLevel | 'unknown',
): GoldenSeverity {
  if (status === 'ok') return 'ok';
  if (stage === 'day_0' || stage === 'expired') return 'ok';
  if (marketLevel === 'hot') return 'critical';
  if (marketLevel === 'cold') return 'note';
  return 'warning';
}

/**
 * Return true ms is within the 14-day golden window from createdAt.
 * Useful for "is this product still inside the boost window?" checks elsewhere.
 */
export function isInsideGoldenWindow(createdAt: Date, asOf: Date = new Date()): boolean {
  return asOf.getTime() - createdAt.getTime() < 14 * MS_PER_DAY;
}
