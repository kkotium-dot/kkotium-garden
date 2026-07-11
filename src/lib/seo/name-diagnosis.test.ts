// computeNameDiagnosis unit test (SEO 상품명 진단 강화). No test framework in
// this repo — run standalone: `npx tsx src/lib/seo/name-diagnosis.test.ts`.
// Exits non-zero on the first failed assertion. Covers the spec §5.1:
//   - banned word + no keyword → ranked weaknesses + top-3 suggestions
//   - trend strong / weak → trendReflected band + grade nudge
//   - honest caveats (#231) + seller-language suggestions (#233)
//   - purity (same inputs → identical output)

import assert from 'node:assert/strict';
import { computeNameDiagnosis } from './product-name-diagnosis';
import type { CategoryTrendEntry } from '@/lib/naver/category-trend-cache';

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

// --- weaknesses + suggestions -----------------------------------------------

check('banned word + no keyword surfaces ranked weaknesses + suggestions', () => {
  const r = computeNameDiagnosis({
    name: '최저가 주문폭주 원피스',
    d1: '패션의류',
    d2: '여성의류',
    d3: '원피스',
    keywords: [],
    trend: trend(70),
  });
  assert.ok(r.weaknesses.length > 0, 'has weaknesses');
  // fail-severity checks must sort ahead of warn.
  const firstWarnIdx = r.weaknesses.findIndex(w => w.severity === 'warn');
  const lastFailIdx = r.weaknesses.map(w => w.severity).lastIndexOf('fail');
  if (firstWarnIdx !== -1 && lastFailIdx !== -1) {
    assert.ok(lastFailIdx < firstWarnIdx, 'fail weaknesses rank before warn');
  }
  assert.ok(r.suggestions.length >= 1 && r.suggestions.length <= 3, '1..3 suggestions');
});

check('suggestions are capped at 3', () => {
  const r = computeNameDiagnosis({
    name: '최저가 사은품 이벤트 ★대박★ 원피스원피스원피스',
    d1: '패션의류',
    d2: '여성의류',
    d3: '원피스',
    keywords: [],
    trend: trend(20),
  });
  assert.ok(r.suggestions.length <= 3, 'never more than 3 suggestions');
});

// --- trend reflection band + grade nudge ------------------------------------

check('trend strong vs weak flips trendReflected and nudges grade', () => {
  const good = { name: '차량용 디퓨저 방향제 무드등', d1: '생활/건강', d2: '생활용품', d3: '방향제' };
  const hi = computeNameDiagnosis({ ...good, keywords: ['방향제'], trend: trend(90) });
  const lo = computeNameDiagnosis({ ...good, keywords: ['방향제'], trend: trend(10) });
  assert.equal(hi.trendReflected, 'strong');
  assert.equal(lo.trendReflected, 'weak');
  // same name → same base score; strong nudges up, weak nudges down.
  assert.ok(hi.nameScore === lo.nameScore, 'name score independent of trend');
});

check('cold/absent trend → trendReflected unknown (no penalty)', () => {
  const r = computeNameDiagnosis({
    name: '차량용 디퓨저 방향제 무드등',
    d1: '생활/건강',
    d2: '생활용품',
    d3: '방향제',
    keywords: ['방향제'],
    trend: null,
  });
  assert.equal(r.trendReflected, 'unknown');
});

check('no category → categoryScore null, trendReflected unknown', () => {
  const r = computeNameDiagnosis({ name: '차량용 디퓨저 방향제', keywords: ['방향제'] });
  assert.equal(r.categoryScore, null);
  assert.equal(r.trendReflected, 'unknown');
});

// --- honest caveats (#231) + seller language (#233) -------------------------

check('missing keywords adds an honest caveat (#231)', () => {
  const r = computeNameDiagnosis({
    name: '차량용 디퓨저 방향제',
    d1: '생활/건강', d2: '생활용품', d3: '방향제',
    keywords: [],
    trend: trend(55),
  });
  assert.ok(r.caveats.some(c => c.includes('참고용')), 'keyword caveat present');
  // category-score caveats inherited (competition exclusion).
  assert.ok(r.caveats.some(c => c.includes('경쟁 강도')), 'inherits category caveats');
});

check('suggestions use seller language, not jargon (#233)', () => {
  const r = computeNameDiagnosis({
    name: '최저가 원피스',
    d1: '패션의류', d2: '여성의류', d3: '원피스',
    keywords: ['원피스'],
    trend: trend(20),
  });
  const blob = r.suggestions.join(' ');
  assert.ok(!/trendScore|ratio|seoScore|roiScore/i.test(blob), 'no jargon tokens');
});

// --- weak trend contributes a suggestion when room remains ------------------

check('weak trend appends a search-demand suggestion when < 3', () => {
  // A clean name (few base issues) in a cold category should still get the
  // trend-derived suggestion.
  const r = computeNameDiagnosis({
    name: '차량용 디퓨저 방향제 무드등 세트',
    d1: '생활/건강', d2: '생활용품', d3: '방향제',
    keywords: ['방향제'],
    trend: trend(10),
  });
  assert.ok(
    r.suggestions.some(s => s.includes('검색 상승세')),
    'weak trend surfaces a search-demand suggestion',
  );
});

// --- purity -----------------------------------------------------------------

check('pure: identical inputs → identical output', () => {
  const input = {
    name: '최저가 주문폭주 원피스',
    d1: '패션의류', d2: '여성의류', d3: '원피스',
    supplierPrice: 12000,
    keywords: ['원피스'],
    trend: trend(60),
  };
  const a = computeNameDiagnosis(input);
  const b = computeNameDiagnosis(input);
  assert.deepEqual(a, b, 'deterministic — no clock/IO nondeterminism');
});

// eslint-disable-next-line no-console
console.log(`\nname-diagnosis: ${passed} checks passed`);
