// scripts/verify-sourcing-seeds.ts
//
// 결함2 자체검증(2026-08-20, Desktop 리뷰 요구사항): resolveSourcingSeeds()를
// 실 DB + 실 SearchAd로 실행해 씨앗 5개를 그대로 출력한다. Code 워크트리엔
// DATABASE_URL/NAVER_SEARCHAD_* 자격증명이 없어(두 환경 핑퐁 프로토콜) Code가
// 직접 실행할 수 없다 — Desktop이 실행하고 출력을 그대로 보고에 붙여넣는다.
//
// USAGE:
//   npx tsx scripts/verify-sourcing-seeds.ts

import fs from 'fs';
import path from 'path';

function loadEnvLocal(): void {
  const p = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const [, key, val] = m;
    if (!(key in process.env)) process.env[key] = val.replace(/^"|"$/g, '');
  }
}
loadEnvLocal();

import { resolveSourcingSeeds } from '../src/lib/naver/seed-keywords';

async function main(): Promise<void> {
  const seeds = await resolveSourcingSeeds();
  console.log(JSON.stringify(seeds, null, 2));
  if (seeds.length === 0) {
    console.log('씨앗 0개 — resolveSourcingSeeds()가 빈 배열을 반환했다. 호출부는 DataLab 카테고리 폴백을 탄다.');
  }
}

main()
  .catch((e) => {
    console.error('verify-sourcing-seeds failed:', e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
