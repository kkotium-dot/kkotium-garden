// src/app/api/backdrop/ingest/route.ts
//
// Track B Phase 1/2/3 — POST /api/backdrop/ingest (2026-05-30).
//
// Authority: docs/research/FIREFLY_AUTOMATION_RESEARCH_2026-05-30.md §6 + §7.
//
// Two paths via the `asyncGate` body flag:
//
//   • SYNC (default — single-item fallback path):
//       pending -> { sourceUrl | base64 } -> normalize PNG -> VLM gate
//                -> upload (only when passed) -> auto-cache probe
//                -> done | review
//   • ASYNC (Phase 3 — worker-batchable, 60s timeout avoidance):
//       pending -> { sourceUrl | base64 } -> normalize PNG -> stage upload
//                -> status='classifying' -> return.
//       A separate POST /api/backdrop/classify run then completes the job.
//
// Errors at any step transition the row to status='review' via the shared
// backdrop-job-state helper, which also fires an OPS_REPORT Discord alert so
// fail-closed jobs never pile up silently.
//
// Workrule #38: no external image-GENERATION API is called — only a vision
// classifier (research §7) at the gate + server-side Storage writes.

import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import {
  uploadBackdropServer,
  uploadStagedPng,
  stagingStoragePath,
} from '@/lib/storage/upload-backdrop-server';
import { findCachedAsset } from '@/lib/storage/automation-storage';
import { classifyBackdrop, type VlmGateVerdict } from '@/lib/automation/backdrop-vlm-gate';
import { markReview, type ReviewStage } from '@/lib/automation/backdrop-job-state';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface IngestBody {
  jobId?: string;
  /** Public/presigned URL to the freshly generated backdrop image. */
  sourceUrl?: string;
  /** Base64-encoded image bytes (any sharp-supported format). */
  base64?: string;
  /** Phase 3: defer the VLM gate + upload to a separate /api/backdrop/classify
   *  call (worker-batchable). Default false = single-item sync fallback. */
  asyncGate?: boolean;
}

async function loadSourceBuffer(body: IngestBody): Promise<Buffer> {
  if (body.base64 && body.base64.length > 0) {
    return Buffer.from(body.base64, 'base64');
  }
  if (body.sourceUrl) {
    const res = await fetch(body.sourceUrl);
    if (!res.ok) throw new Error(`source fetch ${res.status} ${res.statusText}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error('either sourceUrl or base64 is required');
}

async function markReviewLocal(
  job: { id: string; productId: string; skeletonId: string },
  reason: string,
  stage: ReviewStage,
): Promise<void> {
  await markReview({
    jobId: job.id,
    productId: job.productId,
    skeletonId: job.skeletonId,
    reason,
    stage,
  });
}

export async function POST(req: Request) {
  let body: IngestBody = {};
  try {
    body = (await req.json()) as IngestBody;
  } catch {
    // empty body falls through to validation
  }

  const jobId = body.jobId?.trim();
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }

  const job = await prisma.backdropJob.findUnique({ where: { id: jobId } });
  if (!job) {
    return NextResponse.json({ error: 'backdrop job not found', jobId }, { status: 404 });
  }

  // 1. fetch / decode source bytes.
  let src: Buffer;
  try {
    src = await loadSourceBuffer(body);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markReviewLocal(job, `fetch failed: ${msg}`, 'fetch');
    return NextResponse.json({ error: 'source load failed', detail: msg }, { status: 400 });
  }

  // 2. PNG normalization via sharp (transparently handles JPEG/WebP/PNG input).
  let pngBuf: Buffer;
  let meta: { width?: number; height?: number; format?: string };
  try {
    meta = await sharp(src).metadata();
    pngBuf = await sharp(src).png({ compressionLevel: 9 }).toBuffer();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markReviewLocal(job, `decode failed: ${msg}`, 'decode');
    return NextResponse.json({ error: 'decode failed', detail: msg }, { status: 400 });
  }

  // 2a. Phase 3 — asyncGate branch. Stage the PNG, transition to
  // status='classifying', and let /api/backdrop/classify finish the job. This
  // avoids the 60s function ceiling when a worker batches many jobs and lets
  // the heavy VLM call happen out-of-band.
  if (body.asyncGate) {
    let staged: { path: string; publicUrl: string };
    try {
      staged = await uploadStagedPng(jobId, pngBuf);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markReviewLocal(job, `staging upload failed: ${msg}`, 'upload');
      return NextResponse.json({ error: 'staging upload failed', detail: msg }, { status: 500 });
    }
    await prisma.backdropJob.update({
      where: { id: jobId },
      data: {
        status: 'classifying',
        storagePath: staged.path,
        outputUrl: staged.publicUrl,
        error: null,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json({
      jobId,
      status: 'classifying',
      productId: job.productId,
      skeletonId: job.skeletonId,
      stagingPath: stagingStoragePath(jobId),
      uploaded: false,
      sourceFormat: meta.format ?? null,
      width: meta.width ?? null,
      height: meta.height ?? null,
    });
  }

  // 2b. Phase 2 — zero-shot VLM gate (research §7). Bad plates (product /
  // person / text / non-empty) are routed to human review BEFORE any Storage
  // write so the resolver cache never serves polluted backdrops.
  let gate: VlmGateVerdict;
  try {
    gate = await classifyBackdrop(pngBuf);
  } catch (err) {
    // classifyBackdrop is fail-closed by design, but defend the route anyway.
    const msg = err instanceof Error ? err.message : String(err);
    await markReviewLocal(job, `vlm gate threw: ${msg}`, 'vlm-error');
    return NextResponse.json({ error: 'vlm gate failed', detail: msg }, { status: 500 });
  }
  if (!gate.passed) {
    await markReviewLocal(job, `vlm reject: ${gate.reasons.join(',')}`, 'vlm-reject');
    return NextResponse.json({
      jobId,
      status: 'review',
      productId: job.productId,
      skeletonId: job.skeletonId,
      gate,
      uploaded: false,
      sourceFormat: meta.format ?? null,
      width: meta.width ?? null,
      height: meta.height ?? null,
    });
  }

  // 3. upload to the fixed resolver cache path (upsert).
  let uploaded: { path: string; publicUrl: string };
  try {
    uploaded = await uploadBackdropServer(job.productId, job.skeletonId, pngBuf);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markReviewLocal(job, `upload failed: ${msg}`, 'upload');
    return NextResponse.json({ error: 'upload failed', detail: msg }, { status: 500 });
  }

  // 4. status='uploaded' + storage_path + output_url.
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

  // 5. P1-6 auto-cache probe — exactly the call asset-source-resolver uses, so a
  // positive hit guarantees the next thumbnail render flips to auto-cache.
  const cached = await findCachedAsset(job.productId, `backdrop-${job.skeletonId}.png`);
  let finalStatus: 'done' | 'review';
  if (cached !== null) {
    await prisma.backdropJob.update({
      where: { id: jobId },
      data: { status: 'done', error: null, updatedAt: new Date() },
    });
    finalStatus = 'done';
  } else {
    await markReviewLocal(job, 'auto-cache probe missed after upload', 'auto-cache-miss');
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
    sourceFormat: meta.format ?? null,
    width: meta.width ?? null,
    height: meta.height ?? null,
  });
}
