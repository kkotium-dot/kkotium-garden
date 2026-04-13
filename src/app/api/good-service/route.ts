// src/app/api/good-service/route.ts
// Good Service Score API — aggregates order data into 3-axis quality score

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calcGoodServiceScore, simulateGrade } from '@/lib/good-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Aggregate order data for 14-day window
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
      select: {
        id: true,
        status: true,
        createdAt: true,
        paidAt: true,
        shippedAt: true,
        deliveredAt: true,
        cancelledAt: true,
        claimReason: true,
        refundStatus: true,
        totalAmount: true,
      },
    });

    // Calculate metrics from order data
    const totalOrders = orders.length;

    // Order fulfillment metrics
    let confirmedWithin24h = 0;
    let confirmedWithin48h = 0;
    let lateConfirmations = 0;
    let cancelledBySeller = 0;

    // Delivery quality metrics
    let deliveredOnTime = 0;
    let deliveredLate = 0;
    let deliveryIssues = 0;

    for (const order of orders) {
      // Confirmation speed: time from paidAt to shippedAt
      if (order.paidAt && order.shippedAt) {
        const confirmHours = (order.shippedAt.getTime() - order.paidAt.getTime()) / (1000 * 60 * 60);
        if (confirmHours <= 24) confirmedWithin24h++;
        else if (confirmHours <= 48) confirmedWithin48h++;
        else lateConfirmations++;
      } else if (order.paidAt && !order.shippedAt && order.status !== 'CANCELLED') {
        // Paid but not yet shipped — check if overdue
        const hoursSincePaid = (now.getTime() - order.paidAt.getTime()) / (1000 * 60 * 60);
        if (hoursSincePaid > 48) lateConfirmations++;
      }

      // Seller-fault cancellation
      if (order.status === 'CANCELLED' && order.cancelledAt) {
        const reason = (order.claimReason ?? '').toLowerCase();
        if (reason.includes('seller') || reason.includes('stock') || reason.includes('out_of_stock')) {
          cancelledBySeller++;
        }
      }

      // Delivery quality
      if (order.deliveredAt && order.shippedAt) {
        const deliveryDays = (order.deliveredAt.getTime() - order.shippedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (deliveryDays <= 3) deliveredOnTime++;
        else deliveredLate++;
      }

      // Delivery issues (damage, wrong item)
      if (order.refundStatus && ['DAMAGED', 'WRONG_ITEM', 'LOST'].includes(order.refundStatus)) {
        deliveryIssues++;
      }
    }

    // Customer satisfaction metrics (basic — no review API available)
    // Estimate from return/claim data
    const returnOrders = orders.filter(o =>
      o.refundStatus && o.refundStatus !== 'NONE' && o.refundStatus !== ''
    );
    const returnsBySeller = returnOrders.filter(o => {
      const reason = (o.claimReason ?? '').toLowerCase();
      return reason.includes('seller') || reason.includes('quality') || reason.includes('wrong');
    }).length;

    // Monthly stats for grade simulation
    const monthlyOrders = await prisma.order.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, status: { not: 'CANCELLED' } },
      select: { totalAmount: true },
    });
    const monthlySalesAmount = monthlyOrders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
    const monthlySalesCount = monthlyOrders.length;

    const input = {
      totalOrders,
      confirmedWithin24h,
      confirmedWithin48h,
      lateConfirmations,
      cancelledBySeller,
      deliveredOnTime,
      deliveredLate,
      deliveryIssues,
      totalReviews: 0, // No review API — placeholder
      avgRating: 0,
      inquiriesTotal: 0,
      inquiriesAnswered24h: 0,
      returnsBySeller,
      returnsTotal: returnOrders.length,
    };

    const score = calcGoodServiceScore(input);
    const gradeSimulation = simulateGrade(monthlySalesAmount, monthlySalesCount, score.overall);

    return NextResponse.json({
      success: true,
      data: {
        score,
        metrics: input,
        gradeSimulation,
        period: {
          start: fourteenDaysAgo.toISOString(),
          end: now.toISOString(),
          days: 14,
        },
        monthlySummary: {
          salesAmount: monthlySalesAmount,
          salesCount: monthlySalesCount,
        },
      },
    });
  } catch (error) {
    console.error('[GoodService] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
