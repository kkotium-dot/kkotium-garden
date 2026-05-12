// /api/golden-window/active
// ============================================================================
// Sprint 7 P0-B (Session E-2 Sprint 7): active products inside / past the
// 14-day registration golden window. Powers the GoldenWindowWidget (Inbox).
//
// Returns rows sorted by urgency: needs_action first, then ok.
// ============================================================================

import { NextResponse } from 'next/server';
import { evaluateGoldenWindow } from '@/lib/golden-window-tracker';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await evaluateGoldenWindow();
  return NextResponse.json({ data: rows });
}
