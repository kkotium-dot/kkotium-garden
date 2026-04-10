// src/app/api/cron/daily/route.ts
// Unified daily cron — runs at 08:00 KST (23:00 UTC previous day)
// Triggers: daily recommendation, OOS detection, score drop detection, Naver sync
// All Discord channels fire from this single endpoint

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calcHoneyScore } from '@/lib/honey-score';
import { calcUploadReadiness } from '@/lib/upload-readiness';
import {
  sendDiscord,
  buildRecommendEmbed,
  buildStockAlertEmbed,
  buildScoreDropEmbed,
  getSeasonContext,
  GRADE_EMOJI,
} from '@/lib/discord';
import { fetchNaverTrends, matchProductsToTrends } from '@/lib/trend-analyzer';

// ── Auth guard ──────────────────────────────────────────────────────────────
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev mode: no secret = open
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

// ── Honey score helper with grade ──────────────────────────────────────────
function scoreProduct(p: {
  salePrice: number;
  supplierPrice: number;
  naverCategoryCode?: string | null;
  name: string;
  keywords?: unknown;
  tags?: unknown;
  mainImage?: string | null;
}) {
  return calcHoneyScore({
    salePrice:     p.salePrice,
    supplierPrice: p.supplierPrice,
    categoryId:    p.naverCategoryCode ?? '',
    productName:   p.name,
    keywords:      Array.isArray(p.keywords) ? (p.keywords as string[]) : [],
    tags:          Array.isArray(p.tags)     ? (p.tags     as string[]) : [],
    hasMainImage:  !!p.mainImage,
  });
}

// ── Main handler ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  try {
    // Fetch all non-inactive products
    const products = await prisma.product.findMany({
      where: { status: { not: 'INACTIVE' } },
      include: { supplier: { select: { name: true, id: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 300,
    });

    // ── 1. OOS detection ──────────────────────────────────────────────────
    const oosProducts = products.filter(p => p.status === 'OUT_OF_STOCK');

    if (oosProducts.length > 0) {
      // Record events for new OOS products (those without a recent event)
      for (const p of oosProducts) {
        const existing = await prisma.productEvent.findFirst({
          where: {
            productId: p.id,
            type: 'OOS',
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });
        if (!existing) {
          await prisma.productEvent.create({
            data: {
              productId: p.id,
              type: 'OOS',
              oldValue: 'ACTIVE',
              newValue: 'OUT_OF_STOCK',
              note: 'Detected by daily cron',
            },
          });
        }
      }

      const stockPayload = oosProducts.map(p => {
        const score = scoreProduct(p);
        return {
          name:          p.name,
          sku:           p.sku,
          salePrice:     p.salePrice,
          honeyScore:    score.total,
          honeyGrade:    score.grade,
          netMarginRate: score.netMarginRate,
          alternatives:  [],
        };
      });

      const stockResult = await sendDiscord(
        'STOCK_ALERT',
        '',
        [buildStockAlertEmbed({ products: stockPayload })]
      );
      results.stockAlert = { sent: stockResult.ok, count: oosProducts.length };
    } else {
      results.stockAlert = { sent: false, count: 0, reason: 'no OOS products' };
    }

    // ── 2. Score drop detection ───────────────────────────────────────────
    // Compare current honey score vs stored aiScore (previous snapshot)
    const scoreDrops: {
      productName: string;
      sku: string;
      oldScore: number;
      newScore: number;
      dropAmt: number;
      reason: string;
    }[] = [];

    for (const p of products) {
      if (p.aiScore === null || p.aiScore === undefined) continue;
      const current = scoreProduct(p);
      const drop = p.aiScore - current.total;
      if (drop >= 20) {
        scoreDrops.push({
          productName: p.name,
          sku:         p.sku,
          oldScore:    p.aiScore,
          newScore:    current.total,
          dropAmt:     drop,
          reason:      current.warnings.slice(0, 2).join(' / ') || 'Score recalculation',
        });

        // Record event
        const existing = await prisma.productEvent.findFirst({
          where: {
            productId: p.id,
            type: 'SCORE_DROP',
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });
        if (!existing) {
          await prisma.productEvent.create({
            data: {
              productId: p.id,
              type:      'SCORE_DROP',
              oldValue:  String(p.aiScore),
              newValue:  String(current.total),
              note:      `Drop: ${drop}pts`,
            },
          });
        }
      }
    }

    if (scoreDrops.length > 0) {
      const dropResult = await sendDiscord(
        'KKOTTI_SCORE',
        '',
        [buildScoreDropEmbed({ drops: scoreDrops })]
      );
      results.scoreDropAlert = { sent: dropResult.ok, count: scoreDrops.length };
    } else {
      results.scoreDropAlert = { sent: false, count: 0, reason: 'no score drops >= 20pts' };
    }

    // ── 3. Daily recommendation with Perplexity trend boost ─────────────
    const season = getSeasonContext();

    // Fetch today's Naver trends via Perplexity (non-blocking fallback if fails)
    const trends = await fetchNaverTrends();
    const trendMatches = matchProductsToTrends(products, trends);
    const trendBoostMap = new Map(trendMatches.map(m => [m.productId, m.boostScore]));
    results.trends = { source: trends.source, keywords: trends.trendKeywords, matched: trendMatches.length };

    // Score all eligible products — apply trend boost to honey score
    const scored = products
      .filter(p => p.salePrice > 0 && p.supplierPrice > 0)
      .map(p => {
        const base  = scoreProduct(p);
        const boost = trendBoostMap.get(p.id) ?? 0;
        return { p, score: { ...base, total: Math.min(base.total + boost, 100) }, boost };
      })
      .sort((a, b) => b.score.total - a.score.total);

    // Top 3 overall
    const top3 = scored.slice(0, 3).map(({ p, score }) => ({
      name:          p.name,
      score:         score.total,
      grade:         score.grade,
      netMarginRate: score.netMarginRate,
      supplierName:  p.supplier?.name,
    }));

    // Season top 2 (keyword match in name)
    const seasonTop2 = season
      ? scored
          .filter(({ p }) =>
            season.words.some(w => p.name.includes(w))
          )
          .slice(0, 2)
          .map(({ p, score }) => ({ name: p.name, score: score.total }))
      : [];

    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    if (top3.length > 0) {
      // Include trend context in Discord embed description
      const trendNote = trends.trendKeywords.length > 0
        ? `\n\n**오늘 네이버 트렌드**: ${trends.trendKeywords.slice(0, 3).join(', ')} (${trends.source})`
        : '';

      const recResult = await sendDiscord(
        'KKOTTI_RECOMMEND',
        '',
        [buildRecommendEmbed({ today, top3, season, seasonTop2, appUrl, trendNote })]
      );
      results.recommendation = { sent: recResult.ok, top3Count: top3.length, trendSource: trends.source };
    } else {
      results.recommendation = { sent: false, reason: 'no eligible products' };
    }

    // ── 4. Persist today's recommendation to DB ───────────────────────────
    if (top3.length > 0) {
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);

      await prisma.daily_recommendations.deleteMany({
        where: { date: todayDate },
      });

      await prisma.daily_recommendations.createMany({
        data: top3.map((item, i) => ({
          date:         todayDate,
          product_name: item.name,
          honey_score:  item.score,
          season_tag:   season?.label ?? null,
          status:       'sent',
        })),
      });

      results.dbSaved = top3.length;
    }

    return NextResponse.json({
      ok:        true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[cron/daily] error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
