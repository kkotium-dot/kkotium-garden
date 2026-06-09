// /api/products/[id]/white-bg
// ============================================================================
// In-app SIMPLE white-background finisher (C-1). Sibling of thumb-crop.
//   POST — flatten + contain the product on a white 1:1 1000px canvas (NO AI
//          segmentation). Reports background difficulty (SIMPLE/COMPLEX) so the
//          UI / finish-image router (C-3) can fall back to an Adobe cutout.
//          Dry-run (default): base64 preview + warnings + bgDifficulty (no write).
//          confirm:true: upload the result and SET it as the representative image
//          (mainImage + main_image_url). REVERSIBLE DB, never touches Naver.
//          Only severity:'block' warnings (OCR text, Naver 2024-10-28) stop apply.
//
// Body: { imageUrl?, ocr?: boolean, trim?: boolean, margin?: number, confirm?: boolean }
//   imageUrl defaults to the product's representative source (mainImage chain).
// Node runtime (sharp + tesseract).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { whiteBgFinish } from '@/lib/images/white-bg';
import { assessBgDifficulty } from '@/lib/images/bg-difficulty';
import { uploadAutomationAsset } from '@/lib/storage/automation-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // OCR cold start can be slow

interface Body {
  imageUrl?: string;
  ocr?: boolean;
  trim?: boolean;
  margin?: number;
  confirm?: boolean;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;

  let body: Body = {};
  try { body = await req.json(); } catch { /* empty → use product representative image */ }

  let url = body.imageUrl ?? null;
  if (!url) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { mainImage: true, main_image_url: true, detail_image_url: true },
    });
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    url = product.mainImage || product.main_image_url || product.detail_image_url || null;
  }
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
  let result;
  try {
    bgDifficulty = await assessBgDifficulty(input);
    result = await whiteBgFinish(input, {
      ocr: body.ocr,
      trim: body.trim,
      margin: body.margin,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: `White-bg failed: ${msg}` }, { status: 500 });
  }

  // Only severity:'block' (OCR text) stops apply. A COMPLEX background or a
  // low-resolution source is a non-blocking caution (route to Adobe / expand).
  const blockReasons = result.warnings.filter(w => w.severity === 'block');
  const cautions = result.warnings.filter(w => w.severity === 'warn');
  // Surface the difficulty verdict as a caution when the in-app path is a poor
  // fit (the result keeps a non-white center — needs a real Adobe cutout).
  const complexAdvice = bgDifficulty.mode === 'COMPLEX'
    ? 'background is COMPLEX — in-app white-flatten centers the product on white but cannot remove a non-white background; route to an Adobe cutout (apply-cutout, C-2)'
    : null;

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
        cautions,
        bgDifficulty,
        complexAdvice,
        ocrText: result.ocrText,
        whiteBgVerified: result.whiteBgVerified,
        note: 'white-bg not applied — text detected in the representative (Naver 2024-10-28). Use a text-free source or run text-remove (inpaint).',
      });
    }
    try {
      const uploaded = await uploadAutomationAsset({
        productId,
        kind: 'thumb',
        variant: 'whitebg',
        buffer: result.buffer,
        contentType: 'image/jpeg',
      });
      mainImageUrl = uploaded.publicUrl;
      // Set BOTH the builder field (mainImage) and the display field
      // (main_image_url) so register/update PUT uses the white-bg representative.
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
    outputSize: result.outputSize,
    trimmed: result.trimmed,
    ocrText: result.ocrText,
    whiteBgVerified: result.whiteBgVerified,
    bgDifficulty,
    complexAdvice,
    warnings: result.warnings,
    cautions,
    applied,
    mainImageUrl,
    // Base64 preview (1000x1000 JPEG). Operator reviews before any publish.
    preview: `data:image/jpeg;base64,${result.buffer.toString('base64')}`,
  });
}
