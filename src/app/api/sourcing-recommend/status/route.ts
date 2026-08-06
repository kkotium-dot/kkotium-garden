// src/app/api/sourcing-recommend/status/route.ts
// 트랙C-1(docs/design/SOURCING_NAKJEOM_PIPELINE_2026-08-05.md): 소싱 낙점 상태 변경.
// 스캔(POST /api/sourcing-recommend)과 목적이 다르므로 별도 엔드포인트로 분리
// (#316 게이트 분리 사상). 낙점은 내부 상태만 바꾸며 네이버/디스코드와 무관 —
// 비가역 아님, 발송·PUT 위험 0.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 허용 상태값 — 스키마의 operator_status VarChar(20)에 저장되는 값.
// null = 미검토(발견됨), 나머지 3종은 낙점 상태.
const ALLOWED = ['interested', 'sourcing_started', 'skipped'] as const;
type AllowedStatus = (typeof ALLOWED)[number];

function isAllowed(v: unknown): v is AllowedStatus {
  return typeof v === 'string' && (ALLOWED as readonly string[]).includes(v);
}

// PATCH: 소싱 기회 레코드의 낙점 상태를 변경한다.
// body: { recordId?: string, keyword?: string, date?: string, status: <AllowedStatus>|null }
//  - recordId 우선. 없으면 keyword(+date, 기본 오늘)로 오늘자 레코드를 찾는다.
//  - status=null 이면 낙점 해제(미검토로 되돌림) — 관심 토글 off에 사용.
export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const recordId = typeof body.recordId === 'string' ? body.recordId : undefined;
    const keyword = typeof body.keyword === 'string' ? body.keyword : undefined;
    const dateStr = typeof body.date === 'string' ? body.date : undefined;
    const rawStatus = body.status;

    // status는 허용값이거나 명시적 null(낙점 해제)만 받는다.
    if (rawStatus !== null && !isAllowed(rawStatus)) {
      return NextResponse.json(
        { ok: false, error: 'invalid status' },
        { status: 400 },
      );
    }
    const status: AllowedStatus | null = rawStatus === null ? null : (rawStatus as AllowedStatus);

    // 대상 레코드 결정: recordId 우선, 없으면 keyword+date(오늘).
    let targetId = recordId;
    if (!targetId) {
      if (!keyword) {
        return NextResponse.json(
          { ok: false, error: 'recordId or keyword required' },
          { status: 400 },
        );
      }
      const dayStart = dateStr ? new Date(dateStr) : new Date();
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const found = await prisma.sourcingOpportunityRecord
        .findFirst({
          where: { keyword, date: { gte: dayStart, lt: dayEnd } },
          orderBy: { rank: 'asc' },
          select: { id: true },
        })
        .catch(() => null); // P2021 가드 — 마이그레이션 이전 배포에서도 안전

      if (!found) {
        return NextResponse.json(
          { ok: false, error: 'record not found' },
          { status: 404 },
        );
      }
      targetId = found.id;
    }

    const updated = await prisma.sourcingOpportunityRecord
      .update({
        where: { id: targetId },
        data: {
          operatorStatus: status,
          operatorStatusAt: status === null ? null : new Date(),
        },
        select: { id: true, operatorStatus: true },
      })
      .catch(() => null); // P2021/P2022 가드

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: 'update failed' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      recordId: updated.id,
      status: updated.operatorStatus,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
