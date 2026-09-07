// src/app/api/products/[id]/supplier-code/route.ts
// ============================================================================
// STOCK_VISIBILITY_DISCORD_CONTENT_DIAGNOSIS_2026-07-13 §1-B — attach/backfill
// supplier_product_code so the inventory poller can track a linked product's
// upstream Domeggook stock. Two paths, one route:
//   - { code: "12345678" }  -> manual attach (operator-entered, always wins)
//   - {} / no code          -> best-effort auto-match via crawl_logs name match
// DB write only for the code itself — Naver untouched.
//
// DISPOSITION_SNAPSHOT_ABSENCE_2026-09-06 §24h지연 (#62/#363) — a freshly
// connected code used to sit idle until the next midnight cron (up to 24h).
// We now fire one best-effort immediate poll (real Domeggook getInventory
// call) right after a code is newly attached, so the operator sees a real
// snapshot/qty instead of a 24h-stale badge. Poll failure never blocks the
// connection itself — the code write already succeeded by that point.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { attemptAutoMapSupplierCode, setSupplierCode } from '@/lib/inventory-mapping';
import { pollSingleProduct } from '@/lib/dome-inventory-poller';

export const dynamic = 'force-dynamic';

async function pollBestEffort(productNo: string): Promise<{ qty: number; status: string } | null> {
  try {
    return await pollSingleProduct(productNo);
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json().catch(() => ({}));
    const manualCode = typeof body?.code === 'string' ? body.code.trim() : '';

    if (manualCode) {
      await setSupplierCode(params.id, manualCode);
      const snapshot = await pollBestEffort(manualCode);
      return NextResponse.json({ success: true, matched: true, code: manualCode, source: 'manual', snapshot });
    }

    const result = await attemptAutoMapSupplierCode(params.id);
    const snapshot = result.matched && result.code && result.source !== 'already_set'
      ? await pollBestEffort(result.code)
      : null;
    return NextResponse.json({ success: true, ...result, snapshot });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
