// Test what cookies we get during login + domemedb access
const iconv = require('./node_modules/iconv-lite');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function parseCookies(headers) {
  const setCookies = headers.getSetCookie ? headers.getSetCookie() : [];
  const cookies = {};
  for (const h of setCookies) {
    const part = h.split(';')[0].trim();
    const eq = part.indexOf('=');
    if (eq > 0) cookies[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

function mergeCookies(base, newer) {
  const map = {};
  for (const part of [...base.split('; '), ...newer.split('; ')]) {
    const eq = part.indexOf('=');
    if (eq > 0) map[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return Object.entries(map).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function run() {
  // Read credentials from environment or prompt
  const id = process.argv[2];
  const pw = process.argv[3];
  if (!id || !pw) {
    console.log('Usage: node probe_login.js <id> <password>');
    process.exit(1);
  }

  console.log('Step 1: Get login form...');
  const formRes = await fetch('https://domeggook.com/ssl/member/mem_loginForm.php', {
    headers: { 'User-Agent': UA }
  });
  const initCookies = parseCookies(formRes.headers);
  console.log('Init cookies:', initCookies.slice(0, 100));

  console.log('Step 2: POST login...');
  const body = new URLSearchParams({ id, pass: pw, mode: 'mongoLogin', encording: 'utf8', back: '', extCookie: '' });
  const loginRes = await fetch('https://domeggook.com/main/member/mem_ing.php', {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': initCookies, 'Origin': 'https://domeggook.com', 'Referer': 'https://domeggook.com/ssl/member/mem_loginForm.php' },
    body: body.toString(),
    redirect: 'manual'
  });
  const loginCookies = parseCookies(loginRes.headers);
  let merged = mergeCookies(initCookies, loginCookies);
  console.log('After login cookies:', merged);
  console.log('Location:', loginRes.headers.get('location'));

  // Follow redirect
  const loc = loginRes.headers.get('location');
  if (loc) {
    const url = loc.startsWith('http') ? loc : `https://domeggook.com${loc}`;
    const redirRes = await fetch(url, { headers: { 'User-Agent': UA, 'Cookie': merged }, redirect: 'manual' });
    const redirCookies = parseCookies(redirRes.headers);
    if (redirCookies) merged = mergeCookies(merged, redirCookies);
    console.log('After redirect cookies:', merged);
  }

  console.log('\nStep 3b: Hit domemedb index...');
  const dbRes = await fetch('https://domemedb.domeggook.com/index/', {
    headers: { 'User-Agent': UA, 'Cookie': merged, 'Accept-Language': 'ko-KR' },
    redirect: 'follow'
  });
  const dbCookies = parseCookies(dbRes.headers);
  if (dbCookies) merged = mergeCookies(merged, dbCookies);
  const dbBuf = Buffer.from(await dbRes.arrayBuffer());
  const dbHtml = iconv.decode(dbBuf, 'euc-kr');
  console.log('domemedb cookies:', dbCookies);
  console.log('domemedb LOGGED IN:', dbHtml.includes('로그아웃') || dbHtml.includes('jih'));
  console.log('FINAL cookies:', merged);

  // Now try safeDbList with these cookies
  console.log('\nStep 4: Test safeDbList...');
  const listRes = await fetch('https://domemedb.domeggook.com/index/item/safeDbList.php?fromOversea=0&so=da&pageLimit=10', {
    headers: { 'User-Agent': UA, 'Cookie': merged, 'Accept-Language': 'ko-KR', 'Referer': 'https://domemedb.domeggook.com/index/' },
    redirect: 'follow'
  });
  const listBuf = Buffer.from(await listRes.arrayBuffer());
  const listHtml = iconv.decode(listBuf, 'euc-kr');
  const nos = listHtml.match(/value="(\d{7,10})"/g)?.map(m => m.replace(/[^0-9]/g, '')).slice(0, 5) || [];
  console.log('safeDbList STATUS:', listRes.status, 'LEN:', listHtml.length, 'NOS:', nos.join(', '));
  if (listHtml.length < 300) console.log('BODY:', listHtml);
}
run().catch(console.error);
