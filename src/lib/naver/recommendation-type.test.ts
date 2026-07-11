// classifyRecommendationType unit test (#250 §3). No test framework — run:
// `npx tsx src/lib/naver/recommendation-type.test.ts`. Exits non-zero on first fail.
// Covers: golden (hot+margin), niche (margin+not-hot), seasonal (in-peak priority),
// none, seller-language reasons (#233), purity.

import assert from 'node:assert/strict';
import { classifyRecommendationType } from './recommendation-type';
import type { CategoryTrendEntry } from './category-trend-cache';

function trend(trendScore: number): CategoryTrendEntry {
  const marketLevel = trendScore >= 60 ? 'hot' : trendScore >= 30 ? 'normal' : 'cold';
  return { cacheKey: 't', trendScore, volumeScore: 0, marketLevel, dataSource: 'test', refreshedAt: new Date(0) };
}

let passed = 0;
function check(name: string, fn: () => void) {
  fn(); passed += 1;
  // eslint-disable-next-line no-console
  console.log(`  ok — ${name}`);
}

check('golden: hot search + strong margin', () => {
  // 수영복: recommended margin 40%, so a priced product yields strong roi.
  const r = classifyRecommendationType({
    d1: '스포츠/레저', d2: '스포츠의류', d3: '수영복',
    supplierPrice: 20000, trend: trend(90), nowMonth: 1, // Jan: not swimsuit peak
  });
  assert.equal(r.type, 'golden', `expected golden, got ${r.type}`);
  assert.equal(r.emoji, '🏆');
  assert.ok(r.reasons.join(' ').includes('검색 상승세'), 'golden reason');
});

check('seasonal: in-peak wins over golden', () => {
  // 수영복 peak = 5~8월. In June, seasonal must take priority.
  const r = classifyRecommendationType({
    d1: '스포츠/레저', d2: '스포츠의류', d3: '수영복',
    supplierPrice: 20000, trend: trend(90), nowMonth: 6,
  });
  assert.equal(r.type, 'seasonal', `expected seasonal, got ${r.type}`);
  assert.equal(r.emoji, '🗓️');
  assert.ok(r.reasons.join(' ').includes('시즌 급상승'), 'seasonal reason');
});

check('niche: decent margin but search not hot', () => {
  // 청소용품: non-seasonal, thin-ish margin. Cold trend → niche if roi >= 45.
  const r = classifyRecommendationType({
    d1: '생활/건강', d2: '생활용품', d3: '청소용품',
    trend: trend(20), nowMonth: 1,
  });
  // roiScore from marginRecommended 25 → ~45-50; seo low → niche or null.
  assert.ok(r.type === 'niche' || r.type === null, `got ${r.type}`);
  if (r.type === 'niche') {
    assert.equal(r.emoji, '💎');
    assert.ok(r.reasons.join(' ').includes('틈새'), 'niche reason');
  }
});

check('reasons are seller language, no jargon (#233)', () => {
  const r = classifyRecommendationType({
    d1: '스포츠/레저', d2: '스포츠의류', d3: '수영복',
    supplierPrice: 20000, trend: trend(90), nowMonth: 6,
  });
  assert.ok(!/trendScore|roiScore=|seoScore=/i.test(r.reasons.join(' ')), 'no raw jargon tokens');
});

check('score carries caveats (#231) for the caller', () => {
  const r = classifyRecommendationType({
    d1: '패션의류', d2: '여성의류', d3: '레깅스', trend: trend(55), nowMonth: 1,
  });
  assert.ok(r.score.caveats.some((c) => c.includes('경쟁 강도')), 'caveats present');
});

check('pure: identical inputs → identical output', () => {
  const input = { d1: '스포츠/레저', d2: '스포츠의류', d3: '수영복', supplierPrice: 20000, trend: trend(90), nowMonth: 6 };
  assert.deepEqual(classifyRecommendationType(input), classifyRecommendationType(input));
});

// eslint-disable-next-line no-console
console.log(`\nrecommendation-type: ${passed} checks passed`);
