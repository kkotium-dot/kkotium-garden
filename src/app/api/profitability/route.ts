// src/app/api/profitability/route.ts
// C-4: Profitability analysis API
// Aggregates all products' margin data + fee comparison by traffic channel.
//
// 2025-06-02 reform: sales-fee channel split (normal 2.73% / marketing 0.91%).
// All commission math is centralized in lib/naver-fee-rates-2026.ts.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getNaverFeeRate,
  NAVER_SALES_FEE_NORMAL,
  NAVER_SALES_FEE_MARKETING,
  NAVER_MARKETING_FEE_REDUCTION,
  NAVER_FEE_REFORM_DATE,
  NAVER_FEE_REFORM_NOTE,
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

    // Per-product profitability — uses each product's category-specific rate
    const productAnalysis = products.map(p => {
      const effectivePrice = p.salePrice - Number(p.instant_discount ?? 0);
      // Resolve category-aware fee for both channels via single source of truth
      const code = p.naverCategoryCode ?? undefined;
      const totalRateNormal = getNaverFeeRate(code, 'normal');
      const totalRateMarketing = getNaverFeeRate(code, 'marketing');
      const feeNormal = Math.round(effectivePrice * totalRateNormal);
      const feeMarketing = Math.round(effectivePrice * totalRateMarketing);
      const baseCost = p.supplierPrice + (p.shippingFee ?? 0);

      const profitNormal = effectivePrice - baseCost - feeNormal;
      const profitMarketing = effectivePrice - baseCost - feeMarketing;
      const marginNormal = effectivePrice > 0 ? (profitNormal / effectivePrice) * 100 : 0;
      const marginMarketing = effectivePrice > 0 ? (profitMarketing / effectivePrice) * 100 : 0;
      const feeSaved = feeNormal - feeMarketing; // savings with marketing link

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
        profitNormal: Math.round(profitNormal),
        profitMarketing: Math.round(profitMarketing),
        marginNormal: Math.round(marginNormal * 10) / 10,
        marginMarketing: Math.round(marginMarketing * 10) / 10,
        feeSaved,
        // Per-product effective rates (for transparency in UI tooltips later)
        rateNormal: Math.round(totalRateNormal * 10000) / 10000,
        rateMarketing: Math.round(totalRateMarketing * 10000) / 10000,
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
    const avgMarginMarketing = totalProducts > 0
      ? Math.round(productAnalysis.reduce((s, p) => s + p.marginMarketing, 0) / totalProducts * 10) / 10 : 0;

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

    // Fee comparison rates — derived from category-aware totals when products exist,
    // otherwise show the standard middle-small-3 grade default
    const avgRateNormal = totalProducts > 0
      ? productAnalysis.reduce((s, p) => s + p.rateNormal, 0) / totalProducts
      : 0.05733;
    const avgRateMarketing = totalProducts > 0
      ? productAnalysis.reduce((s, p) => s + p.rateMarketing, 0) / totalProducts
      : 0.05733 - NAVER_MARKETING_FEE_REDUCTION;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProducts,
          activeCount: activeProducts.length,
          avgMarginNormal,
          avgMarginMarketing,
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
          // Average effective rates, accounting for category mix
          normalRate: Math.round(avgRateNormal * 10000) / 100,        // e.g. 5.73
          marketingRate: Math.round(avgRateMarketing * 10000) / 100,  // e.g. 3.91
          savedRate: Math.round((avgRateNormal - avgRateMarketing) * 10000) / 100, // e.g. 1.82
          salesFeeNormal: NAVER_SALES_FEE_NORMAL * 100,
          salesFeeMarketing: NAVER_SALES_FEE_MARKETING * 100,
          reformDate: NAVER_FEE_REFORM_DATE,
          reformNote: NAVER_FEE_REFORM_NOTE,
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
