// Sprint 7-M2 Smart Asset Workflow v3.1 FINAL — POST /api/diagnose-v2
//
// 9-axis CTI diagnosis scaffold writing to the new DiagnosisResult model.
// Step 1 = scaffold: c4SourcePoverty is computed from real product signals
// (imageCount + description length); c1-c3 + t1-t5 are placeholder pseudo-random
// in a stable per-product band. Step 2 will replace the placeholders with real
// scoring backed by PlayMCP category match, DataLab trends, and Naver SEO API.
//
// Coexists with /api/diagnose (Sprint 7-Diag MVP, writes to Diagnosis model).
// DO NOT remove the v1 route until v2 reaches parity.

import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Grade = 'L1' | 'L2' | 'L3' | 'L4';
type SkeletonId =
  | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7'
  | 'S8' | 'S9' | 'S10' | 'S11' | 'S12' | 'S13' | 'S14';

interface DiagnoseBody {
  productId?: string;
}

interface AxisScores {
  c1Category: number;
  c2PriceTier: number;
  c3RevenuePotential: number;
  c4SourcePoverty: number;
  t1ToneScore: number;
  t2Seasonality: number;
  t3GiftScore: number;
  t4Competition: number;
  t5BrandIdentity: number;
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

// Deterministic pseudo-random in [0, 1) seeded by a string. Replaces unseeded
// Math.random for stable scaffold scoring per product id.
function seededFloat(seed: string, salt: string): number {
  let h = 2166136261;
  const input = `${seed}::${salt}`;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Mix and fold to [0,1)
  const folded = ((h >>> 0) % 1_000_000) / 1_000_000;
  return folded;
}

// Source poverty is the one real signal in Step 1: how starved we are of source
// material from the supplier. Higher = more poverty = more lift required from
// our pipeline (master image generation, copy synthesis, etc.).
function computeSourcePoverty(args: {
  imageCount: number;
  descriptionLength: number;
}): number {
  const { imageCount, descriptionLength } = args;
  // Image starvation: 0 images = 1.0 poverty, 10+ images = 0.0 poverty
  const imageStarvation = Math.max(0, Math.min(1, 1 - imageCount / 10));
  // Description starvation: 0 chars = 1.0 poverty, 2000+ chars = 0.0 poverty
  const descStarvation = Math.max(0, Math.min(1, 1 - descriptionLength / 2000));
  // 60% image, 40% description — image starvation hurts more for visual SKUs
  return Math.min(1, imageStarvation * 0.6 + descStarvation * 0.4);
}

function pickSkeleton(args: {
  category: string | null;
  naverCategoryCode: string | null;
  productName: string;
}): SkeletonId {
  const { category, naverCategoryCode, productName } = args;
  // Drop placeholder category sentinel — historical rows used 'uncategorized' as
  // a literal value that collides with English keyword regex (e.g. 'cat' substring).
  const safeCategory = category && category !== 'uncategorized' ? category : '';
  const haystack = `${safeCategory} ${productName}`.toLowerCase();

  // Keyword sniff — Korean tokens are dominant; English fragments use word
  // boundaries to avoid false positives like 'cat' inside 'uncategorized'.
  if (/(\bflower\b|\bplant\b)|꽃|화분|식물/.test(haystack)) return 'S1';
  if (/(\bfood\b|\bdessert\b)|식품|디저트|간식/.test(haystack)) return 'S2';
  if (/(\bclothes\b|\bwear\b|\bapparel\b)|의류|티셔츠|바지|원피스/.test(haystack)) return 'S6';
  if (/(\bbaby\b|\bkid\b|\bchildcare\b)|출산|육아|아기/.test(haystack)) return 'S14';
  if (/(\bhomewear\b|\bpajama\b|\bloungewear\b)|홈웨어|잠옷|실내복/.test(haystack)) return 'S13';
  if (/(\bhealth\b|\bbeauty\b|\bcosmetic\b)|건강|뷰티|화장품/.test(haystack)) return 'S7';
  if (/(\bpet\b|\bdog\b|\bcat\b)|반려|강아지|고양이/.test(haystack)) return 'S10';
  if (/(\belectronics\b|\bappliance\b)|가전|전자/.test(haystack)) return 'S9';
  if (/(\bseasonal\b|\bchristmas\b|\bevent\b)|시즌|이벤트|크리스마스/.test(haystack)) return 'S11';
  if (/(\bcustom\b|\bmade\b)|커스텀|맞춤/.test(haystack)) return 'S12';
  if (/(\bpremium\b|\bluxury\b|\bgift\b)|선물|프리미엄|고급/.test(haystack)) return 'S5';

  // Naver category code prefix hints
  if (naverCategoryCode && naverCategoryCode.startsWith('5000')) return 'S3';
  if (safeCategory && /^11_/.test(safeCategory)) return 'S3';

  return 'S3';
}

function pickGrade(totalScore: number): Grade {
  if (totalScore < 0.30) return 'L1';
  if (totalScore < 0.55) return 'L2';
  if (totalScore < 0.78) return 'L3';
  return 'L4';
}

function computeAxes(args: {
  productId: string;
  imageCount: number;
  descriptionLength: number;
}): AxisScores {
  const { productId, imageCount, descriptionLength } = args;
  const c4 = computeSourcePoverty({ imageCount, descriptionLength });
  return {
    c1Category: seededFloat(productId, 'c1'),
    c2PriceTier: seededFloat(productId, 'c2'),
    c3RevenuePotential: seededFloat(productId, 'c3'),
    c4SourcePoverty: c4,
    t1ToneScore: seededFloat(productId, 't1'),
    t2Seasonality: seededFloat(productId, 't2'),
    t3GiftScore: seededFloat(productId, 't3'),
    t4Competition: seededFloat(productId, 't4'),
    t5BrandIdentity: seededFloat(productId, 't5'),
  };
}

function computeTotalScore(axes: AxisScores): number {
  let sum = 0;
  (Object.keys(AXIS_WEIGHTS) as Array<keyof AxisScores>).forEach((k) => {
    sum += axes[k] * AXIS_WEIGHTS[k];
  });
  return Math.max(0, Math.min(1, sum));
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
      imageCount: true,
      description: true,
    },
  });

  if (!product) {
    return jsonError('product not found', 404, { productId: body.productId });
  }

  const descriptionLength = (product.description ?? '').length;

  const axes = computeAxes({
    productId: product.id,
    imageCount: product.imageCount ?? 0,
    descriptionLength,
  });
  const totalScore = computeTotalScore(axes);
  const recommendedGrade = pickGrade(totalScore);
  const recommendedSkeleton = pickSkeleton({
    category: product.category,
    naverCategoryCode: product.naverCategoryCode ?? null,
    productName: product.name,
  });

  const reasoning = {
    method: 'scaffold-step-1',
    weightedAxes: Object.fromEntries(
      (Object.keys(axes) as Array<keyof AxisScores>).map((k) => [
        k,
        { raw: axes[k], weight: AXIS_WEIGHTS[k], contribution: axes[k] * AXIS_WEIGHTS[k] },
      ]),
    ),
    sourceSignals: {
      imageCount: product.imageCount ?? 0,
      descriptionLength,
    },
    skeletonReason: 'keyword-sniff + category-prefix fallback to S3',
  };

  await prisma.diagnosisResult.upsert({
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
      recommendedSkeleton,
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
      recommendedSkeleton,
      reasoning: reasoning as Prisma.InputJsonValue,
      diagnosedAt: new Date(),
    },
  });

  return NextResponse.json({
    grade: recommendedGrade,
    skeleton: recommendedSkeleton,
    score: totalScore,
    reasoning,
  });
}
