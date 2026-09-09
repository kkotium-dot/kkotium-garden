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
import { attemptAutoMapSupplierCode, setSupplierCode, SupplierCodeParseError } from '@/lib/inventory-mapping';
import { pollSingleProduct } from '@/lib/dome-inventory-poller';
import { SourceAdapterError } from '@/lib/sources';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function hasExistingSnapshot(productId: string): Promise<boolean> {
  const count = await prisma.inventorySnapshot.count({ where: { productId } });
  return count > 0;
}

interface PollOutcome {
  snapshot: { qty: number; status: string } | null;
  /** Honest reason the snapshot is null, when the code write itself succeeded. */
  pollNote: string | null;
}

// MULTI_PLATFORM_SUPPLIER_CODE_2026-09-09 — poll failure must not look
// identical to poll success-with-no-data. A stub adapter (e.g. OwnerClan pre
// API-key) throws NotImplemented; we surface that as an honest note instead
// of silently returning snapshot:null like every other failure mode (#231).
async function pollBestEffort(productNo: string): Promise<PollOutcome> {
  try {
    const snapshot = await pollSingleProduct(productNo);
    return { snapshot, pollNote: null };
  } catch (e) {
    if (e instanceof SourceAdapterError && e.kind === 'NotImplemented') {
      return { snapshot: null, pollNote: 'PLATFORM_NOT_WIRED' };
    }
    return { snapshot: null, pollNote: null };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json().catch(() => ({}));
    const manualInput = typeof body?.code === 'string' ? body.code.trim() : '';

    if (manualInput) {
      let attach;
      try {
        attach = await setSupplierCode(params.id, manualInput);
      } catch (e) {
        if (e instanceof SupplierCodeParseError) {
          return NextResponse.json({ success: false, error: e.message }, { status: 422 });
        }
        throw e;
      }
      const { snapshot, pollNote } = await pollBestEffort(attach.code);
      return NextResponse.json({
        success: true,
        matched: true,
        code: attach.code,
        platformCode: attach.platformCode,
        source: 'manual',
        snapshot,
        pollNote,
      });
    }

    const result = await attemptAutoMapSupplierCode(params.id);
    // MULTI_PLATFORM_SUPPLIER_CODE_2026-09-09 — 'already_set' used to always
    // skip the poll (designed to avoid redundant API calls on repeat clicks).
    // But a code can be "already set" and still have zero snapshots — e.g.
    // this session's URL-as-code bug, corrected directly in the DB without
    // going through this route. Only skip the poll when a real snapshot
    // already exists; otherwise still fire the best-effort poll so the
    // operator sees a genuine "재고추적 시작됨" instead of a stale "곧 확인".
    let snapshot: { qty: number; status: string } | null = null;
    let pollNote: string | null = null;
    if (result.matched && result.code) {
      const alreadyHasSnapshot = result.source === 'already_set'
        ? await hasExistingSnapshot(params.id)
        : false;
      if (!alreadyHasSnapshot) {
        ({ snapshot, pollNote } = await pollBestEffort(result.code));
      }
    }
    return NextResponse.json({ success: true, ...result, snapshot, pollNote });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
