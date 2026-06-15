// /api/cron/asset-integrity-sweep
// ============================================================================
// STANDING asset-integrity detection (#80 follow-up). Storage<->DB drift used to
// be invisible until a human opened the studio; this sweep runs the live check
// across every in-scope product and seeds/clears the control-tower
// `asset_integrity` card so drift surfaces as an Operator Action Queue item.
//
// Authenticated via CRON_SECRET (Vercel Cron sends the Authorization header).
// Read-mostly: it never moves storage or touches Naver — only the 1-click fix
// (per-product route, confirm-gated) mutates assets. Best-effort per product.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkProductIntegrity } from '@/lib/storage/asset-integrity';
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
export const maxDuration = 300;

const PRODUCT_LIMIT = 200;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    where: { OR: [{ status: 'DRAFT' }, { naverProductId: { not: null } }] },
    select: { id: true },
    orderBy: { updatedAt: 'desc' },
    take: PRODUCT_LIMIT,
  });

  let checked = 0;
  let seeded = 0;
  let cleared = 0;
  const drift: Array<{ productId: string; depth2: number; dead: number }> = [];

  for (const p of products) {
    try {
      const report = await checkProductIntegrity(p.id);
      checked += 1;
      if (report.ok) {
        cleared += await clearJobIntervention(p.id, INTERVENTION_ASSET_INTEGRITY);
        continue;
      }
      drift.push({ productId: p.id, depth2: report.depth2Count, dead: report.deadRefs.length });
      const r = await setJobIntervention({
        productId: p.id,
        jobType: BG_CLEAN,
        type: INTERVENTION_ASSET_INTEGRITY,
        payload: buildAssetIntegrityPayload({
          productId: p.id,
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
      if (r) seeded += 1;
    } catch {
      // best-effort per product — one bad product never aborts the sweep
    }
  }

  return NextResponse.json({
    success: true,
    checked,
    seeded,
    cleared,
    driftProducts: drift.length,
    drift,
  });
}
