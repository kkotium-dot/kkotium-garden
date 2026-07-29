// src/app/api/products/[id]/review-approve/route.ts
// ============================================================================
// ADR-0003 검수 승인 엔드포인트. publish-review-gate.ts(assertPublishable)가
// 읽는 Product.reviewChecklist를 쓰는 유일한 경로 — 이게 없으면 게이트가
// "전부 차단" 상태로만 존재한다(#307 인계).
//
// GET  — 씨앗심기 발행전검수 화면이 현재 승인 상태를 렌더링하기 위한 읽기.
// PATCH — action:'approve' | 'revoke'.
//   approve: readiness===100 && blockingImageWarnings===0 이어야 승인 가능
//     (아직 안 끝난 상품을 승인해봐야 다른 사유로 어차피 막혀 의미 없다).
//     gateSnapshot에 화이트리스트 필드 스냅샷을 함께 저장(#316-A REVIEW_STALE
//     판정용 — loadReviewInputs와 같은 계산을 재사용해 드리프트 방지, #62).
//   revoke: approved:false로 뒤집되 이전 gateSnapshot/approvedAt은 감사기록으로
//     보존(완전 삭제 안 함) — 운영자가 되돌릴 길이 필요하다는 설계 결정.
//
// 비가역 아님(DB 플래그, 승인 취소 가능) — #46 GO 게이트 대상 아님.
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  decidePublishGate,
  loadReviewInputs,
  type ReviewChecklist,
} from '@/lib/products/publish-review-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const productId = params.id;
  const inputs = await loadReviewInputs(productId);
  if (!inputs.ok) {
    return NextResponse.json({ success: false, error: 'product not found or DB unavailable' }, { status: 404 });
  }

  const review = decidePublishGate({
    readinessScore: inputs.readinessScore,
    blockingImageWarningCount: inputs.blockingImageWarningCount,
    reviewChecklist: inputs.reviewChecklist,
    currentSnapshot: inputs.currentSnapshot,
  });

  return NextResponse.json({
    success: true,
    review,
    reviewChecklist: inputs.reviewChecklist,
    readinessScore: inputs.readinessScore,
    blockingImageWarningCount: inputs.blockingImageWarningCount,
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const productId = params.id;
  let body: { action?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'invalid JSON body' }, { status: 400 });
  }

  if (body.action === 'approve') {
    const inputs = await loadReviewInputs(productId);
    if (!inputs.ok) {
      return NextResponse.json({ success: false, error: 'product not found or DB unavailable' }, { status: 404 });
    }
    if (inputs.readinessScore < 100 || inputs.blockingImageWarningCount > 0) {
      return NextResponse.json({
        success: false,
        error: '준비도·이미지 경고가 남아 있어 검수 승인할 수 없습니다.',
        readinessScore: inputs.readinessScore,
        blockingImageWarningCount: inputs.blockingImageWarningCount,
      }, { status: 400 });
    }

    const checklist: ReviewChecklist = {
      approved: true,
      approvedAt: new Date().toISOString(),
      gateSnapshot: {
        readiness: inputs.readinessScore,
        imageWarnings: inputs.blockingImageWarningCount,
        fields: inputs.currentSnapshot,
      },
      ...(body.note ? { note: body.note } : {}),
    };

    try {
      await prisma.product.update({
        where: { id: productId },
        data: { reviewChecklist: checklist as object, reviewLastUpdated: new Date() },
      });
    } catch (e) {
      return NextResponse.json(
        { success: false, error: e instanceof Error ? e.message : String(e) },
        { status: 500 },
      );
    }

    const review = decidePublishGate({
      readinessScore: inputs.readinessScore,
      blockingImageWarningCount: inputs.blockingImageWarningCount,
      reviewChecklist: checklist,
      currentSnapshot: inputs.currentSnapshot,
    });
    return NextResponse.json({ success: true, review, reviewChecklist: checklist });
  }

  if (body.action === 'revoke') {
    let existing;
    try {
      existing = await prisma.product.findUnique({
        where: { id: productId },
        select: { reviewChecklist: true },
      });
    } catch (e) {
      return NextResponse.json(
        { success: false, error: e instanceof Error ? e.message : String(e) },
        { status: 500 },
      );
    }
    if (!existing) {
      return NextResponse.json({ success: false, error: 'product not found' }, { status: 404 });
    }

    const prior = (existing.reviewChecklist as ReviewChecklist | null) ?? null;
    const checklist: ReviewChecklist = {
      ...prior,
      approved: false,
      ...(body.note ? { note: body.note } : {}),
    };

    try {
      await prisma.product.update({
        where: { id: productId },
        data: { reviewChecklist: checklist as object, reviewLastUpdated: new Date() },
      });
    } catch (e) {
      return NextResponse.json(
        { success: false, error: e instanceof Error ? e.message : String(e) },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      review: { approved: false, reasons: ['NOT_REVIEWED'] },
      reviewChecklist: checklist,
    });
  }

  return NextResponse.json({ success: false, error: "action must be 'approve' or 'revoke'" }, { status: 400 });
}
