// /api/products/[id]/thumb-crop
// ============================================================================
// SIMPLE-mode thumbnail crop tool. Phase 3, handoff task 5.
//   POST — crop a 1:1 thumbnail out of a detail-page image (operator box OR
//          sharp attention/entropy saliency), normalize to 1000px, OCR guard.
//          Dry-run (default): returns a base64 preview + warnings (no write).
//          confirm:true (item 4): upload the crop and SET it as the product's
//          representative image (mainImage + main_image_url). REVERSIBLE DB,
//          never touches Naver. BLOCKED when the crop would degrade quality —
//          a low-resolution source (SOURCE_TOO_SMALL / LOW_RESOLUTION, e.g. the
//          437px gallery shot) or OCR-detected text (TEXT_DETECTED) — so an
//          upscale-blurred or text-bearing thumbnail can never become the rep.
//          NO cutout / NO compositing (that is ENHANCE/NEW mode).
//
// Body: { imageUrl?, box?: {x,y,width,height}, strategy?: 'attention'|'entropy',
//         ocr?: boolean, confirm?: boolean }
//   imageUrl defaults to the product's detail_image_url (the supplier detail page).
// Node runtime (sharp + tesseract).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { simpleCrop, type CropBox, type CropStrategy } from '@/lib/images/simple-crop';
import { uploadAutomationAsset } from '@/lib/storage/automation-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // OCR cold start can be slow

interface Body {
  imageUrl?: string;
  box?: CropBox;
  strategy?: CropStrategy;
  ocr?: boolean;
  confirm?: boolean;
}

// Quality guards that must NOT survive into the representative image.
const BLOCKING_WARNINGS = new Set(['SOURCE_TOO_SMALL', 'LOW_RESOLUTION', 'TEXT_DETECTED']);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;

  let body: Body = {};
  try { body = await req.json(); } catch { /* empty → use product detail image */ }

  let url = body.imageUrl ?? null;
  if (!url) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { detail_image_url: true, main_image_url: true, mainImage: true },
    });
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    url = product.detail_image_url || product.main_image_url || product.mainImage || null;
  }
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json(
      { success: false, error: 'No detail-page image URL (http/https) to crop' },
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

  let result;
  try {
    result = await simpleCrop(input, { box: body.box, strategy: body.strategy, ocr: body.ocr });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: `Crop failed: ${msg}` }, { status: 500 });
  }

  const blockReasons = result.warnings.filter(w => BLOCKING_WARNINGS.has(w.code));

  // confirm:true — apply the crop as the representative image (item 4). Blocked
  // when a quality guard would degrade the rep; otherwise upload + set the DB
  // columns the publish builder reads (mainImage) plus main_image_url.
  let applied = false;
  let mainImageUrl: string | null = null;
  if (body.confirm === true) {
    if (blockReasons.length > 0) {
      return NextResponse.json({
        success: true,
        productId,
        applied: false,
        blocked: true,
        blockReasons,
        warnings: result.warnings,
        cropSidePx: result.cropSidePx,
        upscaled: result.upscaled,
        ocrText: result.ocrText,
        note: 'crop not applied — quality guard (low-resolution source or detected text). Obtain a >=1000px text-free source.',
      });
    }
    try {
      const uploaded = await uploadAutomationAsset({
        productId,
        kind: 'thumb',
        variant: 'cropmain',
        buffer: result.buffer,
        contentType: 'image/jpeg',
      });
      mainImageUrl = uploaded.publicUrl;
      // Set BOTH the builder field (mainImage) and the display field
      // (main_image_url) so register/update PUT uses the cropped representative.
      await prisma.product.update({
        where: { id: productId },
        data: { mainImage: mainImageUrl, main_image_url: mainImageUrl },
      });
      applied = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        { success: false, error: `Apply failed: ${msg}`, stage: 'APPLY' },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({
    success: true,
    productId,
    sourceUrl: url,
    source: result.source,
    region: result.region,
    cropSidePx: result.cropSidePx,
    upscaled: result.upscaled,
    ocrText: result.ocrText,
    warnings: result.warnings,
    applied,
    mainImageUrl,
    // Base64 preview (1000x1000 JPEG). Operator reviews before any publish.
    preview: `data:image/jpeg;base64,${result.buffer.toString('base64')}`,
  });
}
