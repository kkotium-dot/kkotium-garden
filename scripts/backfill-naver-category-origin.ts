// scripts/backfill-naver-category-origin.ts
//
// One-shot recovery for products registered BEFORE the import route mapped
// naverCategoryCode / origin (docs/handoff/CODE_PARTIAL_SYNC_SAFETY_HANDOFF_
// 2026-08-11.md). Those products are LIVE on Naver with a correct category/
// origin, but the app DB row is blank — a dangerous "trusted baseline" gap
// that /api/naver/products/update's null-defense (2026-08-12 fix) now guards
// against at write-time. This script is the follow-up: backfill the app DB
// itself from Naver's live GET so the gap stops recurring on every dryRun.
//
// For every published product (naverProductId set) where naverCategoryCode
// is blank/invalid or naver_origin (origin content label) is null, GET the
// live Naver product and write the recovered values back to the app DB.
//
// SAFETY:
//   - DRY-RUN by default. Pass --apply to write.
//   - Read-only against Naver (GET only, never PUT) — this script can never
//     mutate the live Naver product, only the app DB row.
//   - Per 두 환경 핑퐁 프로토콜 (작업원칙 #41): Code does not run --apply
//     against production — Desktop reviews the dry-run output and applies.
//
// USAGE:
//   npx tsx scripts/backfill-naver-category-origin.ts            # dry-run
//   npx tsx scripts/backfill-naver-category-origin.ts --apply    # write changes

import fs from 'fs';
import path from 'path';

function loadEnvLocal(): void {
  const raw = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
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
import { getProduct } from '../src/lib/naver/api-client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const VALID_LEAF_CATEGORY_ID = /^\d{6,10}$/;

async function main(): Promise<void> {
  console.log(`[backfill-category-origin] mode=${APPLY ? 'APPLY (writes app DB)' : 'DRY-RUN'}`);

  const products = await prisma.product.findMany({
    where: { naverProductId: { not: null } },
    select: { id: true, name: true, naverProductId: true, naverCategoryCode: true, naver_origin: true },
  });

  const stats = { scanned: 0, categoryFixed: 0, originFixed: 0, unchanged: 0, getFailed: 0 };

  for (const p of products) {
    stats.scanned++;
    const naverProductId = p.naverProductId as string;
    let current: any;
    try {
      current = await getProduct(naverProductId);
    } catch (e) {
      stats.getFailed++;
      console.log(`  GET-FAILED  ${p.id} "${p.name}" naverProductId=${naverProductId} — ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    const origin = current?.originProduct as Record<string, unknown> | undefined;
    const curLeafCategoryId = typeof origin?.leafCategoryId === 'string'
      ? origin.leafCategoryId
      : (typeof origin?.leafCategoryId === 'number' ? String(origin.leafCategoryId) : '');
    const detailAttr = origin?.detailAttribute as Record<string, unknown> | undefined;
    const originArea = detailAttr?.originAreaInfo as Record<string, unknown> | undefined;
    const curOriginContent = typeof originArea?.content === 'string' ? originArea.content : '';

    const dbCategoryInvalid = !VALID_LEAF_CATEGORY_ID.test((p.naverCategoryCode ?? '').trim());
    const dbOriginBlank = !p.naver_origin || p.naver_origin.trim().length === 0;

    const update: Record<string, string> = {};
    if (dbCategoryInvalid && VALID_LEAF_CATEGORY_ID.test(curLeafCategoryId)) {
      update.naverCategoryCode = curLeafCategoryId;
    }
    if (dbOriginBlank && curOriginContent.trim().length > 0) {
      update.naver_origin = curOriginContent;
    }

    if (Object.keys(update).length === 0) {
      stats.unchanged++;
      continue;
    }

    if (update.naverCategoryCode) {
      console.log(`  ${APPLY ? 'FIXED' : 'WOULD-FIX'}  ${p.id} "${p.name}" naverCategoryCode: "${p.naverCategoryCode}" -> "${update.naverCategoryCode}"`);
      stats.categoryFixed++;
    }
    if (update.naver_origin) {
      console.log(`  ${APPLY ? 'FIXED' : 'WOULD-FIX'}  ${p.id} "${p.name}" naver_origin: "${p.naver_origin ?? 'null'}" -> "${update.naver_origin}"`);
      stats.originFixed++;
    }

    if (APPLY) {
      await prisma.product.update({ where: { id: p.id }, data: update });
    }
  }

  console.log('[backfill-category-origin] summary:', JSON.stringify(stats));
  if (!APPLY && (stats.categoryFixed > 0 || stats.originFixed > 0)) {
    console.log('[backfill-category-origin] dry-run only — re-run with --apply to write the above.');
  }
}

main()
  .catch((e) => { console.error('[backfill-category-origin] ERROR', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
