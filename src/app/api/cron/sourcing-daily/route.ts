// src/app/api/cron/sourcing-daily/route.ts
// 2026-08-08: E-7(꼬띠 소싱 추천)을 cron/daily에서 분리한 독립 크론(#333 후속).
// cron/daily가 8단계 외부 API를 순차 실행하며 Hobby maxDuration(기본 10초)을
// 넘겨, 순서상 후반부였던 E-7이 강제종료로 아예 발송되지 못하던 것이 아침
// 소싱 알림 미발송의 근본원인이었다. 동일 스케줄(0 23 * * * UTC = 08:00 KST)의
// 별도 Vercel 함수로 분리해 다른 섹션의 지연과 완전히 독립시킨다.
//
// 근본수정 2단계(2026-08-11, #338): 위 분리 당시 이 라우트를 실제 작업을 하는
// /api/sourcing-recommend로 HTTP self-fetch 하도록 만들었는데, 그 라우트에
// maxDuration 지정이 빠져 있어 Hobby 기본 10초 제한에 걸렸다(실측: dryRun만
// 으로도 8.4초 — DB저장+Discord발송까지 더하면 넘기기 쉬움). self-fetch는
// "다른 함수를 부르는" 방식이라 이 라우트의 maxDuration=60은 그 함수엔
// 적용되지 않는다 — 별개 서버리스 함수이기 때문. 이제 self-fetch를 없애고
// runSourcingScan()을 같은 프로세스 안에서 직접 호출한다(sourcing-recommender.ts
// — 이 라우트의 maxDuration=60이 전체를 커버).

import { NextRequest, NextResponse } from 'next/server';
import { runSourcingScan } from '@/lib/sourcing-recommender';
import { withCronLogging } from '@/lib/cron/with-logging';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── Auth guard (cron/daily와 동일 패턴) ───────────────────────────────────────
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev mode: no secret = open
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export const GET = withCronLogging('/api/cron/sourcing-daily', async (req: NextRequest) => {
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
    const outcome = await runSourcingScan({ dryRun: sourcingPaused, sendToDiscord: true });
    results.sourcingRecommend = {
      dryRun: outcome.dryRun,
      sent: outcome.discordSent,
      opportunities: outcome.skipped
        ? (outcome.skippedExistingCount ?? 0)
        : outcome.scan.opportunities.length,
      excludedCount: outcome.scan.excludedCount ?? 0,
      skipped: outcome.skipped,
    };
  } catch (srcErr) {
    results.sourcingRecommendError = srcErr instanceof Error ? srcErr.message.slice(0, 200) : String(srcErr);
  }

  return NextResponse.json({
    ok:        true,
    timestamp: new Date().toISOString(),
    ...results,
  });
});
