// scripts/backfill-naver-category-origin.ts
//
// One-shot recovery for products registered BEFORE the import route mapped
// naverCategoryCode/origin/AS-info/brand/sellerCode/unitPrice (docs/handoff/
// CODE_PARTIAL_SYNC_SAFETY_HANDOFF_2026-08-11.md +
// CODE_IMPORT_FIELD_COMPLETENESS_HANDOFF_2026-08-11.md). Those products are
// LIVE on Naver with correct values, but the app DB row is blank for fields
// the import route didn't map at the time — a dangerous "trusted baseline"
// gap that /api/naver/products/update's null-defense (2026-08-12 fix) guards
// against for category/origin at write-time, but the app DB itself should
// still carry the real values (씨앗심기 재입력 없이 이어쓰기, 운영자 원 요청).
//
// For every published product (naverProductId set), GET the live Naver
// product and backfill any of these app DB columns that are currently blank:
//   naverCategoryCode, naver_origin (origin label), asPhone, asInfo (AS안내),
//   naver_brand, sellerProductCode, unit_price_yn/unit_total_capacity/
//   unit_capacity/unit_indication_unit (단위가격, only if the category requires it
//   AND Naver actually returns unitPriceInfo for the product).
//
// NOT covered (confirmed unrecoverable from Naver's GET response — see
// docs/handoff/CODE_IMPORT_FIELD_COMPLETENESS_2026-08-11.md §3): hookPhrase /
// detailImages / detailImageUrl (baked into one opaque detailContent HTML
// blob, not separate structured fields) and keywords (merged into sellerTags
// before Naver ever sees it — already covered by the existing `tags` import).
// shippingTemplateId is a local FK into our own ShippingTemplate table, not a
// Naver-returned value — also not attempted here.
//
// SAFETY:
//   - DRY-RUN by default. Pass --apply to write.
//   - Read-only against Naver (GET only, never PUT) — this script can never
//     mutate the live Naver product, only the app DB row.
//   - Never overwrites a non-blank app DB value — only fills blanks.
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

function nonBlank(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

async function main(): Promise<void> {
  console.log(`[backfill-import-fields] mode=${APPLY ? 'APPLY (writes app DB)' : 'DRY-RUN'}`);

  const products = await prisma.product.findMany({
    where: { naverProductId: { not: null } },
    select: {
      id: true, name: true, naverProductId: true, naverCategoryCode: true, naver_origin: true,
      asPhone: true, asInfo: true, naver_brand: true, sellerProductCode: true,
      unit_price_yn: true, unit_total_capacity: true, unit_capacity: true, unit_indication_unit: true,
    },
  });

  const stats = { scanned: 0, fieldsFixed: 0, productsChanged: 0, unchanged: 0, getFailed: 0 };

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
    const detailAttr = origin?.detailAttribute as Record<string, unknown> | undefined;

    const curLeafCategoryId = typeof origin?.leafCategoryId === 'string'
      ? origin.leafCategoryId
      : (typeof origin?.leafCategoryId === 'number' ? String(origin.leafCategoryId) : '');
    const originArea = detailAttr?.originAreaInfo as Record<string, unknown> | undefined;
    const curOriginContent = typeof originArea?.content === 'string' ? originArea.content : '';
    const afterService = detailAttr?.afterServiceInfo as Record<string, unknown> | undefined;
    const curAsPhone = typeof afterService?.afterServiceTelephoneNumber === 'string' ? afterService.afterServiceTelephoneNumber : '';
    const curAsGuide = typeof afterService?.afterServiceGuideContent === 'string' ? afterService.afterServiceGuideContent : '';
    const curBrand = typeof (detailAttr?.naverShoppingSearchInfo as Record<string, unknown> | undefined)?.brandName === 'string'
      ? String((detailAttr!.naverShoppingSearchInfo as Record<string, unknown>).brandName) : '';
    const curSellerCode = typeof (detailAttr?.sellerCodeInfo as Record<string, unknown> | undefined)?.sellerManagementCode === 'string'
      ? String((detailAttr!.sellerCodeInfo as Record<string, unknown>).sellerManagementCode) : '';
    const unitInfo = detailAttr?.unitPriceInfo as Record<string, unknown> | undefined;

    const update: Record<string, unknown> = {};

    if (!VALID_LEAF_CATEGORY_ID.test((p.naverCategoryCode ?? '').trim()) && VALID_LEAF_CATEGORY_ID.test(curLeafCategoryId)) {
      update.naverCategoryCode = curLeafCategoryId;
    }
    if (!nonBlank(p.naver_origin) && nonBlank(curOriginContent)) {
      update.naver_origin = curOriginContent.trim();
    }
    if (!nonBlank(p.asPhone) && nonBlank(curAsPhone)) {
      update.asPhone = curAsPhone.trim();
    }
    if (!nonBlank(p.asInfo) && nonBlank(curAsGuide)) {
      update.asInfo = curAsGuide.trim();
    }
    if (!nonBlank(p.naver_brand) && nonBlank(curBrand)) {
      update.naver_brand = curBrand.trim();
    }
    if (!nonBlank(p.sellerProductCode) && nonBlank(curSellerCode)) {
      update.sellerProductCode = curSellerCode.trim();
    }
    if (unitInfo && p.unit_price_yn == null) {
      if (unitInfo.unitPriceYn === 'Y' || unitInfo.unitPriceYn === 'N') {
        update.unit_price_yn = unitInfo.unitPriceYn === 'Y';
      }
      if (typeof unitInfo.totalCapacityValue === 'number') update.unit_total_capacity = unitInfo.totalCapacityValue;
      if (typeof unitInfo.unitCapacity === 'number') update.unit_capacity = unitInfo.unitCapacity;
      if (nonBlank(unitInfo.indicationUnit)) update.unit_indication_unit = String(unitInfo.indicationUnit).trim();
    }

    if (Object.keys(update).length === 0) {
      stats.unchanged++;
      continue;
    }

    stats.productsChanged++;
    for (const [key, val] of Object.entries(update)) {
      stats.fieldsFixed++;
      console.log(`  ${APPLY ? 'FIXED' : 'WOULD-FIX'}  ${p.id} "${p.name}" ${key}: ${JSON.stringify((p as any)[key] ?? null)} -> ${JSON.stringify(val)}`);
    }

    if (APPLY) {
      await prisma.product.update({ where: { id: p.id }, data: update });
    }
  }

  console.log('[backfill-import-fields] summary:', JSON.stringify(stats));
  if (!APPLY && stats.fieldsFixed > 0) {
    console.log('[backfill-import-fields] dry-run only — re-run with --apply to write the above.');
  }
}

main()
  .catch((e) => { console.error('[backfill-import-fields] ERROR', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
