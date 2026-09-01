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
import { extractNouns } from '../strategy/morpheme-tokenizer';

const MIN_CONFIDENT_SCORE = 20; // route.ts DETERMINISTIC_MIN_CONFIDENT_SCORE와 동일
//
// Desktop dryRun 교차검증(2026-09-01)에서 발견: route.ts의 원래 게이트는
// D1_CONFLICT_CEILING(top.score < 40일 때만 d1 충돌 검사) 때문에 top 점수가
// 이미 높으면 서로 다른 d1의 근접 2위를 무시했다 — "차량용 신발장"처럼 top이
// 90점(신발장, 가구/인테리어)이어도 75점짜리 다른 d1 후보(신발, 스포츠/레저)가
// 15점 차로 바짝 붙어 있으면 신뢰할 수 없다(실측 오분류: 트렁크정리 상품이
// '신발장'에 낚임). 이 백필 경로는 라이브 suggest UI처럼 사람이 검토하지 않고
// DB에 그대로 쓰이므로, route.ts보다 더 보수적으로: 점수 크기와 무관하게 항상
// d1 충돌을 검사하고(천장 폐지), 여유폭도 넓힌다.
const D1_CONFLICT_GAP = 20;
// 복합명(추출 명사 3개 이상)일수록 무관한 단어가 우연히 엉뚱한 leaf와
// 부분매칭될 여지가 커진다(실측: "인테리어소품 달항아리 도어벨 개업선물
// 액막이 집들이" 류 — 상품명이 길수록 위험). 짧은 이름보다 더 높은 점수를
// 요구해 "저신뢰 긴 복합명은 NULL 유지"를 강제한다.
const MULTI_NOUN_THRESHOLD = 3;
const MULTI_NOUN_MIN_SCORE = 60;

// 방향 전환(2026-09-02, Desktop 임의 30종 전수검증 — 정확17/NULL8/오분류5,
// #352 "오분류0" 미달): 매처 추가 튜닝은 중단한다(무한 두더지잡기 — "사료"
// 하나 고치면 다음 임의 표본에서 또 다른 범용접미어가 걸린다). 대신 여러
// 무관 카테고리에 걸쳐 재사용되는 흔한 독립어(=매처가 아무리 정교해도 상품명
// 문맥 없이는 구분 불가능한 단어)는 백필 대상에서 원천 제외한다 — 실측:
// "사료"가 생활/건강>관상어용품>사료(완전일치)로 "강아지 사료"·"강아지사료"
// (반려동물)류를 통째로 낚아챔. 이런 상품은 category_id를 NULL로 남기고
// 씨앗심기 UI의 UCE-4 개입큐(사람 확인)로 흘려보낸다 — 확신 없으면 정직하게
// 비워두는 게 개악보다 낫다(#352).
const GENERIC_SUFFIX_BLOCKLIST = new Set(['사료', '받침', '커버', '필터']);

export interface CategoryResolution {
  /** naver_categories.category_code — Product.category_id를 채우려면 이 코드로
   *  naver_categories 행을 조회해야 한다(마스터 미적재/코드 부재 시 null 처리는
   *  호출자 책임). */
  code: string;
  fullPath: string;
  match: DeterministicMatch;
}

/** tier 1(리프 정확 매치) + 점수 임계 + d1 충돌 없음(+ 복합명 가중 임계) —
 *  이걸 모두 만족해야 "확신"으로 간주한다. 하나라도 못 만족하면 억지로
 *  연결하지 않는다(정직). */
function isConfident(matches: DeterministicMatch[], nounCount: number): boolean {
  const top = matches[0];
  if (!top || top.tier !== 1) return false;
  if (top.score < MIN_CONFIDENT_SCORE) return false;
  if (nounCount >= MULTI_NOUN_THRESHOLD && top.score < MULTI_NOUN_MIN_SCORE) return false;
  if (GENERIC_SUFFIX_BLOCKLIST.has(top.matchedTerm)) return false;
  const second = matches[1];
  if (second && second.d1 !== top.d1 && top.score - second.score <= D1_CONFLICT_GAP) {
    return false;
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
  const { nouns } = extractNouns(productName);
  if (!isConfident(matches, nouns.length)) return null;
  const top = matches[0];
  const entry = NAVER_CATEGORIES_FULL.find(
    (c) => c.d1 === top.d1 && c.d2 === top.d2 && c.d3 === top.d3 && (c.d4 || undefined) === top.d4,
  );
  if (!entry) return null; // 이론상 발생 안 함(top이 NAVER_CATEGORIES_FULL에서 나옴) — 방어적 처리
  return { code: entry.code, fullPath: entry.fullPath, match: top };
}
