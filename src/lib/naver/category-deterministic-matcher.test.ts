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

import assert from 'node:assert/strict';
import { matchDeterministicCategories } from './category-deterministic-matcher';
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
  { name: '소파', d1: '가구/인테리어', d2: '아동/주니어가구' },
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

console.log(`\n${passed}/${passed} passed ✅\n`);
