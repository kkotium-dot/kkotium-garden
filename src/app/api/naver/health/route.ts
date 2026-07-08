// src/app/api/naver/health/route.ts
// ============================================================================
// PROXY-HEALTH (#204, PROXY_HEALTH_SPEC_2026-07-07)
// GET /api/naver/health — one lightweight Naver call to verify the proxy +
// token + IP are alive. The Naver proxy (home Mac / Tailscale Funnel) is the
// single point of failure for every Naver integration; when it dies silently
// (ECONNRESET), sync stops but the app shows nothing. This endpoint lets the
// dashboard surface a visible alert instead (detect -> surface -> guide).
//
// Response: { healthy, errorClass?, message?, checkedAt }
//   errorClass ∈ PROXY_DOWN | IP_NOT_ALLOWED | AUTH_SIGN_INVALID | RATE_LIMIT |
//                NAVER_ERROR   (from the NaverFailKind classifier, #181)
//
// Cache: the verdict is memoized for 60s (rate-limit / load protection). Pass
// ?fresh=1 to force a re-check (bypasses the cache and refreshes it).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkNaverHealth, type NaverHealthResult } from '@/lib/naver/api-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_MS = 60_000;

// Module-scoped memo — survives across requests within a warm serverless
// instance. A cold start simply re-checks, which is the safe default.
let cached: { result: NaverHealthResult; expiresAt: number } | null = null;

export async function GET(request: NextRequest) {
  const fresh = request.nextUrl.searchParams.get('fresh') === '1';
  const now = Date.now();

  if (!fresh && cached && now < cached.expiresAt) {
    return NextResponse.json(
      { ...cached.result, cached: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const result = await checkNaverHealth();
  cached = { result, expiresAt: now + CACHE_TTL_MS };

  return NextResponse.json(
    { ...result, cached: false },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
