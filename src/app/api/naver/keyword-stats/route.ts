// src/app/api/naver/keyword-stats/route.ts
// GET /api/naver/keyword-stats?keywords=키워드1,키워드2,...
// Returns monthly search volumes + competition for up to 5 keywords

import { NextRequest, NextResponse } from 'next/server';
import { fetchKeywordStats } from '@/lib/naver/keyword-api';

// Simple in-memory cache — keyword stats change monthly so 12h TTL is fine

export const dynamic = 'force-dynamic';
const CACHE = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

function getCached(key: string) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { CACHE.delete(key); return null; }
  return entry.data;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('keywords') ?? '';

  if (!raw.trim()) {
    return NextResponse.json({ success: false, error: 'keywords parameter required' }, { status: 400 });
  }

  const keywords = raw.split(',').map(k => k.trim()).filter(Boolean).slice(0, 5);
  const cacheKey = keywords.sort().join(',');

  // Cache hit
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ success: true, keywords: cached, cached: true });
  }

  try {
    const stats = await fetchKeywordStats(keywords);

    // Evict if cache grows too large
    if (CACHE.size >= 500) {
      const oldest = [...CACHE.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      if (oldest) CACHE.delete(oldest[0]);
    }
    CACHE.set(cacheKey, { data: stats, ts: Date.now() });

    return NextResponse.json({ success: true, keywords: stats, cached: false });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[keyword-stats]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
