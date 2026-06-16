// Thumbnail policy gate unit test (2026-06-16, session8).
// No test framework in this repo — run standalone:
//   npx tsx src/lib/naver/thumbnail-policy.test.ts
// Exits non-zero on the first failed assertion. Covers authority §8/§9:
//   - clean single-product image passes
//   - any OCR text fails (text_present)
//   - zero or multiple products fails (not_single_product)
//   - each forbidden overlay fails (forbidden_overlay)
//   - assertThumbnailPolicy throws on fail, returns on pass (#46 hard gate)

import assert from 'node:assert/strict';
import {
  evaluateThumbnailPolicy,
  assertThumbnailPolicy,
  ThumbnailPolicyError,
  THUMBNAIL_POLICY_CONFIG,
  type ThumbnailCandidateSignals,
  type OverlayKind,
} from './thumbnail-policy';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  // eslint-disable-next-line no-console
  console.log(`  ok — ${name}`);
}

const clean: ThumbnailCandidateSignals = {
  textRegionCount: 0,
  productCount: 1,
  overlays: [],
  label: 'cutout.png',
};

// 1) Clean single product, no text, no overlays → pass.
check('clean single-product image passes', () => {
  const r = evaluateThumbnailPolicy(clean);
  assert.equal(r.pass, true);
  assert.equal(r.violations.length, 0);
  assert.equal(r.policyRevision, '2024-10-28');
  assert.equal(r.label, 'cutout.png');
});

// 2) Any OCR text region → text_present violation.
check('text present fails', () => {
  const r = evaluateThumbnailPolicy({ ...clean, textRegionCount: 1 });
  assert.equal(r.pass, false);
  assert.ok(r.violations.some((v) => v.code === 'text_present'));
});

// 3) Zero products and multiple products both fail single-product rule.
check('not single product fails (0 and 2)', () => {
  const zero = evaluateThumbnailPolicy({ ...clean, productCount: 0 });
  assert.equal(zero.pass, false);
  assert.ok(zero.violations.some((v) => v.code === 'not_single_product'));

  const two = evaluateThumbnailPolicy({ ...clean, productCount: 2 });
  assert.equal(two.pass, false);
  assert.ok(two.violations.some((v) => v.code === 'not_single_product'));
});

// 4) Every forbidden overlay kind is rejected.
check('each forbidden overlay fails', () => {
  for (const o of THUMBNAIL_POLICY_CONFIG.forbiddenOverlays) {
    const r = evaluateThumbnailPolicy({ ...clean, overlays: [o as OverlayKind] });
    assert.equal(r.pass, false, `overlay ${o} should fail`);
    assert.ok(
      r.violations.some((v) => v.code === 'forbidden_overlay' && v.detail === o),
      `overlay ${o} reported`,
    );
  }
});

// 5) Multiple simultaneous violations are all reported.
check('multiple violations aggregate', () => {
  const r = evaluateThumbnailPolicy({
    textRegionCount: 3,
    productCount: 4,
    overlays: ['price', 'border'],
  });
  assert.equal(r.pass, false);
  // text + not-single + 2 overlays = 4 violations
  assert.equal(r.violations.length, 4);
});

// 6) Hard gate: throws on fail, returns the result on pass (#46).
check('assertThumbnailPolicy throws on fail, returns on pass', () => {
  const ok = assertThumbnailPolicy(clean);
  assert.equal(ok.pass, true);

  assert.throws(
    () => assertThumbnailPolicy({ ...clean, textRegionCount: 2 }),
    (e: unknown) => {
      assert.ok(e instanceof ThumbnailPolicyError, 'is ThumbnailPolicyError');
      assert.ok((e as ThumbnailPolicyError).result.violations.length > 0);
      assert.ok(/thumbnail_policy_blocked/.test((e as Error).message));
      return true;
    },
  );
});

// eslint-disable-next-line no-console
console.log(`\nAll ${passed} thumbnail-policy assertions passed.`);
