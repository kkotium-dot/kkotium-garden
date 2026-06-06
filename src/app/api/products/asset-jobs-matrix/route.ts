// GET /api/products/asset-jobs-matrix
// ============================================================================
// READ-ONLY product x track matrix for the control tower (Phase 1).
// Aggregates asset_jobs by product + lane into 4 tracks (image/publish/line/ops),
// pins blocked rows, counts WIP, and surfaces "next action" chips. Never mutates.
//
// Migration-safe: if asset_jobs doesn't exist yet (Supabase migration pending),
// returns { migrationPending: true } instead of erroring, so production stays up
// between the code push and the Desktop apply_migration step.
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type TrackStatus = 'done' | 'in_progress' | 'pending' | 'blocked' | 'none';
type Overall = 'risk' | 'caution' | 'ok' | 'none';

const WIP_LIMIT = 3;

// lane -> track. line/ops are cross-cutting signals not produced by asset_jobs
// in Phase 1, so they read 'none' until later phases wire them.
const LANE_TO_TRACK: Record<string, 'image' | 'publish'> = {
  generate: 'image',
  process:  'image',
  compose:  'image',
  review:   'publish',
  publish:  'publish',
};

interface JobRow { productId: string; lane: string; status: string }

function trackStatus(statuses: string[]): TrackStatus {
  if (statuses.length === 0) return 'none';
  if (statuses.includes('blocked')) return 'blocked';
  if (statuses.some(s => s === 'in_progress' || s === 'awaiting_approval')) return 'in_progress';
  if (statuses.some(s => s === 'pending' || s === 'ready' || s === 'failed')) return 'pending';
  return 'done'; // all done/cancelled
}

function overallOf(tracks: TrackStatus[]): Overall {
  if (tracks.includes('blocked')) return 'risk';
  if (tracks.includes('in_progress') || tracks.includes('pending')) return 'caution';
  if (tracks.includes('done')) return 'ok';
  return 'none';
}

// Sort key so blocked/risk rows pin to the top.
const OVERALL_RANK: Record<Overall, number> = { risk: 0, caution: 1, ok: 2, none: 3 };

export async function GET() {
  let jobs: JobRow[];
  try {
    jobs = await prisma.assetJob.findMany({
      select: { productId: true, lane: true, status: true },
    });
  } catch (e: unknown) {
    // P2021 = table does not exist (migration not applied yet).
    const code = (e as { code?: string })?.code;
    const msg = e instanceof Error ? e.message : String(e);
    if (code === 'P2021' || /does not exist|relation .* does not exist/i.test(msg)) {
      return NextResponse.json({
        success: true,
        migrationPending: true,
        rows: [],
        wip: { count: 0, limit: WIP_LIMIT, over: false },
        counts: { risk: 0, caution: 0, ok: 0, none: 0 },
        note: 'asset_jobs table not created yet — populated after the Supabase migration is applied.',
      });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }

  // Group jobs by product, then by track.
  const byProduct = new Map<string, { image: string[]; publish: string[] }>();
  let wipCount = 0;
  for (const j of jobs) {
    if (j.status === 'in_progress') wipCount++;
    const track = LANE_TO_TRACK[j.lane];
    if (!track) continue;
    let entry = byProduct.get(j.productId);
    if (!entry) { entry = { image: [], publish: [] }; byProduct.set(j.productId, entry); }
    entry[track].push(j.status);
  }

  // Resolve product names (no Prisma relation; fetch separately).
  const productIds = [...byProduct.keys()];
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(products.map(p => [p.id, p.name]));

  const counts = { risk: 0, caution: 0, ok: 0, none: 0 };
  const rows = productIds.map((productId) => {
    const e = byProduct.get(productId)!;
    const image   = trackStatus(e.image);
    const publish = trackStatus(e.publish);
    const line: TrackStatus = 'none';   // wired in a later phase
    const ops: TrackStatus  = 'none';   // wired in a later phase
    const overall = overallOf([image, publish, line, ops]);
    counts[overall]++;

    // Missing-detection: image done but publish not started/in-progress yet.
    const nextAction = (image === 'done' && (publish === 'none' || publish === 'pending'))
      ? 'publish'
      : null;

    return {
      productId,
      name: nameById.get(productId) ?? productId,
      tracks: { image, publish, line, ops },
      overall,
      nextAction,
    };
  });

  // Pin blocked/risk rows to the top, then caution, then ok.
  rows.sort((a, b) => OVERALL_RANK[a.overall] - OVERALL_RANK[b.overall] || a.name.localeCompare(b.name));

  return NextResponse.json({
    success: true,
    migrationPending: false,
    rows,
    wip: { count: wipCount, limit: WIP_LIMIT, over: wipCount > WIP_LIMIT },
    counts,
  });
}
