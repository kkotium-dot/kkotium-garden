// /api/products/[id]/thumb-crop
// ============================================================================
// SIMPLE-mode thumbnail crop tool. Phase 3, handoff task 5.
//   POST — crop a 1:1 thumbnail out of a detail-page image (operator box OR
//          sharp attention/entropy saliency), normalize to 1000px, OCR guard.
//          Dry-run: returns a base64 preview + warnings (no DB/Naver write).
//          NO cutout / NO compositing (that is ENHANCE/NEW mode).
//
// Body: { imageUrl?, box?: {x,y,width,height}, strategy?: 'attention'|'entropy',
//         ocr?: boolean }
//   imageUrl defaults to the product's detail_image_url (the supplier detail page).
// Node runtime (sharp + tesseract).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { simpleCrop, type CropBox, type CropStrategy } from '@/lib/images/simple-crop';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // OCR cold start can be slow

interface Body {
  imageUrl?: string;
  box?: CropBox;
  strategy?: CropStrategy;
  ocr?: boolean;
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
    result = await simpleCrop(input, { box: body.box, strategy: body.strategy, ocr: body.ocr });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: `Crop failed: ${msg}` }, { status: 500 });
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
    // Base64 preview (1000x1000 JPEG). Operator reviews before any publish.
    preview: `data:image/jpeg;base64,${result.buffer.toString('base64')}`,
  });
}
