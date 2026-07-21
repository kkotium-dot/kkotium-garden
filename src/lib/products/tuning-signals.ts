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
import { loadSourceGoneFlags } from './source-gone';

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
  // H-4 (#266 연장, SCREEN_DIFFERENTIATION_SPEC_2026-07-17) — 좀비 판정 스킵
  // 가드의 기준. 미발행(정원 창고) 상품은 판정 대상에서 제외한다.
  naverProductId?: string | null;
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
  allProducts: TuningSourceProduct[],
): Promise<Map<string, ZombieVerdictResult>> {
  const out = new Map<string, ZombieVerdictResult>();
  // H-4 (#266 연장, SCREEN_DIFFERENTIATION_SPEC_2026-07-17 §4-5) — 좀비 =
  // "되살릴 수 있는 상품"(#264)이라 판 적 없는(미발행) 상품엔 무의미. 스토어에
  // 올라간 적 있는 상품(naverProductId 有)만 판정 대상으로 좁힌다. 이 한 곳의
  // 가드가 4개 노출처(목록 배지·dashboard/stats·사이드바·디스코드 좀비알림)를
  // 동시에 정상화한다(#62) — 전부 이 함수를 거쳐가기 때문.
  const products = allProducts.filter((p) => !!p.naverProductId);
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

  // Batch 4 — 공급처 단절(#271). 공급사가 상품을 내려 재매입이 불가능하면
  // 마진·판매실적과 무관하게 좀비로 확정된다. 판정 권위는 source-gone.ts(#62).
  const sourceGoneMap = await loadSourceGoneFlags(products.map((p) => p.id));

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
      sourceGone: sourceGoneMap.get(p.id) ?? false,
    });
    out.set(p.id, result);
  }

  return out;
}
