// src/app/api/diagnose/route.ts
//
// Sprint 7-M2 Step 4 — unified POST /api/diagnose
//
// History:
//   - v1 (Sharp 4-axis quality + CTI 8-axis tone + L1~L4 grading) → archived
//     at src/app/api/_archive/diagnose-v1/route.ts (Next.js skips _ prefix).
//   - v2 (real 9-axis CTI score engine + PlayMCP cache + skeleton picker) →
//     archived at src/app/api/_archive/diagnose-v2/route.ts.
//
// This unified handler runs v2's 9-axis scoring internally, but:
//   1. Writes BOTH the v1 Diagnosis table (for /api/thumbnail and
//      /api/products/[id]/generate-detail which still read it) AND the
//      v2 DiagnosisResult table (for the new automation pipeline).
//   2. Returns a v1-compatible response shape (grade, confidenceLevel,
//      inferenceConfidence, qualityScore, skeletonId, conceptTone, persisted)
//      so /studio's useStudioActions keeps working without changes.
//   3. Adds a v2-detail block (axes, totalScore, reasoning) for callers that
//      want the 9-axis breakdown — e.g. /api/automation/l1.
//
// Runtime contract is intentionally minimal: { productId, persist? }. Other
// v1 inputs (imageUrl, productName, ...) are no longer accepted because v2
// only operates on persisted Product rows.

import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  computeAllAxes,
  giftKeywordCount,
  emotionalKeywordCount,
} from '@/lib/diagnosis/score-engine';
import type { AxisScores } from '@/lib/diagnosis/score-engine';
import { getCategoryMetadata } from '@/lib/diagnosis/playmcp-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Grade = 'L1' | 'L2' | 'L3' | 'L4';
type ConfidenceLevel = 'auto' | 'review' | 'designer';
type SkeletonId =
  | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7'
  | 'S8' | 'S9' | 'S10' | 'S11' | 'S12' | 'S13' | 'S14';

interface DiagnoseBody {
  productId?: string;
  persist?: boolean;
}

const AXIS_WEIGHTS: Record<keyof AxisScores, number> = {
  c1Category: 0.12,
  c2PriceTier: 0.10,
  c3RevenuePotential: 0.14,
  c4SourcePoverty: 0.16,
  t1ToneScore: 0.10,
  t2Seasonality: 0.08,
  t3GiftScore: 0.08,
  t4Competition: 0.12,
  t5BrandIdentity: 0.10,
};

function jsonError(message: string, status: number, detail?: unknown) {
  return NextResponse.json(
    detail !== undefined ? { error: message, detail } : { error: message },
    { status },
  );
}

function computeTotalScore(axes: AxisScores): number {
  let sum = 0;
  (Object.keys(AXIS_WEIGHTS) as Array<keyof AxisScores>).forEach((k) => {
    sum += axes[k] * AXIS_WEIGHTS[k];
  });
  return Math.max(0, Math.min(1, sum));
}

function pickGrade(totalScore: number): Grade {
  if (totalScore < 0.30) return 'L1';
  if (totalScore < 0.55) return 'L2';
  if (totalScore < 0.78) return 'L3';
  return 'L4';
}

function pickConfidenceLevel(totalScore: number): ConfidenceLevel {
  if (totalScore >= 0.70) return 'auto';
  if (totalScore >= 0.40) return 'review';
  return 'designer';
}

// Image-derived qualityScore proxy. v1 used Sharp to compute this directly
// from pixel stats; the unified route avoids that 600ms+ network+decode cost
// and derives a 0..100 proxy from category strength, supplier richness, and
// image count. Good enough for grade thresholds; a future revision can layer
// real Sharp signals on top.
function deriveQualityScore(axes: AxisScores, imageCount: number): number {
  const categoryStrength = axes.c1Category;
  const sourceRichness = 1 - axes.c4SourcePoverty;
  const imagePresence = Math.min(1, imageCount / 8);
  const score01 = categoryStrength * 0.4 + sourceRichness * 0.4 + imagePresence * 0.2;
  return Math.round(score01 * 100);
}

// v1 competition expects 0..2 (1.0 = category average). t4Competition is 0..1
// where higher = more competition pressure, so map t4 to the 0..2 axis.
function deriveCompetitionScore(t4: number): number {
  return Math.max(0, Math.min(2, t4 * 2));
}

// v1 roiScore centered around 0 (positive = ROI risk). Use 1 - c3RevenuePotential
// scaled to roughly [-1..1] so higher revenue potential → negative ROI risk.
function deriveRoiScore(c3: number): number {
  return (0.5 - c3) * 2;
}

// Reuse v2 picker logic (kept inline here to avoid forcing a route → route
// import). Mirrors the archived v2 implementation.
function pickSkeleton(args: {
  category: string | null;
  naverCategoryCode: string | null;
  productName: string;
  description: string | null;
  giftHits: number;
  emotionalHits: number;
}): { id: SkeletonId; reason: string } {
  const { category, naverCategoryCode, productName, description, giftHits, emotionalHits } = args;
  const safeCategory = category && category !== 'uncategorized' ? category : '';
  const haystack = `${safeCategory} ${productName} ${description ?? ''}`.toLowerCase();
  const code = naverCategoryCode ?? '';

  const isApparel = /(\bclothes\b|\bwear\b|\bapparel\b)|의류|티셔츠|바지|원피스|상의|하의/.test(haystack)
    || code.startsWith('50000167');
  if (isApparel) {
    if (giftHits >= 1) return { id: 'S14', reason: 'apparel + gift signals -> care/safety' };
    if (emotionalHits >= 1) return { id: 'S13', reason: 'apparel + emotional tone -> comfort homewear' };
    return { id: 'S6', reason: 'apparel default' };
  }
  if (/(\bbaby\b|\bkid\b|\bchildcare\b)|출산|육아|아기|유아|영유아/.test(haystack)
      || code.startsWith('50000003') || code.startsWith('50000201')) {
    return { id: 'S14', reason: 'baby/childcare keywords -> care/safety' };
  }
  if (/(\bflower\b|\bplant\b)|꽃|화분|식물/.test(haystack)) {
    return { id: 'S1', reason: 'flower/plant keywords' };
  }
  if (/(\bfood\b|\bdessert\b)|식품|디저트|간식|과자/.test(haystack)) {
    return { id: 'S2', reason: 'food/dessert keywords' };
  }
  if (/(\bpet\b|\bdog\b|\bcat\b)|반려|강아지|고양이/.test(haystack)) {
    return { id: 'S10', reason: 'pet keywords' };
  }
  if (/(\bhealth\b|\bbeauty\b|\bcosmetic\b)|건강|뷰티|화장품|스킨케어/.test(haystack)) {
    return { id: 'S7', reason: 'health/beauty keywords' };
  }
  if (/(\belectronics\b|\bappliance\b)|가전|전자|이어폰|블루투스/.test(haystack)) {
    return { id: 'S9', reason: 'electronics keywords' };
  }
  if (/(\bseasonal\b|\bchristmas\b|\bevent\b)|시즌|이벤트|크리스마스|할로윈/.test(haystack)) {
    return { id: 'S11', reason: 'seasonal/event keywords' };
  }
  if (/(\bcustom\b)|커스텀|맞춤|주문제작/.test(haystack)) {
    return { id: 'S12', reason: 'custom-made keywords' };
  }
  if (/^11_08_22/.test(code) || /인테리어|소품|데코|장식/.test(haystack)) {
    return { id: 'S3', reason: 'interior decor / emotional living (category beats gift signals)' };
  }
  if (giftHits >= 2) return { id: 'S5', reason: 'multiple gift keywords -> premium gift' };
  if (code.startsWith('5000')) return { id: 'S3', reason: 'naver code 50000xx fallback -> emotional living' };
  if (/^11_/.test(code)) return { id: 'S3', reason: 'naver code 11_xx fallback -> emotional living' };
  return { id: 'S3', reason: 'global default' };
}

export async function POST(req: Request) {
  let body: DiagnoseBody;
  try {
    body = (await req.json()) as DiagnoseBody;
  } catch {
    return jsonError('invalid JSON body', 400);
  }

  if (!body.productId) {
    return jsonError('productId required', 400);
  }

  const product = await prisma.product.findUnique({
    where: { id: body.productId },
    select: {
      id: true,
      name: true,
      category: true,
      naverCategoryCode: true,
      supplierPrice: true,
      salePrice: true,
      margin: true,
      imageCount: true,
      description: true,
      supplier: {
        select: {
          platformCode: true,
          name: true,
        },
      },
    },
  });

  if (!product) {
    return jsonError('product not found', 404, { productId: body.productId });
  }

  const meta = await getCategoryMetadata(product.naverCategoryCode);
  const currentMonth = new Date().getMonth() + 1;

  const productInputs = {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    naverCategoryCode: product.naverCategoryCode,
    supplierPrice: product.supplierPrice,
    salePrice: product.salePrice,
    margin: product.margin,
    imageCount: product.imageCount,
  };
  const supplierInputs = {
    platformCode: product.supplier.platformCode,
    name: product.supplier.name,
  };

  const axes = computeAllAxes({
    product: productInputs,
    supplier: supplierInputs,
    meta,
    currentMonth,
  });
  const totalScore = computeTotalScore(axes);
  const recommendedGrade = pickGrade(totalScore);
  const confidenceLevel = pickConfidenceLevel(totalScore);
  const inferenceConfidence = Math.round(totalScore * 100);

  const giftHits = giftKeywordCount(productInputs);
  const emotionalHits = emotionalKeywordCount(productInputs);
  const skeleton = pickSkeleton({
    category: product.category,
    naverCategoryCode: product.naverCategoryCode ?? null,
    productName: product.name,
    description: product.description,
    giftHits,
    emotionalHits,
  });

  const qualityScore = deriveQualityScore(axes, product.imageCount);
  const competitionScore = deriveCompetitionScore(axes.t4Competition);
  const roiScore = deriveRoiScore(axes.c3RevenuePotential);

  const conceptTone: Record<string, string> = {
    skeleton: skeleton.id,
    grade: recommendedGrade,
    confidence: confidenceLevel,
    tone: axes.t1ToneScore >= 0.5 ? 'warm' : 'neutral',
    seasonality: axes.t2Seasonality >= 0.5 ? 'in-season' : 'off-season',
  };

  const reasoning = {
    method: 'unified-v2-with-v1-compat',
    skeletonReason: skeleton.reason,
    weightedAxes: Object.fromEntries(
      (Object.keys(axes) as Array<keyof AxisScores>).map((k) => [
        k,
        { raw: axes[k], weight: AXIS_WEIGHTS[k], contribution: axes[k] * AXIS_WEIGHTS[k] },
      ]),
    ),
    sourceSignals: {
      imageCount: product.imageCount,
      descriptionLength: (product.description ?? '').length,
      giftHits,
      emotionalHits,
      currentMonth,
    },
    categoryMetadata: {
      source: meta.source,
      monthlySearchVolume: meta.monthlySearchVolume,
      competitionLevel: meta.competitionLevel,
      avgPrice: meta.avgPrice,
    },
    supplier: {
      platformCode: product.supplier.platformCode,
    },
  };

  const shouldPersist = body.persist !== false;
  let persisted = false;
  let persistError: string | null = null;

  if (shouldPersist) {
    try {
      await prisma.$transaction([
        prisma.diagnosis.upsert({
          where: { productId: product.id },
          create: {
            productId: product.id,
            qualityScore,
            qualitySignals: { derived: true, axes } as unknown as Prisma.InputJsonValue,
            competitionScore,
            roiScore,
            roiBreakdown: { c3RevenuePotential: axes.c3RevenuePotential } as Prisma.InputJsonValue,
            conceptTone: conceptTone as Prisma.InputJsonValue,
            skeletonId: skeleton.id,
            inferenceConfidence,
            grade: recommendedGrade,
            confidenceLevel,
            recommendedSections: [],
          },
          update: {
            qualityScore,
            qualitySignals: { derived: true, axes } as unknown as Prisma.InputJsonValue,
            competitionScore,
            roiScore,
            roiBreakdown: { c3RevenuePotential: axes.c3RevenuePotential } as Prisma.InputJsonValue,
            conceptTone: conceptTone as Prisma.InputJsonValue,
            skeletonId: skeleton.id,
            inferenceConfidence,
            grade: recommendedGrade,
            confidenceLevel,
            recommendedSections: [],
            diagnosedAt: new Date(),
          },
        }),
        prisma.diagnosisResult.upsert({
          where: { productId: product.id },
          create: {
            productId: product.id,
            c1Category: axes.c1Category,
            c2PriceTier: axes.c2PriceTier,
            c3RevenuePotential: axes.c3RevenuePotential,
            c4SourcePoverty: axes.c4SourcePoverty,
            t1ToneScore: axes.t1ToneScore,
            t2Seasonality: axes.t2Seasonality,
            t3GiftScore: axes.t3GiftScore,
            t4Competition: axes.t4Competition,
            t5BrandIdentity: axes.t5BrandIdentity,
            totalScore,
            recommendedGrade,
            recommendedSkeleton: skeleton.id,
            reasoning: reasoning as Prisma.InputJsonValue,
          },
          update: {
            c1Category: axes.c1Category,
            c2PriceTier: axes.c2PriceTier,
            c3RevenuePotential: axes.c3RevenuePotential,
            c4SourcePoverty: axes.c4SourcePoverty,
            t1ToneScore: axes.t1ToneScore,
            t2Seasonality: axes.t2Seasonality,
            t3GiftScore: axes.t3GiftScore,
            t4Competition: axes.t4Competition,
            t5BrandIdentity: axes.t5BrandIdentity,
            totalScore,
            recommendedGrade,
            recommendedSkeleton: skeleton.id,
            reasoning: reasoning as Prisma.InputJsonValue,
            diagnosedAt: new Date(),
          },
        }),
      ]);
      persisted = true;
    } catch (err) {
      persistError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json({
    grade: recommendedGrade,
    confidenceLevel,
    inferenceConfidence,
    qualityScore,
    skeletonId: skeleton.id,
    conceptTone,
    persisted,
    persistError,
    v2: {
      axes,
      totalScore,
      reasoning,
    },
  });
}
