// UCE-7 unit verification — no test framework in this repo, standalone run:
//   npx tsx src/lib/naver/category-deterministic-matcher.test.ts
//   npm run test:category-match
// Exits non-zero on the first failed assertion.
//
// Covers docs/design/UCE7_MATCH_QUALITY_2026-08-27.md §4 완료 조건:
//   - 오분류5 정확화 (head-noun weighting + service-d2 exclusion + reverse fallback)
//   - 정상7 회귀0
//   - 서비스/레슨 d2 exclusion (UCE-7c) actually removes those candidates
//
// §3 UCE-7a also asks to verify — as a logged case, not just an assertion —
// that extractNouns("실리콘 주걱") isolates "주걱" as a single, unprotected
// noun and that it wins over the longer "실리콘" modifier match once
// head-noun weighting is applied. That's the "실리콘주걱→주걱 승리 로깅"
// line below.
//
// UCE-10 (2026-09-04) 추가: docs/design/UCE10_TIE_BREAK_AND_SOURCING_PARITY_2026-09-04.md
//   - 결함C: isLeafItself(+1) 동점보너스 -> branchBreadthBonus(자식 d4 개수
//     기반) 교체. 전수스캔 16건 중 (d1,d2) 두 branch에 동일 d3명이 걸치는
//     11건을 실코드로 재검증 — 9건 정답전환(TIE_BREAK_PAIRS), "넥타이"는
//     extractNouns가 트레일링 "이"를 조사로 오인식해 스트리핑하는 별개의
//     토크나이저 결함(headNoun="넥타"≠d3"넥타이")으로 여전히 실패, "우산"은
//     스포츠/레저>골프>골프필드용품>우산이라는 실재하는 다른 d4 리프와의
//     정당한 충돌이라 결함C 범위 밖 — 둘 다 UCE-11 후보로 별도 티켓, 이
//     스위트에서는 회귀 확인용으로 "여전히 오답"을 명시적으로 단언한다.
//   - 결함B: termMatchScore에 "용" 제거 정규화 fallback(소폭 감점) 추가 —
//     "실내방향제"/"차량방향제"처럼 상품명이 마스터 리프의 공식 "...용"
//     접미를 생략한 관용 표기일 때도 정확한 d4까지 잡히는지 확인.

import assert from 'node:assert/strict';
import { matchDeterministicCategories } from './category-deterministic-matcher';
import { isDeterministicLowConfidence } from './category-ai-suggest';
import { extractNouns } from '../strategy/morpheme-tokenizer';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  // eslint-disable-next-line no-console
  console.log(`  ok — ${name}`);
}

// ---------------------------------------------------------------------------
// UCE-7a 단위검증(로깅): extractNouns가 "실리콘 주걱"에서 핵심명사 "주걱"을
// 단일 추출하는지, 그리고 그 결과 "주걱"이 "실리콘"(수식어)을 이기는지.
// ---------------------------------------------------------------------------
console.log('\n[UCE-7a] extractNouns 핵심명사 단위검증');
{
  const { nouns } = extractNouns('실리콘 주걱');
  console.log(`  extractNouns("실리콘 주걱") -> [${nouns.join(', ')}] (headNoun="${nouns[nouns.length - 1]}")`);
  const [top] = matchDeterministicCategories('실리콘 주걱', 5);
  console.log(
    `  matchDeterministicCategories("실리콘 주걱") 1위: ` +
    `[T${top.tier}][${top.score.toFixed(1)}] ${top.d1}>${top.d2}>${top.d3} (matched:"${top.matchedTerm}")`,
  );
  console.log(`  → "${top.matchedTerm}"(핵심명사) 승리 여부: ${top.matchedTerm === '주걱' ? '승리 ✅' : '패배 ❌'}`);
}

// ---------------------------------------------------------------------------
// 오분류5 정확화 — 프로덕션 실측(2026-08-27) 오답 5건이 정답으로 뒤집혔는지.
// ---------------------------------------------------------------------------
type Expectation = { name: string; d1: string; d2: string };

const MISCLASSIFIED_5: Expectation[] = [
  { name: '실리콘 주걱', d1: '생활/건강', d2: '주방용품' },
  { name: '칫솔 살균기', d1: '디지털/가전', d2: '생활가전' },
  { name: '차량용 방향제', d1: '생활/건강', d2: '자동차용품' },
  { name: '요가 매트', d1: '스포츠/레저', d2: '요가/필라테스' },
  { name: '스텐 빨대', d1: '생활/건강', d2: '주방용품' },
];

const NORMAL_7: Expectation[] = [
  { name: '달항아리', d1: '생활/건강', d2: '주방용품' },
  { name: '우산꽂이', d1: '가구/인테리어', d2: '수납가구' },
  { name: '수세미', d1: '생활/건강', d2: '주방용품' },
  { name: '레깅스', d1: '출산/육아', d2: '유아동의류' },
  { name: '차렵이불', d1: '가구/인테리어', d2: '침구단품' },
  // UCE-10 (결함C): "소파"의 기대값을 "아동/주니어가구"(자식0 자기리프, 옛
  // isLeafItself 버그가 항상 이기게 만들던 오답)에서 "거실가구"(자식10, 진짜
  // 주력 브랜치)로 정정 — branchBreadthBonus 도입 이후의 올바른 승자.
  { name: '소파', d1: '가구/인테리어', d2: '거실가구' },
  { name: '전동 칫솔', d1: '디지털/가전', d2: '생활가전' },
];

console.log('\n[완료조건] 오분류5 정확화');
for (const exp of MISCLASSIFIED_5) {
  check(`"${exp.name}" -> ${exp.d1}>${exp.d2}`, () => {
    const [top] = matchDeterministicCategories(exp.name, 3);
    assert.ok(top, `"${exp.name}": no match at all`);
    assert.equal(top.d1, exp.d1, `"${exp.name}": d1 mismatch (got ${top.d1}>${top.d2})`);
    assert.equal(top.d2, exp.d2, `"${exp.name}": d2 mismatch (got ${top.d1}>${top.d2})`);
  });
}

console.log('\n[완료조건] 정상7 회귀0');
for (const exp of NORMAL_7) {
  check(`"${exp.name}" -> ${exp.d1}>${exp.d2}`, () => {
    const [top] = matchDeterministicCategories(exp.name, 3);
    assert.ok(top, `"${exp.name}": no match at all`);
    assert.equal(top.d1, exp.d1, `"${exp.name}": d1 regressed (got ${top.d1}>${top.d2})`);
    assert.equal(top.d2, exp.d2, `"${exp.name}": d2 regressed (got ${top.d1}>${top.d2})`);
  });
}

// ---------------------------------------------------------------------------
// UCE-7c: service/lesson d2 exclusion — 물리상품 매칭에 서비스 카테고리가
// 섞이면 안 된다. "차량용 방향제"가 예전엔 여가/생활편의>원데이클래스로
// 오분류됐던 근본 원인이므로, 그 후보 자체가 결과에서 완전히 사라졌는지 확인.
// ---------------------------------------------------------------------------
console.log('\n[UCE-7c] 서비스/레슨 d2 제외목록');
check('차량용 방향제 결과에 여가/생활편의(서비스) 후보 없음', () => {
  const matches = matchDeterministicCategories('차량용 방향제', 10);
  const serviceHit = matches.find((m) => m.d1 === '여가/생활편의');
  assert.equal(serviceHit, undefined, `서비스 카테고리가 여전히 후보에 남아있음: ${JSON.stringify(serviceHit)}`);
});
check('요가복 결과에 예체능레슨 후보 없음', () => {
  const matches = matchDeterministicCategories('요가복', 10);
  const lessonHit = matches.find((m) => m.d2 === '예체능레슨');
  assert.equal(lessonHit, undefined, `레슨 카테고리가 여전히 후보에 남아있음: ${JSON.stringify(lessonHit)}`);
});

// ---------------------------------------------------------------------------
// UCE-10 결함C: 동일 d3명이 두 (d1,d2) branch에 걸치는 16건 중 실코드로
// 재현되는 11건 — 9건은 branchBreadthBonus로 정답전환, 2건("넥타이","우산")은
// 결함C 범위 밖의 별개 원인으로 여전히 오답(회귀 확인용으로 명시 단언).
// ---------------------------------------------------------------------------
const TIE_BREAK_PAIRS: Expectation[] = [
  { name: '소파', d1: '가구/인테리어', d2: '거실가구' },
  { name: '의자', d1: '가구/인테리어', d2: '서재/사무용가구' },
  { name: '책상', d1: '가구/인테리어', d2: '서재/사무용가구' },
  { name: '조명', d1: '가구/인테리어', d2: '인테리어소품' },
  { name: '히터', d1: '디지털/가전', d2: '계절가전' },
  { name: '귀걸이', d1: '패션잡화', d2: '주얼리' },
  { name: '팔찌', d1: '패션잡화', d2: '주얼리' },
  { name: '스카프', d1: '패션잡화', d2: '패션소품' },
  { name: '스타킹', d1: '패션잡화', d2: '패션소품' },
];

console.log('\n[UCE-10 결함C] 동점쌍 9건 정답전환');
for (const exp of TIE_BREAK_PAIRS) {
  check(`"${exp.name}" -> ${exp.d1}>${exp.d2}`, () => {
    const [top] = matchDeterministicCategories(exp.name, 3);
    assert.ok(top, `"${exp.name}": no match at all`);
    assert.equal(top.d1, exp.d1, `"${exp.name}": d1 mismatch (got ${top.d1}>${top.d2})`);
    assert.equal(top.d2, exp.d2, `"${exp.name}": d2 mismatch (got ${top.d1}>${top.d2})`);
  });
}

console.log('\n[UCE-11 결함A 수정] "넥타이" 정답전환 / [범위 밖] "우산"은 여전히 별개 원인');
check('"넥타이" -> 패션잡화>패션소품 (COMPOUND_NOUNS 등재로 트레일링 "이" 스트리핑 결함 해소)', () => {
  const [top] = matchDeterministicCategories('넥타이', 3);
  assert.equal(top.d1, '패션잡화');
  assert.equal(top.d2, '패션소품');
});
check('"우산"은 여전히 스포츠/레저>골프로 매칭 (골프우산이라는 실재 리프와의 정당한 충돌, UCE-11 범위 밖)', () => {
  const [top] = matchDeterministicCategories('우산', 3);
  assert.equal(top.d1, '스포츠/레저');
  assert.equal(top.d2, '골프');
});

// ---------------------------------------------------------------------------
// UCE-10 결함B: "용" 제거 정규화 — 상품명 관용 표기가 마스터 리프의 공식
// "...용" 접미를 생략해도 정확한 d4까지 잡히는지.
// ---------------------------------------------------------------------------
console.log('\n[UCE-10 결함B] "용" 제거 정규화 매칭');
check('"실내방향제" -> 생활/건강>생활용품>제습/방향/탈취>실내용방향제', () => {
  const [top] = matchDeterministicCategories('실내방향제', 3);
  assert.equal(top.d1, '생활/건강');
  assert.equal(top.d2, '생활용품');
  assert.equal(top.d3, '제습/방향/탈취');
  assert.equal(top.d4, '실내용방향제');
});
check('"차량방향제" -> 생활/건강>자동차용품>공기청정용품>차량용방향제', () => {
  const [top] = matchDeterministicCategories('차량방향제', 3);
  assert.equal(top.d1, '생활/건강');
  assert.equal(top.d2, '자동차용품');
  assert.equal(top.d3, '공기청정용품');
  assert.equal(top.d4, '차량용방향제');
});

// ---------------------------------------------------------------------------
// UCE-11 결함C (2026-09-05): slash-packed 라벨의 partial coverage가 파편
// 개수와 무관한 flat ×0.5였을 때, "내솥/패킹/트레이"의 "트레이" 파편 1개만
// 걸린 "얼음트레이"가 정확히 20.00점 tier1 단독후보가 되어
// isDeterministicLowConfidence의 `< 20` 경계를 통과 — 디지털/가전>주방가전>
// 전기밥솥으로 오분류(docs/design/UCE11_TOKENIZER_LONGNAME_CANDIDATES_
// 2026-09-04.md §"결함C 정확한 트리거 규명"). matched/parts 비율 페널티로
// 15.00점까지 낮아져 저신뢰 판정(AI 교차확인/개입큐)으로 흘러야 한다.
// ---------------------------------------------------------------------------
console.log('\n[UCE-11 결함C 수정] "얼음트레이"류 부분매칭 오낚임 -> 저신뢰 판정');
for (const name of ['얼음트레이', '서빙트레이', '다용도트레이', '주방트레이', '화장품트레이', '정리트레이']) {
  check(`"${name}" -> 전기밥솥 단독후보 아님(저신뢰로 흘러 AI/개입큐 확인)`, () => {
    const matches = matchDeterministicCategories(name, 3);
    assert.ok(
      isDeterministicLowConfidence(matches),
      `"${name}": 여전히 confident 판정 (top=${JSON.stringify(matches[0])})`,
    );
  });
}

// ---------------------------------------------------------------------------
// UCE-11 결함D (2026-09-05): headNounWeight의 역방향 포함관계
// (`term.includes(p)`)가 토크나이저가 못 쪼갠 단일-명사 상품명("실리콘트레이"
// -> nouns=["실리콘트레"], modifierNouns=[])에서 위치와 무관하게
// HEAD_NOUN_BOOST(×3)를 줘, 우연히 그 블록 안에 등장하는 무관 리프 파편
// ("실리콘"→공구>접착용품, "니트"→골프의류, "큐브"→유아동퍼즐)이 확신구간
// (lowConf=false)으로 잘못 확정되던 결함(docs/design/
// UCE11_TOKENIZER_LONGNAME_CANDIDATES_2026-09-04.md §결함D). modifierNouns가
// 빈 경우(=토크나이저가 통째로 못 쪼갠 경우)에 한해 부스트를 머리명사
// 말미(head-final) 위치로 제한해 저신뢰로 흘러야 한다. "차량용 신발장"처럼
// 이미 modifier가 분리된 경우는 건드리지 않는다(회귀 확인, 아래 별도 케이스).
// ---------------------------------------------------------------------------
console.log('\n[UCE-11 결함D 수정] "실리콘트레이"류 복합어 미분리 오낚임 -> 저신뢰 판정');
for (const name of ['실리콘트레이', '미니트레이', '큐브트레이']) {
  check(`"${name}" -> 확신구간 아님(저신뢰로 흘러 AI/개입큐 확인)`, () => {
    const matches = matchDeterministicCategories(name, 3);
    assert.ok(
      isDeterministicLowConfidence(matches),
      `"${name}": 여전히 confident 판정 (top=${JSON.stringify(matches[0])})`,
    );
  });
}
check('"차량용 신발장" -> 신발(스포츠/레저) 후보 여전히 근접 경쟁(결함D 수정이 modifier-분리 케이스는 건드리지 않음)', () => {
  const matches = matchDeterministicCategories('차량용 신발장', 4);
  const top = matches[0];
  const second = matches[1];
  assert.ok(top && second, '경쟁 후보가 사라짐 — 결함D 수정이 modifier-분리 케이스까지 건드렸을 가능성');
  assert.notEqual(top.d1, second.d1, '경쟁 후보가 같은 d1으로 흡수됨');
  assert.ok(top.score - second.score <= 20, `경쟁 후보 점수차가 너무 벌어짐(회귀) — top=${top.score} second=${second.score}`);
});

console.log(`\n${passed}/${passed} passed ✅\n`);
