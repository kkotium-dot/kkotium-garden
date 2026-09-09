// src/app/api/platforms/[id]/test-auth/route.ts
// ============================================================================
// OWNERCLAN_INTEGRATION_2026-09-09 — verify saved credentials actually work
// by attempting a real auth call. Called right after the operator saves
// credentials so they get immediate pass/fail feedback instead of finding out
// days later when a cron poll silently fails.
// NOTE: :id here is the platform CODE (e.g. "OWC"), not a cuid — see
// credentials/route.ts for why this reuses the [id] folder name.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/sources';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const platformCode = params.id;
  const adapter = getAdapter(platformCode);
  if (!adapter) {
    return NextResponse.json({ success: false, error: `등록되지 않은 플랫폼 코드입니다: ${platformCode}` }, { status: 404 });
  }
  try {
    // A minimal read call exercises the full auth path (token issue + one
    // GraphQL request) without side effects. getMinQuantity on a bogus key
    // still forces auth to run; a NotFound/BadResponse for the bogus key is
    // expected and fine — AuthFailed is the only failure mode we care about.
    await adapter.getMinQuantity('AUTH_TEST_PROBE_KEY');
    return NextResponse.json({ success: true, authOk: true });
  } catch (e) {
    const isSourceError = e && typeof e === 'object' && 'kind' in e;
    const kind = isSourceError ? (e as { kind: string }).kind : 'Unknown';
    if (kind === 'AuthFailed') {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ success: true, authOk: false, error: msg });
    }
    // Any other error kind (NotFound, BadResponse for the probe key, etc.)
    // means auth itself succeeded — the probe key just doesn't exist.
    return NextResponse.json({ success: true, authOk: true, note: '인증은 성공했으나 확인용 상품코드는 존재하지 않습니다(정상).' });
  }
}

