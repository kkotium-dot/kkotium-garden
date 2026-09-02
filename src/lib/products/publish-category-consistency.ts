// src/lib/products/publish-category-consistency.ts
// #355/#356 발행 직전 정합성 게이트: naverCategoryCode(및 category_id)가
// 가리키는 카테고리 리프명과 상품명 사이에 최소한의 어휘적 겹침조차 없으면
// 상충으로 판정한다("가습기" 상품이 "조명" 카테고리, "아이스트레이"가
// "홍합" 카테고리 등). UCE 매처(category-deterministic-matcher.ts)처럼
// "가장 그럴듯한 정답"을 고르는 게 아니라, 이미 지정된 카테고리가
// "명백히 무관"한지만 보는 훨씬 낮은/보수적인 기준이다 — 여기서 오탐이
// 나면 정상 발행을 막으므로, 애매하면 통과시킨다(#355 "정합성", 확신 아님).
//
// PURE — no I/O, no DB, no AI.

import { NAVER_CATEGORIES_FULL, type NaverCategoryEntry } from '../naver/naver-categories-full';
import { extractNouns } from '../strategy/morpheme-tokenizer';

const MIN_TERM_LEN = 2;

function leafTerms(entry: NaverCategoryEntry): string[] {
  const leaf = entry.d4 || entry.d3 || entry.d2 || entry.d1;
  return leaf
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s.length >= MIN_TERM_LEN);
}

/** 카테고리 리프명 용어 중 하나라도 상품명(또는 추출명사 조합)과 겹치거나,
 *  상품 핵심명사가 리프 용어 안에 포함되면(역포함, 매처와 동일 원리) "겹침"
 *  으로 본다. 겹침이 하나도 없을 때만 상충 — 낮은 기준을 의도적으로 유지. */
function overlaps(productName: string, entry: NaverCategoryEntry): boolean {
  const name = productName.trim();
  if (!name) return true; // 이름 없음은 이 게이트의 판단 범위 밖 — readiness 게이트가 별도로 막음

  const { nouns } = extractNouns(name);
  const nounsCompact = nouns.join('');
  const haystacks = [name, nounsCompact].filter((h, i, arr) => h && arr.indexOf(h) === i);
  const headNoun = nouns.length > 0 ? nouns[nouns.length - 1] : '';

  return leafTerms(entry).some((term) => {
    if (haystacks.some((h) => h.includes(term))) return true;
    if (headNoun && (term.includes(headNoun) || headNoun.includes(term))) return true;
    return false;
  });
}

export interface CategoryMismatchInput {
  field: 'category_id' | 'naverCategoryCode';
  code: string | null | undefined;
}

export interface CategoryMismatch {
  field: 'category_id' | 'naverCategoryCode';
  categoryFullPath: string;
}

/** PURE. #356: 발행에 실제 쓰이는 두 카테고리 필드(category_id가 가리키는
 *  naver_categories 행의 categoryCode + naverCategoryCode 원문) 모두를
 *  검사한다 — 하나만 청소되고 다른 하나가 오라벨로 남는 사고(#356)를
 *  발행 게이트에서 구조적으로 막는다. 코드가 마스터에 없으면(레거시/미상)
 *  판단 불가로 건너뛴다(#82 반대편 아님 — 이건 "확신 없으면 통과"인 권고
 *  판정이라 fail-open이 맞다; DB 조회 실패 자체의 fail-closed는 상위
 *  loadReviewInputs가 담당). */
export function findCategoryMismatches(
  productName: string,
  categories: CategoryMismatchInput[],
): CategoryMismatch[] {
  const mismatches: CategoryMismatch[] = [];
  for (const { field, code } of categories) {
    if (!code) continue;
    const entry = NAVER_CATEGORIES_FULL.find((c) => c.code === code);
    if (!entry) continue;
    if (!overlaps(productName, entry)) {
      mismatches.push({ field, categoryFullPath: entry.fullPath });
    }
  }
  return mismatches;
}
