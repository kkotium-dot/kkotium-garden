// src/app/api/profitability/route.ts
// C-4: Profitability analysis API
// Aggregates all products' margin data + fee comparison by traffic source

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 2026 Naver fee structure
const ORDER_MGMT_RATE = 0.03003; // middle-small-3
const SALES_FEE_NORMAL = 0.0273; // standard exposure
const SALES_FEE_MARKETING = 0.0091; // seller marketing link

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

    // Per-product profitability
    const productAnalysis = products.map(p => {
      const effectivePrice = p.salePrice - Number(p.instant_discount ?? 0);
      const feeNormal = Math.round(effectivePrice * (ORDER_MGMT_RATE + SALES_FEE_NORMAL));
      const feeMarketing = Math.round(effectivePrice * (ORDER_MGMT_RATE + SALES_FEE_MARKETING));
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
          normalRate: (ORDER_MGMT_RATE + SALES_FEE_NORMAL) * 100,
          marketingRate: (ORDER_MGMT_RATE + SALES_FEE_MARKETING) * 100,
          savedRate: (SALES_FEE_NORMAL - SALES_FEE_MARKETING) * 100,
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
