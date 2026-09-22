// src/app/api/ai/aesthetic-wit/route.ts
// ============================================================================
// AESTHETIC_WIT_2026-09-22 (#48 근본수정) — Hook/Detail/Attitude 3단계 카피를
// 텍스트로 미리보기 생성. Hook(공감형 도발)=generateProblemCopy, Detail
// (핵심 팩트)=generateSpecRows, Attitude(시크한 클로징)=generateAttitudeCopy
// — 전부 이미 존재하는 section-copy.ts 함수를 그대로 재사용(#295 단일권위,
// 새 카피 생성 로직을 중복 구현하지 않음). 이 엔드포인트가 신규로 하는 일은
// "PNG 렌더링 없이 3개 카피 함수만 순서대로 호출해 텍스트로 반환"뿐이다.
//
// 신규 판정엔진 아님 — 결과는 항상 사람이 검토할 "후보"이며 자동 확정
// 저장이 없다(#353 반자동 원칙).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { S1 } from '@/lib/automation/layout-skeletons/s1-budget-daily-single';
import {
  generateProblemCopy,
  generateSpecRows,
  generateAttitudeCopy,
} from '@/lib/automation/section-renderers/section-copy';
import type { SectionRenderContext } from '@/lib/automation/section-renderers/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const productName: string = typeof body?.productName === 'string' ? body.productName.trim() : '';
    const category: string | undefined = typeof body?.category === 'string' ? body.category.trim() : undefined;

    if (!productName) {
      return NextResponse.json({ success: false, error: '상품명이 필요합니다.' }, { status: 400 });
    }

    // sourceImageUrl is required by SectionRenderContext's type but none of
    // the three copy functions used here actually read it (they only touch
    // productName/category/spec) — a placeholder is safe.
    const ctx: SectionRenderContext = {
      productName,
      category,
      sourceImageUrl: '',
    };

    const [hook, detail, attitude] = await Promise.all([
      generateProblemCopy(S1, ctx),
      generateSpecRows(S1, ctx),
      generateAttitudeCopy(S1, ctx),
    ]);

    return NextResponse.json({
      success: true,
      hook: { question: hook.value.question, bullets: hook.value.bullets, filtered: hook.filtered },
      detail: { rows: detail.value.rows, filtered: detail.filtered },
      attitude: { closingLine: attitude.value.closingLine, signOff: attitude.value.signOff, filtered: attitude.filtered },
    });
  } catch (e: unknown) {
    // 원인 상세는 노출하지 않는다(#156/#310) — 실패했다는 사실만 정직하게 전달.
    return NextResponse.json({ success: false, error: '카피 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
