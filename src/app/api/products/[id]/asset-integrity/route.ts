// /api/products/[id]/asset-integrity
// ============================================================================
// Per-product asset-integrity guard (#80 follow-up).
//   GET                      -> run the live check, return the report (no writes).
//   POST { action:'seed' }   -> check + seed/clear the control-tower card (idempotent).
//   POST { action:'fix', confirm:true } -> 1-click remediation (move legacy-root
//       files into canonical stages + remap depth-2 DB refs), then re-check and
//       reseed/clear the card. IRREVERSIBLE → gated on confirm (#46).
//
// Live storage reads (no-store client). No Naver. Node runtime (Sharp for the
// optional ratio pass). Card seeding is best-effort and never fatal.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  checkProductIntegrity,
  fixProductIntegrity,
  reconcileRegistryDrift,
  type AssetIntegrityReport,
  type ReconcileDecisions,
} from '@/lib/storage/asset-integrity';
import {
  setJobIntervention,
  clearJobIntervention,
  buildAssetIntegrityPayload,
  INTERVENTION_ASSET_INTEGRITY,
} from '@/lib/jobs/intervention';
import { BG_CLEAN } from '@/lib/jobs/job-type-routing';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Seed an asset_integrity card when the product has drift, or clear it when the
// product is clean. Returns whether a card is now present. Best-effort.
async function syncCard(report: AssetIntegrityReport): Promise<boolean> {
  if (report.ok) {
    await clearJobIntervention(report.productId, INTERVENTION_ASSET_INTEGRITY);
    return false;
  }
  await setJobIntervention({
    productId: report.productId,
    jobType: BG_CLEAN,
    type: INTERVENTION_ASSET_INTEGRITY,
    payload: buildAssetIntegrityPayload({
      productId: report.productId,
      depth2Count: report.depth2Count,
      deadCount: report.deadRefs.length,
      fixableDepth2: report.fixableDepth2,
      fixableDeadRefs: report.fixableDeadRefs,
      ratioCount: report.ratioFlags.length,
      sampleFiles: [...report.depth2Files, ...report.deadRefs.map((d) => d.key.split('/').pop() ?? d.key)],
      checkedAt: new Date().toISOString(),
    }),
    tool: 'sharp',
    matchInterventionType: true,
  });
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const includeRatio = new URL(request.url).searchParams.get('ratio') === '1';
    const report = await checkProductIntegrity(params.id, { includeRatio });
    return NextResponse.json({ success: true, report });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'check failed' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  let body: { action?: string; confirm?: boolean; ratio?: boolean; decisions?: ReconcileDecisions } = {};
  try {
    body = await request.json();
  } catch {
    // empty body — default action 'seed'
  }
  const action = body.action ?? 'seed';

  try {
    if (action === 'seed') {
      const report = await checkProductIntegrity(params.id, { includeRatio: !!body.ratio });
      const carded = await syncCard(report);
      return NextResponse.json({ success: true, report, carded });
    }
    if (action === 'fix') {
      if (!body.confirm) {
        return NextResponse.json(
          { success: false, error: '비가역 교정은 confirm:true가 필요합니다' },
          { status: 400 },
        );
      }
      const result = await fixProductIntegrity(params.id);
      const carded = await syncCard(result.after);
      return NextResponse.json({ success: true, result, carded });
    }
    if (action === 'reconcile') {
      if (!body.confirm) {
        return NextResponse.json(
          { success: false, error: 'reconcile는 confirm:true가 필요합니다' },
          { status: 400 },
        );
      }
      const result = await reconcileRegistryDrift(params.id, body.decisions ?? {});
      const carded = await syncCard(result.after);
      return NextResponse.json({ success: true, result, carded });
    }
    return NextResponse.json({ success: false, error: `알 수 없는 action: ${action}` }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'action failed' },
      { status: 500 },
    );
  }
}
