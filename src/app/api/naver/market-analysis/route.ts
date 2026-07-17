// src/app/api/naver/market-analysis/route.ts
// C-12: Real-time market analysis API
// GET /api/naver/market-analysis?q=keyword — competition analysis + Groq AI insight
// Uses: Naver Shopping Search API (free) + Groq AI (free 14,400/day)
// Replaces PlayMCP functionality with direct API calls

import { NextRequest, NextResponse } from 'next/server';
import {
  searchShopping,
  analyzeCompetition,
  generateMarketInsight,
} from '@/lib/naver/shopping-search';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// R-1 — 시장 분석 경쟁사 집계에서 자사를 빼려면 자사 몰명이 필요하다.
// 운영자가 설정 안 했으면 브랜드 기본값("꽃틔움")으로 대체 — 네이버 몰명이
// "꽃틔움 KKOTIUM"처럼 접미어가 붙어도 부분일치로 잡힌다.
const DEFAULT_OWN_MALL = '꽃틔움';
async function getOwnMallKey(): Promise<string> {
  try {
    const row = await prisma.storeSettings.findUnique({ where: { id: 'default' }, select: { storeName: true } });
    return (row?.storeName ?? '').trim() || DEFAULT_OWN_MALL;
  } catch {
    return DEFAULT_OWN_MALL;
  }
}

// Simple in-memory cache (1 hour TTL)
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q');
    if (!q) {
      return NextResponse.json({ success: false, error: 'q parameter required' }, { status: 400 });
    }

    // Check cache
    const cacheKey = `market:${q}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json({ success: true, cached: true, ...cached.data });
    }

    // 1. Competition analysis (Naver Shopping Search) — 자사 제외(R-1)
    const ownMallKey = await getOwnMallKey();
    const competition = await analyzeCompetition(q, ownMallKey);

    // 2. AI market insight (Groq — free)
    const insight = await generateMarketInsight(q, competition);

    const result = {
      competition,
      insight,
      timestamp: new Date().toISOString(),
    };

    // Cache result
    cache.set(cacheKey, { data: result, ts: Date.now() });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';

    // If API key not configured, return helpful message
    if (msg.includes('not configured')) {
      return NextResponse.json({
        success: false,
        error: 'Naver Open API key not configured',
        help: 'Add NAVER_OPENAPI_CLIENT_ID and NAVER_OPENAPI_CLIENT_SECRET to .env.local (from developers.naver.com)',
      }, { status: 503 });
    }

    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
