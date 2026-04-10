// Naver master data seed: categories (naver_categories) + origin codes (origin_codes)
// Run: npm run seed:naver
// Files: 카테고리번호.xls, 원산지코드.xls (project root)

import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();
const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// CATEGORIES
// ---------------------------------------------------------------------------
async function seedCategories() {
  const filePath = path.join(ROOT, '카테고리번호.xls');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  console.log(`Category rows found: ${rows.length}`);

  let upserted = 0;
  let skipped = 0;

  for (const row of rows) {
    // Column name detection — support both Korean and English headers
    const code = String(
      row['카테고리번호'] ||
      row['categoryCode'] ||
      row['category_code'] ||
      row[Object.keys(row)[0]] ||
      ''
    ).trim();

    if (!code || code === '' || isNaN(Number(code))) {
      skipped++;
      continue;
    }

    // Depth columns — try known Korean headers first
    const keys = Object.keys(row);
    const depth1 = String(row['대분류'] || row['depth1'] || row[keys[1]] || '').trim();
    const depth2 = String(row['중분류'] || row['depth2'] || row[keys[2]] || '').trim();
    const depth3 = String(row['소분류'] || row['depth3'] || row[keys[3]] || '').trim();
    const depth4 = String(row['세분류'] || row['depth4'] || row[keys[4]] || '').trim();

    const parts = [depth1, depth2, depth3, depth4].filter(Boolean);
    const fullPath = parts.join(' > ');

    if (!fullPath) {
      skipped++;
      continue;
    }

    try {
      await prisma.naverCategory.upsert({
        where: { categoryCode: code },
        update: { depth1, depth2, depth3, depth4, fullPath },
        create: { categoryCode: code, depth1, depth2, depth3, depth4, fullPath },
      });
      upserted++;
    } catch (e: any) {
      console.warn(`Category skip [${code}]: ${e.message}`);
      skipped++;
    }
  }

  console.log(`Categories: ${upserted} upserted, ${skipped} skipped`);
}

// ---------------------------------------------------------------------------
// ORIGIN CODES
// ---------------------------------------------------------------------------
async function seedOriginCodes() {
  const filePath = path.join(ROOT, '원산지코드.xls');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  console.log(`Origin rows found: ${rows.length}`);

  let upserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const keys = Object.keys(row);

    const code = String(
      row['원산지코드'] ||
      row['originCode'] ||
      row['origin_code'] ||
      row[keys[0]] ||
      ''
    ).trim();

    const name = String(
      row['원산지명'] ||
      row['originName'] ||
      row['origin_name'] ||
      row[keys[1]] ||
      ''
    ).trim();

    if (!code || !name) {
      skipped++;
      continue;
    }

    try {
      await prisma.originCode.upsert({
        where: { originCode: code },
        update: { originName: name },
        create: { originCode: code, originName: name },
      });
      upserted++;
    } catch (e: any) {
      console.warn(`Origin skip [${code}]: ${e.message}`);
      skipped++;
    }
  }

  console.log(`Origins: ${upserted} upserted, ${skipped} skipped`);
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== Naver Master Data Seed START ===');
  await seedCategories();
  await seedOriginCodes();
  console.log('=== Naver Master Data Seed DONE ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

