const { PrismaClient } = require('./node_modules/@prisma/client');
const iconv = require('./node_modules/iconv-lite');
const p = new PrismaClient();

async function run() {
  const rows = await p.$queryRaw`SELECT cookies FROM supplier_sessions WHERE is_valid=true ORDER BY updated_at DESC LIMIT 1`;
  const c = rows[0].cookies;
  const hdrs = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Cookie': c,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9',
    'Referer': 'https://domemedb.domeggook.com/'
  };

  // Test 1: safeDbList
  const r1 = await fetch('https://domemedb.domeggook.com/index/item/safeDbList.php?fromOversea=0&pageLimit=20', { headers: hdrs, redirect: 'follow' });
  const b1 = iconv.decode(Buffer.from(await r1.arrayBuffer()), 'euc-kr');
  console.log('=== safeDbList ===');
  console.log('STATUS:', r1.status, 'URL:', r1.url, 'LEN:', b1.length);
  console.log('BODY START:', b1.slice(0, 200).replace(/\s+/g,' '));

  // Test 2: try the domemeDB API endpoint
  const r2 = await fetch('https://domemedb.domeggook.com/index/item/safeDbList.php', {
    method: 'POST',
    headers: { ...hdrs, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'fromOversea=0&pageLimit=20&so=da',
    redirect: 'follow'
  });
  const b2 = iconv.decode(Buffer.from(await r2.arrayBuffer()), 'euc-kr');
  console.log('\n=== POST safeDbList ===');
  console.log('STATUS:', r2.status, 'LEN:', b2.length);
  console.log('BODY START:', b2.slice(0, 200).replace(/\s+/g,' '));

  // Test 3: the actual search API
  const r3 = await fetch('https://domemedb.domeggook.com/index/item/safeDbList.php?fromOversea=0&so=da&pageLimit=500', {
    headers: { ...hdrs, 'X-Requested-With': 'XMLHttpRequest' },
    redirect: 'follow'
  });
  const b3 = iconv.decode(Buffer.from(await r3.arrayBuffer()), 'euc-kr');
  console.log('\n=== safeDbList XHR ===');
  console.log('STATUS:', r3.status, 'LEN:', b3.length);
  // Look for product numbers
  const nos = b3.match(/\b\d{7,10}\b/g)?.filter(n => n > 1000000)?.slice(0,10) || [];
  console.log('PRODUCT NOS:', nos.join(', '));
  if (b3.length < 500) console.log('BODY:', b3);
  
  // Test 4: check if there's a JSON API
  const r4 = await fetch('https://domemedb.domeggook.com/index/item/safeDbListAjax.php?fromOversea=0&pageLimit=20', { headers: hdrs });
  const b4 = iconv.decode(Buffer.from(await r4.arrayBuffer()), 'euc-kr');
  console.log('\n=== Ajax endpoint ===');
  console.log('STATUS:', r4.status, 'LEN:', b4.length, 'BODY:', b4.slice(0,100));
}
run().catch(console.error).finally(() => p.$disconnect());
