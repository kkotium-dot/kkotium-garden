// /api/products/[id]/finish-image
// ============================================================================
// C-3 unified representative-image finisher (single router the UI calls).
// Authority: docs/design/REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md §3 +
//            docs/plan/CUTOUT_CROP_FEATURE_BUILD_PLAN.md (C-3).
//
//   POST — assess background difficulty, then DISPATCH:
//     SIMPLE  -> in-app white-flatten (shared whiteBgFinish, same as /white-bg):
//                dry-run preview, or confirm:true SETS the representative.
//     COMPLEX -> cannot be flattened in-app (opaque/colored bg); seed the
//                product's bg_clean job to awaiting_human and return the Adobe
//                cutout guidance. The operator finishes via /apply-cutout (C-2).
//
//   The schema this consumes (Product.extra_images jsonb, main_image_policy
//   text) is already migrated — this route CONSUMES it, no migration here:
//     - main_image_policy='lifestyle_intended' (C-4): the operator keeps a
//       non-white representative on purpose. confirm then does NOT overwrite the
//       representative; the white-bg result is parked in extra_images and
//       policyHeld:true is reported (the lifestyle main is preserved).
//     - keepAsExtra:true: before overwriting, the previous representative URL is
//       archived into extra_images ({source:'previous_main'}) so nothing is lost.
//
//   REVERSIBLE DB only, never touches Naver. Dry-run is the default.
//   Only severity:'block' warnings (OCR text, Naver 2024-10-28) stop apply.
//
// Body: { imageUrl?, ocr?, trim?, margin?, keepAsExtra?, confirm? }
// Node runtime (sharp + tesseract).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { whiteBgFinish } from '@/lib/images/white-bg';
import { assessBgDifficulty } from '@/lib/images/bg-difficulty';
import { uploadAutomationAsset, registerUploadedAsset } from '@/lib/storage/automation-storage';
import { REAL_HERO_CUT_GUIDANCE } from '@/lib/images/finishing-guidance';
import { MAIN_IMAGE_POLICY_LIFESTYLE } from '@/lib/seo/seo-guard-linter';
import { BG_CLEAN } from '@/lib/jobs/job-type-routing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // OCR cold start can be slow

interface Body {
  imageUrl?: string;
  ocr?: boolean;
  trim?: boolean;
  margin?: number;
  keepAsExtra?: boolean;
  confirm?: boolean;
}

const OPEN_STATUSES: string[] = [
  'awaiting_human', 'human_done', 'in_progress', 'ready', 'pending', 'blocked', 'review',
];

/**
 * Seed (or reuse the latest open) bg_clean job to awaiting_human so a COMPLEX
 * representative surfaces in the operator queue as a cutout-needed item. No
 * intervention card type — it falls back to the generic AUTH card (C-9 no
 * regression). Best-effort: returns null on any error.
 */
async function seedBgCleanAwaiting(productId: string): Promise<string | null> {
  try {
    const existing = await prisma.assetJob.findFirst({
      where: { productId, jobType: BG_CLEAN, status: { in: OPEN_STATUSES } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (existing) {
      await prisma.assetJob.update({ where: { id: existing.id }, data: { status: 'awaiting_human' } });
      return existing.id;
    }
    const created = await prisma.assetJob.create({
      data: {
        productId, lane: 'process', jobType: BG_CLEAN, tool: 'adobe_express',
        ipSafe: true, status: 'awaiting_human',
      },
      select: { id: true },
    });
    return created.id;
  } catch {
    return null;
  }
}

/** Append an entry to Product.extra_images, guarded for the pre-migration window. */
async function appendExtraImage(
  productId: string,
  entry: Record<string, unknown>,
): Promise<{ ok: boolean; pending: boolean }> {
  try {
    const cur = await prisma.product.findUnique({ where: { id: productId }, select: { extra_images: true } });
    const arr = Array.isArray(cur?.extra_images) ? (cur!.extra_images as unknown[]) : [];
    await prisma.product.update({
      where: { id: productId },
      data: { extra_images: [...arr, entry] as unknown as Prisma.InputJsonValue },
    });
    return { ok: true, pending: false };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2022' || e.code === 'P2021')) {
      return { ok: false, pending: true }; // column not migrated yet (#50 reverse-deploy safety)
    }
    throw e;
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;

  let body: Body = {};
  try { body = await req.json(); } catch { /* empty → use product representative */ }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true, mainImage: true, main_image_url: true, detail_image_url: true,
      main_image_policy: true,
    },
  });
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  const currentRepresentative = product.mainImage || product.main_image_url || null;
  const url = body.imageUrl ?? currentRepresentative ?? product.detail_image_url ?? null;
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json(
      { success: false, error: 'No representative image URL (http/https) to finish' },
      { status: 422 },
    );
  }

  let input: Buffer;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `Image fetch failed (${res.status})`, url }, { status: 502 });
    }
    input = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: `Image fetch error: ${msg}`, url }, { status: 502 });
  }

  let bgDifficulty;
  try {
    bgDifficulty = await assessBgDifficulty(input);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: `Background assess failed: ${msg}` }, { status: 500 });
  }

  // The lifestyle-intended policy (C-4) is hoisted above the COMPLEX branch so a
  // COMPLEX representative the operator deliberately keeps does not seed a cutout
  // card. usingOwnRep is true when no explicit imageUrl was passed (we assessed
  // the product's current representative, not an operator-supplied candidate).
  const policyLifestyle = product.main_image_policy === MAIN_IMAGE_POLICY_LIFESTYLE;
  const usingOwnRep = !body.imageUrl;

  // ── COMPLEX dispatch: in-app white-flatten cannot remove an opaque/colored
  //    background. Route to the Adobe cutout (C-2 /apply-cutout) and seed the
  //    bg_clean job so the operator queue surfaces it. No write to the product. ──
  if (bgDifficulty.mode === 'COMPLEX') {
    // Policy guard (#46): a lifestyle-intended representative is COMPLEX by design
    // (e.g. myeonghwa leather). When we are looking at that very representative
    // (usingOwnRep), seeding a cutout card would be a false intervention. Skip it.
    // An explicit imageUrl (operator-supplied candidate) still seeds normally.
    if (policyLifestyle && usingOwnRep) {
      return NextResponse.json({
        success: true,
        productId,
        mode: 'COMPLEX',
        dispatch: 'none',
        applied: false,
        policyHeld: true,
        sourceUrl: url,
        bgDifficulty,
        note: 'lifestyle main intentionally kept — no cutout needed',
      });
    }
    const bgCleanJobId = await seedBgCleanAwaiting(productId);
    return NextResponse.json({
      success: true,
      productId,
      mode: 'COMPLEX',
      dispatch: 'apply-cutout',
      applied: false,
      sourceUrl: url,
      bgDifficulty,
      bgCleanJobId,
      sourceGuidance: REAL_HERO_CUT_GUIDANCE,
      complexAdvice:
        'background is COMPLEX — in-app white-flatten cannot remove it. Produce an Adobe cutout (transparent PNG) and finish it via /apply-cutout (C-2).',
    });
  }

  // ── SIMPLE dispatch: in-app white-flatten produces a compliant white-bg
  //    representative (shared finisher with /white-bg). ──
  let result;
  try {
    result = await whiteBgFinish(input, { ocr: body.ocr, trim: body.trim, margin: body.margin });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: `White-bg failed: ${msg}` }, { status: 500 });
  }

  const blockReasons = result.warnings.filter(w => w.severity === 'block');
  const cautions = result.warnings.filter(w => w.severity === 'warn');
  // policyLifestyle is hoisted above the COMPLEX branch (still in scope here).

  let applied = false;
  let policyHeld = false;
  let mainImageUrl: string | null = null;
  let keptPreviousAsExtra = false;
  let extraImagesPending = false;

  if (body.confirm === true) {
    if (blockReasons.length > 0) {
      return NextResponse.json({
        success: true, productId, mode: 'SIMPLE', dispatch: 'white-bg',
        applied: false, blocked: true, blockReasons,
        warnings: result.warnings, cautions, bgDifficulty,
        ocrText: result.ocrText, whiteBgVerified: result.whiteBgVerified,
        note: 'finish not applied — text detected in the representative (Naver 2024-10-28). Use a text-free source or run text-remove.',
      });
    }

    // Upload the finished white-bg candidate to the thumb/ stage.
    let uploadedUrl: string;
    try {
      const uploaded = await uploadAutomationAsset({
        productId, kind: 'thumbnail', variant: 'whitebg', buffer: result.buffer, contentType: 'image/jpeg',
      });
      uploadedUrl = uploaded.publicUrl;
      // #62 write-time registry intake (idempotent, best-effort).
      await registerUploadedAsset({ productId, path: uploaded.path, stage: 'thumbnail', sourceTag: 'finish_image' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ success: false, error: `Apply failed: ${msg}`, stage: 'UPLOAD' }, { status: 502 });
    }

    if (policyLifestyle) {
      // C-4 consume: the operator keeps a non-white representative on purpose.
      // Do NOT overwrite mainImage — park the white-bg result in extra_images so
      // it is available as an additional image without disturbing the main.
      const r = await appendExtraImage(productId, {
        url: uploadedUrl, source: 'white_bg_candidate', label: 'finish-image', tool: 'sharp',
      });
      extraImagesPending = r.pending;
      policyHeld = true;
    } else {
      // Default: archive the previous representative (keepAsExtra) then set the
      // white-bg result as the representative (both builder + display fields).
      if (body.keepAsExtra && currentRepresentative && currentRepresentative !== uploadedUrl) {
        const r = await appendExtraImage(productId, {
          url: currentRepresentative, source: 'previous_main', label: 'archived', tool: 'finish-image',
        });
        keptPreviousAsExtra = r.ok;
        extraImagesPending = r.pending;
      }
      try {
        await prisma.product.update({
          where: { id: productId },
          data: { mainImage: uploadedUrl, main_image_url: uploadedUrl },
        });
        mainImageUrl = uploadedUrl;
        applied = true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ success: false, error: `Apply failed: ${msg}`, stage: 'APPLY', uploadedUrl }, { status: 502 });
      }
    }
  }

  return NextResponse.json({
    success: true,
    productId,
    mode: 'SIMPLE',
    dispatch: 'white-bg',
    sourceUrl: url,
    source: result.source,
    outputSize: result.outputSize,
    trimmed: result.trimmed,
    ocrText: result.ocrText,
    whiteBgVerified: result.whiteBgVerified,
    bgDifficulty,
    warnings: result.warnings,
    cautions,
    applied,
    policyHeld,
    mainImageUrl,
    keptPreviousAsExtra,
    extraImagesPending,
    // Base64 preview (1000x1000 JPEG). Operator reviews before any publish.
    preview: `data:image/jpeg;base64,${result.buffer.toString('base64')}`,
  });
}
