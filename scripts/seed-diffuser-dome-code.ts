// scripts/seed-diffuser-dome-code.ts
// ============================================================================
// Sprint 7-PC-B follow-up — manual dome_code seed for the diffuser test path.
// ============================================================================
//
// Why this script exists
// ----------------------
// /api/category/suggest queries `category_mappings` by (lookup_kind, lookup_key).
// PC-B-1 (5a3b8c2) wired the client to pass `domeCategoryCode` so the cache
// can be hit — but the cache row itself does not exist yet for the diffuser
// dome code "11_08_07_03_00". Without a seed, the suggest endpoint falls
// through to AI / FALLBACK_RULES, which returns an invalid Naver triple
// (the FALLBACK_RULES bug is P13-D, fixed in PC-C). Seeding the canonical
// mapping closes the loop for the diffuser test case immediately, while the
// broader FALLBACK_RULES correction lands in PC-C.
//
// Evidence (Desktop turn, Chrome MCP, 2026-05-19)
// -----------------------------------------------
// Domeggook navigation hierarchy for the bornscent diffuser product:
//   D1 = '가구/인테리어'         (code 11)
//   D2 = '인테리어소품'           (code 11_08)
//        — note: prefill payload reports '홈인테리어소품' which is a
//          crawler-side normalisation bug. Recorded as paper-cut P21.
//   D3 = '아로마/캔들용품'        (code 11_08_07)
//   D4 = '아로마방향제/디퓨저'    (code 11_08_07_03)
// Source: https://domeggook.com/main/item/itemList.php?ca=11_08_07_00_00
//
// Naver category target (src/lib/naver/naver-categories-full.ts L201)
// -------------------------------------------------------------------
//   code  = '50003356'
//   d1    = '가구/인테리어'
//   d2    = '인테리어소품'
//   d3    = '아로마/캔들용품'
//   d4    = '아로마방향제/디퓨저'
//
// Runtime
// -------
//   npx tsx scripts/seed-diffuser-dome-code.ts
//
// Idempotent: `saveMapping` upserts on the (lookup_kind, lookup_key) unique
// index, so re-running prints the same final state.
//
// Note on `source` value: `MappingSource` is the strict union
// 'ai' | 'fallback' | 'manual' in src/lib/dome-category-cache.ts. We use
// 'manual' as the closest canonical value. The TASK_BRIDGE hand-off proposed
// the more specific label 'manual_seed' — adopting that would require
// expanding the union (separate cleanup, out of scope here).

import { prisma } from '../src/lib/prisma';
import { saveMapping } from '../src/lib/dome-category-cache';

const DIFFUSER_DOME_CODE = '11_08_07_03_00';

async function main(): Promise<void> {
  const before = await prisma.categoryMapping.count({ where: { lookupKind: 'dome_code' } });
  console.log(`[seed] dome_code rows before: ${before}`);

  await saveMapping({
    kind: 'dome_code',
    key: DIFFUSER_DOME_CODE,
    d1: '가구/인테리어',
    d2: '인테리어소품',
    d3: '아로마/캔들용품',
    d4: '아로마방향제/디퓨저',
    naverCategoryCode: '50003356',
    confidence: 95,
    source: 'manual',
  });

  const after = await prisma.categoryMapping.count({ where: { lookupKind: 'dome_code' } });
  const row = await prisma.categoryMapping.findUnique({
    where: { lookupKind_lookupKey: { lookupKind: 'dome_code', lookupKey: DIFFUSER_DOME_CODE } },
  });

  console.log(`[seed] dome_code rows after:  ${after}`);
  console.log('[seed] row:', JSON.stringify({
    id: row?.id,
    lookupKey: row?.lookupKey,
    naverD1: row?.naverD1,
    naverD2: row?.naverD2,
    naverD3: row?.naverD3,
    naverD4: row?.naverD4,
    naverCategoryCode: row?.naverCategoryCode,
    confidence: row?.confidence,
    source: row?.source,
    hitCount: row?.hitCount,
  }, null, 2));
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
