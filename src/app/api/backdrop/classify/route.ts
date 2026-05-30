// src/app/api/backdrop/classify/route.ts
//
// Track B Phase 3 — POST /api/backdrop/classify (2026-05-30).
//
// Completes the async ingest path. Body: { jobId }. Requires the job to be in
// status='classifying' (otherwise 409). Picks up the staged PNG written by
// /api/backdrop/ingest with asyncGate=true and finishes the lifecycle:
//
//   classifying -> download staged PNG -> VLM gate
//                -> PASS: upload(fixed) + delete staged + auto-cache probe
//                         -> 'done' (hit) or 'review' (miss)
//                -> FAIL: delete staged -> 'review'
//
// review transitions fire the shared backdrop-job-state OPS_REPORT alert, so
// fail-closed jobs surface to the operator immediately.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { classifyBackdrop, type VlmGateVerdict } from '@/lib/automation/backdrop-vlm-gate';
import {
  uploadBackdropServer,
  downloadStagedPng,
  deleteStagedPng,
} from '@/lib/storage/upload-backdrop-server';
import { findCachedAsset } from '@/lib/storage/automation-storage';
import { markReview } from '@/lib/automation/backdrop-job-state';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ClassifyBody {
  jobId?: string;
}

export async function POST(req: Request) {
  let body: ClassifyBody = {};
  try {
    body = (await req.json()) as ClassifyBody;
  } catch {
    // empty body fails validation below
  }
  const jobId = body.jobId?.trim();
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }

  const job = await prisma.backdropJob.findUnique({ where: { id: jobId } });
  if (!job) {
    return NextResponse.json({ error: 'backdrop job not found', jobId }, { status: 404 });
  }
  if (job.status !== 'classifying') {
    return NextResponse.json(
      {
        error: 'job not in classifying state',
        currentStatus: job.status,
        jobId,
      },
      { status: 409 },
    );
  }

  // 1. download staged PNG.
  const staged = await downloadStagedPng(jobId);
  if (!staged) {
    await markReview({
      jobId,
      productId: job.productId,
      skeletonId: job.skeletonId,
      reason: 'staged PNG missing — ingest may have failed or staging expired',
      stage: 'classify-missing-stage',
    });
    return NextResponse.json({
      jobId,
      status: 'review',
      productId: job.productId,
      skeletonId: job.skeletonId,
      error: 'staged PNG missing',
    });
  }

  // 2. VLM gate.
  let gate: VlmGateVerdict;
  try {
    gate = await classifyBackdrop(staged);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markReview({
      jobId,
      productId: job.productId,
      skeletonId: job.skeletonId,
      reason: `vlm error: ${msg}`,
      stage: 'vlm-error',
    });
    await deleteStagedPng(jobId);
    return NextResponse.json({ error: 'vlm error', detail: msg }, { status: 500 });
  }
  if (!gate.passed) {
    await markReview({
      jobId,
      productId: job.productId,
      skeletonId: job.skeletonId,
      reason: `vlm reject: ${gate.reasons.join(',')}`,
      stage: 'vlm-reject',
    });
    await deleteStagedPng(jobId);
    return NextResponse.json({
      jobId,
      status: 'review',
      productId: job.productId,
      skeletonId: job.skeletonId,
      gate,
      uploaded: false,
    });
  }

  // 3. pass -> upload to the fixed resolver cache path.
  let uploaded: { path: string; publicUrl: string };
  try {
    uploaded = await uploadBackdropServer(job.productId, job.skeletonId, staged);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markReview({
      jobId,
      productId: job.productId,
      skeletonId: job.skeletonId,
      reason: `upload failed: ${msg}`,
      stage: 'upload',
    });
    return NextResponse.json({ error: 'upload failed', detail: msg }, { status: 500 });
  }

  // 4. cleanup staged + status='uploaded'.
  await deleteStagedPng(jobId);
  await prisma.backdropJob.update({
    where: { id: jobId },
    data: {
      status: 'uploaded',
      storagePath: uploaded.path,
      outputUrl: uploaded.publicUrl,
      error: null,
      updatedAt: new Date(),
    },
  });

  // 5. auto-cache probe -> done | review.
  const cached = await findCachedAsset(job.productId, `backdrop-${job.skeletonId}.png`);
  let finalStatus: 'done' | 'review';
  if (cached !== null) {
    await prisma.backdropJob.update({
      where: { id: jobId },
      data: { status: 'done', error: null, updatedAt: new Date() },
    });
    finalStatus = 'done';
  } else {
    await markReview({
      jobId,
      productId: job.productId,
      skeletonId: job.skeletonId,
      reason: 'auto-cache probe missed after upload',
      stage: 'auto-cache-miss',
    });
    finalStatus = 'review';
  }

  return NextResponse.json({
    jobId,
    status: finalStatus,
    productId: job.productId,
    skeletonId: job.skeletonId,
    storagePath: uploaded.path,
    publicUrl: uploaded.publicUrl,
    autoCacheHit: cached !== null,
    gate,
    uploaded: true,
  });
}
