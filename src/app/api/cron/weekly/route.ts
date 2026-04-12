// src/app/api/cron/weekly/route.ts
// Weekly ops report — runs every Monday at 08:00 KST (23:00 UTC Sunday)
// Sends summary to #📊운영-리포트 Discord channel

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calcHoneyScore } from '@/lib/honey-score';
import { sendDiscord, buildWeeklyReportEmbed } from '@/lib/discord';


export const dynamic = 'force-dynamic';
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Product counts by status
    const statusCounts = await prisma.product.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    const cm: Record<string, number> = {};
    for (const r of statusCounts) cm[r.status] = r._count.id;

    const totalProducts   = Object.values(cm).reduce((s, n) => s + n, 0);
    const activeProducts  = cm['ACTIVE']        ?? 0;
    const oosProducts     = cm['OUT_OF_STOCK']  ?? 0;

    // New products registered this week
    const newRegistered = await prisma.product.count({
      where: { createdAt: { gte: weekAgo } },
    });

    // Order stats this week (B-5 enhancement)
    let weekRevenue = 0;
    let weekOrderCount = 0;
    let weekCancelCount = 0;
    let weekNetProfit = 0;
    try {
      const weekOrders = await (prisma as any).order.findMany({
        where: { createdAt: { gte: weekAgo } },
        select: { totalAmount: true, status: true },
      });
      weekOrderCount  = weekOrders.filter((o: any) => !['CANCELLED','CANCEL_REQUESTED','RETURNED','RETURN_REQUESTED'].includes(o.status)).length;
      weekCancelCount = weekOrders.filter((o: any) => ['CANCELLED','RETURNED'].includes(o.status)).length;
      weekRevenue     = weekOrders
        .filter((o: any) => !['CANCELLED','CANCEL_REQUESTED','RETURNED','RETURN_REQUESTED'].includes(o.status))
        .reduce((s: number, o: any) => s + (Number(o.totalAmount) || 0), 0);
      // Estimated net profit: revenue * (1 - naver fee 5.733% - avg supply ratio 40%)
      weekNetProfit = Math.round(weekRevenue * (1 - 0.05733 - 0.4));
    } catch { /* order table may not exist yet */ }

    // Price change events this week
    const priceChanges = await prisma.productEvent.count({
      where: { type: 'PRICE_CHANGE', createdAt: { gte: weekAgo } },
    });

    // Average honey score across active products
    const activeRaw = await prisma.product.findMany({
      where: { status: 'ACTIVE', salePrice: { gt: 0 }, supplierPrice: { gt: 0 } },
      select: {
        salePrice: true, supplierPrice: true, naverCategoryCode: true,
        name: true, keywords: true, tags: true, mainImage: true,
      },
    });

    let avgHoneyScore = 0;
    let topProduct: { name: string; score: number } | undefined;

    if (activeRaw.length > 0) {
      const scores = activeRaw.map(p => ({
        name:  p.name,
        score: calcHoneyScore({
          salePrice:     p.salePrice,
          supplierPrice: p.supplierPrice,
          categoryId:    p.naverCategoryCode ?? '',
          productName:   p.name,
          keywords:      Array.isArray(p.keywords) ? (p.keywords as string[]) : [],
          tags:          Array.isArray(p.tags)     ? (p.tags     as string[]) : [],
          hasMainImage:  !!p.mainImage,
        }).total,
      }));
      avgHoneyScore = Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length);
      topProduct = scores.sort((a, b) => b.score - a.score)[0];
    }

    // Week label
    const weekLabel = `${weekAgo.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} ~ ${now.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`;

    const embed = buildWeeklyReportEmbed({
      weekLabel,
      totalProducts,
      activeProducts,
      oosProducts,
      newRegistered,
      avgHoneyScore,
      topProduct,
      noAltOosCount: oosProducts,
      priceChanges,
      weekRevenue,
      weekOrderCount,
      weekCancelCount,
      weekNetProfit,
    });

    const result = await sendDiscord('OPS_REPORT', '', [embed]);

    return NextResponse.json({
      ok:        result.ok,
      timestamp: new Date().toISOString(),
      weekLabel,
      stats: { totalProducts, activeProducts, oosProducts, newRegistered, avgHoneyScore, priceChanges, weekRevenue, weekOrderCount, weekCancelCount, weekNetProfit },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[cron/weekly] error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
