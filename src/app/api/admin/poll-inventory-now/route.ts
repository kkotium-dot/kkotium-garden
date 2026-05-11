// /api/admin/poll-inventory-now
// ============================================================================
// Sprint 6-A UI Phase 3: ad-hoc manual polling trigger.
//
// Why this route exists:
//   Vercel Hobby cron is limited to once-per-day. The 6-hour automatic
//   cycle only resumes on the Pro plan. Until then, the seller needs a way
//   to verify that polling actually works after registering the first real
//   product without waiting up to 24 hours.
//
// Security model (1-seller env, no auth middleware available):
//   - Allow localhost (dev smoke testing).
//   - Allow same-origin requests by Origin / Referer header check
//     (matches NEXT_PUBLIC_APP_URL or the request Host).
//   - Allow Authorization: Bearer ${CRON_SECRET} for curl debugging.
//   - Rate limit: refuse if last successful poll started < 3 minutes ago,
//     to prevent abuse + double-counting Discord notifications.
//
// Response: same shape as pollAppRegisteredInventory() result + runAt.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { pollAppRegisteredInventory } from '@/lib/dome-inventory-poller';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MIN_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

// Module-scoped rate limit anchor. Survives across requests in the same
// serverless instance; cold starts get a fresh 0 (acceptable — a cold
// start already implies the prior caller is long gone).
let lastPollStartedAt = 0;

function isAuthorized(req: NextRequest): boolean {
  const headers = req.headers;
  const host = headers.get('host') ?? '';
  const origin = headers.get('origin') ?? '';
  const referer = headers.get('referer') ?? '';
  const auth = headers.get('authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  // 1. Bearer token (curl / debugging)
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;

  // 2. Localhost (dev)
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return true;

  // 3. Same-origin via Origin or Referer
  const candidates = [appUrl, `https://${host}`, `http://${host}`].filter(Boolean);
  if (origin && candidates.some((c) => origin.startsWith(c))) return true;
  if (referer && candidates.some((c) => referer.startsWith(c))) return true;

  return false;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized — must be same-origin or carry CRON_SECRET' },
      { status: 401 },
    );
  }

  const now = Date.now();
  if (now - lastPollStartedAt < MIN_INTERVAL_MS) {
    const waitSec = Math.ceil((MIN_INTERVAL_MS - (now - lastPollStartedAt)) / 1000);
    return NextResponse.json(
      {
        ok: false,
        error: 'rate-limited',
        retryAfterSec: waitSec,
      },
      { status: 429, headers: { 'Retry-After': String(waitSec) } },
    );
  }

  lastPollStartedAt = now;

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
