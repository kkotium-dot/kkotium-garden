// scripts/clear-known-wrong-category-labels.ts
//
// Direction change (2026-09-02): auto re-deriving Product.category_id from
// the product name (scripts/backfill-category-id-from-name.ts) proved
// unsafe — even with a GENERIC_SUFFIX_BLOCKLIST, the deterministic matcher
// can still be fooled by substring collisions the blocklist doesn't cover
// (실측: "샤워필터"→정수기, "실외기"→TV커버). #352/#353: auto-correction
// cannot reach "오분류 0" against an arbitrary catalog — stop trying.
//
// This script does NOT try to guess a replacement value. It only CLEARS
// category_id for products that currently point at one of a short, manually
// confirmed list of nonsense destination categories (WRONG_DESTINATION_CODES
// below) — the ones the original UCE-8 backfill bug (scripts/wire-category-
// id-from-code.ts on a different branch, run against production) is known to
// have produced from stale naverCategoryCode values (아이스트레이→홍합,
// 디퓨저→교자상, docs/playbook/CORE_WORKING_PRINCIPLES.md#기둥1). Clearing a
// demonstrably-wrong value back to NULL is not a regression ("개악") — it's
// removing a known-wrong label, which is strictly safer than leaving it.
//
// This is deliberately narrow and manual, not a general "detect and clear
// anything that looks wrong" tool — that would just reintroduce the same
// unreliable-matcher problem from the other direction. Extend
// WRONG_DESTINATION_CODES only with codes an operator has manually confirmed
// are nonsense destinations for this catalog, then re-run dryRun before
// --apply.
//
// SAFETY (작업원칙 #41 — 두 환경 핑퐁 프로토콜):
//   - DRY-RUN by default. --apply to write.
//   - Only ever sets category_id to NULL — never sets a new value.
//
// USAGE:
//   npx tsx scripts/clear-known-wrong-category-labels.ts            # dry-run
//   npx tsx scripts/clear-known-wrong-category-labels.ts --apply    # write

import fs from 'fs';
import path from 'path';

function loadEnvLocal(): void {
  const p = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) {
      const val = m[2].replace(/^["']|["']$/g, '').replace(/\\\$/g, '$');
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  }
}
loadEnvLocal();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

// naver_categories.category_code, confirmed-wrong destinations (2026-09-01/02
// 실측). Add more here only after manually confirming they're nonsense for
// this catalog — never derive this list programmatically.
const WRONG_DESTINATION_CODES: Record<string, string> = {
  '50004716': '식품 > 수산물 > 해산물/어패류 > 홍합', // 아이스트레이류 상품이 잘못 연결됨
  '50004765': '생활/건강 > 주방용품 > 교자상/밥상 > 교자상', // 디퓨저류 상품이 잘못 연결됨
};

async function main(): Promise<void> {
  console.log(`[clear-known-wrong-category-labels] mode=${APPLY ? 'APPLY (writes Product.category_id)' : 'DRY-RUN'}`);
  console.log(`[clear-known-wrong-category-labels] target codes: ${Object.keys(WRONG_DESTINATION_CODES).join(', ')}`);

  const wrongCategories = await prisma.naverCategory.findMany({
    where: { categoryCode: { in: Object.keys(WRONG_DESTINATION_CODES) } },
    select: { id: true, categoryCode: true, fullPath: true },
  });

  if (wrongCategories.length === 0) {
    console.log('[clear-known-wrong-category-labels] none of the target codes exist in naver_categories — nothing to clear.');
    return;
  }

  const products = await prisma.product.findMany({
    where: { category_id: { in: wrongCategories.map((c) => c.id) } },
    select: { id: true, name: true, category_id: true, naverCategoryCode: true },
  });

  const stats = { scanned: products.length, cleared: 0 };
  for (const p of products) {
    const wrong = wrongCategories.find((c) => c.id === p.category_id);
    stats.cleared++;
    console.log(`  ${APPLY ? 'CLEARED' : 'WOULD-CLEAR'}  ${p.id} "${p.name}" category_id -> NULL (was ${wrong?.fullPath ?? p.category_id}, naverCategoryCode=${p.naverCategoryCode ?? ''})`);
    if (APPLY) {
      await prisma.product.update({ where: { id: p.id }, data: { category_id: null } });
    }
  }

  console.log('\n[clear-known-wrong-category-labels] summary:', JSON.stringify(stats));
  if (!APPLY && stats.cleared > 0) {
    console.log('[clear-known-wrong-category-labels] DRY-RUN only — re-run with --apply to write the above.');
  }
}

main()
  .catch((e) => { console.error('[clear-known-wrong-category-labels] ERROR', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
