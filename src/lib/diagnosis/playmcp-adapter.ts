// Sprint 7-M2 Step 2 — runtime adapter over category_metadata_cache.
//
// PlayMCP (NaverDataLab / search_shop) is reachable from the Claude Web session
// only — NOT from Vercel runtime. Strategy: cache values into Postgres ahead of
// time and have the runtime do a simple SELECT here. The cache is refreshed by
// either (a) a manual seed via the Web session or (b) a weekly Vercel Cron job
// hitting a backend endpoint that proxies a stored fixture file. Either way,
// runtime never opens a socket to a PlayMCP server.
//
// Returns neutral defaults when the key is missing so the score engine can run
// against any product without 404-ing on uncached categories.

import { prisma } from '@/lib/prisma';

export interface CategoryMetadata {
  monthlySearchVolume: number;
  competitionLevel: number; // 0..1 where 1.0 = most saturated
  avgPrice: number;
  source: 'cache' | 'fallback';
}

const NEUTRAL_FALLBACK: CategoryMetadata = {
  monthlySearchVolume: 0,
  competitionLevel: 0.5,
  avgPrice: 0,
  source: 'fallback',
};

const STALE_AFTER_DAYS = 30;

function isStale(updatedAt: Date): boolean {
  const ageMs = Date.now() - updatedAt.getTime();
  return ageMs > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

export async function getCategoryMetadata(naverCode: string | null | undefined): Promise<CategoryMetadata> {
  if (!naverCode) return NEUTRAL_FALLBACK;

  const row = await prisma.categoryMetadataCache.findUnique({
    where: { naverCode },
  });

  if (!row) return NEUTRAL_FALLBACK;

  // Stale rows still beat the neutral fallback because at least the magnitudes
  // are realistic. Caller can inspect `source` if it wants to flag staleness.
  if (isStale(row.updatedAt)) {
    return {
      monthlySearchVolume: row.monthlySearchVolume,
      competitionLevel: row.competitionLevel,
      avgPrice: row.avgPrice,
      source: 'cache',
    };
  }

  return {
    monthlySearchVolume: row.monthlySearchVolume,
    competitionLevel: row.competitionLevel,
    avgPrice: row.avgPrice,
    source: 'cache',
  };
}
