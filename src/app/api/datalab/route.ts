// src/app/api/datalab/route.ts
// D-4: Naver DataLab Shopping Insight direct API
// GET /api/datalab?categories=cat1,cat2&period=7|30|90
// Returns category trend data for chart rendering

import { NextRequest, NextResponse } from 'next/server';
import { getShoppingCategoryTrend, getShoppingKeywordTrend } from '@/lib/naver/shopping-search';

export const dynamic = 'force-dynamic';

// Default Naver DataLab category codes
const DEFAULT_CATEGORIES = [
  { name: '\uD328\uC158\uC758\uB958',       param: ['50000000'] },
  { name: '\uD328\uC158\uC7A1\uD654',       param: ['50000001'] },
  { name: '\uD654\uC7A5\uD488/\uBBF8\uC6A9', param: ['50000002'] },
  { name: '\uB514\uC9C0\uD138/\uAC00\uC804', param: ['50000003'] },
  { name: '\uAC00\uAD6C/\uC778\uD14C\uB9AC\uC5B4', param: ['50000004'] },
  { name: '\uCD9C\uC0B0/\uC721\uC544',      param: ['50000005'] },
  { name: '\uC2DD\uD488',                     param: ['50000006'] },
  { name: '\uC2A4\uD3EC\uCE20/\uB808\uC800', param: ['50000007'] },
  { name: '\uC0DD\uD65C/\uAC74\uAC15',      param: ['50000008'] },
  { name: '\uC5EC\uAC00/\uC0DD\uD65C\uD3B8\uC758', param: ['50000009'] },
];

// In-memory cache (5 min TTL)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const period = Number(request.nextUrl.searchParams.get('period') ?? '30');
    const keyword = request.nextUrl.searchParams.get('keyword');
    const categoryParam = request.nextUrl.searchParams.get('category');

    // Date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - period * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const timeUnit = period <= 7 ? 'date' as const : period <= 60 ? 'week' as const : 'month' as const;

    const cacheKey = `datalab:${period}:${keyword ?? ''}:${categoryParam ?? 'all'}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json({ success: true, cached: true, ...(cached.data as Record<string, unknown>) });
    }

    let result: unknown;

    if (keyword && categoryParam) {
      // Keyword trend within a specific category
      const trends = await getShoppingKeywordTrend(
        categoryParam,
        [{ name: keyword, param: [keyword] }],
        { startDate: fmt(startDate), endDate: fmt(endDate), timeUnit },
      );
      result = {
        type: 'keyword',
        keyword,
        category: categoryParam,
        period,
        timeUnit,
        trends,
      };
    } else {
      // Category trends — DataLab allows max 3 categories per request
      // Split into batches of 3 and merge results
      const categories = DEFAULT_CATEGORIES;
      const allTrends: Array<{ title: string; data: Array<{ period: string; ratio: number }> }> = [];

      for (let i = 0; i < categories.length; i += 3) {
        const batch = categories.slice(i, i + 3);
        try {
          const batchResult = await getShoppingCategoryTrend(
            batch,
            { startDate: fmt(startDate), endDate: fmt(endDate), timeUnit },
          );
          allTrends.push(...batchResult);
        } catch {
          // Skip failed batch, continue with others
        }
        // Rate limit between batches
        if (i + 3 < categories.length) {
          await new Promise(r => setTimeout(r, 200));
        }
      }

      // Sort by latest ratio desc to find trending categories
      const ranked = allTrends.map(t => {
        const data = t.data ?? [];
        const latest = data[data.length - 1]?.ratio ?? 0;
        const prev = data.length >= 2 ? data[data.length - 2]?.ratio ?? 0 : latest;
        const change = prev > 0 ? ((latest - prev) / prev) * 100 : 0;
        return {
          title: t.title,
          latestRatio: Math.round(latest * 10) / 10,
          change: Math.round(change * 10) / 10,
          data: data.map(d => ({ period: d.period, ratio: Math.round(d.ratio * 10) / 10 })),
        };
      }).sort((a, b) => b.latestRatio - a.latestRatio);

      result = {
        type: 'categories',
        period,
        timeUnit,
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        trends: ranked,
        topRising: ranked.filter(r => r.change > 0).slice(0, 3).map(r => r.title),
        topDecline: ranked.filter(r => r.change < 0).slice(0, 3).map(r => r.title),
      };
    }

    cache.set(cacheKey, { data: result, ts: Date.now() });

    return NextResponse.json({ success: true, ...result as Record<string, unknown> });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';

    if (msg.includes('NOT_CONFIGURED') || msg.includes('not configured')) {
      return NextResponse.json({
        success: false,
        error: 'Naver DataLab API not configured',
        help: 'Add NAVER_DATALAB_CLIENT_ID and NAVER_DATALAB_CLIENT_SECRET to .env.local',
      }, { status: 503 });
    }

    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
