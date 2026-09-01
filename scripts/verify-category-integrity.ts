// scripts/verify-category-integrity.ts
//
// Regression gate for the category_id backfill bug (2026-09-01). Structure
// (FK integrity) was never broken — 0 orphans — but the CONTENT was wrong
// (아이스트레이→홍합, 디퓨저→교자상, docs/playbook/CORE_WORKING_PRINCIPLES.md
// #기둥1: "FK 연결됨 ≠ 올바른 카테고리"). "구조 검증 ≠ 내용 검증"을 코드로
// 박제해 재발을 자동 차단한다.
//
// 2026-09-01 Desktop dryRun 교차검증 추가분: 정합성 테스트는 최초 green
// 이었지만 실제 프로덕션 전 상품 dryRun에서 4건 신규 오분류(듀얼무선가습기→
// 완구>기차, 불멍가습기→도서>인테리어류, 트렁크정리→신발장 낚임, 달항아리
// (인테리어소품 접두)→도서>인테리어)가 나왔다 — resolveConfidentCategory의
// 신뢰 게이트를 강화(d1 충돌 천장 폐지 + 복합명 임계, category-id-resolver.ts)
// 한 근거가 이 4건이다. 아래에 재발방지 케이스로 고정한다.
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
  { name: '듀얼무선가습기', wrongD1: '출산/육아', wrongD2: '완구' }, // 舊: 완구>기차
  { name: '불멍가습기', wrongD1: '도서', wrongD2: '가정/요리' }, // 舊: 도서>인테리어류
  { name: '차량용 신발장', wrongD1: '가구/인테리어', wrongD2: '수납가구' }, // 트렁크정리 상품이 '신발장'에 낚인 사고 재현 케이스
  { name: '인테리어 소품 달항아리 도어벨 개업선물 액막이 집들이', wrongD1: '도서', wrongD2: '가정/요리' }, // 舊: 도서>가정/요리>인테리어(UCE7_EDGECASE_QUEUE §3-2)
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
const AMBIGUOUS_NAMES = [
  '스텐 빨대',
  '듀얼무선가습기', // 舊: 완구>기차 (d3-only 약신호, tier1 아님 — 확신 불가)
  '듀얼 무선 가습기',
  '불멍가습기', // 舊: 도서>인테리어류
  '불멍 가습기',
  '차량용 신발장', // 트렁크정리 상품의 '신발장' 낚임 — 근접 2위(신발, 다른 d1)와 15점차, 강화된 게이트로 차단
  '인테리어 소품 달항아리 도어벨 개업선물 액막이 집들이', // 舊: 도서>가정/요리>인테리어(UCE7_EDGECASE_QUEUE §3-2)
  '디자인 복 달항아리 도어벨 개업선물 액막이 집들이', // 원 설계문서(PRODUCT_CATEGORY_BACKFILL) 빈손 사례
];

console.log('\n[정직성] 약한/애매한 신호는 강제 연결하지 않고 비워둠(NULL)');
for (const name of AMBIGUOUS_NAMES) {
  check(`"${name}" -> null (확신 불가, 강제 연결 금지)`, () => {
    const resolved = resolveConfidentCategory(name);
    assert.equal(resolved, null, `"${name}": expected no confident match, but got ${JSON.stringify(resolved)}`);
  });
}

console.log(`\n${passed}/${passed} passed ✅\n`);
