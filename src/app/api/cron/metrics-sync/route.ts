// src/app/api/cron/metrics-sync/route.ts
// ============================================================================
// Sprint 7-M2 5-B — Daily CVR metrics sync cron route.
// ============================================================================
//
// Runs once per day via Vercel Cron (vercel.json: 0 17 * * * UTC = 02:00 KST).
// Authenticated via CRON_SECRET (Vercel Cron sends Authorization header).
// Mirrors the inventory-sync route auth + envelope pattern.
//
// What it does
//   - Pull 30 days of orders from Naver Commerce.
//   - Update business_metrics JSON on every active art_director_prompt row.
//   - CTR / clicks / impressions stay null (HANDOFF_CTR_CVR_PIPELINE.md §1
//     honesty rule — Naver Commerce does not expose those fields).
//
// Manual trigger:
//   curl -H "Authorization: Bearer ${CRON_SECRET}" \
//     https://kkotium-garden.vercel.app/api/cron/metrics-sync
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { collectMetricsForActivePrompts } from '@/lib/metrics/metrics-collector';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    // logSample is opt-in via query string for the first manual run, then
    // left off so the cron does not spam the logs.
    const url = new URL(request.url);
    const logSample = url.searchParams.get('logSample') === '1';
    const dryRun = url.searchParams.get('dryRun') === '1';

    const result = await collectMetricsForActivePrompts({
      windowDays: 30,
      dryRun,
      logSample,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      runAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: msg, runAt: new Date().toISOString() },
      { status: 500 },
    );
  }
}
