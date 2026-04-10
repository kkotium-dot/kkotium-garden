import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const wb = XLSX.readFile(path.resolve('prisma/카테고리번호.xlsx'));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any>(ws);

  console.log(`Total rows: ${rows.length}`);
  let count = 0;

  for (const row of rows) {
    const d1 = String(row['대분류'] ?? '').trim();
    const d2 = String(row['중분류'] ?? '').trim();
    const d3 = String(row['소분류'] ?? '').trim();
    const d4 = String(row['세분류'] ?? '').trim();
    const code = String(row['카테고리번호'] ?? '').trim();
    if (!code) continue;

    const parts = [d1, d2, d3, d4].filter(Boolean);
    const fullPath = parts.join(' > ');

    await prisma.naverCategory.upsert({
      where: { categoryCode: code },
      update: { depth1: d1||null, depth2: d2||null, depth3: d3||null, depth4: d4||null, fullPath },
      create: { categoryCode: code, depth1: d1||null, depth2: d2||null, depth3: d3||null, depth4: d4||null, fullPath },
    });
    count++;
  }
  console.log(`Seeded ${count} categories`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
