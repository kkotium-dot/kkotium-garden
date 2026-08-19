// B4-A 크론 수신 계측(rev123 인계, #337 우회) — Vercel Hobby는 크론 실행이력을
// 사후 조회할 API가 없어, Vercel이 크론 호출 시 보내는 user-agent(vercel-cron/1.0)
// · x-vercel-cron-schedule 헤더를 자체 기록해 "호출됐는지"를 직접 증명한다.
//
// 기록(create)은 각 라우트의 CRON_SECRET 인증 검사보다 먼저 일어나야 한다 —
// 그래야 "인증 실패로 401"과 "애초에 호출 자체가 없었음"을 구분할 수 있다.
// 로깅 자체의 실패가 크론 본체 실행을 막으면 안 되므로 create/update 모두
// try/catch로 격리한다.
//
// P1-1(2026-08-20, Desktop) — 크론 라우트는 사람이 curl로도 찔러볼 수 있고
// 브라우저 미리보기·헬스체크 봇도 지나간다. 그런 "크론 형태가 아닌" 요청까지
// 전부 기록하면 cron_invocation_log가 노이즈로 뒤덮여 정작 봐야 할 관측값
// (내일 08:00~09:00 KST에 sourcing-daily가 실제로 불렸는지)을 찾기 어려워진다.
// user-agent가 'vercel-cron'로 시작하거나 x-vercel-cron-schedule 헤더가 있거나
// Authorization: Bearer가 있는 요청만 "크론 형태"로 보고 기록한다.
// ★ Bearer 값이 틀려도(=CRON_SECRET 불일치) 헤더 자체는 존재하므로 크론 형태
//   판정을 통과해 계속 기록된다 — 401도 반드시 남아야 하는 게 이 계측의 핵심
//   관측값이다(#337: "호출은 됐는데 인증 실패"와 "애초에 호출이 없었음"을
//   구분하는 게 목적). 이 가드는 순수 잡음 요청(UA·헤더 셋 다 없음)만 거른다.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type CronHandler = (req: NextRequest) => Promise<NextResponse>;

function looksLikeCronRequest(req: NextRequest): boolean {
  const userAgent = req.headers.get('user-agent') ?? '';
  const hasCronSchedule = req.headers.has('x-vercel-cron-schedule');
  const hasBearer = (req.headers.get('authorization') ?? '').startsWith('Bearer ');
  return userAgent.startsWith('vercel-cron') || hasCronSchedule || hasBearer;
}

export function withCronLogging(path: string, handler: CronHandler): CronHandler {
  return async (req: NextRequest) => {
    if (!looksLikeCronRequest(req)) {
      return handler(req);
    }

    const userAgent = req.headers.get('user-agent');
    const cronSchedule = req.headers.get('x-vercel-cron-schedule');

    let logId: string | null = null;
    try {
      const log = await prisma.cronInvocationLog.create({
        data: { path, userAgent, cronSchedule },
        select: { id: true },
      });
      logId = log.id;
    } catch (e) {
      console.error('[cron-logging] failed to record invocation:', e);
    }

    const start = Date.now();
    let res: NextResponse;
    let outcome: string;
    let errorMessage: string | null = null;
    try {
      res = await handler(req);
      outcome = res.ok ? 'ok' : `http_${res.status}`;
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : String(e);
      outcome = 'error';
      res = NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }
    const durationMs = Date.now() - start;
    const authOk = res.status !== 401;

    if (logId) {
      try {
        await prisma.cronInvocationLog.update({
          where: { id: logId },
          data: { authOk, outcome, durationMs, errorMessage },
        });
      } catch (e) {
        console.error('[cron-logging] failed to update invocation:', e);
      }
    }

    return res;
  };
}
