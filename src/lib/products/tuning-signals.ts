// src/lib/products/tuning-signals.ts
// ============================================================================
// 좀비 통합 판정 — async signal loader (#256 P4, #264로 zombie-verdict 흡수).
// Batches the DB/lookup work so zombie-verdict.ts/tuning-score.ts stay pure.
// Reuses existing engines only (#252, #264):
//   revival-score의 thin_images(이미지 수) · honey-score(마진) ·
//   product-name-diagnosis(상품명 SEO) · category-trend-cache(카테고리 트렌드) ·
//   SupplierStockProfile(dome-inventory-poller의 공급사 신뢰도) ·
//   substitute_info(품절 대체 설정 여부, product-link.ts).
// Callers: /api/products (warehouse list) · /api/products/linked (list) ·
// /api/products/[id]/naver-detail (single-product info panel) · cron/daily
// (zombie Discord digest).
// ============================================================================

import { prisma } from '@/lib/prisma';
import { calcHoneyScore } from '@/lib/honey-score';
import { diagnoseProductName } from '@/lib/seo/product-name-diagnosis';
import { getCachedTrend, buildD1Key } from '@/lib/naver/category-trend-cache';
import { isOutOfStockOrSuspended } from './tuning-score';
import { computeZombieVerdict, type ZombieVerdictResult } from './zombie-verdict';
import { readSubstituteInfo, hasSubstitutePlan } from '@/lib/product-link';

export interface TuningSourceProduct {
  id: string;
  name: string;
  salePrice: number;
  supplierPrice: number;
  naverCategoryCode?: string | null;
  category?: string | null;
  keywords?: unknown;
  tags?: unknown;
  mainImage?: string | null;
  images?: unknown;
  naver_status_type?: string | null;
  status: string;
  lastSaleDate?: Date | string | null;
  updatedAt?: Date | string | null;
  supplier_product_code?: string | null;
}

const daysSince = (d: Date | string | null | undefined): number | null => {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
};

const d1Of = (category: string | null | undefined): string | null => {
  const d1 = (category ?? '').split(/\s*[>/]\s*/)[0]?.trim();
  return d1 || null;
};

/**
 * Batch-compute tuning scores for a set of products. Best-effort on every
 * enrichment signal (trend cache miss / no supplier profile / etc. degrade to
 * a neutral input rather than throwing) — a scoring hiccup must never break
 * the 꽃밭 돌보기 list (#82).
 */
export async function loadTuningScores(
  products: TuningSourceProduct[],
): Promise<Map<string, ZombieVerdictResult>> {
  const out = new Map<string, ZombieVerdictResult>();
  if (products.length === 0) return out;

  // Batch 1 — category trend (distinct D1s → single-ish set of cache reads).
  const d1s = Array.from(new Set(products.map((p) => d1Of(p.category)).filter((v): v is string => !!v)));
  const trendMap = new Map<string, number | null>();
  await Promise.all(d1s.map(async (d1) => {
    try {
      const trend = await getCachedTrend(buildD1Key(d1));
      trendMap.set(d1, trend?.trendScore ?? null);
    } catch {
      trendMap.set(d1, null);
    }
  }));

  // Batch 2 — supplier trustworthiness (dome-inventory-poller's rolling profile),
  // keyed by dome productNo = Product.supplier_product_code.
  const productNos = Array.from(new Set(
    products.map((p) => p.supplier_product_code).filter((v): v is string => !!v),
  ));
  const trustMap = new Map<string, boolean>();
  if (productNos.length > 0) {
    try {
      const profiles = await prisma.supplierStockProfile.findMany({
        where: { productNo: { in: productNos } },
        select: { productNo: true, isTrustworthy: true },
      });
      for (const row of profiles) trustMap.set(row.productNo, row.isTrustworthy);
    } catch {
      // table/column not migrated yet — degrade silently (#82)
    }
  }

  // Batch 3 — 품절 대체 신호(#264): substitute_info is only meaningful for
  // OOS/판매중지 products, so only fetch for those (avoids a full-table read).
  const oosIds = products
    .filter((p) => isOutOfStockOrSuspended({ naverStatusType: p.naver_status_type ?? null, appStatus: p.status }))
    .map((p) => p.id);
  const substituteMap = oosIds.length > 0 ? await readSubstituteInfo(oosIds) : new Map();

  for (const p of products) {
    const netMarginRate = p.salePrice > 0 && p.supplierPrice > 0
      ? calcHoneyScore({
          salePrice: p.salePrice, supplierPrice: p.supplierPrice,
          categoryId: p.naverCategoryCode ?? '', productName: p.name,
          keywords: Array.isArray(p.keywords) ? (p.keywords as string[]) : [],
          tags: Array.isArray(p.tags) ? (p.tags as string[]) : [],
          hasMainImage: !!p.mainImage,
        }).netMarginRate
      : 0;
    const nameSeoScore = diagnoseProductName(p.name ?? '').score;
    const d1 = d1Of(p.category);
    const imageCount = (p.mainImage ? 1 : 0) + (Array.isArray(p.images) ? p.images.length : 0);
    const oos = isOutOfStockOrSuspended({ naverStatusType: p.naver_status_type ?? null, appStatus: p.status });

    const result = computeZombieVerdict({
      naverStatusType: p.naver_status_type ?? null,
      appStatus: p.status,
      daysSinceLastSale: daysSince(p.lastSaleDate),
      netMarginRate,
      nameSeoScore,
      categoryTrendScore: d1 ? (trendMap.get(d1) ?? null) : null,
      supplierTrustworthy: p.supplier_product_code ? (trustMap.get(p.supplier_product_code) ?? null) : null,
      daysSinceUpdated: daysSince(p.updatedAt),
      imageCount,
      oosSubstituteConfigured: oos ? hasSubstitutePlan(substituteMap.get(p.id)) : null,
    });
    out.set(p.id, result);
  }

  return out;
}
