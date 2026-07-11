// /api/products/[id]/capture-source-detail
// ============================================================================
// Capture the FULL-RES supplier detail image into app storage (two-branch
// system, item 1 — the P16 crawl-gap fix). Calls Domeggook getItemView, pulls
// the full-res detail out of desc.contents (supplier-hosted, hotlink-protected),
// fetches it with a Referer header, uploads to product-assets, and records
// source_detail_url. REVERSIBLE DB write — never touches Naver.
//
// Product-agnostic (#55): any Domeggook-sourced product with a
// supplier_product_code can capture. Body { productNo } overrides the stored code.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { uploadAutomationAsset, registerUploadedAsset } from '@/lib/storage/automation-storage';
import { captureSupplierDetail } from '@/lib/sources/capture-supplier-detail';
import { assessImageQuality } from '@/lib/images/quality-classifier';

// Supplier detail quality floor — at/above this the detail is "good" (Branch A
// candidate); below it needs build/enhance (Branch B). Two-branch split eval.
const SOURCE_DETAIL_GOOD_SCORE = 50;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // large supplier images + sharp metadata

interface Body { productNo?: string }

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;

  let body: Body = {};
  try { body = await req.json(); } catch { /* optional */ }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, supplier_product_code: true, quality_reasons: true },
  });
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  const productNo = (body.productNo ?? product.supplier_product_code ?? '').trim();
  if (!productNo) {
    return NextResponse.json(
      { success: false, error: 'No supplier_product_code (Domeggook no) for this product' },
      { status: 422 },
    );
  }

  const settings = await prisma.storeSettings.findFirst({ select: { domeggookApiKey: true } });
  const apiKey = settings?.domeggookApiKey?.trim();
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'Domeggook API key not configured' }, { status: 422 });
  }

  let captured;
  try {
    captured = await captureSupplierDetail(productNo, apiKey);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: `Capture failed: ${msg}` }, { status: 502 });
  }
  if (!captured) {
    return NextResponse.json(
      { success: false, error: 'No full-res detail image found in getItemView desc.contents', productNo },
      { status: 404 },
    );
  }

  // Split-quality eval (item 2): score the supplier detail so the two-branch
  // router knows if it is good (Branch A as-is) or poor (Branch B build).
  let sourceDetailScore = 0;
  try {
    sourceDetailScore = (await assessImageQuality(captured.buffer)).score;
  } catch { /* best-effort — defaults to poor */ }
  const sourceDetailGood = sourceDetailScore >= SOURCE_DETAIL_GOOD_SCORE;

  let detailUrl: string;
  try {
    const uploaded = await uploadAutomationAsset({
      productId,
      kind: 'detail',
      variant: 'source',
      buffer: captured.buffer,
      contentType: captured.contentType,
    });
    detailUrl = uploaded.publicUrl;
    const prevQr = (product.quality_reasons ?? {}) as Record<string, unknown>;
    const quality_reasons = { ...prevQr, sourceDetailGood, sourceDetailScore };
    await prisma.product.update({
      where: { id: productId },
      data: {
        source_detail_url: detailUrl,
        quality_reasons: quality_reasons as unknown as Prisma.InputJsonValue,
      },
    });
    // Registry intake (#241) — every storage write lands a registry row so the
    // index stays a complete inventory (best-effort, idempotent on path).
    await registerUploadedAsset({
      productId,
      path: uploaded.path,
      stage: 'detail',
      width: captured.width ?? null,
      height: captured.height ?? null,
      sourceTag: 'capture_source_detail',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: `Store failed: ${msg}`, stage: 'STORE' }, { status: 502 });
  }

  return NextResponse.json({
    success: true,
    productId,
    productNo,
    sourceUrl: captured.sourceUrl,
    sourceDetailUrl: detailUrl,
    width: captured.width,
    height: captured.height,
  });
}
