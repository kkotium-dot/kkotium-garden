// scripts/verify-seed-golden.ts
//
// P0-6 (2026-08-20, Desktop 지침): scripts/fixtures/seed-golden-set.ts를
// candidateHeadwordsFromName()(seed-keywords.ts, extractNouns 기반)에 통과시켜
// 기대 headword와의 일치율을 출력한다. DB·SearchAd API 불필요 — 순수 함수
// 테스트라 자격증명 없는 환경(Code 워크트리)에서도 그대로 돌아간다.
//
// 기준: 일치율 80% 미만이면 회귀로 간주하고 실패 케이스를 원인과 함께 출력한다.
//
// USAGE:
//   npx tsx scripts/verify-seed-golden.ts
//   npm run test:seeds

import { SEED_GOLDEN_SET } from './fixtures/seed-golden-set';
import { candidateHeadwordsFromName } from '../src/lib/naver/seed-keywords';

const PASS_THRESHOLD = 0.8;

function main(): void {
  const results = SEED_GOLDEN_SET.map((c) => {
    const candidates = candidateHeadwordsFromName(c.productName);
    const actual = candidates[0] ?? '(없음)';
    return { ...c, actual, candidates, pass: actual === c.expected };
  });

  const passed = results.filter((r) => r.pass);
  const failed = results.filter((r) => !r.pass);
  const rate = results.length === 0 ? 0 : passed.length / results.length;

  console.log(`씨앗 headword 골든셋 검증 — ${passed.length}/${results.length} 일치 (${(rate * 100).toFixed(1)}%)\n`);

  if (failed.length > 0) {
    console.log('실패 케이스:');
    for (const r of failed) {
      console.log(
        `  [${r.category}] "${r.productName}"\n` +
        `    기대: "${r.expected}" / 실제: "${r.actual}" / 전체 후보: [${r.candidates.join(', ')}]`
      );
    }
    console.log('');
  }

  const byCategory = new Map<string, { pass: number; total: number }>();
  for (const r of results) {
    const s = byCategory.get(r.category) ?? { pass: 0, total: 0 };
    s.total += 1;
    if (r.pass) s.pass += 1;
    byCategory.set(r.category, s);
  }
  console.log('카테고리별:');
  for (const [cat, s] of byCategory) {
    console.log(`  ${cat}: ${s.pass}/${s.total}`);
  }

  if (rate < PASS_THRESHOLD) {
    console.error(`\n일치율 ${(rate * 100).toFixed(1)}% — 기준(${PASS_THRESHOLD * 100}%) 미달. 회귀로 보고 중단.`);
    process.exitCode = 1;
  }
}

main();
