// src/lib/products/sales-assets.ts
// ============================================================================
// 자산 보호 판단 (작업원칙 #272) — SINGLE authority.
//
// 네이버 스마트스토어의 실질 자산은 "상품 URL에 누적된 이력"이다: 리뷰·구매평,
// 판매 건수, 찜, 그리고 상품ID 기준으로 축적된 검색 순위. 상품을 삭제하면 이
// 전부가 영구 소멸하고, 같은 상품을 재등록해도 리뷰 0·순위 0의 신규 상품이
// 된다(순위 회복에 수개월).
//
// 따라서 공급처가 끊긴 상품이라도 판매 이력이 있으면 "삭제"가 아니라
// "판매중지 + 대체 소싱"(같은 URL에서 공급처만 교체 → 순위·리뷰 승계)을
// 권해야 한다. 파워셀러 실무 표준이며, 유료 셀러툴들도 삭제 대신 이 경로를 민다.
// 판매 이력이 없는 미완성/미판매 상품만 삭제가 안전하다.
//
// PURE (no I/O, no prisma) — 클라이언트 컴포넌트(/products page)와 서버 양쪽에서
// 같은 규칙을 쓰기 위해 DB 접근이 있는 source-gone.ts와 분리했다(#62 단일 권위는
// 유지: source-gone.ts가 이 모듈을 re-export).
// ============================================================================

export interface SalesAssetInput {
  salesCount?: number | null;
  lastSaleDate?: string | Date | null;
}

/**
 * 지켜야 할 판매 자산(리뷰·순위·판매이력)이 있는지. 하나라도 있으면 true —
 * 이 경우 삭제 대신 판매중지/대체소싱을 권장한다.
 */
export function hasSalesAssets(p: SalesAssetInput): boolean {
  if ((p.salesCount ?? 0) > 0) return true;
  if (p.lastSaleDate) return true; // 판매된 적이 있으면 리뷰가 달렸을 수 있다
  return false;
}
