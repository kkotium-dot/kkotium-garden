// Test orders API response structure via the app's API (which correctly reads env vars)
const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({status: res.statusCode, body: JSON.parse(data)}); }
        catch { resolve({status: res.statusCode, body: data}); }
      });
    }).on('error', reject);
  });
}

async function run() {
  // Use the app's naver-sync which calls checkNaverConnection
  const r = await get('http://localhost:3000/api/naver/products?check=1');
  console.log('[check=1]', JSON.stringify(r.body));

  // orders API
  const r2 = await get('http://localhost:3000/api/naver/orders?manual=1&hours=24');
  console.log('[orders] status:', r2.status);
  if (typeof r2.body === 'object') {
    console.log('[orders] keys:', Object.keys(r2.body));
    console.log('[orders] error:', r2.body.error ? r2.body.error.slice(0,150) : 'none');
    console.log('[orders] success:', r2.body.success);
    console.log('[orders] synced:', r2.body.synced);
  }
}

run().catch(console.error);
