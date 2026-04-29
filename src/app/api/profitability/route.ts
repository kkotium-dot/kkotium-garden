// src/app/api/profitability/route.ts
// C-4: Profitability analysis API
// Aggregates all products' margin data + fee comparison by traffic source
// 2026-04-29 update: per-category fee rates via naver-fee-rates-2026 (single source of truth)
//                    + 2025.06.02 reform metadata (effectiveDate / channel breakdown)

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getNaverFeeRate,
  NAVER_ORDER_MGMT_RATE_DEFAULT,
  NAVER_SALES_FEE_NORMAL,
  NAVER_SALES_FEE_MARKETING,
  NAVER_DEFAULT_FEE_RATE,
  NAVER_DEFAULT_FEE_RATE_MARKETING,
  FEE_REFORM_DATE,
} from '@/lib/naver-fee-rates-2026';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { status: { in: ['ACTIVE', 'DRAFT'] } },
      select: {
        id: true,
        name: true,
        sku: true,
        status: true,
        salePrice: true,
        supplierPrice: true,
        instant_discount: true,
        shippingFee: true,
        naverCategoryCode: true,
        category: true,
      },
    });

    // Per-product profitability — fee rates resolved per category via single-source-of-truth library
    const productAnalysis = products.map(p => {
      const effectivePrice = p.salePrice - Number(p.instant_discount ?? 0);
      const code = p.naverCategoryCode || undefined;
      const rateNormal = getNaverFeeRate(code, 'normal');
      const rateMarketing = getNaverFeeRate(code, 'marketing');

      const feeNormal = Math.round(effectivePrice * rateNormal);
      const feeMarketing = Math.round(effectivePrice * rateMarketing);
      const baseCost = p.supplierPrice + (p.shippingFee ?? 0);

      const profitNormal = effectivePrice - baseCost - feeNormal;
      const profitMarketing = effectivePrice - baseCost - feeMarketing;
      const marginNormal = effectivePrice > 0 ? (profitNormal / effectivePrice) * 100 : 0;
      const marginMarketing = effectivePrice > 0 ? (profitMarketing / effectivePrice) * 100 : 0;
      const feeSaved = feeNormal - feeMarketing; // savings with marketing link (0 for exception categories)

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        status: p.status,
        salePrice: p.salePrice,
        supplierPrice: p.supplierPrice,
        effectivePrice,
        feeNormal,
        feeMarketing,
        feeRateNormal: Math.round(rateNormal * 10000) / 100,        // %
        feeRateMarketing: Math.round(rateMarketing * 10000) / 100,  // %
        profitNormal: Math.round(profitNormal),
        profitMarketing: Math.round(profitMarketing),
        marginNormal: Math.round(marginNormal * 10) / 10,
        marginMarketing: Math.round(marginMarketing * 10) / 10,
        feeSaved,
      };
    });

    // Aggregate stats
    const totalProducts = productAnalysis.length;
    const activeProducts = productAnalysis.filter(p => p.status === 'ACTIVE');

    const sumNormalProfit = productAnalysis.reduce((s, p) => s + p.profitNormal, 0);
    const sumMarketingProfit = productAnalysis.reduce((s, p) => s + p.profitMarketing, 0);
    const sumFeeSaved = productAnalysis.reduce((s, p) => s + p.feeSaved, 0);
    const sumFeeNormal = productAnalysis.reduce((s, p) => s + p.feeNormal, 0);
    const sumFeeMarketing = productAnalysis.reduce((s, p) => s + p.feeMarketing, 0);
    const avgMarginNormal = totalProducts > 0
      ? Math.round(productAnalysis.reduce((s, p) => s + p.marginNormal, 0) / totalProducts * 10) / 10 : 0;

    // Margin distribution buckets
    const distribution = { excellent: 0, good: 0, normal: 0, low: 0, danger: 0 };
    for (const p of productAnalysis) {
      if (p.marginNormal >= 50) distribution.excellent++;
      else if (p.marginNormal >= 30) distribution.good++;
      else if (p.marginNormal >= 15) distribution.normal++;
      else if (p.marginNormal >= 0) distribution.low++;
      else distribution.danger++;
    }

    // Top 5 most profitable + bottom 5
    const sorted = [...productAnalysis].sort((a, b) => b.profitNormal - a.profitNormal);
    const top5 = sorted.slice(0, 5);
    const bottom5 = sorted.slice(-5).reverse();

    // Monthly revenue simulation (if all products sell 1x per day)
    const dailyRevenueNormal = sumNormalProfit;
    const monthlyRevenueNormal = dailyRevenueNormal * 30;
    const dailyRevenueMarketing = sumMarketingProfit;
    const monthlyRevenueMarketing = dailyRevenueMarketing * 30;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProducts,
          activeCount: activeProducts.length,
          avgMarginNormal,
          totalFeeNormal: sumFeeNormal,
          totalFeeMarketing: sumFeeMarketing,
          totalFeeSaved: sumFeeSaved,
          totalProfitNormal: sumNormalProfit,
          totalProfitMarketing: sumMarketingProfit,
          monthlySimulation: {
            normal: monthlyRevenueNormal,
            marketing: monthlyRevenueMarketing,
            difference: monthlyRevenueMarketing - monthlyRevenueNormal,
          },
        },
        distribution,
        top5,
        bottom5,
        feeComparison: {
          // Default 중소3 + standard categories — used for the dashboard summary card
          normalRate: NAVER_DEFAULT_FEE_RATE * 100,                   // 5.733
          marketingRate: NAVER_DEFAULT_FEE_RATE_MARKETING * 100,     // 3.913
          savedRate: (NAVER_SALES_FEE_NORMAL - NAVER_SALES_FEE_MARKETING) * 100, // 1.82
          orderMgmtRate: NAVER_ORDER_MGMT_RATE_DEFAULT * 100,        // 3.003
          salesFeeNormal: NAVER_SALES_FEE_NORMAL * 100,              // 2.73
          salesFeeMarketing: NAVER_SALES_FEE_MARKETING * 100,        // 0.91
          gradeLabel: '중소3 (신규 기본)',
          effectiveDate: FEE_REFORM_DATE,
          note: '2025.06.02 개편 — 유입수수료 2% 폐지 → 판매수수료(일반 2.73% / 자체마케팅 0.91%)으로 통합',
        },
      },
    });
  } catch (error) {
    console.error('[Profitability] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
