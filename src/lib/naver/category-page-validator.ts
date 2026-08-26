// src/lib/naver/category-page-validator.ts
// ============================================================================
// Sprint 7 P1-A (리서치 6번): 1-page category distribution validator
// ============================================================================
//
// 원래 설계: 상품명으로 네이버 쇼핑검색 1페이지(최대 30건)를 가져와 각 결과의
// 카테고리 브레드크럼(category1~4)을 집계, 80%+ 공유하는 d1+d2를 "정답" 카테고리로
// 추천한다(AI/폴백 제안보다 우선). 근거(리서치 6): 네이버 쇼핑 알고리즘은 카테고리
// 일치를 강하게 가중하므로, 키워드가 완벽해도 카테고리가 틀리면 노출이 안 된다.
//
// SE05(#324, 2026-08-27): 이 기능이 의존하던 /v1/search/shop.json을 네이버가
// 2026-07-31 영구 종료했다(docs/design/NAVER_SHOPPING_API_SUNSET_RESPONSE.md).
// 검색광고 API는 집계 검색량/경쟁도만 제공하고 개별 상품의 카테고리 브레드크럼은
// 주지 않으므로 이 신호는 대체 불가 — 영구 비활성. 죽은 엔드포인트를 매번 호출해
// 8초 타임아웃을 기다리지 않도록 네트워크 호출 자체를 하지 않는다(#310: 살아나지
// 않는 API에 재시도 금지). 소비처(api/category/suggest/route.ts)는 이미
// `error` 필드를 `pageValidationApplied:'error'`로 정직하게 반영하도록 되어 있어
// 별도 수정이 필요 없다.
// ============================================================================

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface PageCategoryDistribution {
  /** Path like "패션의류 > 여성의류" with depth1+depth2 only. */
  d1d2Path: string;
  count: number;
  share: number; // 0..1
}

export interface PageValidationResult {
  /** Total items pulled (typically 30, may be less if Naver returns fewer). */
  totalItems: number;
  /** All distinct d1+d2 paths sorted by count DESC. */
  distribution: PageCategoryDistribution[];
  /** Dominant path if share >= DOMINANT_THRESHOLD, else null. */
  dominant: {
    d1: string;
    d2: string;
    share: number;
    count: number;
  } | null;
  /** Error code — 'api_permanently_discontinued' 고정(SE05/#324, 대체 경로 없음). */
  error?: string;
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * 페이지-1 카테고리 분포 신호는 SE05(#324)로 영구 비활성 상태다. 즉시
 * `api_permanently_discontinued`를 반환한다. 인터페이스는 소비처 호환을 위해
 * 유지한다 — 대체 API가 생기면 이 함수 내부만 재구현하면 된다.
 */
export async function validatePageCategory(
  keyword: string,
): Promise<PageValidationResult> {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return { totalItems: 0, distribution: [], dominant: null, error: 'empty_keyword' };
  }

  return {
    totalItems: 0,
    distribution: [],
    dominant: null,
    error: 'api_permanently_discontinued',
  };
}
