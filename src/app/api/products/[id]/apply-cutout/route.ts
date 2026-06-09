// /api/products/[id]/apply-cutout
// ============================================================================
// C-2 Adobe-cutout apply executor. Sibling of thumb-crop / white-bg.
//   POST — recover an Adobe-produced transparent cutout PNG (cutoutUrl) and
//          finish it into a Naver-compliant white-background representative via
//          the SHARED white-bg finisher (flatten-on-white + contain 1:1 1000px +
//          OCR / white-bg guards). On confirm it SETS the representative
//          (mainImage + main_image_url, REVERSIBLE) and advances the product's
//          bg_clean asset_job to 'done'. Never touches Naver.
//          Dry-run (default): base64 preview + warnings (no write).
//          Only severity:'block' (OCR text, Naver 2024-10-28) stops apply.
//
// Source rule (#57): the cutout must come from a real-photographed hero shot —
// surfaced via sourceGuidance for the UI. Body: { cutoutUrl, confirm?, trim?,
// margin?, ocr? }.
// Node runtime (sharp + tesseract).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { whiteBgFinish } from '@/lib/images/white-bg';
import { uploadAutomationAsset } from '@/lib/storage/automation-storage';
import { transitionJob, type JobStatus } from '@/lib/jobs/asset-job-state';
import { BG_CLEAN } from '@/lib/jobs/job-type-routing';
import { REAL_HERO_CUT_GUIDANCE } from '@/lib/images/finishing-guidance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

interface Body {
  cutoutUrl?: string;
  ocr?: boolean;
  trim?: boolean;
  margin?: number;
  confirm?: boolean;
}

// One step toward 'done' from each status (operator-applied bg_clean result).
const STEP_TO_DONE: Partial<Record<JobStatus, JobStatus>> = {
  awaiting_human: 'human_done',
  human_done: 'in_progress',
  in_progress: 'done',
  ready: 'in_progress',
  pending: 'ready',
  blocked: 'ready',
  review: 'done',
};

const OPEN_STATUSES: JobStatus[] = [
  'awaiting_human', 'human_done', 'in_progress', 'ready', 'pending', 'blocked', 'review',
];

/** Advance the product's open bg_clean job to 'done' (best-effort). */
async function completeBgCleanJob(productId: string) {
  const job = await prisma.assetJob.findFirst({
    where: { productId, jobType: BG_CLEAN, status: { in: OPEN_STATUSES } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true },
  });
  if (!job) return null;
  const path: JobStatus[] = [];
  let status = job.status as JobStatus;
  for (let i = 0; i < 6 && status !== 'done'; i++) {
    const next = STEP_TO_DONE[status];
    if (!next) break;
    try {
      const updated = await transitionJob(job.id, next, {
        actor: 'human', event: 'apply_cutout', note: 'Adobe cutout applied as representative',
      });
      status = updated.status as JobStatus;
      path.push(next);
    } catch {
      break; // optimistic-lock or not-allowed — stop, report progress so far.
    }
  }
  return { jobId: job.id, finalStatus: status, path };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;

  let body: Body = {};
  try { body = await req.json(); } catch { /* validated below */ }

  if (!body.cutoutUrl || !/^https?:\/\//i.test(body.cutoutUrl)) {
    return NextResponse.json(
      { success: false, error: 'cutoutUrl (http/https transparent PNG from Adobe) is required' },
      { status: 400 },
    );
  }

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  let input: Buffer;
  try {
    const res = await fetch(body.cutoutUrl);
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `cutoutUrl fetch failed (${res.status})` }, { status: 502 });
    }
    input = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: `cutoutUrl fetch error: ${msg}` }, { status: 502 });
  }

  let result;
  try {
    // The cutout is transparent → flatten-on-white + contain yields a clean
    // white-bg representative (shared finisher with C-1).
    result = await whiteBgFinish(input, { ocr: body.ocr, trim: body.trim, margin: body.margin });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: `Cutout finish failed: ${msg}` }, { status: 500 });
  }

  const blockReasons = result.warnings.filter(w => w.severity === 'block');
  const cautions = result.warnings.filter(w => w.severity === 'warn');

  let applied = false;
  let mainImageUrl: string | null = null;
  let bgCleanJob: Awaited<ReturnType<typeof completeBgCleanJob>> = null;

  if (body.confirm === true) {
    if (blockReasons.length > 0) {
      return NextResponse.json({
        success: true, productId, applied: false, blocked: true,
        blockReasons, warnings: result.warnings, cautions,
        whiteBgVerified: result.whiteBgVerified, ocrText: result.ocrText,
        sourceGuidance: REAL_HERO_CUT_GUIDANCE,
        note: 'cutout not applied — text detected in the representative (Naver 2024-10-28). Use a text-free cutout.',
      });
    }
    try {
      const uploaded = await uploadAutomationAsset({
        productId, kind: 'thumb', variant: 'cutout', buffer: result.buffer, contentType: 'image/jpeg',
      });
      mainImageUrl = uploaded.publicUrl;
      await prisma.product.update({
        where: { id: productId },
        data: { mainImage: mainImageUrl, main_image_url: mainImageUrl },
      });
      applied = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ success: false, error: `Apply failed: ${msg}`, stage: 'APPLY' }, { status: 502 });
    }
    // Advance the bg_clean job (best-effort, non-fatal).
    try { bgCleanJob = await completeBgCleanJob(productId); } catch { bgCleanJob = null; }
  }

  return NextResponse.json({
    success: true,
    productId,
    sourceUrl: body.cutoutUrl,
    source: result.source,
    outputSize: result.outputSize,
    trimmed: result.trimmed,
    ocrText: result.ocrText,
    whiteBgVerified: result.whiteBgVerified,
    warnings: result.warnings,
    cautions,
    applied,
    mainImageUrl,
    bgCleanJob,
    sourceGuidance: REAL_HERO_CUT_GUIDANCE,
    // Base64 preview (1000x1000 JPEG). Operator reviews before any publish.
    preview: `data:image/jpeg;base64,${result.buffer.toString('base64')}`,
  });
}
