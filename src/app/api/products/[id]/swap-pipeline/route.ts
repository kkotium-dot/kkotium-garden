// /api/products/[id]/swap-pipeline
// ============================================================================
// Product-swap (B-plan) pipeline for one product. Phase 2 task 3.
//   GET  — read the 6 swap stages (cutout -> bg -> composite -> harmonize ->
//          finalize -> normalize) with status + references.
//   POST — transition one stage { jobId, toStatus, actor?, event?, note? }.
//          DB-only via the state machine — never touches Naver (irreversible 0).
//
// Migration-safe: asset_jobs absent (Phase 1/2 migration pending) -> P2021 ->
// { migrationPending: true } instead of a 500 (keeps the page usable).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { transitionJob, JobTransitionError, type JobStatus } from '@/lib/jobs/asset-job-state';

export const dynamic = 'force-dynamic';

// The 6 B-plan stages, in pipeline order.
const STAGE_ORDER = [
  'product_cutout',
  'mood_bg_generate',
  'product_composite',
  'harmonize',
  'express_finalize',
  'naver_normalize',
] as const;

function isMissingTable(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  const msg = e instanceof Error ? e.message : String(e);
  return code === 'P2021' || /does not exist|relation .* does not exist/i.test(msg);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;

  let product: { id: string; name: string } | null = null;
  try {
    product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, name: true } });
  } catch {
    product = null;
  }
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  try {
    const jobs = await prisma.assetJob.findMany({
      where: { productId, jobType: { in: STAGE_ORDER as unknown as string[] } },
      include: { references: true },
    });

    const byType = new Map(jobs.map(j => [j.jobType, j]));
    const stages = STAGE_ORDER.map((key) => {
      const j = byType.get(key);
      if (!j) return { key, jobId: null, status: 'none', tool: null, ipSafe: null, references: [], outputRefs: null, updatedAt: null };
      return {
        key,
        jobId: j.id,
        status: j.status,
        tool: j.tool,
        ipSafe: j.ipSafe,
        awaitingHuman: j.status === 'awaiting_human',
        references: j.references.map(r => ({ kind: r.assetKind, urn: r.assetUrn })),
        outputRefs: j.outputRefs ?? null,
        version: j.version,
        updatedAt: j.updatedAt,
      };
    });

    const conceptComboId = jobs.find(j => j.conceptComboId)?.conceptComboId ?? null;

    return NextResponse.json({
      success: true,
      migrationPending: false,
      productId,
      productName: product.name,
      conceptComboId,
      stages,
    });
  } catch (e: unknown) {
    if (isMissingTable(e)) {
      return NextResponse.json({
        success: true,
        migrationPending: true,
        productId,
        productName: product.name,
        conceptComboId: null,
        stages: STAGE_ORDER.map(key => ({ key, jobId: null, status: 'none', references: [] })),
        note: 'asset_jobs not migrated yet — populated after Supabase migration.',
      });
    }
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let body: { jobId?: string; toStatus?: string; actor?: string; event?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'invalid JSON body' }, { status: 400 });
  }
  const { jobId, toStatus, actor, event, note } = body;
  if (!jobId || !toStatus) {
    return NextResponse.json({ success: false, error: 'jobId and toStatus are required' }, { status: 400 });
  }

  // Guard: the job must belong to this product (no cross-product transitions).
  try {
    const owner = await prisma.assetJob.findUnique({ where: { id: jobId }, select: { productId: true } });
    if (!owner) {
      return NextResponse.json({ success: false, error: 'job not found' }, { status: 404 });
    }
    if (owner.productId !== params.id) {
      return NextResponse.json({ success: false, error: 'job does not belong to this product' }, { status: 409 });
    }
  } catch (e: unknown) {
    if (isMissingTable(e)) {
      return NextResponse.json({ success: false, migrationPending: true, error: 'asset_jobs not migrated yet' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  try {
    const updated = await transitionJob(jobId, toStatus as JobStatus, {
      actor: (actor as 'system' | 'ai_agent' | 'human') ?? 'human',
      event: event ?? 'swap_ui',
      note: note ?? undefined,
    });
    return NextResponse.json({ success: true, job: { id: updated.id, status: updated.status, version: updated.version } });
  } catch (e: unknown) {
    if (e instanceof JobTransitionError) {
      return NextResponse.json(
        { success: false, error: e.message, code: e.code, from: e.from, to: e.to },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
