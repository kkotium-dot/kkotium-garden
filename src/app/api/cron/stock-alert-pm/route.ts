// src/app/api/cron/stock-alert-pm/route.ts
// ============================================================================
// STOCK ALERT — PM RUN (B15, docs/plan/B11_B13_B15_HANDOFF_SPEC_2026-09-09.md)
//
// 요구사항은 "재고 데일리 2회 자동 갱신 + 품절 알림"이었다. 실측 결과 Vercel
// Hobby 플랜은 크론 실행빈도를 "동일 크론 잡당 하루 1회"로 제한한다
// (vercel.com/docs/cron-jobs -- cron/order-sync/route.ts의 기존 주석이 이미
// 이 제약을 문서화하고, order-sync를 cron/daily와 시차를 둔 별도 daily
// 크론으로 분리해 우회하고 있었다). 이 라우트는 그 패턴을 그대로 따라
// 별도 daily 크론으로 만들었다 -- 크론 잡 자체는 각각 하루 1번이라 플랜
// 제약을 어기지 않는다.
//
// GAP_FIX_2026-09-09 (Desktop 재점검) -- 최초 구현은 재고를 새로 조회하지
// 않고 오전 cron/inventory-sync가 쌓아둔 inventory_snapshots를 그대로
// 재사용해 알림만 다시 보냈다. 이러면 "재고 데일리 2회"의 핵심(오후에 새로
// 품절된 상품을 그날 안에 잡아내는 것)이 충족되지 않는다 -- 다음날 자정
// inventory-sync가 돌 때까지 오후에 발생한 품절을 시스템이 전혀 모른다.
// 근본수정: 알림 로직 전에 pollAppRegisteredInventory()를 먼저 호출해
// 실제 재고를 재조회한다. 이제 "재고 재조회 2회(자정+오후)"가 실제로
// 성립한다.
//
// 실행 시각(vercel.json: 12:00 UTC = 21:00 KST)은 cron/daily(08:00 KST)와
// 반나절 이상 떨어뜨린 것 외엔 근거가 없는 임의값이다 -- Gemini 정리본이
// 제안한 "오전9시.오후2시"는 근거 없는 추정치로 판단해 채택하지 않았다
// (#357). 정확한 최적 시각은 운영 데이터(품절-주문 손실 타이밍 분포) 없이는
// 확정할 수 없어 Desktop 판단이 필요하다.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withCronLogging } from '@/lib/cron/with-logging';
import { runStockOutAlertCheck } from '@/lib/cron/stock-alert-check';
import { pollAppRegisteredInventory } from '@/lib/dome-inventory-poller';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // inventory poll + alert check both run here now

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
    // GAP_FIX_2026-09-09 -- re-poll real supplier inventory before alerting,
    // otherwise this PM run just re-announces the AM snapshot (#82
    // best-effort: a poll failure must not block the alert check that
    // follows -- the AM snapshot is still better than no alert at all).
    let pollResult: unknown = null;
    try {
      pollResult = await pollAppRegisteredInventory();
    } catch (e: unknown) {
      console.error('[cron/stock-alert-pm] inventory re-poll failed (continuing with existing snapshots):', e instanceof Error ? e.message : e);
    }

    const products = await prisma.product.findMany({
      where: { status: { not: 'INACTIVE' } },
      orderBy: { updatedAt: 'desc' },
      take: 300,
    });
    const result = await runStockOutAlertCheck(products);
    return NextResponse.json({ ok: true, poll: pollResult, stockAlert: result, timestamp: new Date().toISOString() });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[cron/stock-alert-pm] error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
});
