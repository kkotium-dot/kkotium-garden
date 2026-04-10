const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  let wb;
  try { wb = XLSX.readFile('원산지코드.xlsx'); }
  catch (e) { wb = XLSX.readFile('원산지코드.xls'); }

  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log('[seed] rows:', rows.length);
  console.log('[seed] cols:', JSON.stringify(Object.keys(rows[0] || {})));

  await prisma.originCode.deleteMany({});
  console.log('[seed] cleared');

  const data = rows
    .map(r => {
      const keys = Object.keys(r);
      const code = String(r[keys[0]] || '').trim();
      const region = String(r[keys[1]] || '').trim();
      return { code, region, active: true };
    })
    .filter(x => x.code && x.region);

  await prisma.originCode.createMany({ data, skipDuplicates: true });
  const total = await prisma.originCode.count();
  console.log('[seed] DONE. total:', total);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
