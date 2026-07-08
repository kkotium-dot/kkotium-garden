// src/app/api/products/linked/drift-scan/route.ts
// ============================================================================
// PRODUCT-LINK PL-5a — drift-scan (PL5A_DRIFT_DETECTION_SPEC_2026-07-08).
//
// On-demand: for every LINKED product (naverProductId present), diff the live
// Naver listing against the app's expected values (diffNaverProduct, read-only
// GET) and PERSIST the result (sync_state + drift_fields + last_synced_at) so the
// linked board renders the real state without re-querying Naver every load.
//
// Drift accounting (spec §1, #197):
//   - counted as drift: app-SoR fields — name, salePrice, representativeImageUrl.
//   - statusType: SHARED — recorded as a 'statusType' marker (needs-check), not
//     an app-drift field, and only when a cached Naver status exists to compare.
//   - EXCLUDED: stock/optionStock (Naver SoR — real-sale decrement, never drift).
//     We simply never pass stockQuantity to diffNaverProduct, so it is not compared.
//
// Read-only / non-gated: no Naver write. Reflecting drift (push) stays GO-gated
// in PL-2/PL-3. 60s cooldown protects the Naver rate limit; ?force=1 overrides.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { diffNaverProduct } from '@/lib/naver/api-client';
import { writeLinkFields } from '@/lib/product-link';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COOLDOWN_MS = 60_000;

interface ScanSummary {
  scanned: number;
  drift: number;
  synced: number;
  failed: number;
  statusMismatch: number;
  ranAt: string;
}

// Module-scoped memo — survives across requests within a warm instance so the
// 60s cooldown holds and a repeat load returns the last summary instantly.
let lastRunAt = 0;
let lastSummary: ScanSummary | null = null;

// App-SoR fields that count as drift (stock/optionStock excluded by design, #197).
const APP_SOR_FIELDS = new Set(['name', 'salePrice', 'representativeImageUrl']);

export async function GET(request: NextRequest) {
  const force = request.nextUrl.searchParams.get('force') === '1';
  const now = Date.now();
  const sinceLast = now - lastRunAt;

  if (!force && lastSummary && sinceLast < COOLDOWN_MS) {
    return NextResponse.json(
      { success: true, cooled: true, cooldownSecondsRemaining: Math.ceil((COOLDOWN_MS - sinceLast) / 1000), summary: lastSummary },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const products = await prisma.product.findMany({
    where: { naverProductId: { not: null } },
    select: {
      id: true, name: true, salePrice: true, mainImage: true,
      naverProductId: true, naver_status_type: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 500,
  });

  const summary: ScanSummary = {
    scanned: 0, drift: 0, synced: 0, failed: 0, statusMismatch: 0,
    ranAt: new Date().toISOString(),
  };
  const results: Array<{ id: string; syncState: string; driftFields: string[]; error?: string }> = [];

  // Sequential (Queue) with per-product error isolation — one product's Naver
  // failure never aborts the whole scan (#82). Each GET goes through the safe
  // Connection:close + retry path in api-client.
  for (const p of products) {
    if (!p.naverProductId) continue;
    summary.scanned++;
    try {
      const appExpected: Parameters<typeof diffNaverProduct>[1] = {
        name: p.name,
        salePrice: p.salePrice,
        representativeImageUrl: p.mainImage ?? undefined,
      };
      // Only compare statusType when a cached Naver status exists (SHARED SoR).
      if (p.naver_status_type) appExpected.statusType = p.naver_status_type;

      const diff = await diffNaverProduct(p.naverProductId, appExpected);
      // drift_fields carries every out-of-sync field name (incl. a 'statusType'
      // marker); app-SoR drift is the subset that drives the needs-sync badge.
      const driftFields = diff.diffs.map((d) => d.field);
      const appDrift = driftFields.filter((f) => APP_SOR_FIELDS.has(f));
      const statusMismatch = driftFields.includes('statusType');
      const syncState = appDrift.length > 0 ? 'DRIFT' : 'SYNCED';

      if (syncState === 'DRIFT') summary.drift++; else summary.synced++;
      if (statusMismatch) summary.statusMismatch++;

      await writeLinkFields(p.id, {
        syncState,
        driftFields,
        lastSyncedAt: summary.ranAt,
      });
      results.push({ id: p.id, syncState, driftFields });
    } catch (e) {
      summary.failed++;
      results.push({ id: p.id, syncState: 'FAILED', driftFields: [], error: e instanceof Error ? e.message : String(e) });
    }
  }

  lastRunAt = Date.now();
  lastSummary = summary;

  return NextResponse.json(
    { success: true, cooled: false, summary, results },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
