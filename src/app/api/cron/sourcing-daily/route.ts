// src/app/api/cron/sourcing-daily/route.ts
// 2026-08-08: E-7(꼬띠 소싱 추천)을 cron/daily에서 분리한 독립 크론(#333 후속).
// cron/daily가 8단계 외부 API를 순차 실행하며 Hobby maxDuration(기본 10초)을
// 넘겨, 순서상 후반부였던 E-7이 강제종료로 아예 발송되지 못하던 것이 아침
// 소싱 알림 미발송의 근본원인이었다. 동일 스케줄(0 23 * * * UTC = 08:00 KST)의
// 별도 Vercel 함수로 분리해 다른 섹션의 지연과 완전히 독립시킨다.

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── Auth guard (cron/daily와 동일 패턴) ───────────────────────────────────────
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev mode: no secret = open
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // ── E-7: 꼬띠 소싱 추천 (아침 KKOTTI_RECOMMEND 채널의 메인 알림) ──────────
  // 2026-08-05 운영자 방향 확정: 이 소싱 발굴 추천이 "오늘의 추천" 아침 알림의
  // 주인공이다(자사 DB 상품 추천은 cron/daily 섹션3에서 채널 발송 제거됨).
  // 기본 동작은 "발송" — SOURCING_RECOMMEND_LIVE를 명시적으로 'false'로
  // 설정할 때만 dry-run(비상 정지)이고, 미설정/그 외에는 실발송.
  try {
    const sourcingPaused = process.env.SOURCING_RECOMMEND_LIVE === 'false';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const srcRes = await fetch(`${baseUrl}/api/sourcing-recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discord: true, dryRun: sourcingPaused }),
    });
    const srcData = await srcRes.json();
    results.sourcingRecommend = {
      dryRun: sourcingPaused,
      sent: srcData.discordSent ?? false,
      opportunities: srcData.opportunityCount ?? 0,
      excludedCount: srcData.excludedCount ?? 0,
    };
  } catch (srcErr) {
    results.sourcingRecommendError = srcErr instanceof Error ? srcErr.message.slice(0, 200) : String(srcErr);
  }

  return NextResponse.json({
    ok:        true,
    timestamp: new Date().toISOString(),
    ...results,
  });
}
