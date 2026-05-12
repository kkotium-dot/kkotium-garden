// src/lib/supplier-score-aggregator.ts
// ============================================================================
// Sprint 6-C.2 (Session E-2 Phase 4): Supplier-level Score Aggregator
// ============================================================================
//
// Pure compute layer. Reads existing data (no new DB writes):
//   - SupplierStockProfile (product-level depletion + trust flag from 6-A)
//   - PriceMovementAlert  (price volatility from 6-B)
//   - Product             (count + active status by supplier)
//
// Produces a per-supplier aggregate used by:
//   - GET /api/suppliers/scores
//   - dashboard SupplierGardenWidget (Section 4 잠재력)
//
// Metric: 0~100 composite score derived from three sub-scores:
//   trustScore       — share of product-level profiles flagged isTrustworthy
//   depletionScore   — relative health of avgDailyDepletion across the
//                      supplier's product line (median scaled to 0-100)
//   priceStability   — inverse of price-volatility ratio. 100 = no recent
//                      PriceMovementAlerts in last 30 days; lower as alerts
//                      accumulate.
//
// composite = round( 0.45*trust + 0.35*depletion + 0.20*priceStability )
//
// Tier mapping (purely cosmetic for the widget):
//   80+ : 'green'  (꽃나무처럼 든든)
//   60+ : 'yellow' (조금만 더 지켜봐요)
//   0+  : 'red'    (대안 검토 권장)
// ============================================================================

import { prisma } from '@/lib/prisma';

const PRICE_LOOKBACK_DAYS = 30;
const MAX_PRICE_ALERTS_FOR_FLOOR = 8; // 8+ alerts in lookback window = 0 stability

export type SupplierTier = 'green' | 'yellow' | 'red';

export interface SupplierScore {
  supplierId: string;
  supplierName: string;
  productCount: number;
  activeProductCount: number;
  trustScore: number;        // 0..100
  depletionScore: number;    // 0..100
  priceStability: number;    // 0..100
  composite: number;         // 0..100 rounded
  tier: SupplierTier;
  untrustworthyCount: number;
  recentPriceAlerts: number;
  computedAt: string;        // ISO
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Compute supplier-level scores for every supplier that has at least one
 * product in the catalog. Returns sorted by composite DESC (best suppliers first).
 *
 * Suppliers with 0 products are excluded. Suppliers with products but no
 * SupplierStockProfile (cold start) get neutral defaults (trust=100, depletion=50,
 * priceStability=100 → composite ~80).
 */
export async function computeSupplierScores(): Promise<SupplierScore[]> {
  const suppliers = await prisma.supplier.findMany({
    select: {
      id: true,
      name: true,
      products: {
        select: {
          id: true,
          naverProductId: true,
          supplier_product_code: true,
        },
      },
    },
  });

  if (suppliers.length === 0) return [];

  const supplierIds = suppliers.map((s) => s.id);
  const productNos: string[] = [];
  for (const s of suppliers) {
    for (const p of s.products) {
      if (p.supplier_product_code) productNos.push(p.supplier_product_code);
    }
  }

  // Pull stock profiles in one query
  const profiles = productNos.length === 0
    ? []
    : await prisma.supplierStockProfile.findMany({
        where: { productNo: { in: productNos } },
        select: {
          productNo: true,
          supplierId: true,
          avgDailyDepletion: true,
          isTrustworthy: true,
        },
      });

  // Pull recent price alerts grouped by product
  const since = new Date(Date.now() - PRICE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const recentAlerts = await prisma.priceMovementAlert.findMany({
    where: {
      triggeredAt: { gte: since },
      product: { supplierId: { in: supplierIds } },
    },
    select: {
      product: { select: { supplierId: true } },
    },
  });

  // Index alerts by supplierId
  const alertsBySupplier = new Map<string, number>();
  for (const a of recentAlerts) {
    const sid = a.product?.supplierId;
    if (!sid) continue;
    alertsBySupplier.set(sid, (alertsBySupplier.get(sid) ?? 0) + 1);
  }

  // Index profiles by supplierId
  const profilesBySupplier = new Map<string, typeof profiles>();
  for (const p of profiles) {
    if (!p.supplierId) continue;
    const list = profilesBySupplier.get(p.supplierId) ?? [];
    list.push(p);
    profilesBySupplier.set(p.supplierId, list);
  }

  const computedAt = new Date().toISOString();

  const out: SupplierScore[] = suppliers
    .filter((s) => s.products.length > 0)
    .map((s) => {
      const productCount = s.products.length;
      const activeProductCount = s.products.filter((p) => !!p.naverProductId).length;
      const supplierProfiles = profilesBySupplier.get(s.id) ?? [];

      // Trust = share of trustworthy product profiles. No profile yet = trust 100.
      let trustScore = 100;
      let untrustworthyCount = 0;
      if (supplierProfiles.length > 0) {
        untrustworthyCount = supplierProfiles.filter((p) => !p.isTrustworthy).length;
        trustScore = Math.round(
          ((supplierProfiles.length - untrustworthyCount) / supplierProfiles.length) * 100,
        );
      }

      // Depletion = relative health. Map median avgDailyDepletion to 0-100 with
      // soft caps: 0 → 30 (stale supplier), 5+ → 100 (healthy depletion).
      let depletionScore = 50;
      if (supplierProfiles.length > 0) {
        const depletions = supplierProfiles
          .map((p) => p.avgDailyDepletion)
          .filter((d) => Number.isFinite(d))
          .sort((a, b) => a - b);
        if (depletions.length > 0) {
          const median = depletions[Math.floor((depletions.length - 1) / 2)];
          depletionScore = mapDepletionToScore(median);
        }
      }

      // Price stability = inverse of recent alert count. 0 alerts = 100.
      const recentPriceAlerts = alertsBySupplier.get(s.id) ?? 0;
      const priceStability = Math.max(
        0,
        Math.round(100 * (1 - recentPriceAlerts / MAX_PRICE_ALERTS_FOR_FLOOR)),
      );

      const composite = Math.round(
        0.45 * trustScore + 0.35 * depletionScore + 0.20 * priceStability,
      );
      const tier: SupplierTier = composite >= 80 ? 'green' : composite >= 60 ? 'yellow' : 'red';

      return {
        supplierId: s.id,
        supplierName: s.name,
        productCount,
        activeProductCount,
        trustScore,
        depletionScore,
        priceStability,
        composite,
        tier,
        untrustworthyCount,
        recentPriceAlerts,
        computedAt,
      };
    });

  out.sort((a, b) => b.composite - a.composite);
  return out;
}

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

/**
 * Map median daily depletion (units/day) into a 0-100 score.
 *   0       → 30  (stale supplier — alerts disabled by 6-A treats these as untrustworthy)
 *   0..1    → 30..60 (linear)
 *   1..5    → 60..100 (linear)
 *   5+      → 100 (capped)
 */
function mapDepletionToScore(depletion: number): number {
  if (!Number.isFinite(depletion) || depletion <= 0) return 30;
  if (depletion >= 5) return 100;
  if (depletion >= 1) {
    return Math.round(60 + ((depletion - 1) / 4) * 40);
  }
  return Math.round(30 + (depletion / 1) * 30);
}
