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
  buildRegistryDriftPayload,
  INTERVENTION_ASSET_INTEGRITY,
  INTERVENTION_REGISTRY_DRIFT,
} from '@/lib/jobs/intervention';
import { BG_CLEAN } from '@/lib/jobs/job-type-routing';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Seed/clear two independent cards from one report (best-effort, idempotent):
//   - asset_integrity: depth2 / dead refs (gated on `ok`) — 1-click auto-fix.
//   - registry_drift:  REGISTRY<->STORAGE orphans (gated on registryDrift.
//     reconciled) — operator register-vs-archive decision (#62 P2). Advisory:
//     does NOT block publish; just surfaces in the queue (#56).
// Returns whether any card is now present.
async function syncCard(report: AssetIntegrityReport): Promise<boolean> {
  const now = new Date().toISOString();

  // asset_integrity (existing) — depth2 / dead refs.
  if (report.ok) {
    await clearJobIntervention(report.productId, INTERVENTION_ASSET_INTEGRITY);
  } else {
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
        checkedAt: now,
      }),
      tool: 'sharp',
      matchInterventionType: true,
    });
  }

  // registry_drift (#62 P2) — storage/registry orphans.
  const drift = report.registryDrift;
  if (drift.reconciled) {
    await clearJobIntervention(report.productId, INTERVENTION_REGISTRY_DRIFT);
  } else {
    await setJobIntervention({
      productId: report.productId,
      jobType: BG_CLEAN,
      type: INTERVENTION_REGISTRY_DRIFT,
      payload: buildRegistryDriftPayload({
        productId: report.productId,
        storageOnlyCount: drift.storageOnlyCount,
        registryOnlyCount: drift.registryOnlyCount,
        undefinedStages: drift.undefinedStages,
        sampleFiles: [
          ...drift.storageOnly.map((o) => o.path.split('/').pop() ?? o.path),
          ...drift.registryOnly.map((o) => o.path.split('/').pop() ?? o.path),
        ],
        checkedAt: now,
      }),
      tool: 'sharp',
      matchInterventionType: true,
    });
  }

  return !report.ok || !drift.reconciled;
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
