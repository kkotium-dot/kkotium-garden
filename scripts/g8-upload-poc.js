// scripts/g8-upload-poc.js
// One-shot POC: download the ice tray source from domeggook (with referer to
// bypass hotlink protection), upload to Supabase Storage `product-images`
// bucket, and print the resulting public URL. Reads credentials from
// .env.local directly so secrets never leave the user machine.
// Run: node scripts/g8-upload-poc.js   (then delete)

const fs = require('fs');
const path = require('path');

function readEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  const raw = fs.readFileSync(envPath, 'utf8');
  const map = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) map[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return map;
}

async function main() {
  const env = readEnv();
  const url =
    env.SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    env.SUPABASE_PROJECT_URL;
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_SERVICE_KEY ||
    env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    console.log('MISSING_ENV url=' + !!url + ' key=' + !!key);
    console.log('AVAILABLE_KEYS=' + Object.keys(env).filter((k) => k.includes('SUPABASE')).join(','));
    return;
  }

  const srcUrl =
    'https://cdn1.domeggook.com/upload/item/2023/05/19/1684482544B3E6EE8F6E003135C56A12/1684482544B3E6EE8F6E003135C56A12_img_760?hash=6155cc69e73d48060e5940a764a5d689';

  const imgRes = await fetch(srcUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      Referer: 'https://domeme.domeggook.com/',
    },
  });
  if (!imgRes.ok) {
    console.log('SRC_FETCH_FAIL status=' + imgRes.status);
    return;
  }
  const buf = Buffer.from(await imgRes.arrayBuffer());
  console.log('SRC_OK bytes=' + buf.length);

  const objectPath = 'poc/icetray-cmpp62yje-poc.jpg';
  const uploadUrl = url.replace(/\/$/, '') + '/storage/v1/object/product-images/' + objectPath;

  const upRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
    },
    body: buf,
  });
  const upText = await upRes.text();
  console.log('UPLOAD_STATUS=' + upRes.status);
  if (!upRes.ok) {
    console.log('UPLOAD_BODY=' + upText.slice(0, 300));
    return;
  }

  const publicUrl =
    url.replace(/\/$/, '') + '/storage/v1/object/public/product-images/' + objectPath;
  console.log('PUBLIC_URL=' + publicUrl);
}

main().catch((e) => console.log('ERROR=' + (e && e.message ? e.message : String(e))));
