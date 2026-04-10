// /api/products/score-check
// Called after product save to detect honey score drops ≥20 pts
// Sends to Discord #📉꼬띠-점수급락

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calcHoneyScore } from '@/lib/honey-score';
import { sendDiscord, buildScoreDropEmbed } from '@/lib/discord';

// Score drop threshold

export const dynamic = 'force-dynamic';
const DROP_THRESHOLD = 20;

// Reason analysis
function analyzeDropReason(
  prev: ReturnType<typeof calcHoneyScore>,
  curr: ReturnType<typeof calcHoneyScore>
): string {
  const reasons: string[] = [];
  if (prev.marginScore - curr.marginScore >= 10) reasons.push(`수익성 ${prev.marginScore}→${curr.marginScore}점`);
  if (prev.seoScore - curr.seoScore >= 10)       reasons.push(`SEO ${prev.seoScore}→${curr.seoScore}점`);
  if (prev.competitionScore - curr.competitionScore >= 10) reasons.push('경쟁강도 증가');
  if (reasons.length === 0) reasons.push(`전체 점수 ${prev.total}→${curr.total}점`);
  return reasons.join(', ');
}

export async function POST(req: Request) {
  try {
    const { productId, previousScore } = await req.json();
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true, name: true, sku: true,
        salePrice: true, supplierPrice: true,
        naverCategoryCode: true, mainImage: true,
        keywords: true, tags: true,
        aiScore: true,  // previously stored score
      },
    });

    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const currentScore = calcHoneyScore({
      salePrice:     product.salePrice,
      supplierPrice: product.supplierPrice ?? 0,
      categoryId:    product.naverCategoryCode ?? '',
      productName:   product.name,
      keywords:      Array.isArray(product.keywords) ? product.keywords as string[] : [],
      tags:          Array.isArray(product.tags) ? product.tags as string[] : [],
      hasMainImage:  !!product.mainImage,
    });

    // Use provided previousScore OR stored aiScore
    const prevScoreNum = previousScore ?? product.aiScore ?? null;
    const dropAmt = prevScoreNum !== null ? prevScoreNum - currentScore.total : 0;

    // Update stored score
    await prisma.product.update({
      where: { id: productId },
      data: { aiScore: currentScore.total },
    }).catch(() => null);

    if (prevScoreNum === null || dropAmt < DROP_THRESHOLD) {
      return NextResponse.json({
        success: true,
        currentScore: currentScore.total,
        previousScore: prevScoreNum,
        dropAmt,
        alertSent: false,
        message: dropAmt < DROP_THRESHOLD ? `점수 변화 ${dropAmt}점 — 알림 기준 미달` : '이전 점수 없음',
      });
    }

    // Build previous score object for reason analysis (approximation)
    const prevScoreObj = calcHoneyScore({
      salePrice:     product.salePrice * 1.05,  // rough reversal approximation
      supplierPrice: product.supplierPrice ?? 0,
      categoryId:    product.naverCategoryCode ?? '',
      productName:   product.name,
    });

    const reason = analyzeDropReason(prevScoreObj, currentScore);
    const embed = buildScoreDropEmbed({
      drops: [{
        productName: product.name,
        sku: product.sku,
        oldScore: prevScoreNum,
        newScore: currentScore.total,
        dropAmt,
        reason,
      }],
    });

    const result = await sendDiscord('KKOTTI_SCORE', '', [embed]);

    return NextResponse.json({
      success: true,
      currentScore: currentScore.total,
      previousScore: prevScoreNum,
      dropAmt,
      alertSent: result.ok,
      reason,
    });
  } catch (err) {
    console.error('[score-check]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
