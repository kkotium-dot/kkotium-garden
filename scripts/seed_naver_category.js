const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const wb = XLSX.readFile('카테고리번호.xls');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log('[seed] rows:', rows.length);

  await prisma.naverCategory.deleteMany({});
  console.log('[seed] cleared');

  const BATCH = 200;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const data = rows
      .slice(i, i + BATCH)
      .map(r => {
        const code = String(r['카테고리번호'] || '').trim();
        const level1 = String(r['대분류'] || '').trim() || null;
        const level2 = String(r['중분류'] || '').trim() || null;
        const level3 = String(r['소분류'] || '').trim() || null;
        const level4 = String(r['세분류'] || '').trim() || null;
        const fullPath = [level1, level2, level3, level4].filter(Boolean).join(' > ');
        return { code, level1, level2, level3, level4, fullPath: fullPath || null, active: true };
      })
      .filter(x => x.code);

    await prisma.naverCategory.createMany({ data, skipDuplicates: true });
    inserted += data.length;
    console.log('[seed] inserted:', inserted);
  }

  const total = await prisma.naverCategory.count();
  console.log('[seed] DONE. total:', total);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
