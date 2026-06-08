// /api/products/[id]/thumb-crop
// ============================================================================
// SIMPLE-mode thumbnail crop tool. Phase 3, handoff task 5.
//   POST — crop a 1:1 thumbnail out of a detail-page image (operator box OR
//          sharp attention/entropy saliency), normalize to 1000px, OCR guard.
//          Dry-run (default): returns a base64 preview + warnings (no write).
//          confirm:true (item 4): upload the crop and SET it as the product's
//          representative image (mainImage + main_image_url). REVERSIBLE DB,
//          never touches Naver. T2: only severity:'block' warnings stop apply —
//          OCR-detected text (TEXT_DETECTED, Naver 2024-10-28 regulatory). A
//          low-resolution crop (SOURCE_TOO_SMALL / LOW_RESOLUTION) is now a
//          non-blocking WARNING so the line-A flow may apply and remediate later
//          with a 1:1 canvas expand. NO cutout / NO compositing (ENHANCE/NEW).
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
  // T6 full-subject containment:
  contain?: boolean;          // auto: build a square that contains the product
  enforceSubject?: boolean;   // box: block when the box clips the product
  allowSubjectClip?: boolean; // operator prop-exception override
}

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
    result = await simpleCrop(input, {
      box: body.box,
      strategy: body.strategy,
      ocr: body.ocr,
      contain: body.contain,
      enforceSubject: body.enforceSubject,
      allowSubjectClip: body.allowSubjectClip,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: `Crop failed: ${msg}` }, { status: 500 });
  }

  // T2: severity is the source of truth (set in simple-crop). Only 'block'
  // (TEXT_DETECTED) stops apply; resolution issues are non-blocking cautions.
  const blockReasons = result.warnings.filter(w => w.severity === 'block');
  const cautions = result.warnings.filter(w => w.severity === 'warn');

  // confirm:true — apply the crop as the representative image (item 4). Blocked
  // only by a regulatory guard (text in the rep); a low-resolution crop applies
  // with a caution + canvas-expand remediation hint.
  let applied = false;
  let mainImageUrl: string | null = null;
  if (body.confirm === true) {
    if (blockReasons.length > 0) {
      const clipBlocked = blockReasons.some(w => w.code === 'SUBJECT_CLIPPED');
      const note = clipBlocked
        ? 'crop not applied — the product is clipped. Snap to full containment, or confirm it is only a styling prop.'
        : 'crop not applied — text detected in the representative (Naver 2024-10-28). Pick a text-free region or run text-remove (inpaint).';
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
        subjectBBox: result.subjectBBox,
        contained: result.contained,
        cautions,
        note,
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
    subjectBBox: result.subjectBBox,
    contained: result.contained,
    warnings: result.warnings,
    cautions,
    applied,
    mainImageUrl,
    // Base64 preview (1000x1000 JPEG). Operator reviews before any publish.
    preview: `data:image/jpeg;base64,${result.buffer.toString('base64')}`,
  });
}
