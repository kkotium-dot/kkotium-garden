// surfaceRules forbidden-combination test suite (작업3, 2026-07-23).
// No test framework — run: `npx tsx src/lib/products/surfaceRules.test.ts`.
// Exits non-zero on first fail.
//
// Covers the concretely-defined SURFACE_RULES.md v2 IDs only: T-05 (modified),
// T-08/T-11/T-12/T-13 (kept from v1), T-16~T-20 (new). T-01~T-04/T-06/T-07/
// T-09/T-10/T-14/T-15 are not individually defined in the v2 doc (T-04/T-06/
// T-07/T-10 explicitly retired — EXTEND_PERIOD/ARCHIVED concepts don't exist
// in this app) — asserting them here would fabricate coverage that isn't
// specified anywhere (#303: don't invent, ask/report instead).

import assert from 'node:assert/strict';
import {
  ALL_LIFECYCLE_STATES,
  allowedActionsFor,
  hasFullStateCoverage,
  isDeleteAllowed,
  isDeleteVisible,
  isPrimaryLabelAllowed,
  isQueueEligible,
  deriveLifecycleState,
  decideDisposition,
} from './surfaceRules';
import disposaCopy from './disposition.strings.ko.json';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  // eslint-disable-next-line no-console
  console.log(`  ok — ${name}`);
}

// T-05 (modified): hasSalesAssets=true 면 DELETE 금지. SOURCE_GONE_DELETABLE
// (자산 없음)은 삭제 허용 — v1 "발행 트랙 전면 금지"는 폐기됨.
check('T-05: DELETE forbidden when hasSalesAssets, allowed when not', () => {
  assert.equal(isDeleteAllowed(true), false, 'assets present -> delete must be blocked');
  assert.equal(isDeleteAllowed(false), true, 'no assets -> delete safe');
});

// T-08: 표(STATE_ALLOWED_ACTIONS) ↔ 코드 enum(LifecycleState) 동기화.
check('T-08: action matrix covers exactly the 7 declared states, no more/less', () => {
  assert.equal(ALL_LIFECYCLE_STATES.length, 7, 'lifecycle.ts declares 7 states (bridge §3)');
  for (const s of ALL_LIFECYCLE_STATES) {
    assert.ok(Array.isArray(allowedActionsFor(s)), `matrix missing entry for ${s}`);
  }
});

// T-11: 주 액션 유일성 — decideDisposition은 항상 정확히 하나의 action을
// 반환한다(함수 시그니처가 이미 단일값). 샘플 입력으로 재확인.
check('T-11: decideDisposition always yields exactly one action', () => {
  const samples: Parameters<typeof decideDisposition>[0][] = [
    { naverProductId: null },
    { naverProductId: 'N1', sourceGone: true, salesCount: 3 },
    { naverProductId: 'N1', sourceGone: true, salesCount: 0 },
    { naverProductId: 'N1', qty: 0, daysOutOfStock: 20 },
    { naverProductId: 'N1', qty: 0, daysOutOfStock: 1 },
    { naverProductId: 'N1', qty: 10 },
  ];
  for (const s of samples) {
    const v = decideDisposition(s);
    assert.equal(typeof v.action, 'string');
    assert.equal(Object.keys(v).filter((k) => k === 'action').length, 1);
  }
});

// T-12: total function — 7상태 전부 커버, 미분류 없음.
check('T-12: state matrix is a total function over all 7 states', () => {
  assert.equal(hasFullStateCoverage(), true);
});

// T-13: 카피 키 정합 — disposition.strings.ko.json의 액션 키(NONE 제외)가
// DispositionAction 4종(MARK_OUT_OF_STOCK/SUSPEND/RESOURCE/DELETE_SAFE)과 1:1.
check('T-13: disposition copy keys match DispositionAction (excl. NONE)', () => {
  const expected = ['MARK_OUT_OF_STOCK', 'SUSPEND', 'RESOURCE', 'DELETE_SAFE'].sort();
  const actual = Object.keys(disposaCopy).filter((k) => !k.startsWith('_') && k === k.toUpperCase()).sort();
  assert.deepEqual(actual, expected, `copy keys drifted: ${JSON.stringify(actual)}`);
});

// T-16: sourceGone인데 OUT_OF_STOCK으로 파생되면 실패해야 한다 — 단절이
// 품절보다 우선(§3).
check('T-16: sourceGone must not derive as plain OUT_OF_STOCK', () => {
  const state = deriveLifecycleState({
    naverProductId: 'N1', status: 'OUT_OF_STOCK', consecutiveNegatives: 5, hasSalesAssets: true,
  });
  assert.notEqual(state, 'OUT_OF_STOCK');
  assert.equal(state, 'SOURCE_GONE_RESOURCE');
});

// T-17: sourceGone + SUSPENSION인데 SUSPENDED로 파생되면 실패 — 단절이 중지보다 우선.
check('T-17: sourceGone + SUSPENSION must not derive as plain SUSPENDED', () => {
  const state = deriveLifecycleState({
    naverProductId: 'N1', naverStatusType: 'SUSPENSION', consecutiveNegatives: 5, hasSalesAssets: false,
  });
  assert.notEqual(state, 'SUSPENDED');
  assert.equal(state, 'SOURCE_GONE_DELETABLE');
});

// T-18: SOURCE_GONE_RESOURCE 상태의 삭제 버튼은 노출조차 되면 안 된다(HIDDEN).
check('T-18: SOURCE_GONE_RESOURCE hides the delete action entirely', () => {
  const state = deriveLifecycleState({
    naverProductId: 'N1', consecutiveNegatives: 5, hasSalesAssets: true,
  });
  assert.equal(state, 'SOURCE_GONE_RESOURCE');
  assert.equal(isDeleteVisible(state), false);
  assert.equal(isDeleteAllowed(true), false); // consistent with T-05
});

// T-19: 미발행 상품은 어떤 작업 큐(queue surface)에도 노출되면 안 된다(§1).
check('T-19: unpublished states are never queue-eligible', () => {
  const draft = deriveLifecycleState({ naverProductId: null, status: 'DRAFT' });
  const ready = deriveLifecycleState({ naverProductId: null, status: 'READY' });
  assert.equal(draft, 'DRAFT_INCOMPLETE');
  assert.equal(ready, 'READY_UNPUBLISHED');
  assert.equal(isQueueEligible(draft), false);
  assert.equal(isQueueEligible(ready), false);
});

// T-20: 배지=공급처 단절인데 주 액션이 "등록 완료"/"새 생명 부여"(발행·부활
// 전용 CTA) 이면 실패 — 이번 F1 모순(재활성화 필요 ↔ 부활소 0건)의 회귀 방지.
check('T-20: source-gone badge never pairs with publish/revive-track CTAs', () => {
  const resourceState = deriveLifecycleState({ naverProductId: 'N1', consecutiveNegatives: 5, hasSalesAssets: true });
  const deletableState = deriveLifecycleState({ naverProductId: 'N1', consecutiveNegatives: 5, hasSalesAssets: false });
  for (const state of [resourceState, deletableState]) {
    assert.equal(isPrimaryLabelAllowed(state, '등록 완료'), false);
    assert.equal(isPrimaryLabelAllowed(state, '이어서 작성'), false);
    assert.equal(isPrimaryLabelAllowed(state, '새 생명 부여'), false);
    assert.equal(isPrimaryLabelAllowed(state, '대체소싱 하기'), true);
  }
});

// eslint-disable-next-line no-console
console.log(`\nsurfaceRules: ${passed} checks passed`);
