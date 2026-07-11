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
  buildPublishReadyAlert,
  buildRevivalAlert,
  buildZombieAlert,
  buildMarginWarnAlert,
  getSeasonContext,
  GRADE_EMOJI,
} from '@/lib/discord';
import { computeRevivalScore, revivalSignalsFromProduct } from '@/lib/products/revival-score';
import { getReactivationReason } from '@/lib/daily-slots';
import { fetchNaverTrends, matchProductsToTrends } from '@/lib/trend-analyzer';
import { refreshCategoryTrendCache } from '@/lib/naver/category-trend-cache';
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
      // Auto-suspend performs a LIVE Naver mutation (PUT) + local OOS write. It
      // is OFF by default and only runs when NAVER_AUTOSUSPEND_ENABLED=true, so
      // fixing the read endpoint below cannot silently re-activate suspensions —
      // operator opt-in is required. While disabled the cron still reads stock
      // correctly and surfaces candidates in `wouldSuspend` (no mutation).
      const autoSuspendEnabled = process.env.NAVER_AUTOSUSPEND_ENABLED === 'true';
      const wouldSuspend: string[] = [];

      for (const p of naverProducts) {
        try {
          // The stored naverProductId is the originProductNo (verified 2026-06-06
          // via the inspect probe). channel-products 404s on an origin number, so
          // read stock/status from origin-products instead.
          const raw = await naverRequest(
            'GET',
            `/v2/products/origin-products/${p.naverProductId}`
          ) as Record<string, unknown>;

          const origin = (raw?.originProduct ?? raw ?? {}) as Record<string, unknown>;
          const stock  = Number(origin.stockQuantity ?? 999);
          const status = String(origin.statusType ?? '');

          // If Naver stock is 0 and not already suspended
          if (stock === 0 && status !== 'SUSPENSION' && status !== 'CLOSE') {
            if (!autoSuspendEnabled) {
              // Read-only candidate — surfaced for review, no mutation.
              wouldSuspend.push(p.name);
              continue;
            }
            // Suspend on Naver. §3-7 full-replace: merge the full origin and
            // override only statusType (v2 origin-products endpoint).
            await naverRequest(
              'PUT',
              `/v2/products/origin-products/${p.naverProductId}`,
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

      results.autoSuspend = {
        checked: naverProducts.length,
        suspended: suspendedCount,
        items: suspendedList,
        enabled: autoSuspendEnabled,
        wouldSuspend: autoSuspendEnabled ? [] : wouldSuspend,
      };

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

    // ── 2.5 Operational-event digest (#250 §2) ────────────────────────────
    // Reuse the already-loaded `products` — one morning digest per signal set,
    // routed by the repurposed channels. Green (digest) tier for standing sets;
    // margin loss fires red (realtime). Reuses existing pure helpers only.
    try {
      const publishReady: string[] = [];
      const revival: string[] = [];
      const zombie: string[] = [];
      const marginWarn: { name: string; margin: number }[] = [];

      for (const p of products) {
        // 발행 준비 완료: passes every upload-readiness check AND not yet live on Naver.
        if (!p.naverProductId) {
          const rd = calcUploadReadiness({
            naverCategoryCode: p.naverCategoryCode,
            keywords: Array.isArray(p.keywords) ? (p.keywords as string[]) : [],
            tags: Array.isArray(p.tags) ? (p.tags as string[]) : [],
            name: p.name,
            mainImage: p.mainImage,
            salePrice: p.salePrice,
            supplierPrice: p.supplierPrice,
          });
          if (rd.failed.length === 0) publishReady.push(p.name);
        }

        // 부활 후보 (revival S/A) + 좀비 (long_inactive).
        const rev = computeRevivalScore(revivalSignalsFromProduct({
          naver_status_type: (p as { naver_status_type?: string | null }).naver_status_type ?? null,
          status: p.status,
          naverProductId: p.naverProductId,
          name: p.name,
          mainImage: p.mainImage,
        }));
        if (rev.grade === 'S' || rev.grade === 'A') revival.push(p.name);

        const reason = getReactivationReason({
          ...p,
          createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
          lastSaleDate: p.lastSaleDate ? new Date(p.lastSaleDate) : undefined,
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : undefined,
        } as Parameters<typeof getReactivationReason>[0]);
        if (reason?.reason === 'long_inactive') zombie.push(p.name);

        // 마진 경고 (임계 이하: 순마진 < 20%, honey-score 위험 기준).
        if (p.salePrice > 0 && p.supplierPrice > 0) {
          const m = scoreProduct(p).netMarginRate;
          if (m < 20) marginWarn.push({ name: p.name, margin: m });
        }
      }

      const opsDigest: Record<string, unknown> = {};
      if (publishReady.length > 0) {
        const r = await sendDiscord('KKOTTI_RECOMMEND', '', [buildPublishReadyAlert(publishReady)]);
        opsDigest.publishReady = { sent: r.ok, count: publishReady.length };
      }
      if (revival.length > 0) {
        const r = await sendDiscord('KKOTTI_SCORE', '', [buildRevivalAlert(revival)]);
        opsDigest.revival = { sent: r.ok, count: revival.length };
      }
      if (zombie.length > 0) {
        const r = await sendDiscord('KKOTTI_SCORE', '', [buildZombieAlert(zombie)]);
        opsDigest.zombie = { sent: r.ok, count: zombie.length };
      }
      if (marginWarn.length > 0) {
        const r = await sendDiscord('PRICE_CHANGE', '', [buildMarginWarnAlert(marginWarn)]);
        opsDigest.marginWarn = { sent: r.ok, count: marginWarn.length };
      }
      results.opsDigest = opsDigest;
    } catch (e) {
      results.opsDigest = { error: e instanceof Error ? e.message.slice(0, 100) : String(e) };
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

    // ── A3-CRON-SYNC: Naver orders sync (added 2026-05-06) ────────────────
    // Daily auto-sync of last 24h orders. Without this, downstream modules
    // (auto confirm below, confirmation reminder widget, month review widget,
    // dashboard stats) all run on stale data. The sync route routes through
    // Tailscale Funnel via NAVER_PROXY_URL when set (production) or direct
    // Naver API call when not set (dev with registered home IP).
    try {
      const baseUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      const cronSecret = process.env.CRON_SECRET ?? '';
      const syncRes = await fetch(`${baseUrl}/api/naver/orders?hours=24`, {
        headers: cronSecret
          ? { Authorization: `Bearer ${cronSecret}` }
          : {},
      });
      const syncData = await syncRes.json();
      results.naverSync = {
        ok:      syncData.success ?? false,
        synced:  syncData.synced  ?? 0,
        skipped: syncData.skipped ?? 0,
        total:   syncData.total   ?? 0,
        period:  syncData.period  ?? null,
      };
    } catch (syncErr) {
      results.naverSyncError = syncErr instanceof Error ? syncErr.message.slice(0, 80) : String(syncErr);
    }

    // ── C-10: Auto order confirmation ────────────────────────────────────
    // Automatically confirm PAID orders that are older than 2 hours
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const pendingOrders = await prisma.order.findMany({
        where: {
          status: { in: ['PAID', 'PAYED'] },
          paidAt: { lt: twoHoursAgo },
        },
        select: { id: true, orderNumber: true, productName: true },
      });

      if (pendingOrders.length > 0) {
        const ids = pendingOrders.map(o => o.id);
        try {
          await naverRequest('POST', '/v1/pay-order/seller/product-orders/confirm', {
            productOrderIds: ids,
          });
          // Update local status
          await prisma.order.updateMany({
            where: { id: { in: ids } },
            data: { status: 'CONFIRMED', updatedAt: new Date() },
          });
          results.autoConfirmed = ids.length;

          // Discord notification
          await sendDiscord('OPS_REPORT', '', [{
            title: ':white_check_mark: Auto Order Confirmation',
            description: `${ids.length}건 주문 자동 발주확인 완료`,
            color: 0x16a34a,
            fields: pendingOrders.slice(0, 5).map(o => ({
              name: o.orderNumber?.slice(-12) ?? '',
              value: o.productName ?? '',
              inline: true,
            })),
            footer: { text: '꽃틔움 가든 · 자동 발주' },
            timestamp: new Date().toISOString(),
          }]).catch(() => null);
        } catch (confirmErr) {
          results.autoConfirmError = String(confirmErr);
        }
      } else {
        results.autoConfirmed = 0;
      }
    } catch (e) {
      results.autoConfirmError = String(e);
    }

    // ── D-3: Competition monitoring (daily scan) ─────────────────────────
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      const compRes = await fetch(`${baseUrl}/api/competition`, { method: 'POST' });
      const compData = await compRes.json();
      results.competitionAlerts = compData.alertCount ?? 0;
      results.competitionChecked = compData.totalChecked ?? 0;
    } catch (compErr) {
      results.competitionError = String(compErr);
    }

    // ── E-7: Kkotti sourcing recommendation (daily trend scan) ───────────
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      const srcRes = await fetch(`${baseUrl}/api/sourcing-recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discord: true }),
      });
      const srcData = await srcRes.json();
      results.sourcingRecommend = {
        sent: srcData.discordSent ?? false,
        opportunities: srcData.opportunityCount ?? 0,
      };
    } catch (srcErr) {
      results.sourcingRecommendError = String(srcErr);
    }

    // Sprint 7 P0-B enhancement: refresh DataLab category trend cache.
    // Powers the golden-window-tracker market context. Failure is non-fatal.
    try {
      const trendRefresh = await refreshCategoryTrendCache();
      results.categoryTrendRefresh = trendRefresh;
    } catch (trendErr) {
      results.categoryTrendRefreshError = String(trendErr).slice(0, 200);
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
