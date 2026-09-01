// scripts/backfill-category-id-from-name.ts
//
// Root-cause fix for the category_id backfill bug (2026-09-01). The prior
// backfill (scripts/wire-category-id-from-code.ts, UCE-8, run against
// production from a different branch) set Product.category_id by resolving
// each product's EXISTING naverCategoryCode straight into naver_categories.
// For products classified before the UCE matcher existed, that code was a
// stale/wrong label — the FK itself was never broken (0 orphans), but the
// VALUE it pointed at was (실측: 아이스트레이→홍합, 디퓨저→교자상, see
// docs/playbook/CORE_WORKING_PRINCIPLES.md#기둥1). "FK 연결됨 ≠ 올바른 카테고리".
//
// This script does NOT trust naverCategoryCode. For every product it
// re-derives the category from the product NAME via the same deterministic
// matcher UCE uses (src/lib/naver/category-id-resolver.ts#resolveConfidentCategory,
// shared with scripts/verify-category-integrity.ts so the two can never
// silently disagree). A confident match writes category_id; anything else —
// no match, or a weak/ambiguous one — clears category_id to NULL rather than
// keeping (or forcing) a guess. 빈손이면 정직하게 비워둔다.
//
// SAFETY (작업원칙 #41 — 두 환경 핑퐁 프로토콜):
//   - DRY-RUN by default. --apply to write.
//   - Read-only against Naver — this script never calls the Naver API.
//   - Code(이 워크트리)는 --apply를 프로덕션에 직접 실행하지 않는다. dry-run
//     출력을 운영자(Desktop)가 검토한 뒤 그 환경에서 --apply 한다.
//
// USAGE:
//   npx tsx scripts/backfill-category-id-from-name.ts            # dry-run
//   npx tsx scripts/backfill-category-id-from-name.ts --apply    # write

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
import { resolveConfidentCategory } from '../src/lib/naver/category-id-resolver';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main(): Promise<void> {
  console.log(`[backfill-category-id-from-name] mode=${APPLY ? 'APPLY (writes Product.category_id)' : 'DRY-RUN'}`);

  const categories = await prisma.naverCategory.findMany({ select: { id: true, categoryCode: true } });
  if (categories.length === 0) {
    console.error('[backfill-category-id-from-name] ABORT — naver_categories is empty. Run load-naver-categories.ts --apply first.');
    process.exitCode = 1;
    return;
  }
  const idByCode = new Map(categories.map((c) => [c.categoryCode, c.id]));

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      category_id: true,
      naver_categories: { select: { fullPath: true } },
    },
  });

  const stats = { scanned: products.length, fixed: 0, cleared: 0, unresolvedMaster: 0, unchanged: 0 };

  for (const p of products) {
    const resolution = resolveConfidentCategory(p.name);
    const currentFullPath = p.naver_categories?.fullPath ?? null;

    if (!resolution) {
      // No confident match from the name — honest empty hand. Clear a
      // previously (possibly wrongly) set category_id; leave an already-null
      // one alone.
      if (p.category_id !== null) {
        stats.cleared++;
        console.log(`  ${APPLY ? 'CLEARED' : 'WOULD-CLEAR'}  ${p.id} "${p.name}" category_id: ${p.category_id} ("${currentFullPath}") -> NULL (matcher has no confident hit)`);
        if (APPLY) await prisma.product.update({ where: { id: p.id }, data: { category_id: null } });
      } else {
        stats.unchanged++;
      }
      continue;
    }

    const newCategoryId = idByCode.get(resolution.code);
    if (!newCategoryId) {
      // Matcher is confident but the master doesn't have that leaf's code
      // loaded yet — a data-completeness gap, not a matching failure. Don't
      // touch the existing value either way.
      stats.unresolvedMaster++;
      console.log(`  MASTER-MISSING  ${p.id} "${p.name}" matcher -> "${resolution.fullPath}" (code=${resolution.code}) but naver_categories has no row for that code`);
      continue;
    }

    if (p.category_id === newCategoryId) {
      stats.unchanged++;
      continue;
    }

    stats.fixed++;
    console.log(`  ${APPLY ? 'FIXED' : 'WOULD-FIX'}  ${p.id} "${p.name}" category_id: ${p.category_id ?? 'NULL'} ("${currentFullPath ?? '-'}") -> ${newCategoryId} ("${resolution.fullPath}")`);
    if (APPLY) await prisma.product.update({ where: { id: p.id }, data: { category_id: newCategoryId } });
  }

  console.log('\n[backfill-category-id-from-name] summary:', JSON.stringify(stats));
  if (!APPLY && (stats.fixed > 0 || stats.cleared > 0)) {
    console.log('[backfill-category-id-from-name] DRY-RUN only — re-run with --apply to write the above.');
  }
}

main()
  .catch((e) => { console.error('[backfill-category-id-from-name] ERROR', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
