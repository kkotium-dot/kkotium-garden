// src/app/api/dashboard/metrics-timeseries/route.ts
// ============================================================================
// KPI-TIMESERIES (#223) — daily revenue/order-count aggregation for the KPI
// sparklines + delta. Aggregates the existing Order table directly (no new
// metrics table, per #223) over a continuous N-day window ending today (KST).
//
// HONESTY (#82/#45): local aggregation is ALWAYS a real value — a day with no
// orders is revenue 0 / orderCount 0 (real, not fabricated). Missing days are
// 0-filled so the series is continuous. This is distinct from the Naver-derived
// KPIs (정산 예정) which degrade to "—" when the Naver API is unavailable; the
// local Order aggregation never degrades.
//
// guarded: any Order query failure → success:false + empty series (never a fake
// timeseries).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // singleton — avoids connection pool exhaustion

export const dynamic = 'force-dynamic';

const DAY_MS = 86_400_000;

// KST (Asia/Seoul, UTC+9, no DST) civil-date key YYYY-MM-DD for a Date — so the
// "today" bucket matches the dashboard's KST "오늘" everywhere else.
function kstDateKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export async function GET(req: NextRequest) {
  const raw = Number(new URL(req.url).searchParams.get('days') ?? '14');
  const days = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 90) : 14;

  try {
    const now = Date.now();
    const since = new Date(now - days * DAY_MS);

    // Direct Order aggregation (#223) — bounded window, no status filter (spec §1).
    const orders = await prisma.order.findMany({
      where: { paymentDate: { gte: since } },
      select: { paymentDate: true, totalAmount: true },
    });

    const byDate = new Map<string, { revenue: number; orderCount: number }>();
    for (const o of orders) {
      if (!o.paymentDate) continue;
      const key = kstDateKey(o.paymentDate);
      const cur = byDate.get(key) ?? { revenue: 0, orderCount: 0 };
      cur.revenue += o.totalAmount ?? 0;
      cur.orderCount += 1;
      byDate.set(key, cur);
    }

    // Continuous N days ending today (KST), 0-filled — empty day = real 0 (#82).
    const series: Array<{ date: string; revenue: number; orderCount: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const key = kstDateKey(new Date(now - i * DAY_MS));
      const agg = byDate.get(key) ?? { revenue: 0, orderCount: 0 };
      series.push({ date: key, revenue: agg.revenue, orderCount: agg.orderCount });
    }

    return NextResponse.json({ success: true, series, filledDays: days });
  } catch (e) {
    // Guarded — no fake timeseries on failure (#82).
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : 'metrics-timeseries query failed',
        series: [],
        filledDays: 0,
      },
      { status: 200 },
    );
  }
}
