// /api/products/[id]/jobs
// ============================================================================
// Workbench job lifecycle (asset_jobs) — list + operator controls.
//   GET  — list this product's asset_jobs (status + lifecycle metadata).
//   POST — operator control: { jobId, action: 'cancel' | 'retry' | 'reopen' }.
//          cancel → cancelled (abort/중단) · retry → ready (failed/rejected/
//          blocked, budget-gated) · reopen → ready (step-back a finished step).
//
// Pure DB state machine (transitionJob) — NEVER touches Naver (비가역 0). The
// asset_jobs table may not be migrated yet (P2021/P2022) → GET degrades to an
// empty list instead of erroring.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { transitionJob, JobTransitionError, type JobStatus } from '@/lib/jobs/asset-job-state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ControlAction = 'cancel' | 'retry' | 'reopen';
const ACTION_TARGET: Record<ControlAction, JobStatus> = {
  cancel: 'cancelled',
  retry: 'ready',
  reopen: 'ready',
};

function isMissingTable(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  const msg = e instanceof Error ? e.message : String(e);
  return code === 'P2021' || code === 'P2022' || /does not exist|relation .* does not exist/i.test(msg);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;
  try {
    const jobs = await prisma.assetJob.findMany({
      where: { productId },
      select: {
        id: true, jobType: true, lane: true, tool: true, status: true,
        blockedReason: true, retryCount: true, maxRetries: true, updatedAt: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json({ success: true, jobs });
  } catch (e) {
    if (isMissingTable(e)) return NextResponse.json({ success: true, jobs: [], migrationPending: true });
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;

  let body: { jobId?: string; action?: string } = {};
  try { body = await req.json(); } catch { /* validated below */ }

  const jobId = body.jobId;
  const action = body.action as ControlAction | undefined;
  if (!jobId || !action || !(action in ACTION_TARGET)) {
    return NextResponse.json(
      { success: false, error: 'jobId and action (cancel | retry | reopen) are required' },
      { status: 400 },
    );
  }

  // Ownership guard — the job must belong to this product.
  const job = await prisma.assetJob.findUnique({ where: { id: jobId }, select: { id: true, productId: true } });
  if (!job || job.productId !== productId) {
    return NextResponse.json({ success: false, error: 'Job not found for this product' }, { status: 404 });
  }

  try {
    const updated = await transitionJob(jobId, ACTION_TARGET[action], {
      actor: 'human',
      event: `operator_${action}`,
    });
    return NextResponse.json({ success: true, jobId, action, status: updated.status });
  } catch (e) {
    if (e instanceof JobTransitionError) {
      // Not-allowed / retry-exhausted / version-conflict — a 409 the UI can show.
      return NextResponse.json(
        { success: false, error: e.message, code: e.code, from: e.from, to: e.to },
        { status: 409 },
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
