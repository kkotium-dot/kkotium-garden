// Sprint 7-M2 Step 2 — POST /api/diagnose-v2
//
// Real 9-axis CTI diagnosis writing to DiagnosisResult. Replaces the Step 1
// scaffold with deterministic, signal-driven scoring backed by the
// category_metadata_cache (PlayMCP runtime adapter).
//
// Coexists with /api/diagnose (Sprint 7-Diag MVP, writes to Diagnosis model).
// DO NOT remove the v1 route until v2 reaches parity — Step 4 owns that call.

import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { computeAllAxes, giftKeywordCount, emotionalKeywordCount } from '@/lib/diagnosis/score-engine';
import type { AxisScores } from '@/lib/diagnosis/score-engine';
import { getCategoryMetadata } from '@/lib/diagnosis/playmcp-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Grade = 'L1' | 'L2' | 'L3' | 'L4';
type SkeletonId =
  | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7'
  | 'S8' | 'S9' | 'S10' | 'S11' | 'S12' | 'S13' | 'S14';

interface DiagnoseBody {
  productId?: string;
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

// Upgraded picker — uses naverCategoryCode prefix as the strongest hint, then
// gift / emotional / niche signals to disambiguate between archetypes.
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

  // Apparel branch (Naver fashion top-level code 50000167/50000xxx fashion).
  const isApparel = /(\bclothes\b|\bwear\b|\bapparel\b)|의류|티셔츠|바지|원피스|상의|하의/.test(haystack)
    || code.startsWith('50000167');
  if (isApparel) {
    if (giftHits >= 1) return { id: 'S14', reason: 'apparel + gift signals -> care/safety' };
    if (emotionalHits >= 1) return { id: 'S13', reason: 'apparel + emotional tone -> comfort homewear' };
    return { id: 'S6', reason: 'apparel default' };
  }

  // Childcare / baby branch — overrides any premium gift bias.
  if (/(\bbaby\b|\bkid\b|\bchildcare\b)|출산|육아|아기|유아|영유아/.test(haystack)
      || code.startsWith('50000003') || code.startsWith('50000201')) {
    return { id: 'S14', reason: 'baby/childcare keywords -> care/safety' };
  }

  // Flower / plant.
  if (/(\bflower\b|\bplant\b)|꽃|화분|식물/.test(haystack)) {
    return { id: 'S1', reason: 'flower/plant keywords' };
  }

  // Food / dessert.
  if (/(\bfood\b|\bdessert\b)|식품|디저트|간식|과자/.test(haystack)) {
    return { id: 'S2', reason: 'food/dessert keywords' };
  }

  // Pet.
  if (/(\bpet\b|\bdog\b|\bcat\b)|반려|강아지|고양이/.test(haystack)) {
    return { id: 'S10', reason: 'pet keywords' };
  }

  // Health / beauty.
  if (/(\bhealth\b|\bbeauty\b|\bcosmetic\b)|건강|뷰티|화장품|스킨케어/.test(haystack)) {
    return { id: 'S7', reason: 'health/beauty keywords' };
  }

  // Electronics.
  if (/(\belectronics\b|\bappliance\b)|가전|전자|이어폰|블루투스/.test(haystack)) {
    return { id: 'S9', reason: 'electronics keywords' };
  }

  // Seasonal / event.
  if (/(\bseasonal\b|\bchristmas\b|\bevent\b)|시즌|이벤트|크리스마스|할로윈/.test(haystack)) {
    return { id: 'S11', reason: 'seasonal/event keywords' };
  }

  // Custom-made.
  if (/(\bcustom\b)|커스텀|맞춤|주문제작/.test(haystack)) {
    return { id: 'S12', reason: 'custom-made keywords' };
  }

  // Interior decor (Naver code 11_08_22_xx_xx) — emotional living archetype wins
  // over premium-gift even when 선물 keyword is present. Per handoff: category
  // beats gift-keyword strength here because the buyer is shopping for a room,
  // not a recipient.
  if (/^11_08_22/.test(code) || /인테리어|소품|데코|장식/.test(haystack)) {
    return { id: 'S3', reason: 'interior decor / emotional living (category beats gift signals)' };
  }

  // Strong gift signals — premium gift archetype.
  if (giftHits >= 2) return { id: 'S5', reason: 'multiple gift keywords -> premium gift' };

  // Naver category code prefix hints — fashion ranges, living ranges.
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

  const reasoning = {
    method: 'real-step-2',
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
    skeletonReason: skeleton.reason,
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
  });

  return NextResponse.json({
    grade: recommendedGrade,
    skeleton: skeleton.id,
    score: totalScore,
    reasoning,
  });
}
