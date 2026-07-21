// src/lib/products/disposition.ts
// ============================================================================
// 상품 처분 권고 (Disposition) — SINGLE authority (작업원칙 #273, #272, #271, #62).
//
// "이 상품을 어떻게 할까?"의 답을 앱이 대신 판단한다. 지금까지는 신호만 보여주고
// (재고 배지·공급처 단절 배지·좀비 지수) 결론은 운영자 머릿속에 있었다. 신호가
// 늘수록 운영자가 매번 정책표를 다시 떠올려야 했고, 실제로 out-of-stock 페이지의
// 자체 로직은 판매 이력을 모른 채 "30일 품절 = 정리 권장"을 띄워 #272(자산 보호)와
// 정면으로 충돌하고 있었다. 그 결론을 이 파일 하나로 모은다(#62).
//
// 판정 규칙 (파워셀러 실무 표준 — 네이버의 실질 자산은 "상품 URL에 누적된 이력"):
//
//   | 상황                        | 권고                | 근거                       |
//   |-----------------------------|---------------------|----------------------------|
//   | 소싱 단절 + 판매이력 O      | 대체 소싱           | 삭제 시 리뷰·순위 영구 소멸 |
//   | 소싱 단절 + 판매이력 X      | 삭제 안전           | 지킬 자산 없음             |
//   | 품절 (단기)                 | 품절 처리           | 재입고 시 즉시 부활        |
//   | 품절 (14일 이상)            | 판매중지            | URL·리뷰 보존, 순위 방어   |
//   | 그 외                       | 권고 없음           | 조용해야 신호가 산다        |
//
// 설계 판단 2가지:
//
//  1. 소싱 단절은 *확정* 신호다(#271과 동일 사상). 재매입 불가는 마진·품절일수와
//     무관하므로 다른 조건보다 먼저 판정하고 덮어쓴다. 가중치 합산이 아니다.
//
//  2. 이미 조치된 상품에는 권고하지 않는다. 네이버 상태가 이미 SUSPENSION이거나,
//     단기 품절인데 이미 OUTOFSTOCK이면 NONE을 돌려준다. 권고는 "아직 안 한 일"일
//     때만 가치가 있고, 처리 끝난 상품에까지 배지가 남으면 경고 피로가 생겨
//     진짜 권고까지 무시하게 된다(#272에서 확인한 원칙 — 경고는 잃을 것에 비례).
//
// PURE (no I/O, no prisma) — 클라이언트 컴포넌트와 서버 라우트 양쪽에서 같은 규칙을
// 쓴다(#32: prisma 의존 모듈에서 분리해야 build가 통과한다).
// 전상품 범용(#55) — 특정 상품 하드코딩 금지(CLAUDE.md §0).
// ============================================================================

import { hasSalesAssets, type SalesAssetInput } from './sales-assets';

/**
 * 품절이 이 일수 이상 지속되면 "품절 처리" 대신 "판매중지"를 권고한다.
 * 근거: 네이버는 장기 품절 상품의 검색 노출을 점진적으로 낮춘다. 품절 상태로
 * 방치하면 순위가 서서히 깎이지만, 판매중지는 검색에서 내려가는 대신 상품 URL과
 * 리뷰·판매이력을 그대로 보존한다. 2주면 공급사 재입고 여부가 판가름난다는
 * 실무 감각과, 순위 손상이 누적되기 전이라는 시점이 맞물리는 지점(운영자 결정).
 */
export const LONG_OUT_OF_STOCK_DAYS = 14;

export type DispositionAction =
  /** 권고 없음 — 정상이거나, 신호가 불충분하거나, 이미 조치 완료. */
  | 'NONE'
  /** 일시 품절 — 스토어에서 품절 처리(OUTOFSTOCK). 재입고 시 즉시 부활. */
  | 'MARK_OUT_OF_STOCK'
  /** 장기 품절 — 판매중지(SUSPENSION). 검색에서 내려가나 URL·리뷰 보존. */
  | 'SUSPEND'
  /** 소싱 단절 + 판매 자산 O — 삭제 금지. 같은 URL에 다른 공급처를 연결. */
  | 'RESOURCE'
  /** 소싱 단절 + 판매 자산 X — 지킬 자산이 없으므로 삭제해도 안전. */
  | 'DELETE_SAFE';

/** 배지·카드 색 강도. 'none'이면 아예 렌더하지 않는다. */
export type DispositionSeverity = 'none' | 'info' | 'warn' | 'critical';

export interface DispositionInput extends SalesAssetInput {
  /** 공급처 단절 판정(source-gone.ts 단일 권위 #271). */
  sourceGone?: boolean | null;
  /** 공급사 재고. 음수는 조회 실패 센티널(#260)이지 실재고가 아니다. */
  qty?: number | null;
  /** 공급사(도매꾹) 상품 상태. '판매중'이 아니면 매입 불가로 본다. */
  supplierStatus?: string | null;
  /** 연속 품절 지속일. null이면 기간을 모르는 것으로 보고 단기로 취급한다. */
  daysOutOfStock?: number | null;
  /** 네이버 상품ID. 없으면 미발행(정원 창고) — 스토어 조치 대상이 아니다. */
  naverProductId?: string | null;
  /** 마지막으로 관측된 네이버 상태(SALE / OUTOFSTOCK / SUSPENSION / ...). */
  naverStatusType?: string | null;
}

export interface DispositionVerdict {
  action: DispositionAction;
  severity: DispositionSeverity;
  /** 판정에 쓰인 자산 유무 — 소비처가 문구를 다시 분기할 때 쓴다. */
  hasAssets: boolean;
  /** 판정에 쓰인 품절 지속일 (모르면 null). 문구에 일수를 넣을 때 쓴다. */
  daysOutOfStock: number | null;
}

const SUPPLIER_STATUS_ACTIVE = '\uD310\uB9E4\uC911'; // 판매중 (한글 리터럴 이스케이프 — InventoryBadge.tsx 관례)
const NAVER_SUSPENDED = 'SUSPENSION';
const NAVER_OUT_OF_STOCK = 'OUTOFSTOCK';

const NONE: DispositionVerdict = {
  action: 'NONE',
  severity: 'none',
  hasAssets: false,
  daysOutOfStock: null,
};

/** 공급사 조회가 실패한 상태인지(#260 센티널). 실재고 0과 구분해야 한다. */
function isLookupFailure(p: DispositionInput): boolean {
  return (p.qty ?? 0) < 0 || p.supplierStatus === 'unknown';
}

/** 공급사에서 지금 매입할 수 없는 상태인지. */
function isOutOfStock(p: DispositionInput): boolean {
  if ((p.qty ?? 0) <= 0) return true;
  const s = p.supplierStatus;
  return !!s && s !== SUPPLIER_STATUS_ACTIVE && s !== 'unknown';
}

/**
 * 이 상품을 어떻게 할지 판정한다. 소비처(배지·품절 페이지·삭제 게이트)는 이
 * 함수의 결론만 쓰고 자체 규칙을 두지 않는다(#62).
 */
export function decideDisposition(p: DispositionInput): DispositionVerdict {
  const hasAssets = hasSalesAssets(p);
  const days = typeof p.daysOutOfStock === 'number' && Number.isFinite(p.daysOutOfStock)
    ? p.daysOutOfStock
    : null;

  // 1. 소싱 단절 — 확정 신호. 발행 여부·품절일수와 무관하게 최우선(#271 사상).
  //    재매입이 불가능하다는 사실은 다른 어떤 조건으로도 상쇄되지 않는다.
  if (p.sourceGone === true) {
    return hasAssets
      ? { action: 'RESOURCE', severity: 'critical', hasAssets, daysOutOfStock: days }
      : { action: 'DELETE_SAFE', severity: 'warn', hasAssets, daysOutOfStock: days };
  }

  // 2. 미발행(정원 창고) — 스토어에 없으니 품절 처리·판매중지가 성립하지 않는다.
  //    소싱 신호등이 이미 "품절이에요"를 보여주므로 여기서 또 권고하지 않는다.
  if (!p.naverProductId) return NONE;

  // 3. 조회 실패 — 단절 임계(연속 3회) 미달이면 아직 판단할 근거가 없다.
  //    모르는 상태에서 권고하면 오히려 잘못된 조치를 유도한다(#260/#271).
  if (isLookupFailure(p)) return NONE;

  // 4. 재고 정상 — 권고 없음.
  if (!isOutOfStock(p)) return NONE;

  // 5. 이미 판매중지 — 조치 완료. 재권고는 경고 피로만 만든다.
  if (p.naverStatusType === NAVER_SUSPENDED) return NONE;

  // 6. 장기 품절 — 순위가 깎이기 전에 판매중지로 URL·리뷰를 보존한다.
  //    이미 품절 처리(OUTOFSTOCK)된 상품이라도 장기화되면 승격 권고가 맞다.
  if (days !== null && days >= LONG_OUT_OF_STOCK_DAYS) {
    return { action: 'SUSPEND', severity: 'warn', hasAssets, daysOutOfStock: days };
  }

  // 7. 이미 품절 처리된 단기 품절 — 조치 완료.
  if (p.naverStatusType === NAVER_OUT_OF_STOCK) return NONE;

  // 8. 단기 품절인데 스토어는 아직 판매중 — 품절 처리 권고.
  //    방치하면 주문이 들어와 취소해야 하고, 취소율은 스토어 등급을 깎는다.
  return { action: 'MARK_OUT_OF_STOCK', severity: 'info', hasAssets, daysOutOfStock: days };
}

/** 권고가 실제로 있는지 (severity 'none'이면 렌더하지 않는다). */
export function hasDisposition(v: DispositionVerdict): boolean {
  return v.action !== 'NONE';
}
