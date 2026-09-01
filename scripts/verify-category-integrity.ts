// scripts/verify-category-integrity.ts
//
// Regression gate for the category_id backfill bug (2026-09-01). Structure
// (FK integrity) was never broken — 0 orphans — but the CONTENT was wrong
// (아이스트레이→홍합, 디퓨저→교자상, docs/playbook/CORE_WORKING_PRINCIPLES.md
// #기둥1: "FK 연결됨 ≠ 올바른 카테고리"). "구조 검증 ≠ 내용 검증"을 코드로
// 박제해 재발을 자동 차단한다.
//
// No test framework, no DB — same convention as scripts/verify-seed-golden.ts
// / src/lib/naver/category-deterministic-matcher.test.ts (pure function,
// runs without credentials in a Code worktree). Asserts against
// resolveConfidentCategory() — the SAME function
// scripts/backfill-category-id-from-name.ts writes Product.category_id
// with — so this test is tautologically what the backfill script does, not
// a hand-rolled second opinion that could itself drift.
//
// Exits non-zero on the first category of failure (regression / honesty).
//
// USAGE:
//   npx tsx scripts/verify-category-integrity.ts
//   npm run test:category-integrity

import assert from 'node:assert/strict';
import { resolveConfidentCategory } from '../src/lib/naver/category-id-resolver';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok — ${name}`);
}

// ---------------------------------------------------------------------------
// 재발 방지 — 프로덕션 실측(2026-09-01) 오연결 2건. 절대 이 잘못된 카테고리로
// 다시 떨어지면 안 된다(정확한 값까지는 매처 개선에 따라 달라질 수 있어도,
// 최소한 이 잘못된 d1/d2로는 절대 안 간다는 것을 고정한다).
// ---------------------------------------------------------------------------
type WrongCategoryGuard = { name: string; wrongD1: string; wrongD2: string };

const KNOWN_WRONG_CONNECTIONS: WrongCategoryGuard[] = [
  { name: '64구 아이스틀 얼음보관함 얼음트레이 아이스트레이', wrongD1: '식품', wrongD2: '수산물' }, // 舊: 홍합(식품>수산물>해산물/어패류>홍합)
  { name: '차량용 디퓨저', wrongD1: '생활/건강', wrongD2: '주방용품' }, // 舊: 교자상(생활/건강>주방용품>교자상/밥상>교자상)
];

console.log('\n[재발방지] 프로덕션 오연결 사고 2건 — 잘못된 카테고리로 재귀환 차단');
for (const g of KNOWN_WRONG_CONNECTIONS) {
  check(`"${g.name}" != ${g.wrongD1}>${g.wrongD2}`, () => {
    const resolved = resolveConfidentCategory(g.name);
    if (resolved) {
      assert.notEqual(
        `${resolved.match.d1}>${resolved.match.d2}`,
        `${g.wrongD1}>${g.wrongD2}`,
        `"${g.name}" resolved back to the known-wrong category: ${resolved.fullPath}`,
      );
    }
    // resolved === null (empty hand) is also an acceptable outcome here —
    // honesty beats a forced guess. Only a *wrong* connection is a failure.
  });
}

// ---------------------------------------------------------------------------
// 내용 정확성 — 위 사고 2건은 실제로는 매처가 확신 가능한 정답을 갖고
// 있었다(버그는 매처가 아니라 구백필이 naverCategoryCode를 믿은 것). 그
// 정답으로 수렴하는지 고정한다.
// ---------------------------------------------------------------------------
type Expectation = { name: string; d1: string; d2: string };

const CORRECT_CONNECTIONS: Expectation[] = [
  { name: '64구 아이스틀 얼음보관함 얼음트레이 아이스트레이', d1: '생활/건강', d2: '주방용품' },
  { name: '차량용 디퓨저', d1: '가구/인테리어', d2: '인테리어소품' },
];

console.log('\n[내용검증] 올바른 카테고리로 확신 연결되는지');
for (const exp of CORRECT_CONNECTIONS) {
  check(`"${exp.name}" -> ${exp.d1}>${exp.d2}`, () => {
    const resolved = resolveConfidentCategory(exp.name);
    assert.ok(resolved, `"${exp.name}": resolveConfidentCategory returned null (expected a confident hit)`);
    assert.equal(resolved!.match.d1, exp.d1, `"${exp.name}": d1 mismatch (got ${resolved!.fullPath})`);
    assert.equal(resolved!.match.d2, exp.d2, `"${exp.name}": d2 mismatch (got ${resolved!.fullPath})`);
  });
}

// ---------------------------------------------------------------------------
// 정직성 — 상품명만으로 확신할 수 없는 애매한 케이스는 억지로 채우지 않고
// null(=category_id NULL 유지)이어야 한다. 억지 연결이 이번 사고의 근본
// 원인이었으므로, "약한 신호는 비워둔다"도 회귀 테스트로 고정한다.
// ---------------------------------------------------------------------------
const AMBIGUOUS_NAMES = ['스텐 빨대'];

console.log('\n[정직성] 약한/애매한 신호는 강제 연결하지 않고 비워둠(NULL)');
for (const name of AMBIGUOUS_NAMES) {
  check(`"${name}" -> null (확신 불가, 강제 연결 금지)`, () => {
    const resolved = resolveConfidentCategory(name);
    assert.equal(resolved, null, `"${name}": expected no confident match, but got ${JSON.stringify(resolved)}`);
  });
}

console.log(`\n${passed}/${passed} passed ✅\n`);
