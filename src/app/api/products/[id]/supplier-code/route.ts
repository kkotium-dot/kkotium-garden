// src/app/api/products/[id]/supplier-code/route.ts
// ============================================================================
// STOCK_VISIBILITY_DISCORD_CONTENT_DIAGNOSIS_2026-07-13 §1-B — attach/backfill
// supplier_product_code so the inventory poller can track a linked product's
// upstream Domeggook stock. Two paths, one route:
//   - { code: "12345678" }  -> manual attach (operator-entered, always wins)
//   - {} / no code          -> best-effort auto-match via crawl_logs name match
// DB write only — Naver/Domeggook untouched, no live network calls.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { attemptAutoMapSupplierCode, setSupplierCode } from '@/lib/inventory-mapping';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json().catch(() => ({}));
    const manualCode = typeof body?.code === 'string' ? body.code.trim() : '';

    if (manualCode) {
      await setSupplierCode(params.id, manualCode);
      return NextResponse.json({ success: true, matched: true, code: manualCode, source: 'manual' });
    }

    const result = await attemptAutoMapSupplierCode(params.id);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
