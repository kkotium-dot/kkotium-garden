// src/app/api/cron/stock-alert-pm/route.ts
// ============================================================================
// STOCK ALERT — PM RUN (B15, docs/plan/B11_B13_B15_HANDOFF_SPEC_2026-09-09.md)
//
// 요구사항은 "품절 데일리 알림 2회"였다. 실측 결과 Vercel Hobby 플랜은 크론
// 실행빈도를 "동일 크론 잡당 하루 1회"로 제한한다(vercel.com/docs/cron-jobs —
// cron/order-sync/route.ts의 기존 주석이 이미 이 제약을 문서화하고, order-sync를
// cron/daily와 시차를 둔 별도 daily 크론으로 분리해 우회하고 있었다). 이 라우트는
// 그 패턴을 그대로 따라 "OOS 감지 + 대체상품 알림"만 떼어낸 별도 크론이다 — 크론
// 잡 자체는 각각 하루 1번이라 플랜 제약을 어기지 않는다.
//
// ⚠️ 실행 시각(vercel.json: 12:00 UTC = 21:00 KST)은 cron/daily(08:00 KST)와
// 반나절 이상 떨어뜨린 것 외엔 근거가 없는 임의값이다 — Gemini 정리본이 제안한
// "오전9시·오후2시"는 근거 없는 추정치로 판단해 채택하지 않았다(#357). 정확한
// 최적 시각은 운영 데이터(품절→주문 손실 타이밍 분포) 없이는 확정할 수 없어
// Desktop 판단이 필요하다.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withCronLogging } from '@/lib/cron/with-logging';
import { runStockOutAlertCheck } from '@/lib/cron/stock-alert-check';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev mode: no secret = open
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export const GET = withCronLogging('/api/cron/stock-alert-pm', async (req: NextRequest) => {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const products = await prisma.product.findMany({
      where: { status: { not: 'INACTIVE' } },
      orderBy: { updatedAt: 'desc' },
      take: 300,
    });
    const result = await runStockOutAlertCheck(products);
    return NextResponse.json({ ok: true, stockAlert: result, timestamp: new Date().toISOString() });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[cron/stock-alert-pm] error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
});
