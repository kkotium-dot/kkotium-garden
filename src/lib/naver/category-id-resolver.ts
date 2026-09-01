// src/lib/naver/category-id-resolver.ts
//
// Root-cause fix (2026-09-01, category_id backfill 사고): scripts/wire-
// category-id-from-code.ts(UCE-8, 별도 브랜치에서 프로덕션에 이미 실행됨)가
// Product.category_id를 상품의 기존 naverCategoryCode 그대로 연결했다. 그
// 코드는 UCE 매처가 생기기 전 과거 임포트/오분류 시점의 "오라벨"인 경우가
// 있어 FK 자체는 무결(orphan 0)해도 값이 틀렸다(실측: 아이스트레이→홍합,
// 디퓨저→교자상, docs/playbook/CORE_WORKING_PRINCIPLES.md#기둥1).
//
// 이 모듈은 "과거 코드를 믿지 말고 상품명을 UCE 매처로 다시 판정"하는 단일
// 진실 공급원이다. scripts/backfill-category-id-from-name.ts(백필)와
// scripts/verify-category-integrity.ts(회귀 테스트)가 반드시 이 함수 하나만
// 거치게 해서, 둘이 서로 다른 판정 로직으로 드리프트하는 것을 구조적으로
// 막는다.
//
// 신뢰 게이트는 src/app/api/category/suggest/route.ts의
// isDeterministicLowConfidence를 의도적으로 미러링한다(정책 중복 — 그
// 라우트 파일을 이 백필 경로에서 import하지 않기 위함). 값을 바꿀 때는
// 두 곳을 함께 검토할 것.

import { NAVER_CATEGORIES_FULL } from './naver-categories-full';
import { matchDeterministicCategories, type DeterministicMatch } from './category-deterministic-matcher';

const MIN_CONFIDENT_SCORE = 20; // route.ts DETERMINISTIC_MIN_CONFIDENT_SCORE와 동일
const D1_CONFLICT_GAP = 10;
const D1_CONFLICT_CEILING = 40;

export interface CategoryResolution {
  /** naver_categories.category_code — Product.category_id를 채우려면 이 코드로
   *  naver_categories 행을 조회해야 한다(마스터 미적재/코드 부재 시 null 처리는
   *  호출자 책임). */
  code: string;
  fullPath: string;
  match: DeterministicMatch;
}

/** tier 1(리프 정확 매치) + 점수 임계 + d1 충돌 없음 — 이 셋을 모두 만족해야
 *  "확신"으로 간주한다. 하나라도 못 만족하면 억지로 연결하지 않는다(정직). */
function isConfident(matches: DeterministicMatch[]): boolean {
  const top = matches[0];
  if (!top || top.tier !== 1) return false;
  if (top.score < MIN_CONFIDENT_SCORE) return false;
  const second = matches[1];
  if (second && second.d1 !== top.d1 && top.score < D1_CONFLICT_CEILING) {
    if (top.score - second.score <= D1_CONFLICT_GAP) return false;
  }
  return true;
}

/**
 * PURE — no I/O, no AI, no DB. 상품명을 UCE 결정론적 매처로 재판정해
 * "확신 가능한" 리프 카테고리(code + full_path)만 돌려준다. 매칭이 없거나
 * 약하면 null — 호출자는 이 경우 category_id를 NULL로 유지해야 한다
 * (억지 연결 금지, docs/design/PRODUCT_CATEGORY_BACKFILL_2026-08-20.md §3).
 */
export function resolveConfidentCategory(productName: string): CategoryResolution | null {
  const matches = matchDeterministicCategories(productName);
  if (!isConfident(matches)) return null;
  const top = matches[0];
  const entry = NAVER_CATEGORIES_FULL.find(
    (c) => c.d1 === top.d1 && c.d2 === top.d2 && c.d3 === top.d3 && (c.d4 || undefined) === top.d4,
  );
  if (!entry) return null; // 이론상 발생 안 함(top이 NAVER_CATEGORIES_FULL에서 나옴) — 방어적 처리
  return { code: entry.code, fullPath: entry.fullPath, match: top };
}
