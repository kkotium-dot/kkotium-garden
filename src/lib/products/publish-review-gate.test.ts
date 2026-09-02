// decidePublishGate test suite (ADR-0003).
// No test framework — run: `npx tsx src/lib/products/publish-review-gate.test.ts`.
// Exits non-zero on first fail.

import assert from 'node:assert/strict';
import { decidePublishGate, buildReviewWhitelistSnapshot, type PublishReviewGateInput } from './publish-review-gate';

let count = 0;
function check(label: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok — ${label}`);
    count++;
  } catch (e) {
    console.error(`  FAIL — ${label}`);
    console.error(e);
    process.exit(1);
  }
}

const baseSnapshot = buildReviewWhitelistSnapshot({
  name: '상품A', naverCategoryCode: '12345678', mainImage: 'https://x/a.jpg',
  detailImageUrl: 'https://x/d.jpg', salePrice: 10000, optionNames: null, optionRows: null,
});

function input(overrides: Partial<PublishReviewGateInput> = {}): PublishReviewGateInput {
  return {
    readinessScore: 100,
    blockingImageWarningCount: 0,
    reviewChecklist: { approved: true, gateSnapshot: { readiness: 100, imageWarnings: 0, fields: baseSnapshot } },
    currentSnapshot: baseSnapshot,
    categoryMismatches: [],
    ...overrides,
  };
}

check('all pass → approved, no reasons', () => {
  const v = decidePublishGate(input());
  assert.equal(v.approved, true);
  assert.deepEqual(v.reasons, []);
});

check('readiness < 100 → READINESS_INCOMPLETE', () => {
  const v = decidePublishGate(input({ readinessScore: 99 }));
  assert.equal(v.approved, false);
  assert.ok(v.reasons.includes('READINESS_INCOMPLETE'));
});

check('blocking image warning → IMAGE_WARNING', () => {
  const v = decidePublishGate(input({ blockingImageWarningCount: 1 }));
  assert.ok(v.reasons.includes('IMAGE_WARNING'));
});

check('never reviewed (null checklist) → NOT_REVIEWED', () => {
  const v = decidePublishGate(input({ reviewChecklist: null }));
  assert.deepEqual(v.reasons, ['NOT_REVIEWED']);
});

check('approved=false → NOT_REVIEWED', () => {
  const v = decidePublishGate(input({ reviewChecklist: { approved: false } }));
  assert.ok(v.reasons.includes('NOT_REVIEWED'));
});

check('approved + whitelist field changed (name) → REVIEW_STALE', () => {
  const changed = { ...baseSnapshot, name: '상품A(수정됨)' };
  const v = decidePublishGate(input({ currentSnapshot: changed }));
  assert.deepEqual(v.reasons, ['REVIEW_STALE']);
});

check('approved + non-whitelist drift (irrelevant to snapshot) stays fresh', () => {
  // Snapshot only carries whitelist fields — an inventory/zombie-score touch
  // never appears in currentSnapshot at all, so it can never trigger STALE.
  const v = decidePublishGate(input());
  assert.equal(v.approved, true);
});

check('approved + no snapshot recorded at approval → REVIEW_STALE (conservative)', () => {
  const v = decidePublishGate(input({ reviewChecklist: { approved: true } }));
  assert.deepEqual(v.reasons, ['REVIEW_STALE']);
});

check('category mismatch (#355/#356) → CATEGORY_MISMATCH', () => {
  const v = decidePublishGate(input({
    categoryMismatches: [{ field: 'naverCategoryCode', categoryFullPath: '식품 > 수산물 > 조개류 > 홍합' }],
  }));
  assert.equal(v.approved, false);
  assert.ok(v.reasons.includes('CATEGORY_MISMATCH'));
});

console.log(`\n${count} passed`);
