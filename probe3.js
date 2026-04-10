const { PrismaClient } = require('./node_modules/@prisma/client');
const iconv = require('./node_modules/iconv-lite');
const p = new PrismaClient();

async function run() {
  // Get ALL sessions (DMM + DMK)
  const rows = await p.$queryRaw`SELECT platform_code, cookies, updated_at FROM supplier_sessions WHERE is_valid=true ORDER BY updated_at DESC`;
  console.log('Sessions:', rows.map(r => r.platform_code + ': ' + r.cookies.slice(0,80)));

  // The key insight: domemedb.domeggook.com may need different cookies than domeme.domeggook.com
  // Try with ALL cookies combined
  const allCookies = rows.map(r => r.cookies).join('; ');
  
  const hdrs = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Referer': 'https://domemedb.domeggook.com/index/',
    'Cookie': allCookies
  };

  // Step 1: Hit the index first to get any session cookies
  const r0 = await fetch('https://domemedb.domeggook.com/index/', { headers: hdrs, redirect: 'follow' });
  const b0 = iconv.decode(Buffer.from(await r0.arrayBuffer()), 'euc-kr');
  console.log('\n=== domemedb index ===');
  console.log('STATUS:', r0.status, 'LEN:', b0.length);
  // Check for login indicator
  const isLoggedIn = b0.includes('로그아웃') || b0.includes('마이페이지') || b0.includes('jih227');
  console.log('LOGGED IN:', isLoggedIn);
  if (!isLoggedIn) console.log('Body sample:', b0.slice(0,300).replace(/\s+/g,' '));

  // Step 2: Hit the safeDbList
  const r1 = await fetch('https://domemedb.domeggook.com/index/item/safeDbList.php?fromOversea=0&so=da&pageLimit=20', {
    headers: hdrs, redirect: 'follow'
  });
  const b1 = iconv.decode(Buffer.from(await r1.arrayBuffer()), 'euc-kr');
  console.log('\n=== safeDbList with full headers ===');
  console.log('STATUS:', r1.status, 'FINAL URL:', r1.url, 'LEN:', b1.length);
  
  const isLoggedIn2 = b1.includes('로그아웃') || b1.includes('item[]') || b1.includes('상품번호');
  console.log('LOGGED IN:', isLoggedIn2);
  
  // Extract product numbers
  const nos = b1.match(/value="(\d{7,10})"/g)?.map(m => m.replace(/[^0-9]/g,''))?.slice(0,10) || [];
  console.log('PRODUCT NOS:', nos.join(', '));
  
  if (!isLoggedIn2) {
    console.log('Body start:', b1.slice(0,200).replace(/\s+/g,' '));
  }
}
run().catch(console.error).finally(() => p.$disconnect());
