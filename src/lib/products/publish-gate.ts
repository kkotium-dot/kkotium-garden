// src/lib/products/publish-gate.ts
// ============================================================================
// 발행 차단 게이트 — SINGLE authority (작업원칙 #286, #285, #62).
//
// ── 왜 필요한가 ─────────────────────────────────────────────────────────────
// 발행 검증이 "준비도"만 봤다: 대표이미지·카테고리·필수필드. 그런데 준비도가
// 100%여도 **공급사가 도매처에서 내린 상품**은 발행하면 안 된다. 발행 즉시
// 매입이 불가능하므로:
//   1) 주문이 들어오면 취소해야 하고 → 취소율이 스토어 등급을 깎는다
//   2) 신규 상품 7일 노출 부스트를 매입 불가 상품에 날린다
//   3) 발행 직후 품절 처리하면 그 상품 URL은 시작부터 죽은 상태가 된다
//
// "준비됐는가"와 "지금 팔 수 있는가"는 다른 질문이다. 준비도는 **상품 데이터의
// 완성도**고, 이 게이트는 **공급 가능성**을 본다. 둘 다 통과해야 발행이다.
//
// 처분 권고(#273)와 같은 신호를 쓰지만 결론이 다르다: 처분은 "이미 발행된
// 상품을 어떻게 할까", 이 게이트는 "아직 안 올린 상품을 올려도 되나".
//
// PURE (no I/O) — 클라이언트 모달과 서버 라우트 양쪽에서 같은 규칙을 쓴다(#32).
// 전상품 범용(#55).
// ============================================================================

/** 발행을 막아야 하는 이유. null이면 발행 가능. */
export type PublishBlockReason = 'SOURCE_GONE' | 'SUPPLIER_OUT_OF_STOCK';

export interface PublishGateInput {
  /** 공급처 단절 판정(source-gone.ts 단일 권위 #271). */
  sourceGone?: boolean | null;
  /** 공급사 재고. 음수는 조회 실패 센티널(#260)이지 실재고가 아니다. */
  qty?: number | null;
  /** 공급사(도매꾹) 상품 상태. '판매중'이 아니면 매입 불가로 본다. */
  supplierStatus?: string | null;
}

export interface PublishGateVerdict {
  /** 발행을 막아야 하는가. */
  blocked: boolean;
  reason: PublishBlockReason | null;
}

const SUPPLIER_STATUS_ACTIVE = '판매중'; // 판매중

const PASS: PublishGateVerdict = { blocked: false, reason: null };

/**
 * 이 상품을 지금 발행해도 되는지. 재고 신호가 아예 없으면(폴링 전) 통과시킨다 —
 * 모르는 것을 이유로 막으면 신규 소싱 상품을 영영 못 올린다(#82 degrade 사상).
 */
export function checkPublishGate(inv: PublishGateInput | undefined | null): PublishGateVerdict {
  if (!inv) return PASS;

  // 1. 공급처 단절 — 확정 차단. 다시 들여올 수 없는 상품을 새로 올릴 이유가 없다.
  if (inv.sourceGone === true) return { blocked: true, reason: 'SOURCE_GONE' };

  // 2. 조회 실패(qty<0, #260)는 차단 사유가 아니다. 일시적 폴링 실패일 수 있고,
  //    지속되면 위 sourceGone이 잡는다. 모른다고 막지 않는다.
  if ((inv.qty ?? 0) < 0) return PASS;

  // 3. 공급사 품절 — 발행해도 즉시 품절 처리해야 한다. 재입고 후 올리는 게 맞다.
  if ((inv.qty ?? 0) <= 0) return { blocked: true, reason: 'SUPPLIER_OUT_OF_STOCK' };
  const s = inv.supplierStatus;
  if (s && s !== SUPPLIER_STATUS_ACTIVE && s !== 'unknown') {
    return { blocked: true, reason: 'SUPPLIER_OUT_OF_STOCK' };
  }

  return PASS;
}

/** 차단 여부만 필요할 때. */
export function isPublishBlocked(inv: PublishGateInput | undefined | null): boolean {
  return checkPublishGate(inv).blocked;
}
