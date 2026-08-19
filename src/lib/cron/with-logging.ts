// B4-A 크론 수신 계측(rev123 인계, #337 우회) — Vercel Hobby는 크론 실행이력을
// 사후 조회할 API가 없어, Vercel이 크론 호출 시 보내는 user-agent(vercel-cron/1.0)
// · x-vercel-cron-schedule 헤더를 자체 기록해 "호출됐는지"를 직접 증명한다.
//
// 기록(create)은 각 라우트의 CRON_SECRET 인증 검사보다 먼저 일어나야 한다 —
// 그래야 "인증 실패로 401"과 "애초에 호출 자체가 없었음"을 구분할 수 있다.
// 로깅 자체의 실패가 크론 본체 실행을 막으면 안 되므로 create/update 모두
// try/catch로 격리한다.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type CronHandler = (req: NextRequest) => Promise<NextResponse>;

export function withCronLogging(path: string, handler: CronHandler): CronHandler {
  return async (req: NextRequest) => {
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
