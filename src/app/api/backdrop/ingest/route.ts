// src/app/api/backdrop/ingest/route.ts
//
// Track B Phase 1 — POST /api/backdrop/ingest (2026-05-30).
//
// Authority: docs/research/FIREFLY_AUTOMATION_RESEARCH_2026-05-30.md §6 (steps
// d-f). Closes the unmanned-adoption spine:
//
//   pending -> { sourceUrl | base64 } -> normalize PNG -> Storage upload
//           -> status='uploaded' + storage_path
//           -> findCachedAsset auto-cache probe
//           -> status='done' (hit) or status='review' (miss)
//
// Phase 1 deliberately skips the 'generating' and 'classifying' transitions
// (handled by future workers in Phase 2/3). Errors at any step set
// status='review' with an explanatory error so a human can inspect the row.
//
// Workrule #38: no external generation API is called — only a stored asset
// fetch + a server-side Storage write.

import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { uploadBackdropServer } from '@/lib/storage/upload-backdrop-server';
import { findCachedAsset } from '@/lib/storage/automation-storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface IngestBody {
  jobId?: string;
  /** Public/presigned URL to the freshly generated backdrop image. */
  sourceUrl?: string;
  /** Base64-encoded image bytes (any sharp-supported format). */
  base64?: string;
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

async function markReview(jobId: string, reason: string): Promise<void> {
  await prisma.backdropJob.update({
    where: { id: jobId },
    data: { status: 'review', error: reason, updatedAt: new Date() },
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
    await markReview(jobId, `fetch failed: ${msg}`);
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
    await markReview(jobId, `decode failed: ${msg}`);
    return NextResponse.json({ error: 'decode failed', detail: msg }, { status: 400 });
  }

  // 3. upload to the fixed resolver cache path (upsert).
  let uploaded: { path: string; publicUrl: string };
  try {
    uploaded = await uploadBackdropServer(job.productId, job.skeletonId, pngBuf);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markReview(jobId, `upload failed: ${msg}`);
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
  const finalStatus = cached !== null ? 'done' : 'review';
  await prisma.backdropJob.update({
    where: { id: jobId },
    data: {
      status: finalStatus,
      error: cached !== null ? null : 'auto-cache probe missed after upload',
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({
    jobId,
    status: finalStatus,
    productId: job.productId,
    skeletonId: job.skeletonId,
    storagePath: uploaded.path,
    publicUrl: uploaded.publicUrl,
    autoCacheHit: cached !== null,
    sourceFormat: meta.format ?? null,
    width: meta.width ?? null,
    height: meta.height ?? null,
  });
}
