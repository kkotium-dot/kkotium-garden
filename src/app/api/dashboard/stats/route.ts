// src/app/api/dashboard/stats/route.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 대시보드 통계 API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d'; // 7d, 30d, 90d, all

    // 기간 필터
    const dateFilter = getPeriodFilter(period);

    // 1. 전체 상품 통계
    const totalProducts = await prisma.product.count();
    const readyProducts = await prisma.product.count({
      where: {
        status: 'READY',
        aiScore: { gte: 60 },
      },
    });

    // 2. AI 점수 통계
    const avgAiScore = await prisma.product.aggregate({
      _avg: { aiScore: true },
      where: dateFilter,
    });

    const scoreDistribution = await getScoreDistribution(dateFilter);

    // 3. 카테고리 분포
    const categoryStats = await prisma.product.groupBy({
      by: ['category'],
      _count: true,
      where: dateFilter,
      orderBy: { _count: { category: 'desc' } },
      take: 5,
    });

    // 4. 최근 활동
    const recentProducts = await prisma.product.findMany({
      where: dateFilter,
      select: {
        id: true,
        name: true,
        aiScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 5. 매출 예측 (마진 기반)
    const marginStats = await prisma.product.aggregate({
      _sum: {
        salePrice: true,
        supplierPrice: true,
      },
      where: {
        ...dateFilter,
        status: { in: ['READY', 'PUBLISHED'] },
      },
    });

    const totalRevenue = (marginStats._sum.salePrice || 0) - (marginStats._sum.supplierPrice || 0);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProducts,
          readyProducts,
          avgAiScore: Math.round(avgAiScore._avg.aiScore || 0),
          totalRevenue,
          period,
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
