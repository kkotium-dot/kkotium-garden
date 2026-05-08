// src/app/api/cron/inventory-sync/route.ts
// ============================================================================
// Sprint 6-A: Inventory polling cron route
// ============================================================================
//
// Runs every 6 hours via Vercel Cron (configured in vercel.json).
// Authenticated via CRON_SECRET (Vercel Cron sends Authorization header).
//
// Manual trigger for testing:
//   curl -H "Authorization: Bearer ${CRON_SECRET}" \
//     https://kkotium-garden.vercel.app/api/cron/inventory-sync
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { pollAppRegisteredInventory } from '@/lib/dome-inventory-poller';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for full polling cycle

export async function GET(request: NextRequest) {
  // Authenticate Vercel Cron
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    const result = await pollAppRegisteredInventory();
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
