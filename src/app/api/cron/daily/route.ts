// src/app/api/cron/daily/route.ts
// Unified daily cron — runs at 08:00 KST (23:00 UTC previous day)
// Triggers: daily recommendation, OOS detection, score drop detection, Naver sync
// All Discord channels fire from this single endpoint

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loadDispositionVerdicts } from '@/lib/products/disposition-load';
import {
  sendDiscord,
  buildRecommendEmbed,
  buildStockAlertEmbed,
  buildScoreDropEmbed,
  buildPublishReadyAlert,
  buildRevivalAlert,
  buildZombieAlert,
  buildZombieDetectedAlert,
  buildMarginWarnAlert,
  getSeasonContext,
  GRADE_EMOJI,
} from '@/lib/discord';
import { refreshCategoryTrendCache } from '@/lib/naver/category-trend-cache';
import { naverRequest } from '@/lib/naver/api-client';
import { scoreProduct, computeOpsDigestSignals, computeRecommendation } from '@/lib/notifications/daily-signals';

// ── Auth guard ──────────────────────────────────────────────────────────────
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev mode: no secret = open
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
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
    // #293/#290 — status만 보면 **공급처가 끊긴 상품이 알림에서 통째로 빠진다.**
    // 그런 상품은 앱 status가 ACTIVE로 남기 때문. 디스코드는 운영자가 앱을
    // 열지 않아도 받는 유일한 채널이라, 여기서 누락되면 아예 모르고 지나간다.
    // 화면(대기함·대시보드)과 같은 판정을 써서 앱이 한 목소리를 내게 한다(#62).
    let dispositionPendingIds = new Set<string>();
    let daysOosById = new Map<string, number | null>();
    try {
      const verdicts = await loadDispositionVerdicts();
      for (const v of verdicts) {
        if (v.verdict.action !== 'NONE') dispositionPendingIds.add(v.productId);
        daysOosById.set(v.productId, v.verdict.daysOutOfStock);
      }
    } catch {
      // best-effort(#82) — 판정 실패가 일일 크론 전체를 막으면 안 된다.
      // 이 경우 아래 status 기준만으로 degrade한다(알림이 아예 안 가는 것보다 낫다).
    }
    const oosProducts = products.filter(
      p => p.status === 'OUT_OF_STOCK' || dispositionPendingIds.has(p.id),
    );

    if (oosProducts.length > 0) {
      // Record events for new OOS products (those without a recent event).
      // ※ 이벤트는 "status가 OUT_OF_STOCK으로 바뀜"의 기록이므로 **status 기준을
      //   유지**한다. 처분 판정 대상(공급처 단절 등)까지 OOS 이벤트로 남기면
      //   이벤트의 의미가 흐려진다 — 알림 대상과 이벤트 대상은 다른 축이다.
      for (const p of oosProducts.filter(x => x.status === 'OUT_OF_STOCK')) {
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
          // 실제 품절 지속일(#273) — "3일째 품절"처럼 체감되는 정보를 준다.
          daysOos:       daysOosById.get(p.id) ?? undefined,
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
      // 튜닝 필요도 지수 (#256 P4) — 좀비 판정을 getReactivationReason의
      // long_inactive 단일 신호에서 품절+실적/마진위기/성장여력/악성재고 복합
      // 지수로 교체(#252 재사용: revival-score/honey-score/name-diagnosis/
      // category-trend-cache/SupplierStockProfile 배치 로더).
      const { publishReady, revival, zombie, zombieDetected, marginWarn } =
        await computeOpsDigestSignals(products as any);

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
      // #256 P4-4 — 좀비 감지 실시간 알림(근거+마진+수정 바로가기), 상위 5건.
      if (zombieDetected.length > 0) {
        const top = zombieDetected.slice(0, 5);
        const r = await sendDiscord('KKOTTI_SCORE', '', top.map(buildZombieDetectedAlert));
        opsDigest.zombieDetected = { sent: r.ok, count: zombieDetected.length, notified: top.length };
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
    const { top5, seasonTop2, trendNote, trendSource, trendKeywords } =
      await computeRecommendation(products as any, season);
    results.trends = { source: trendSource, keywords: trendKeywords };

    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    // #257 — always send, even when top5 is empty: buildRecommendEmbed already
    // renders an honest "오늘 추천할 상품이 없어요" state (S.noProducts) for an
    // empty list. Previously this branch was skipped entirely when there was
    // nothing to recommend, which read as "the alert is broken" rather than
    // "there's genuinely nothing to recommend today" (진단 2026-07-13 §2B).
    const recResult = await sendDiscord(
      'KKOTTI_RECOMMEND',
      '',
      [buildRecommendEmbed({ today, top3: top5, season, seasonTop2, appUrl, trendNote })]
    );
    results.recommendation = { sent: recResult.ok, top5Count: top5.length, trendSource };

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
