// src/app/api/diagnose/route.ts
//
// Sprint 7-Diag MVP (v3.1 FINAL Smart Asset Workflow) — POST /api/diagnose
//
// Runs the full Phase-2 pipeline:
//   1. Sharp 4-axis image quality (assessImageQuality)
//   2. CTI 8-axis inference + skeleton matcher (inferConceptTone)
//   3. L1~L4 grading + confidence branching (gradeProduct)
//   4. Persist into Diagnosis row when productId is supplied
//
// Input contract (JSON body)
//   - productId?: string                 prefer DB row when given
//   - imageUrl?: string                  required if productId has no main image
//   - productName?: string               required if productId not given
//   - category?: string | null
//   - salePrice?: number | null
//   - supplierPrice?: number | null
//   - optionCount?: number | null
//   - optionName?: string | null
//   - categoryAveragePrice?: number | null
//   - competitionScore?: number          0..2, default 1.0 (= category average)
//   - persist?: boolean                  default true (DB upsert only when productId)
//
// Notes
//   - runtime = 'nodejs' is mandatory: Sharp is incompatible with Edge runtime.
//   - dynamic = 'force-dynamic' per workrule #11.
//   - No Korean strings in this route (workrule #2 + #29 carve-out: errors are
//     short English tokens; UI surfaces will localize via i18n strings.ko.json).

import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { type ImageQualityResult } from '@/lib/diagnosis/image-quality';
import { inferConceptTone } from '@/lib/diagnosis/concept-tone-inference';
import { gradeProduct } from '@/lib/diagnosis/grading';
import { runPFilter } from '@/lib/diagnosis/p-filter';
import type { PFilterResult } from '@/lib/diagnosis/p-filter-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DiagnoseBody {
  productId?: string;
  imageUrl?: string;
  productName?: string;
  category?: string | null;
  salePrice?: number | null;
  supplierPrice?: number | null;
  optionCount?: number | null;
  optionName?: string | null;
  categoryAveragePrice?: number | null;
  competitionScore?: number | null;
  persist?: boolean;
}

interface ResolvedInputs {
  productId?: string;
  imageUrl: string;
  productName: string;
  category: string | null;
  salePrice: number | null;
  supplierPrice: number | null;
  optionCount: number | null;
  optionName: string | null;
  margin: number;
  salesCount: number;
}

function jsonError(message: string, status: number, detail?: unknown) {
  return NextResponse.json(
    detail !== undefined ? { error: message, detail } : { error: message },
    { status },
  );
}

async function resolveInputs(body: DiagnoseBody): Promise<ResolvedInputs | NextResponse> {
  let productId = body.productId;
  let imageUrl = body.imageUrl;
  let productName = body.productName ?? undefined;
  let category: string | null = body.category ?? null;
  let salePrice: number | null = typeof body.salePrice === 'number' ? body.salePrice : null;
  let supplierPrice: number | null =
    typeof body.supplierPrice === 'number' ? body.supplierPrice : null;
  let optionCount: number | null =
    typeof body.optionCount === 'number' ? body.optionCount : null;
  let optionName: string | null = body.optionName ?? null;
  let margin = 1;
  let salesCount = 0;

  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        category: true,
        salePrice: true,
        supplierPrice: true,
        margin: true,
        salesCount: true,
        images: true,
        mainImage: true,
        main_image_url: true,
        options: true,
        optionName: true,
        hasOptions: true,
      },
    });
    if (!product) {
      return jsonError('product not found', 404, { productId });
    }
    productName = productName || product.name;
    category = category ?? product.category ?? null;
    salePrice = salePrice ?? (typeof product.salePrice === 'number' ? product.salePrice : null);
    supplierPrice =
      supplierPrice ?? (typeof product.supplierPrice === 'number' ? product.supplierPrice : null);
    optionName = optionName ?? product.optionName ?? null;
    const firstImage = Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : null;
    imageUrl = imageUrl || product.mainImage || product.main_image_url || firstImage || undefined;
    if (optionCount === null) {
      if (Array.isArray(product.options)) {
        optionCount = product.options.length;
      } else if (product.hasOptions === false) {
        optionCount = 0;
      }
    }
    if (typeof product.margin === 'number' && product.margin > 0) {
      margin = product.margin;
    }
    if (typeof product.salesCount === 'number' && product.salesCount > 0) {
      salesCount = product.salesCount;
    }
  }

  if (!productName) {
    return jsonError('productName required', 400);
  }
  if (!imageUrl) {
    return jsonError('imageUrl required (or productId with main image)', 400);
  }

  // Final margin derivation: prefer body override, then DB margin, then computed
  if (margin === 1 && salePrice && supplierPrice && supplierPrice > 0) {
    margin = salePrice / supplierPrice;
  }

  return {
    productId,
    imageUrl,
    productName,
    category,
    salePrice,
    supplierPrice,
    optionCount,
    optionName,
    margin,
    salesCount,
  };
}

/**
 * Upsert the Diagnosis row. Returns null on success, or an error message string
 * on failure. Single-return shape avoids union-narrowing pitfalls at the call site.
 */
async function persistDiagnosis(
  productId: string,
  result: {
    qualityScore: number;
    qualitySignals: unknown;
    competitionScore: number;
    roiScore: number;
    roiBreakdown: unknown;
    conceptTone: unknown;
    skeletonId: string;
    inferenceConfidence: number;
    grade: string;
    confidenceLevel: string;
    recommendedSections: string[];
    pFilterGrade: string | null;
  },
): Promise<string | null> {
  try {
    const data = {
      qualityScore: result.qualityScore,
      qualitySignals: result.qualitySignals as Prisma.InputJsonValue,
      competitionScore: result.competitionScore,
      roiScore: result.roiScore,
      roiBreakdown: result.roiBreakdown as Prisma.InputJsonValue,
      conceptTone: result.conceptTone as Prisma.InputJsonValue,
      skeletonId: result.skeletonId,
      inferenceConfidence: result.inferenceConfidence,
      grade: result.grade,
      confidenceLevel: result.confidenceLevel,
      recommendedSections: result.recommendedSections,
      pFilterGrade: result.pFilterGrade,
    };
    await prisma.diagnosis.upsert({
      where: { productId },
      create: { productId, ...data },
      update: { ...data, diagnosedAt: new Date() },
    });
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

/** Build the qualitySignals payload — embeds both the original 4-axis signals
 *  (preserved for CTI/grading compatibility) and the new P-Filter signals. */
function buildQualitySignals(pFilter: PFilterResult) {
  return {
    ...pFilter.imageQuality.qualitySignals,
    pFilter: {
      grade: pFilter.grade,
      gradeLabel: pFilter.gradeLabel,
      passed: pFilter.passed,
      requiresSellerReview: pFilter.requiresSellerReview,
      autoFixSuggestions: pFilter.autoFixSuggestions,
      signals: pFilter.signals,
      elapsedMs: pFilter.elapsedMs,
    },
  };
}

export async function POST(req: Request) {
  let body: DiagnoseBody;
  try {
    body = (await req.json()) as DiagnoseBody;
  } catch {
    return jsonError('invalid JSON body', 400);
  }

  const resolved = await resolveInputs(body);
  if (resolved instanceof NextResponse) return resolved;

  let pFilter: PFilterResult;
  try {
    pFilter = await runPFilter(resolved.imageUrl);
  } catch (err) {
    return jsonError('image quality assessment failed', 422, {
      detail: err instanceof Error ? err.message : String(err),
    });
  }
  const imageQuality: ImageQualityResult = pFilter.imageQuality;

  // L4: image is unusable — return early with the P-Filter verdict and skip
  // CTI/grading so the seller is routed straight to "reshoot" UX.
  if (pFilter.grade === 'L4') {
    const earlyResult = {
      qualityScore: imageQuality.qualityScore,
      qualitySignals: buildQualitySignals(pFilter),
      pFilterGrade: pFilter.grade,
      pFilterGradeLabel: pFilter.gradeLabel,
      pFilterAutoFixSuggestions: pFilter.autoFixSuggestions,
      pFilterSignals: pFilter.signals,
      pFilterElapsedMs: pFilter.elapsedMs,
      grade: 'L4',
      confidenceLevel: 'low',
      recommendedSections: [] as string[],
      rationale: ['p-filter:L4 — image quality insufficient for automation'],
      diagnosedAt: new Date().toISOString(),
      stoppedAt: 'p-filter',
    };
    return NextResponse.json({ ...earlyResult, persisted: false });
  }

  const cti = inferConceptTone({
    productName: resolved.productName,
    category: resolved.category,
    salePrice: resolved.salePrice,
    categoryAveragePrice: body.categoryAveragePrice ?? null,
    optionCount: resolved.optionCount,
    optionName: resolved.optionName,
    colorMood: imageQuality.colorMood,
    photoStyle: imageQuality.photoStyle,
  });

  const competitionScore =
    typeof body.competitionScore === 'number' && body.competitionScore >= 0 && body.competitionScore <= 2
      ? body.competitionScore
      : 1.0;

  const grading = gradeProduct({
    qualityScore: imageQuality.qualityScore,
    competitionScore,
    conceptTone: cti.conceptTone,
    skeletonId: cti.skeletonId,
    inferenceConfidence: cti.inferenceConfidence,
    roi: {
      margin: resolved.margin,
      salesCount: resolved.salesCount,
    },
  });

  const qualitySignalsPayload = buildQualitySignals(pFilter);

  const result = {
    qualityScore: imageQuality.qualityScore,
    qualitySignals: qualitySignalsPayload,
    competitionScore,
    roiScore: grading.roiScore,
    roiBreakdown: grading.roiBreakdown,
    conceptTone: cti.conceptTone,
    skeletonId: cti.skeletonId,
    inferenceConfidence: cti.inferenceConfidence,
    grade: grading.grade,
    confidenceLevel: grading.confidenceLevel,
    recommendedSections: grading.recommendedSections,
    rationale: grading.rationale,
    signals: cti.signals,
    rawStats: imageQuality.rawStats,
    pFilterGrade: pFilter.grade,
    pFilterGradeLabel: pFilter.gradeLabel,
    pFilterAutoFixSuggestions: pFilter.autoFixSuggestions,
    pFilterSignals: pFilter.signals,
    pFilterElapsedMs: pFilter.elapsedMs,
    diagnosedAt: new Date().toISOString(),
  };

  const shouldPersist = Boolean(resolved.productId) && body.persist !== false;
  if (shouldPersist && resolved.productId) {
    const persistError = await persistDiagnosis(resolved.productId, {
      qualityScore: result.qualityScore,
      qualitySignals: result.qualitySignals,
      competitionScore: result.competitionScore,
      roiScore: result.roiScore,
      roiBreakdown: result.roiBreakdown,
      conceptTone: result.conceptTone,
      skeletonId: result.skeletonId,
      inferenceConfidence: result.inferenceConfidence,
      grade: result.grade,
      confidenceLevel: result.confidenceLevel,
      recommendedSections: result.recommendedSections,
      pFilterGrade: result.pFilterGrade,
    });
    if (persistError) {
      return NextResponse.json(
        { ...result, persisted: false, persistError },
        { status: 200 },
      );
    }
    return NextResponse.json({ ...result, persisted: true });
  }

  return NextResponse.json({ ...result, persisted: false });
}
