// /api/admin/test-daily-discord
// ============================================================================
// Manual test-send trigger for the 08:00 daily Discord digest (진단
// 2026-07-13 §2-A: "실제 발송 내용을 봐야 정밀 개선 가능·코드만으론 확정
// 불가"). Fires the SAME embeds the real cron would build — reuses
// computeOpsDigestSignals / computeRecommendation from
// @/lib/notifications/daily-signals so content is byte-identical to
// production, not a re-derived approximation.
//
// Scope is deliberately narrower than cron/daily: only the two channels the
// operator asked to inspect (KKOTTI_RECOMMEND / KKOTTI_SCORE). This route
// never touches Naver (no auto-suspend PUT, no order auto-confirm, no
// order sync) and never persists to daily_recommendations — a test run must
// not corrupt the real day's recommendation record or mutate live listings.
//
// This is a LIVE external send (real webhook, visible in the real channels).
// Two gates on top of admin auth, matching the codebase's #46 GO-gate
// convention for irreversible/outward actions:
//   - body.confirm !== true            -> dry-run: computes + returns
//                                          would-be embed content, sends nothing.
//   - body.confirm === true            -> actually POSTs to Discord.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  sendDiscord,
  buildRecommendEmbed,
  buildPublishReadyAlert,
  buildRevivalAlert,
  buildZombieAlert,
  buildZombieDetectedAlert,
  getSeasonContext,
} from '@/lib/discord';
import { computeOpsDigestSignals, computeRecommendation } from '@/lib/notifications/daily-signals';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  const headers = req.headers;
  const host = headers.get('host') ?? '';
  const origin = headers.get('origin') ?? '';
  const referer = headers.get('referer') ?? '';
  const auth = headers.get('authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return true;

  const candidates = [appUrl, `https://${host}`, `http://${host}`].filter(Boolean);
  if (origin && candidates.some((c) => origin.startsWith(c))) return true;
  if (referer && candidates.some((c) => referer.startsWith(c))) return true;

  return false;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let confirm = false;
  try {
    const body = await req.json();
    confirm = body?.confirm === true;
  } catch {
    // no body / not JSON — treat as dry-run
  }

  try {
    const products = await prisma.product.findMany({
      where: { status: { not: 'INACTIVE' } },
      include: { supplier: { select: { name: true, id: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 300,
    });

    const season = getSeasonContext();
    const [opsSignals, recommendation] = await Promise.all([
      computeOpsDigestSignals(products as any),
      computeRecommendation(products as any, season),
    ]);
    const { publishReady, revival, zombie, zombieDetected } = opsSignals;
    const { top5, seasonTop2, trendNote, trendSource } = recommendation;

    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const recommendEmbed = buildRecommendEmbed({ today, top3: top5, season, seasonTop2, appUrl, trendNote });

    const preview = {
      KKOTTI_RECOMMEND: {
        recommend: { top5Count: top5.length, trendSource, embedTitle: recommendEmbed.title },
        publishReady: publishReady.length,
      },
      KKOTTI_SCORE: {
        revival: revival.length,
        zombie: zombie.length,
        zombieDetected: zombieDetected.length,
      },
    };

    if (!confirm) {
      return NextResponse.json({ ok: true, dryRun: true, sent: false, preview, note: 'confirm:true 없이 미리보기만 반환 (실 발송 0)' });
    }

    // ── Live send (confirm:true) ────────────────────────────────────────
    const sentCounts: Record<string, unknown> = {};

    const recResult = await sendDiscord('KKOTTI_RECOMMEND', '', [recommendEmbed]);
    sentCounts.recommend = { sent: recResult.ok, top5Count: top5.length };

    if (publishReady.length > 0) {
      const r = await sendDiscord('KKOTTI_RECOMMEND', '', [buildPublishReadyAlert(publishReady)]);
      sentCounts.publishReady = { sent: r.ok, count: publishReady.length };
    }
    if (revival.length > 0) {
      const r = await sendDiscord('KKOTTI_SCORE', '', [buildRevivalAlert(revival)]);
      sentCounts.revival = { sent: r.ok, count: revival.length };
    }
    if (zombie.length > 0) {
      const r = await sendDiscord('KKOTTI_SCORE', '', [buildZombieAlert(zombie)]);
      sentCounts.zombie = { sent: r.ok, count: zombie.length };
    }
    if (zombieDetected.length > 0) {
      const top = zombieDetected.slice(0, 5);
      const r = await sendDiscord('KKOTTI_SCORE', '', top.map(buildZombieDetectedAlert));
      sentCounts.zombieDetected = { sent: r.ok, count: zombieDetected.length, notified: top.length };
    }

    return NextResponse.json({
      ok: true,
      dryRun: false,
      sent: true,
      runAt: new Date().toISOString(),
      sentCounts,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
