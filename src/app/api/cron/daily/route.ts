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
import { naverRequest } from '@/lib/naver/api-client';
import { fetchKeywordStats } from '@/lib/naver/keyword-api';

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

    // ── 0. B-4: Auto suspend out-of-stock products via Naver API ─────────
    // Checks naverProductId products for stock=0 and suspends them on Naver
    try {
      const naverProducts = await (prisma as any).product.findMany({
        where: {
          naverProductId: { not: null },
          status: { in: ['ACTIVE', 'OUT_OF_STOCK'] },
        },
        select: { id: true, name: true, naverProductId: true, status: true, sku: true },
      });

      let suspendedCount = 0;
      const suspendedList: string[] = [];

      for (const p of naverProducts) {
        try {
          const raw = await naverRequest(
            'GET',
            `/v1/products/channel-products/${p.naverProductId}`
          ) as Record<string, unknown>;

          const origin = (raw?.originProduct ?? {}) as Record<string, unknown>;
          const stock  = Number(origin.stockQuantity ?? 999);
          const status = String((raw?.channelProduct as Record<string, unknown>)?.channelProductDisplayStatusType ?? origin.statusType ?? '');

          // If Naver stock is 0 and not already suspended
          if (stock === 0 && status !== 'SUSPENSION' && status !== 'CLOSE') {
            // Call Naver API to suspend product
            await naverRequest(
              'PUT',
              `/v1/products/origin-products/${p.naverProductId}`,
              { originProduct: { ...origin, statusType: 'SUSPENSION' } }
            ).catch(() => null); // non-fatal if update fails

            // Update local DB
            await (prisma as any).product.update({
              where: { id: p.id },
              data: { status: 'OUT_OF_STOCK', updatedAt: new Date() },
            }).catch(() => null);

            suspendedList.push(p.name);
            suspendedCount++;
          }
        } catch {
          // Per-product error — skip silently
        }
      }

      results.autoSuspend = { checked: naverProducts.length, suspended: suspendedCount, items: suspendedList };

      // Discord alert if any suspended
      if (suspendedCount > 0) {
        await sendDiscord(
          'STOCK_ALERT',
          '',
          [{
            title: `B-4 자동 품절 처리 — ${suspendedCount}건`,
            description: suspendedList.map(n => `• ${n}`).join('\n'),
            color: 0xe62310,
          }]
        ).catch(() => null);
      }
    } catch (e) {
      results.autoSuspend = { error: e instanceof Error ? e.message.slice(0, 80) : String(e) };
    }

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

    // ── Step 3 (C-5): Include SOURCED crawl_logs in recommendation pool ─
    // Fetch unregistered sourcing shelf items — treat them as candidate products
    let sourcingCandidates: Array<{
      id: string; name: string; score: ReturnType<typeof scoreProduct>;
      boost: number; isSourcing: true;
      supplierPrice: number; salePrice: number;
      keywords: string[];
    }> = [];
    try {
      const crawlItems = await (prisma as any).crawlLog.findMany({
        where: { sourcingStatus: 'SOURCED', name: { not: null }, supplierPrice: { gt: 0 } },
        orderBy: { crawledAt: 'desc' },
        take: 30,
      });

      // Estimate sale price: supplierPrice × 2.5 (typical markup for analysis)
      sourcingCandidates = crawlItems
        .map((c: any) => {
          const estSalePrice = Math.round(c.supplierPrice * 2.5);
          const sc = scoreProduct({
            salePrice:     estSalePrice,
            supplierPrice: c.supplierPrice,
            naverCategoryCode: c.categoryCode ?? null,
            name:          c.name ?? '',
            keywords:      [],
            tags:          [],
            mainImage:     null,
          });
          const trendBoost = trendMatches
            .filter(m => c.name && m.productId === c.id)
            .reduce((s: number, m: any) => s + m.boostScore, 0);
          return {
            id:            c.id,
            name:          c.name ?? '',
            score:         { ...sc, total: Math.min(sc.total + trendBoost, 100) },
            boost:         trendBoost,
            isSourcing:    true as const,
            supplierPrice: c.supplierPrice,
            salePrice:     estSalePrice,
            keywords:      [],
          };
        })
        .filter((c: any) => c.score.netMarginRate >= 20); // only viable margin
      results.sourcingPool = { total: crawlItems.length, viable: sourcingCandidates.length };
    } catch (e) {
      results.sourcingPool = { error: e instanceof Error ? e.message.slice(0, 60) : String(e) };
    }

    // Score all eligible products — apply trend boost to honey score
    const scored = products
      .filter(p => p.salePrice > 0 && p.supplierPrice > 0)
      .map(p => {
        const base  = scoreProduct(p);
        const boost = trendBoostMap.get(p.id) ?? 0;
        return { p, score: { ...base, total: Math.min(base.total + boost, 100) }, boost };
      })
      .sort((a, b) => b.score.total - a.score.total);

    // ── Step 3-A: Fetch keyword search volume for top candidates ─────────
    // Use Naver Search Ad API to re-rank by real keyword data
    // Fetch volume for top 10 candidates, then re-sort with volume boost
    const top10Candidates = scored.slice(0, 10);
    const volumeBoostMap = new Map<string, number>();
    try {
      // Collect primary keywords from each candidate
      const keywordBatches: { productId: string; keyword: string }[] = [];
      for (const { p } of top10Candidates) {
        const kws = Array.isArray(p.keywords) ? (p.keywords as string[]) : [];
        if (kws[0]) keywordBatches.push({ productId: p.id, keyword: kws[0] });
      }
      if (keywordBatches.length > 0) {
        // Batch by 5 (API limit)
        const uniqueKws = [...new Set(keywordBatches.map(k => k.keyword))].slice(0, 5);
        const stats = await fetchKeywordStats(uniqueKws).catch(() => []);
        const volumeMap = new Map<string, number>(stats.map(s => [s.keyword, s.totalMonthly] as [string, number]));
        for (const { productId, keyword } of keywordBatches) {
          const vol = Number(volumeMap.get(keyword) ?? 0);
          // Blue-ocean scoring: 1k~10k = sweet spot (+5), <1k = niche (+3), >10k = crowded (+1)
          const volBoost = vol >= 1000 && vol < 10000 ? 5 : vol < 1000 && vol > 0 ? 3 : vol >= 10000 ? 1 : 0;
          volumeBoostMap.set(productId, volBoost);
        }
      }
      results.keywordVolume = { fetched: keywordBatches.length, boosted: volumeBoostMap.size };
    } catch (e) {
      results.keywordVolume = { error: e instanceof Error ? e.message.slice(0, 60) : String(e) };
    }

    // Re-rank with volume boost — merge DB products + sourcing candidates, take TOP 5
    const scoredWithBoost = scored.map(item => ({
      id:            item.p.id,
      name:          item.p.name,
      finalScore:    Math.min(item.score.total + (volumeBoostMap.get(item.p.id) ?? 0), 100),
      grade:         item.score.grade,
      netMarginRate: item.score.netMarginRate,
      supplierName:  (item.p as any).supplier?.name as string | undefined,
      keywords:      Array.isArray(item.p.keywords) ? (item.p.keywords as string[]).slice(0, 3) : [],
      volumeBoost:   volumeBoostMap.get(item.p.id) ?? 0,
      isSourcing:    false as const,
    }));

    const sourcingWithBoost = sourcingCandidates.map(c => ({
      id:            c.id,
      name:          c.name,
      finalScore:    Math.min(c.score.total + (volumeBoostMap.get(c.id) ?? 0), 100),
      grade:         c.score.grade,
      netMarginRate: c.score.netMarginRate,
      supplierName:  undefined as string | undefined,
      keywords:      [] as string[],
      volumeBoost:   volumeBoostMap.get(c.id) ?? 0,
      isSourcing:    true as const,
    }));

    const reRanked = [...scoredWithBoost, ...sourcingWithBoost]
      .sort((a, b) => b.finalScore - a.finalScore);

    // Top 5 overall (C-5 upgrade: TOP3 → TOP5)
    const top5 = reRanked.slice(0, 5).map(item => ({
      name:          item.name,
      score:         item.finalScore,
      grade:         item.grade,
      netMarginRate: item.netMarginRate,
      supplierName:  item.supplierName,
      keywords:      item.keywords,
      volumeBoost:   item.volumeBoost,
      isSourcing:    item.isSourcing,
    }));
    // Keep top3 alias for backward compat with embed builder
    const top3 = top5.slice(0, 3);

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
        [buildRecommendEmbed({ today, top3: top5, season, seasonTop2, appUrl, trendNote })]
      );
      results.recommendation = { sent: recResult.ok, top5Count: top5.length, trendSource: trends.source };
    } else {
      results.recommendation = { sent: false, reason: 'no eligible products' };
    }

    // ── 4. Persist today's recommendation to DB ───────────────────────────
    if (top5.length > 0) {
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);

      await prisma.daily_recommendations.deleteMany({
        where: { date: todayDate },
      });

      await prisma.daily_recommendations.createMany({
        data: top5.map((item) => ({
          date:         todayDate,
          product_name: item.name,
          honey_score:  item.score,
          season_tag:   season?.label ?? null,
          status:       'sent',
        })),
      });

      results.dbSaved = top5.length;
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
