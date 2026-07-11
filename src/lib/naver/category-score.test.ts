// Category SEO × ROI score unit test (#249). No test framework in this repo —
// run standalone: `npx tsx src/lib/naver/category-score.test.ts`.
// Exits non-zero on the first failed assertion. Covers spec §5.1:
//   - trend↑ margin↑ → S
//   - trend↓ margin↓ → C
//   - purity (same inputs → identical output; no clock/IO)
//   - honest caveats (#231) + seller-language reasons (#233)

import assert from 'node:assert/strict';
import { computeCategoryScore } from './category-score';
import type { CategoryTrendEntry } from './category-trend-cache';

function trend(trendScore: number): CategoryTrendEntry {
  const marketLevel = trendScore >= 60 ? 'hot' : trendScore >= 30 ? 'normal' : 'cold';
  return {
    cacheKey: 'test',
    trendScore,
    volumeScore: 0,
    marketLevel,
    dataSource: 'test',
    refreshedAt: new Date(0),
  };
}

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  // eslint-disable-next-line no-console
  console.log(`  ok — ${name}`);
}

// --- grade extremes ---------------------------------------------------------

check('trend↑ margin↑ → S', () => {
  // 수영복: high recommended margin (40%), modest return (8%). Hot trend.
  const r = computeCategoryScore({
    d1: '스포츠/레저',
    d2: '스포츠의류',
    d3: '수영복',
    trend: trend(90),
  });
  assert.equal(r.grade, 'S', `expected S, got ${r.grade} (total ${r.totalScore})`);
  assert.ok(r.seoScore >= 80, 'hot trend → high SEO');
  assert.ok(r.roiScore >= 70, 'strong margin → high ROI');
});

check('trend↓ margin↓ → C', () => {
  // 청소용품: thin margin (25%), cold trend.
  const r = computeCategoryScore({
    d1: '생활/건강',
    d2: '생활용품',
    d3: '청소용품',
    trend: trend(8),
  });
  assert.equal(r.grade, 'C', `expected C, got ${r.grade} (total ${r.totalScore})`);
  assert.ok(r.seoScore <= 15, 'cold trend → low SEO');
});

// --- scoring monotonicity ---------------------------------------------------

check('higher trend never lowers totalScore for same category', () => {
  const base = { d1: '패션의류', d2: '여성의류', d3: '원피스' };
  const lo = computeCategoryScore({ ...base, trend: trend(20) });
  const hi = computeCategoryScore({ ...base, trend: trend(80) });
  assert.ok(hi.totalScore > lo.totalScore, 'trend↑ ⇒ total↑');
  assert.ok(hi.seoScore > lo.seoScore, 'trend↑ ⇒ seo↑');
});

// --- product-specific ROI (supplierPrice) -----------------------------------

check('supplierPrice yields product-specific net margin in detail + reasons', () => {
  const r = computeCategoryScore({
    d1: '스포츠/레저',
    d2: '스포츠의류',
    d3: '수영복',
    supplierPrice: 20000,
    trend: trend(70),
  });
  assert.ok(r.detail.netMarginPct != null, 'net margin computed from price');
  assert.ok(
    r.reasons.some((s) => s.includes('예상 순마진')),
    'reason mentions product-specific 예상 순마진',
  );
  // No supplierPrice → the "표준 권장 마진 기준" caveat must NOT appear.
  assert.ok(
    !r.caveats.some((c) => c.includes('실제 공급가 미반영')),
    'price-based ROI drops the "공급가 미반영" caveat',
  );
});

// --- honest data limits (#231) ----------------------------------------------

check('caveats always disclose competition-intensity exclusion (#231)', () => {
  const r = computeCategoryScore({
    d1: '패션의류',
    d2: '여성의류',
    d3: '레깅스',
    trend: trend(55),
  });
  assert.ok(
    r.caveats.some((c) => c.includes('경쟁 강도')),
    'competition exclusion disclosed',
  );
});

check('missing trend → neutral SEO with honest caveat', () => {
  const r = computeCategoryScore({
    d1: '패션의류',
    d2: '여성의류',
    d3: '레깅스',
    trend: null,
  });
  assert.equal(r.seoScore, 50, 'neutral SEO when trend cold');
  assert.ok(
    r.caveats.some((c) => c.includes('중립값')),
    'neutral-score caveat present',
  );
  assert.equal(r.detail.trendScore, null);
});

// --- seller language (#233): no raw jargon leaks --------------------------

check('reasons use seller language, not jargon (#233)', () => {
  const r = computeCategoryScore({
    d1: '스포츠/레저',
    d2: '스포츠의류',
    d3: '수영복',
    trend: trend(90),
  });
  const blob = r.reasons.join(' ');
  assert.ok(!/trendScore|ratio|roiScore|seoScore/i.test(blob), 'no jargon tokens');
});

// --- weight override --------------------------------------------------------

check('roi-first weighting shifts total toward ROI', () => {
  const base = { d1: '생활/건강', d2: '생활용품', d3: '청소용품', trend: trend(90) };
  const even = computeCategoryScore(base);
  const roiFirst = computeCategoryScore({ ...base, weights: { seo: 0.2, roi: 0.8 } });
  // High trend + thin margin: leaning ROI must drop the total vs even split.
  assert.ok(roiFirst.totalScore < even.totalScore, 'roi-weighted total < even');
  assert.ok(Math.abs(roiFirst.detail.roiWeight - 0.8) < 1e-9, 'weights normalized');
});

// --- purity -----------------------------------------------------------------

check('pure: identical inputs → identical output', () => {
  const input = {
    d1: '패션의류',
    d2: '여성의류',
    d3: '원피스',
    supplierPrice: 15000,
    trend: trend(60),
  };
  const a = computeCategoryScore(input);
  const b = computeCategoryScore(input);
  assert.deepEqual(a, b, 'deterministic — no clock/IO nondeterminism');
});

// eslint-disable-next-line no-console
console.log(`\ncategory-score: ${passed} checks passed`);
