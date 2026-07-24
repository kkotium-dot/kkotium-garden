// countLeadingNegatives / isSourceGoneFromCount test suite (ADR-0002, 작업1).
// No test framework — run: `npx tsx src/lib/products/source-gone-pure.test.ts`.
// Exits non-zero on first fail. 6 cases from ADR-0002 §결과.

import assert from 'node:assert/strict';
import { countLeadingNegatives, isSourceGoneFromCount, SOURCE_GONE_MIN_CONSECUTIVE } from './source-gone-pure';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  // eslint-disable-next-line no-console
  console.log(`  ok — ${name}`);
}

assert.equal(SOURCE_GONE_MIN_CONSECUTIVE, 3, 'threshold must stay 3 per ADR-0002');

check('정상연속3: 3 consecutive negatives -> gone', () => {
  const counts = countLeadingNegatives([
    { productId: 'p1', qty: -1 },
    { productId: 'p1', qty: -1 },
    { productId: 'p1', qty: -1 },
  ]);
  assert.equal(counts.get('p1'), 3);
  assert.equal(isSourceGoneFromCount(counts.get('p1')), true);
});

check('스파이크1개낀연속: isolated single positive is skipped, run continues', () => {
  const counts = countLeadingNegatives([
    { productId: 'p1', qty: -1 },
    { productId: 'p1', qty: -1 },
    { productId: 'p1', qty: 5 }, // isolated spike
    { productId: 'p1', qty: -1 },
    { productId: 'p1', qty: -1 },
  ]);
  assert.equal(counts.get('p1'), 4, 'spike itself not counted, all 4 negatives are');
  assert.equal(isSourceGoneFromCount(counts.get('p1')), true);
});

check('양수2연속리셋: two positives in a row = real recovery, reset to 0', () => {
  const counts = countLeadingNegatives([
    { productId: 'p1', qty: -1 },
    { productId: 'p1', qty: -1 },
    { productId: 'p1', qty: -1 },
    { productId: 'p1', qty: 5 },
    { productId: 'p1', qty: 3 },
    { productId: 'p1', qty: -1 }, // sealed — must not be counted
    { productId: 'p1', qty: -1 },
  ]);
  assert.equal(counts.get('p1'), 0);
  assert.equal(isSourceGoneFromCount(counts.get('p1')), false);
});

check('경계(정확히3): exactly 3 at the threshold boundary -> gone', () => {
  const counts = countLeadingNegatives([
    { productId: 'p1', qty: -1 },
    { productId: 'p1', qty: -1 },
    { productId: 'p1', qty: -1 },
  ]);
  assert.equal(isSourceGoneFromCount(counts.get('p1')), true);
  const under = countLeadingNegatives([
    { productId: 'p1', qty: -1 },
    { productId: 'p1', qty: -1 },
  ]);
  assert.equal(isSourceGoneFromCount(under.get('p1')), false, '2 < 3 must not be gone');
});

check('스냅샷부족: fewer snapshots than threshold -> not gone', () => {
  const counts = countLeadingNegatives([{ productId: 'p1', qty: -1 }]);
  assert.equal(counts.get('p1'), 1);
  assert.equal(isSourceGoneFromCount(counts.get('p1')), false);
});

check('전부양수: all positive snapshots -> never gone', () => {
  const counts = countLeadingNegatives([
    { productId: 'p1', qty: 5 },
    { productId: 'p1', qty: 3 },
    { productId: 'p1', qty: 10 },
  ]);
  assert.equal(isSourceGoneFromCount(counts.get('p1')), false);
  assert.equal(counts.get('p1') ?? 0, 0);
});

console.log(`\n${passed} passed`);
