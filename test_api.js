// Test domeggook OpenAPI
// Usage: node test_api.js [API_KEY]
const apiKey = process.argv[2];
if (!apiKey) { console.log('Usage: node test_api.js [API_KEY]'); process.exit(1); }

async function run() {
  const base = 'https://domeggook.com/ssl/api/';

  // Test 1: getItemList — get user's saved item list (보관함)
  const u1 = `${base}?ver=4.0&mode=getItemList&aid=${apiKey}&market=dome&om=json`;
  const r1 = await fetch(u1);
  const d1 = await r1.json();
  console.log('=== getItemList ===');
  console.log('Keys:', Object.keys(d1).join(', '));
  console.log('Sample:', JSON.stringify(d1).slice(0, 400));

  // Test 2: getItem — get single item detail
  // Use a known product number
  const u2 = `${base}?ver=4.0&mode=getItem&aid=${apiKey}&uid=63562688&om=json`;
  const r2 = await fetch(u2);
  const d2 = await r2.json();
  console.log('\n=== getItem (63562688) ===');
  console.log('Keys:', Object.keys(d2).join(', '));
  // Show key fields
  const fields = ['name','price','supplyPrice','sellerNick','sellerId','stock','options','category'];
  fields.forEach(f => { if (d2[f] !== undefined) console.log(f + ':', JSON.stringify(d2[f]).slice(0,80)); });
}
run().catch(e => console.log('ERR:', e.message));
