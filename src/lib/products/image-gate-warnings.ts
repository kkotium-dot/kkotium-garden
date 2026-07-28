// src/lib/products/image-gate-warnings.ts
// ============================================================================
// Shared image-quality gate check — extracted from publish-preview/route.ts
// (재발명 금지 #62) so both the preview screen and the publish-review-gate
// consume the SAME warning computation. Never mutates, never calls Naver.
// ============================================================================

import { prisma } from '@/lib/prisma';
import { buildNaverProductPayload } from '@/lib/naver/product-builder';
import { loadNaverUpdateContext } from '@/lib/naver/load-update-context';
import { assessImageQuality, type QualityAssessment, type RecommendedMode } from '@/lib/images/quality-classifier';
import { ocrFullFrame } from '@/lib/diagnosis/p-filter-watermark';
import { deriveLine, type ProductLine } from '@/lib/automation/control-tower-engine';

// Always-blocking image warnings (regulatory / missing asset) — these stop
// publish on any line. Resolution/background/subject/detail-quality block only
// on line B (assets being built); line A treats them as cautions.
const HARD_BLOCK_WARNINGS = new Set(['text_overlay', 'representative_missing', 'detail_missing']);

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

export interface ImageGateResult {
  imageWarnings: string[];
  blockingImageWarnings: string[];
  imageCautions: string[];
  line: { value: ProductLine; source: 'operator' | 'auto' };
}

/** Loads a product's images + quality signals and computes the same warning set publish-preview shows. */
export async function computeImageGateWarnings(productId: string): Promise<ImageGateResult | null> {
  const ctx = await loadNaverUpdateContext(productId);
  if (!ctx) return null;

  const { product } = ctx;
  const payload = buildNaverProductPayload(product, ctx.deliveryInfo, undefined, ctx.noticeAssets, ctx.storeName);
  void payload; // built only to mirror the exact preview computation path; not sent here

  const repUrl = product.mainImage ?? ctx.dbProduct.main_image_url ?? null;
  const repBuf = await fetchBuffer(repUrl);
  const repWarnings: string[] = [];
  if (repBuf) {
    const a = await assessImageQuality(repBuf);
    const ocr = await ocrFullFrame(repBuf, {});
    if (ocr.hasText) repWarnings.push('text_overlay');
    if (val(a, 'resolution') < 1000) repWarnings.push('low_resolution');
    if (pts(a, 'background') < 11) repWarnings.push('background_not_uniform');
    if (pts(a, 'subject') < 14) repWarnings.push('subject_not_single');
  } else {
    repWarnings.push('representative_missing');
  }

  const detailUrl = ctx.dbProduct.detail_image_url;
  const detailBuf = await fetchBuffer(detailUrl);
  const detailWarnings: string[] = [];
  if (detailBuf) {
    const a = await assessImageQuality(detailBuf);
    const occupancy = val(a, 'subject');
    if (occupancy < 0.15) detailWarnings.push('mostly_blank');
    if (a.score < 40) detailWarnings.push('low_quality');
  } else {
    detailWarnings.push('detail_missing');
  }

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
  const lineSource: 'operator' | 'auto' = lineOverride ? 'operator' : 'auto';

  const imageWarnings = [...repWarnings, ...detailWarnings];
  const blockingImageWarnings =
    lineValue === 'A' ? imageWarnings.filter(w => HARD_BLOCK_WARNINGS.has(w)) : imageWarnings;
  const imageCautions = imageWarnings.filter(w => !blockingImageWarnings.includes(w));

  return { imageWarnings, blockingImageWarnings, imageCautions, line: { value: lineValue, source: lineSource } };
}
