// src/app/api/dashboard/stats/route.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 대시보드 통계 API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { countDispositionPending } from '@/lib/products/disposition-load'; // singleton — avoids connection pool exhaustion
import { getTodayOrderSummary, isNaverAppStatusInvalid, NAVER_APP_STATUS_USER_MESSAGE, isNaverClientSecretInvalid, NAVER_CLIENT_SECRET_USER_MESSAGE } from '@/lib/naver/api-client';
import { loadTuningScores } from '@/lib/products/tuning-signals';


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

    // 처분 대기 수(#290/#278) — status가 아니라 **판정**으로 센다. 공급처가
    // 끊긴 상품은 앱 status가 ACTIVE로 남아 있어 status 집계에서 빠지는데,
    // 그게 가장 급한 처분 대상이다. 화면(대기함)과 같은 규칙을 쓴다(#62).
    const dispositionPending = await countDispositionPending();

    // 부활 대상 count (#62/#247) — SINGLE source with the hub revival filter.
    // Was a divergent ad-hoc query (ACTIVE + no-sale + 30d) that disagreed with
    // the hub (e.g. a SUSPENSION DRAFT is a hub candidate but was ACTIVE-gated
    // out here). Now both count computeRevivalScore(...).isCandidate over ALL
    // products via the shared isRevivalCandidateProduct helper, so the dashboard
    // 부활소 card and the hub "부활 후보" filter always show the same number.
    // 좀비 카운트 — 통합 엔진(zombie-verdict, 원칙 #264)으로 계산한다.
    // 2026-07-15 Desktop 실측에서 발견: 여기가 revival-score 단독 판정을 쓰는
    // 바람에 대시보드/사이드바 배지는 2건, 꽃밭 돌보기 좀비꽃 탭은 1건으로
    // 화면마다 숫자가 달랐다. 운영자가 배지 "2"를 보고 눌렀는데 1건만 나오면
    // 신뢰가 깨지므로, 목록 화면(/api/products)과 동일한 loadTuningScores를
    // 태워 같은 판정을 쓴다.
    const revivalRows = await prisma.product.findMany({
      select: {
        id: true, name: true, category: true,
        naver_status_type: true, status: true, naverProductId: true,
        mainImage: true, images: true,
        salePrice: true, supplierPrice: true, keywords: true, tags: true,
        naverCategoryCode: true, lastSaleDate: true, supplier_product_code: true,
        updatedAt: true,
      },
    });
    // best-effort — 좀비 점수 계산이 실패해도 대시보드 전체가 죽으면 안 된다(#82).
    let zombieCount = 0;
    try {
      const verdicts = await loadTuningScores(revivalRows as unknown as Parameters<typeof loadTuningScores>[0]);
      zombieCount = [...verdicts.values()].filter((v) => v.isZombie).length;
    } catch (err) {
      console.error('좀비 카운트 계산 오류(대시보드는 정상 반환):', err);
    }

    // ORDER-QUEUE-1 (#195): read-only order-processing nudge counts. Surfaces
    // orders that need an operator action now — PAID/PAYED = needs dispatch;
    // CANCEL/RETURN_REQUESTED = needs a claim response. ORDER-SYNC keeps these
    // statuses accurate; no new columns. The write actions live on /orders (#46).
    const orderStatusRows = await prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const orderStatusMap: Record<string, number> = {};
    for (const row of orderStatusRows) {
      orderStatusMap[row.status ?? 'UNKNOWN'] = row._count._all;
    }
    const ordersToShip          = (orderStatusMap['PAID'] ?? 0) + (orderStatusMap['PAYED'] ?? 0);
    const ordersCancelRequested = orderStatusMap['CANCEL_REQUESTED'] ?? 0;
    const ordersReturnRequested = orderStatusMap['RETURN_REQUESTED'] ?? 0;
    const ordersClaim           = ordersCancelRequested + ordersReturnRequested;

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

    // 6. Naver live order summary (non-blocking — falls back to zeros if API unavailable).
    // NAVER-APP-1 (#62/#160): when the Naver order API is down we must NOT show fake
    // zeros as if they were real sales (#82). Capture the failure kind so the UI can
    // surface an honest status instead — application-status-invalid needs an operator
    // console action, so it gets its own user-facing message.
    let naverOrderStatus: 'ok' | 'app_status_invalid' | 'client_secret_invalid' | 'unavailable' = 'ok';
    let naverOrderMessage: string | undefined;
    const todayOrders = await getTodayOrderSummary().catch((e: unknown) => {
      if (isNaverAppStatusInvalid(e)) {
        naverOrderStatus = 'app_status_invalid';
        naverOrderMessage = NAVER_APP_STATUS_USER_MESSAGE;
      } else if (isNaverClientSecretInvalid(e)) {
        // #62: client_secret_sign not-valid.args — honest, actionable instead of
        // a vague "unavailable" (or a false "ok" with fake zero orders).
        naverOrderStatus = 'client_secret_invalid';
        naverOrderMessage = NAVER_CLIENT_SECRET_USER_MESSAGE;
      } else {
        naverOrderStatus = 'unavailable';
      }
      return { count: 0, revenue: 0, paidAmount: 0 };
    });

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
          dispositionPending,
          zombieCount,
          // ORDER-QUEUE-1 (#195): order-processing nudge counts (read-only)
          ordersToShip,
          ordersClaim,
          ordersCancelRequested,
          ordersReturnRequested,
          // Naver live data
          todayOrderCount:   todayOrders.count,
          todayRevenue:      todayOrders.revenue,
          todayPaidAmount:   todayOrders.paidAmount,
          // #62: env presence is a false readiness signal — proxy mode always has
          // it (and a wrong secret still "exists"). Ready means the live order
          // call actually succeeded.
          naverApiReady:     naverOrderStatus === 'ok',
          // NAVER-APP-1: honest live-order status so the dashboard can warn instead
          // of presenting fake zeros when the Naver order API is unavailable.
          naverOrderStatus,
          naverOrderMessage,
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
