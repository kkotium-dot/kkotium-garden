// src/app/api/cron/order-sync/route.ts
// ============================================================================
// ORDER-SYNC cron (#193) — dedicated, more-frequent order sync so status
// transitions (구매확정/취소/반품) stay fresh between the once-daily cron/daily run.
// Orders benefit from a shorter period than daily; this runs every 6h.
//
// Delegates to /api/naver/orders (the 3-endpoint last-changed flow, #192) with a
// 48h lookback — wide enough to bridge any gap between 6-hourly runs so no
// transition is missed. CRON_SECRET guarded (Vercel cron passes the Bearer header);
// the sync route enforces the same secret when `manual` is absent.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev: no secret = open
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const baseUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const cronSecret = process.env.CRON_SECRET ?? '';
    const res = await fetch(`${baseUrl}/api/naver/orders?hours=48`, {
      headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
    });
    const data = await res.json();
    return NextResponse.json({
      ok:      data.success ?? false,
      synced:  data.synced  ?? 0,
      skipped: data.skipped ?? 0,
      total:   data.total   ?? 0,
      changed: data.changed ?? 0,
      period:  data.period  ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[cron/order-sync] error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
