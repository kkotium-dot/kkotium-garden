const { PrismaClient } = require('./node_modules/@prisma/client');
const iconv = require('./node_modules/iconv-lite');
const cheerio = require('./node_modules/cheerio');
const p = new PrismaClient();

async function run() {
  const rows = await p.$queryRaw`SELECT cookies FROM supplier_sessions WHERE platform_code='DMM' AND is_valid=true ORDER BY updated_at DESC LIMIT 1`;
  const c = rows[0].cookies;
  const hdrs = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Cookie': c, 'Accept-Language': 'ko-KR,ko;q=0.9' };

  // Test the safeDbList page
  const res = await fetch('https://domemedb.domeggook.com/index/item/safeDbList.php?fromOversea=0&so=da&pageLimit=20', { headers: hdrs });
  const buf = Buffer.from(await res.arrayBuffer());
  const html = iconv.decode(buf, 'euc-kr');
  const $ = cheerio.load(html);

  console.log('STATUS:', res.status, '| LEN:', html.length);

  // Find product numbers
  const nos = [];
  $('[class*="num"], [class*="no"], td').each((_, el) => {
    const t = $(el).text().trim();
    if (/^\d{7,10}$/.test(t)) nos.push(t);
  });
  console.log('PRODUCT NOS (from DOM):', nos.slice(0,10).join(', '));

  // Find links to product pages
  const links = [];
  $('a').each((_, el) => {
    const h = $(el).attr('href') || '';
    if (h.includes('/s/') || h.includes('uid=')) links.push(h);
  });
  console.log('PRODUCT LINKS:', links.slice(0,5).join('\n  '));

  // Find prices
  const priceEls = [];
  $('[class*="price"], [class*="amt"], [class*="won"]').each((_, el) => {
    const t = $(el).text().trim().replace(/\s/g,'');
    if (t && t.includes('원')) priceEls.push(t.slice(0,20));
  });
  console.log('PRICES:', priceEls.slice(0,8).join(' | '));

  // Find seller names
  const sellers = [];
  $('[class*="seller"], [class*="supply"], [class*="partner"]').each((_, el) => {
    const t = $(el).text().trim();
    if (t && t.length > 1 && t.length < 30) sellers.push(t);
  });
  console.log('SELLERS:', sellers.slice(0,6).join(' | '));

  // Check for any JSON data in scripts
  const scripts = $('script:not([src])').map((_, el) => $(el).html()).get();
  const dataScript = scripts.find(s => s && s.includes('goodsNo') || (s && s.includes('itemList')));
  if (dataScript) console.log('DATA SCRIPT (first 300):', dataScript.slice(0, 300));

  // What does the list item HTML look like?
  const listItem = $('[class*="item-list"], [class*="goodsList"], .list-wrap, table.list').first().html();
  if (listItem) console.log('LIST HTML (first 400):', listItem.slice(0, 400).replace(/\s+/g,' '));

  // Check the actual product card structure
  const cards = $('[class*="goods-item"], [class*="item-box"], .view-type-list td').slice(0,2);
  cards.each((i, el) => {
    console.log(`CARD ${i}:`, $(el).text().trim().slice(0,100));
  });
}
run().catch(console.error).finally(() => p.$disconnect());
