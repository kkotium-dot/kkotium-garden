// src/app/api/dashboard/stats/route.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 대시보드 통계 API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // singleton — avoids connection pool exhaustion
import { getTodayOrderSummary } from '@/lib/naver/api-client';


export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';

    const dateFilter = getPeriodFilter(period);

    // 1+2. Single raw query for all status counts + avg score (avoids connection pool exhaustion)
    const countRows = await prisma.$queryRaw<Array<{ status: string | null; cnt: bigint }>>`
      SELECT status, COUNT(*) AS cnt
      FROM "Product"
      GROUP BY status
    `;
    const countMap: Record<string, number> = {};
    let totalProducts = 0;
    for (const row of countRows) {
      const n = Number(row.cnt);
      const s = row.status ?? 'UNKNOWN';
      countMap[s] = n;
      totalProducts += n;
    }
    const activeProducts     = countMap['ACTIVE'] ?? 0;
    const outOfStockProducts = countMap['OUT_OF_STOCK'] ?? 0;
    const draftProducts      = countMap['DRAFT'] ?? 0;
    const inactiveProducts   = (countMap['INACTIVE'] ?? 0) + (countMap['HIDDEN'] ?? 0);

    // Pipeline counts — sourcing shelf + zombie detection
    const sourcingCount = await prisma.crawlLog.count({ where: { sourcingStatus: 'SOURCED' } });

    // Zombie detection: ACTIVE + no lastSaleDate + createdAt > 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const zombieCount = await prisma.product.count({
      where: {
        status: 'ACTIVE',
        lastSaleDate: null,
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    // avg score — single aggregate
    const avgScoreRaw = await prisma.product.aggregate({
      _avg: { aiScore: true },
      where: { aiScore: { gt: 0 } },
    });
    const avgScore = Math.round(avgScoreRaw._avg.aiScore || 0);

    const scoreDistribution = await getScoreDistribution(dateFilter);

    // 3. Category distribution
    const categoryStats = await prisma.product.groupBy({
      by: ['category'],
      _count: true,
      where: dateFilter,
      orderBy: { _count: { category: 'desc' } },
      take: 5,
    });

    // 4. Recent activity
    const recentProducts = await prisma.product.findMany({
      where: dateFilter,
      select: { id: true, name: true, aiScore: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 5. Estimated margin revenue
    const marginStats = await prisma.product.aggregate({
      _sum: { salePrice: true, supplierPrice: true },
      where: { ...dateFilter, status: { in: ['ACTIVE', 'READY', 'PUBLISHED'] } },
    });
    const totalRevenue = (marginStats._sum.salePrice || 0) - (marginStats._sum.supplierPrice || 0);

    // 6. Naver live order summary (non-blocking — falls back to zeros if API unavailable)
    const todayOrders = await getTodayOrderSummary().catch(() => ({ count: 0, revenue: 0, paidAmount: 0 }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          // Fields the dashboard reads directly
          totalProducts,
          activeProducts,
          outOfStockProducts,
          draftProducts,
          inactiveProducts,
          avgScore,
          totalRevenue,
          period,
          // Pipeline counts for sidebar badges + pipeline card
          sourcingCount,
          zombieCount,
          // Naver live data
          todayOrderCount:   todayOrders.count,
          todayRevenue:      todayOrders.revenue,
          todayPaidAmount:   todayOrders.paidAmount,
          naverApiReady:     !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET),
          // Legacy aliases kept for any other consumers
          readyProducts: activeProducts,
          avgAiScore: avgScore,
        },
        scoreDistribution,
        categoryStats: categoryStats.map(c => ({
          category: c.category || '미분류',
          count: c._count,
        })),
        recentProducts,
      },
    });
  } catch (error) {
    console.error('❌ 대시보드 통계 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    );
  }
}

function getPeriodFilter(period: string) {
  const now = new Date();

  switch (period) {
    case '7d':
      return { createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
    case '30d':
      return { createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
    case '90d':
      return { createdAt: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } };
    case 'all':
      return {};
    default:
      return { createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
  }
}

async function getScoreDistribution(dateFilter: any) {
  const scores = await prisma.product.findMany({
    where: dateFilter,
    select: { aiScore: true },
  });

  const distribution = {
    excellent: 0,  // 90-100
    good: 0,       // 80-89
    average: 0,    // 70-79
    poor: 0,       // 60-69
    failed: 0,     // 0-59
  };

  scores.forEach(({ aiScore }) => {
    if (aiScore >= 90) distribution.excellent++;
    else if (aiScore >= 80) distribution.good++;
    else if (aiScore >= 70) distribution.average++;
    else if (aiScore >= 60) distribution.poor++;
    else distribution.failed++;
  });

  return distribution;
}
