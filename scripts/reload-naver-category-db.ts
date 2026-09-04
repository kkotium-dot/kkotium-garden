// scripts/reload-naver-category-db.ts
//
// 카테고리 마스터 갱신(feature/category-master-refresh, 2026-09-04, 네이버 7/22~26
// 개편 반영) 후 naver_categories 테이블을 새 마스터(src/lib/naver/
// naver-categories-full.ts)와 동기화한다.
//
// scripts/seed_naver_category.js는 쓰지 않는다 — deleteMany({}) 후 전체 재삽입이라
// 모든 행의 cuid(id)가 바뀐다. Product.category_id는 categoryCode가 아니라 이
// cuid를 참조하므로(fk_products_category, ON DELETE SET NULL 확인됨) 그 스크립트를
// 돌리면 REMOVED 32건과 무관하게 category_id가 있는 상품 전부가 고아가 된다.
//
// 이 스크립트는 categoryCode 기준 upsert만 한다 — 기존 id를 보존한다:
//   - ADDED 코드: insert
//   - 공통 코드인데 라벨(d1~d4/fullPath)이 바뀐 경우: update (id 유지)
//   - REMOVED 코드: 삭제 전 Product.category_id 참조 여부를 반드시 확인하고,
//     참조 중이면 그 행은 삭제하지 않고 건너뛴 뒤 경고로 보고한다(운영자 판단 대기).
//
// SAFETY (작업원칙 #41 — 두 환경 핑퐁 프로토콜):
//   - DRY-RUN by default. --apply to write.
//
// USAGE:
//   npx tsx scripts/reload-naver-category-db.ts            # dry-run
//   npx tsx scripts/reload-naver-category-db.ts --apply     # 실제 반영

import { PrismaClient } from '@prisma/client';
import { NAVER_CATEGORIES_FULL } from '../src/lib/naver/naver-categories-full';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  const masterByCode = new Map(NAVER_CATEGORIES_FULL.map(c => [c.code, c]));
  const dbRows = await prisma.naverCategory.findMany({
    select: { id: true, categoryCode: true, depth1: true, depth2: true, depth3: true, depth4: true, fullPath: true },
  });
  const dbByCode = new Map(dbRows.map(r => [r.categoryCode, r]));

  const toInsert = [...masterByCode.values()].filter(c => !dbByCode.has(c.code));
  const toUpdate = [...masterByCode.values()].filter(c => {
    const row = dbByCode.get(c.code);
    if (!row) return false;
    return row.depth1 !== (c.d1 || null) || row.depth2 !== (c.d2 || null) ||
           row.depth3 !== (c.d3 || null) || row.depth4 !== (c.d4 || null) ||
           row.fullPath !== c.fullPath;
  });
  const removedCodes = dbRows.filter(r => !masterByCode.has(r.categoryCode)).map(r => r.categoryCode);

  const referencedCategoryIds = new Set(
    (await prisma.product.findMany({ where: { category_id: { not: null } }, select: { category_id: true } }))
      .map(p => p.category_id as string),
  );
  const removedRows = dbRows.filter(r => removedCodes.includes(r.categoryCode));
  const removedSafe = removedRows.filter(r => !referencedCategoryIds.has(r.id));
  const removedBlocked = removedRows.filter(r => referencedCategoryIds.has(r.id));

  console.log(`[reload-naver-category-db] mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`  DB rows (before): ${dbRows.length}`);
  console.log(`  master codes:     ${masterByCode.size}`);
  console.log(`  INSERT (new codes):        ${toInsert.length}`);
  console.log(`  UPDATE (label changed):    ${toUpdate.length} -> ${toUpdate.map(c => c.code).join(', ') || '(none)'}`);
  console.log(`  DELETE (removed, unused):  ${removedSafe.length} -> ${removedSafe.map(r => r.categoryCode).join(', ') || '(none)'}`);
  console.log(`  DELETE BLOCKED (removed but still referenced by a product.category_id — NOT deleted): ${removedBlocked.length}`);
  if (removedBlocked.length > 0) {
    console.log('  ⚠️ BLOCKED codes (operator review required):', removedBlocked.map(r => `${r.categoryCode} (${r.fullPath})`).join('; '));
  }

  if (!APPLY) {
    console.log('\n[DRY-RUN] no writes made. Re-run with --apply to execute.');
    await prisma.$disconnect();
    return;
  }

  for (const c of toInsert) {
    await prisma.naverCategory.create({
      data: { categoryCode: c.code, depth1: c.d1 || null, depth2: c.d2 || null, depth3: c.d3 || null, depth4: c.d4 || null, fullPath: c.fullPath },
    });
  }
  for (const c of toUpdate) {
    await prisma.naverCategory.update({
      where: { categoryCode: c.code },
      data: { depth1: c.d1 || null, depth2: c.d2 || null, depth3: c.d3 || null, depth4: c.d4 || null, fullPath: c.fullPath },
    });
  }
  for (const r of removedSafe) {
    await prisma.naverCategory.delete({ where: { id: r.id } });
  }

  const after = await prisma.naverCategory.count();
  console.log(`\n[APPLY] done. inserted=${toInsert.length} updated=${toUpdate.length} deleted=${removedSafe.length} blocked=${removedBlocked.length}`);
  console.log(`  DB rows (after): ${after}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
