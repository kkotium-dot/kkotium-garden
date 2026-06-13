// /api/products/[id]/apply-composite
// ============================================================================
// C-7 composite pipeline executor. Sibling of thumb-crop / white-bg.
//   POST — compose a product CUTOUT onto a mood BACKGROUND (in-app sharp) OR
//          recover a pre-composed Firefly result, harmonize (warm grade +
//          contact shadow), normalize to an additional-image format, and apply
//          to a slot (Product.extra_images). The result is an ADDITIONAL image
//          (slots 2..9) / detail S2 hero — NOT the white-bg representative (§9),
//          so text is allowed and no white-bg guard is enforced.
//          Dry-run (default): base64 preview (no write).
//          confirm:true: upload + append to extra_images (REVERSIBLE, guarded
//          for the pre-migration window) + seed a product_composite audit job.
//          Never touches Naver.
//
// Body: { cutoutUrl?, backgroundUrl?, compositeUrl?, format?: '1x1'|'4x5',
//         scale?, posX?, harmonize?, warmth?, slotLabel?, confirm?: boolean }
//   compositeUrl  = Firefly/Photoshop recovery (skips in-app composite).
//   cutoutUrl     = transparent product PNG for the in-app composite.
// Node runtime (sharp).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { compositeMood, normalizeExtraImage, type ExtraFormat } from '@/lib/images/composite';
import { uploadAutomationAsset, listProductAssets } from '@/lib/storage/automation-storage';
import { safeVariant } from '@/lib/storage/asset-taxonomy';
import { BG_CLEAN, PRODUCT_COMPOSITE } from '@/lib/jobs/job-type-routing';
import {
  setJobIntervention,
  buildFireflyDropPayload,
  buildSourceRequestPayload,
  buildMountCheckPayload,
  INTERVENTION_FIREFLY_DROP,
  INTERVENTION_FIREFLY_AUTO,
  INTERVENTION_SOURCE_REQUEST,
  INTERVENTION_MOUNT_CHECK,
} from '@/lib/jobs/intervention';
import { parseFidelity, type ProductFidelity } from '@/lib/fidelity/product-fidelity';

/** Load a product's fidelity card, guarded for the pre-migration window
 *  (P2022/P2021 → null so the firefly prompt simply omits the injection). */
async function loadFidelity(productId: string): Promise<ProductFidelity | null> {
  try {
    const row = await prisma.product.findUnique({ where: { id: productId }, select: { fidelity: true } });
    return parseFidelity(row?.fidelity);
  } catch {
    return null;
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

interface Body {
  cutoutUrl?: string;
  backgroundUrl?: string;
  compositeUrl?: string;
  format?: ExtraFormat;
  scale?: number;
  posX?: number;
  harmonize?: boolean;
  warmth?: number;
  slotLabel?: string;
  confirm?: boolean;
  // C-9: request the Firefly-drop intervention card instead of executing a
  // composite now (the operator has not produced a Firefly result yet). Seeds a
  // product_composite job to awaiting_human + firefly_drop, or source_request
  // when no cutout source exists. Additive — ignored by existing callers.
  requestFireflyDrop?: boolean;
  // The browser driver detected the operator's Firefly tab is open, so the cuts
  // can be generated + drained automatically (ingest catch-basin). Surfaces a
  // firefly_auto card instead of firefly_drop. Additive — defaults to a drop.
  fireflyTabOpen?: boolean;
}

async function fetchBuffer(url: string): Promise<{ buf?: Buffer; status: number }> {
  try {
    const res = await fetch(url);
    if (!res.ok) return { status: res.status };
    return { buf: Buffer.from(await res.arrayBuffer()), status: res.status };
  } catch {
    return { status: 0 };
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;

  let body: Body = {};
  try { body = await req.json(); } catch { /* empty → validated below */ }

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  // C-9 firefly-drop entry: surface the precise drop card (dropkit path +
  // 3-plane prompts) so the operator runs Firefly in-app instead of an
  // out-of-band handoff. When no cutout source exists yet → source_request.
  // Purely additive: callers passing cutoutUrl/compositeUrl never reach here.
  if (body.requestFireflyDrop === true) {
    let hasCutout = false;
    try {
      const assets = await listProductAssets(productId);
      hasCutout = assets.some(a => a.stage === 'cutout');
    } catch { /* listing is best-effort — default to firefly_drop */ hasCutout = true; }

    if (!hasCutout) {
      const seeded = await setJobIntervention({
        productId, jobType: BG_CLEAN, type: INTERVENTION_SOURCE_REQUEST,
        payload: buildSourceRequestPayload({ productId }), tool: 'sharp',
      });
      return NextResponse.json({
        success: true, productId, applied: false, interventionRequired: true,
        interventionType: INTERVENTION_SOURCE_REQUEST, interventionJobId: seeded?.jobId ?? null,
        reason: 'no_cutout_source',
      });
    }
    // Fidelity-aware firefly prompt: promptInject prepend + decorForbidden
    // negatives (item 3). Loaded once, reused for the seed and the response.
    const fidelity = await loadFidelity(productId);
    const fireflyPayload = buildFireflyDropPayload(productId, fidelity);
    // firefly_auto when the tab is open (auto generate + ingest drain); otherwise
    // the manual firefly_drop handoff. Same payload (dropkit + prompts).
    const ivType = body.fireflyTabOpen === true ? INTERVENTION_FIREFLY_AUTO : INTERVENTION_FIREFLY_DROP;
    const seeded = await setJobIntervention({
      productId, jobType: PRODUCT_COMPOSITE, type: ivType,
      payload: fireflyPayload, tool: 'firefly',
    });
    return NextResponse.json({
      success: true, productId, applied: false, interventionRequired: true,
      interventionType: ivType, interventionJobId: seeded?.jobId ?? null,
      fidelityApplied: fidelity != null,
      payload: fireflyPayload,
    });
  }

  const format: ExtraFormat = body.format === '4x5' ? '4x5' : '1x1';
  const recovery = !!body.compositeUrl;
  if (!recovery && !body.cutoutUrl) {
    return NextResponse.json(
      { success: false, error: 'cutoutUrl (transparent PNG) is required for the in-app composite, or pass compositeUrl to recover a Firefly result' },
      { status: 400 },
    );
  }

  // Build the composed buffer — recovery (normalize only) or in-app composite.
  let outBuffer: Buffer;
  let width: number;
  let height: number;
  let hasBackground = false;
  let harmonized = false;
  let usedTool: string;
  try {
    if (recovery) {
      const got = await fetchBuffer(body.compositeUrl!);
      if (!got.buf) {
        return NextResponse.json({ success: false, error: `compositeUrl fetch failed (${got.status})` }, { status: 502 });
      }
      const norm = await normalizeExtraImage(got.buf, format);
      outBuffer = norm.buffer; width = norm.width; height = norm.height;
      usedTool = 'firefly';
    } else {
      const cut = await fetchBuffer(body.cutoutUrl!);
      if (!cut.buf) {
        return NextResponse.json({ success: false, error: `cutoutUrl fetch failed (${cut.status})` }, { status: 502 });
      }
      let bg: Buffer | null = null;
      if (body.backgroundUrl) {
        const got = await fetchBuffer(body.backgroundUrl);
        if (!got.buf) {
          return NextResponse.json({ success: false, error: `backgroundUrl fetch failed (${got.status})` }, { status: 502 });
        }
        bg = got.buf;
      }
      const composed = await compositeMood(cut.buf, bg, {
        format, scale: body.scale, posX: body.posX, harmonize: body.harmonize, warmth: body.warmth,
      });
      outBuffer = composed.buffer; width = composed.width; height = composed.height;
      hasBackground = composed.hasBackground; harmonized = composed.harmonized;
      usedTool = 'sharp';
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: `Composite failed: ${msg}` }, { status: 500 });
  }

  let applied = false;
  let extraImageUrl: string | null = null;
  let extraImagesPending = false; // true when the extra_images column is not migrated yet
  let jobId: string | null = null;

  if (body.confirm === true) {
    try {
      // Stage taxonomy: the composite scene goes to the composite/ folder, keyed
      // by its mood label (ASSET_FOLDER_TAXONOMY_BUILD §2-4).
      const uploaded = await uploadAutomationAsset({
        productId,
        kind: 'composite',
        variant: safeVariant(body.slotLabel, 'mood'),
        buffer: outBuffer,
        contentType: 'image/jpeg',
      });
      extraImageUrl = uploaded.publicUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ success: false, error: `Upload failed: ${msg}`, stage: 'UPLOAD' }, { status: 502 });
    }

    // Append to the extra_images slot array (reversible). Guarded for the
    // pre-migration window: a missing column (P2022/P2021) degrades to a pending
    // flag instead of a 500 (#50 reverse-deploy safety, #46 no fabrication).
    try {
      const cur = await prisma.product.findUnique({ where: { id: productId }, select: { extra_images: true } });
      const arr = Array.isArray(cur?.extra_images) ? (cur!.extra_images as unknown[]) : [];
      const entry = { url: extraImageUrl, source: 'composite_mood', label: body.slotLabel ?? null, tool: usedTool };
      await prisma.product.update({
        where: { id: productId },
        data: { extra_images: [...arr, entry] as unknown as Prisma.InputJsonValue },
      });
      applied = true;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2022' || e.code === 'P2021')) {
        extraImagesPending = true; // column not migrated yet — apply once C-7/C-3 migration runs
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ success: false, error: `Slot apply failed: ${msg}`, stage: 'SLOT', extraImageUrl }, { status: 502 });
      }
    }

    // Audit row (best-effort, non-fatal). job_type product_composite already
    // exists in the asset_jobs CHECK, so this needs no migration.
    try {
      const inputRefs: Prisma.InputJsonValue = {
        cutoutUrl: body.cutoutUrl ?? null,
        backgroundUrl: body.backgroundUrl ?? null,
        compositeUrl: body.compositeUrl ?? null,
        format, hasBackground, harmonized, resultUrl: extraImageUrl,
      };
      const j = await prisma.assetJob.create({
        data: {
          productId, lane: 'process', jobType: PRODUCT_COMPOSITE, tool: usedTool,
          ipSafe: true, status: 'done', inputRefs, blockedReason: null,
        },
        select: { id: true },
      });
      jobId = j.id;
    } catch { /* audit seed is best-effort */ }

    // Mount-physics check (item 8): the composite just locked an image into a
    // slot. If the product declares a mount mechanic, seed a mount_check card so
    // the operator verifies the clip/slat geometry before publish. Best-effort;
    // matchInterventionType so it never hijacks a firefly_drop on the same job.
    if (applied) {
      try {
        const fidelity = await loadFidelity(productId);
        const mountPayload = fidelity ? buildMountCheckPayload(productId, fidelity) : null;
        if (mountPayload) {
          await setJobIntervention({
            productId, jobType: PRODUCT_COMPOSITE, type: INTERVENTION_MOUNT_CHECK,
            payload: mountPayload, tool: 'review', matchInterventionType: true,
          });
        }
      } catch { /* mount-check seed is best-effort */ }
    }
  }

  return NextResponse.json({
    success: true,
    productId,
    mode: recovery ? 'recover' : 'in_app',
    tool: usedTool,
    format,
    width,
    height,
    hasBackground,
    harmonized,
    applied,
    extraImageUrl,
    extraImagesPending,
    jobId,
    // Base64 preview. Additional image (text allowed) — operator reviews before publish.
    preview: `data:image/jpeg;base64,${outBuffer.toString('base64')}`,
  });
}
