// /api/products/[id]/publish-preview
// ============================================================================
// READ-ONLY pre-publish review aggregator (handoff #4 — publish-preview screen).
//   GET — assembles everything the operator needs to fact-check BEFORE the
//   irreversible PUT, in one call:
//     1) representative image + quality/OCR warnings (text overlay, <1000px,
//        non-uniform background, not-single-subject) — the builder's actual
//        representativeImage field (product.mainImage).
//     2) detail image + completeness warnings (missing / mostly-blank skeleton /
//        low quality).
//     3) the exact Naver payload summary the PUT will send (name, tags,
//        attributes, legal-notice HB number, origin, statusType) via the loader.
//     4) canPublish gate = readiness A/S + canRegister + zero image warnings.
//
// Never mutates, never calls Naver. Node runtime (Sharp + OCR). The payload is
// built with the SAME loader the update PUT uses, so the preview cannot drift
// from what actually gets sent.
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildNaverProductPayload } from '@/lib/naver/product-builder';
import { loadNaverUpdateContext } from '@/lib/naver/load-update-context';
import { assessImageQuality, type QualityAssessment, type RecommendedMode } from '@/lib/images/quality-classifier';
import { ocrFullFrame } from '@/lib/diagnosis/p-filter-watermark';
import { deriveLine, type ProductLine } from '@/lib/automation/control-tower-engine';

// Always-blocking image warnings (regulatory / missing asset) — these stop
// publish on any line. Resolution/background/subject/detail-quality block only
// on line B (assets being built); line A treats them as cautions (T2/T4).
const HARD_BLOCK_WARNINGS = new Set(['text_overlay', 'representative_missing', 'detail_missing']);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // OCR cold start can be slow

function pts(a: QualityAssessment, metric: string): number {
  return a.reasons.find(r => r.metric === metric)?.points ?? 0;
}
function val(a: QualityAssessment, metric: string): number {
  return a.reasons.find(r => r.metric === metric)?.value ?? 0;
}

async function fetchBuffer(url: string | null | undefined): Promise<Buffer | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const productId = params.id;
  const ctx = await loadNaverUpdateContext(productId);
  if (!ctx) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  const { product, validation } = ctx;

  // ── Exact payload summary (shared builder == what PUT sends) ─────────────────
  const payload = buildNaverProductPayload(product, ctx.deliveryInfo, undefined, ctx.noticeAssets, ctx.storeName);
  const oa = payload.originProduct.detailAttribute?.originAreaInfo;
  const summary = {
    name: payload.originProduct.name,
    leafCategoryId: payload.originProduct.leafCategoryId,
    salePrice: payload.originProduct.salePrice,
    statusType: payload.originProduct.statusType,
    representativeImage: payload.originProduct.images.representativeImage.url,
    optionalImageCount: payload.originProduct.images.optionalImages?.length ?? 0,
    originAreaInfo: oa,
    sellerTags: payload.originProduct.detailAttribute?.seoInfo?.sellerTags?.map(t => t.text) ?? [],
    optionCombinationValues:
      payload.originProduct.detailAttribute?.optionInfo?.optionCombinations?.map(
        c => [c.optionName1, c.optionName2].filter(Boolean).join(' / '),
      ) ?? [],
    productInfoProvidedNotice: payload.originProduct.detailAttribute?.productInfoProvidedNotice ?? null,
  };

  // ── Representative image review (builder field = product.mainImage) ──────────
  const repUrl = product.mainImage ?? ctx.dbProduct.main_image_url ?? null;
  const repBuf = await fetchBuffer(repUrl);
  const repWarnings: string[] = [];
  let representative: {
    url: string | null;
    score: number | null;
    checks: { resolutionOk: boolean; uniformBg: boolean; textFree: boolean; singleSubject: boolean } | null;
    ocrText: string | null;
    meta: { width: number; height: number } | null;
  } = { url: repUrl, score: null, checks: null, ocrText: null, meta: null };

  if (repBuf) {
    const a = await assessImageQuality(repBuf);
    const ocr = await ocrFullFrame(repBuf, {});
    const checks = {
      resolutionOk: val(a, 'resolution') >= 1000,
      uniformBg: pts(a, 'background') >= 11,
      textFree: !ocr.hasText,
      singleSubject: pts(a, 'subject') >= 14,
    };
    if (!checks.textFree) repWarnings.push('text_overlay');
    if (!checks.resolutionOk) repWarnings.push('low_resolution');
    if (!checks.uniformBg) repWarnings.push('background_not_uniform');
    if (!checks.singleSubject) repWarnings.push('subject_not_single');
    representative = {
      url: repUrl,
      score: a.score,
      checks,
      ocrText: ocr.hasText ? ocr.text.slice(0, 80) : null,
      meta: a.meta,
    };
  } else {
    repWarnings.push('representative_missing');
  }

  // ── Detail image review (completeness) ──────────────────────────────────────
  const detailUrl = ctx.dbProduct.detail_image_url;
  const detailBuf = await fetchBuffer(detailUrl);
  const detailWarnings: string[] = [];
  let detail: {
    url: string | null;
    score: number | null;
    occupancy: number | null;
    meta: { width: number; height: number } | null;
  } = { url: detailUrl, score: null, occupancy: null, meta: null };

  if (detailBuf) {
    const a = await assessImageQuality(detailBuf);
    const occupancy = val(a, 'subject'); // fraction differing from background
    // Mostly-blank = skeleton / empty detail page (handoff: detail-S6 unfinished).
    if (occupancy < 0.15) detailWarnings.push('mostly_blank');
    if (a.score < 40) detailWarnings.push('low_quality');
    detail = { url: detailUrl, score: a.score, occupancy, meta: a.meta };
  } else {
    detailWarnings.push('detail_missing');
  }

  // ── Workflow line (operator override wins) ───────────────────────────────────
  let recommendedMode: RecommendedMode | null = null;
  let qualityScore: number | null = null;
  let lineOverride: ProductLine | null = null;
  try {
    const m = await prisma.product.findUnique({
      where: { id: productId },
      select: { recommended_mode: true, quality_score: true, quality_reasons: true },
    });
    if (m) {
      recommendedMode = (m.recommended_mode as RecommendedMode | null) ?? null;
      qualityScore = m.quality_score ?? null;
      const qr = (m.quality_reasons ?? null) as { line?: string; lineSource?: string } | null;
      if (qr?.lineSource === 'operator' && (qr.line === 'A' || qr.line === 'B')) lineOverride = qr.line;
    }
  } catch { /* adaptive-mode columns not migrated — line defaults to auto */ }
  const lineValue: ProductLine =
    lineOverride ?? deriveLine({ recommendedMode, qualityScore, hasDetail: !!detailBuf });
  const lineSource = lineOverride ? 'operator' : 'auto';

  // ── Publish gate (line-aware) ────────────────────────────────────────────────
  const imageWarnings = [...repWarnings, ...detailWarnings];
  const blockingImageWarnings =
    lineValue === 'A' ? imageWarnings.filter(w => HARD_BLOCK_WARNINGS.has(w)) : imageWarnings;
  const imageCautions = imageWarnings.filter(w => !blockingImageWarnings.includes(w));
  const readinessOk = validation.readinessGrade === 'S' || validation.readinessGrade === 'A';
  const canPublish = readinessOk && validation.canRegister && blockingImageWarnings.length === 0;

  return NextResponse.json({
    success: true,
    productId,
    registered: !!ctx.dbProduct.naverProductId,
    naverProductId: ctx.dbProduct.naverProductId ?? null,
    readiness: {
      readinessGrade: validation.readinessGrade,
      readinessScore: validation.readinessScore,
      attributeGrade: validation.attributeGrade,
      attributeScore: validation.attributeScore,
      canRegister: validation.canRegister,
      missingRequired: validation.missingRequired,
      errors: validation.errors,
      warnings: validation.warnings,
    },
    representative,
    detail,
    repWarnings,
    detailWarnings,
    imageWarnings,
    blockingImageWarnings,
    imageCautions,
    line: { value: lineValue, source: lineSource },
    summary,
    canPublish,
    // Honest gate reasons so the UI can explain a disabled publish button.
    gateReasons: {
      readinessOk,
      canRegister: validation.canRegister,
      imageWarningCount: blockingImageWarnings.length,
    },
  });
}
