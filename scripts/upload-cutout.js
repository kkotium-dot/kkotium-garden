// scripts/upload-cutout.js
//
// Deposit a designer-produced cutout (or backdrop) PNG at the fixed Storage
// cache path the asset-source-resolver looks up, so the thumbnail engine flips
// assetSource from `fallback` to `auto-cache`.
//
//   cutout   -> product-assets/{productId}/cutout.png
//   backdrop -> product-assets/{productId}/backdrop-{skeletonId}.png
//
// The Desktop session cannot write Storage (no service role key); this script
// runs in the Code environment with .env.local credentials. The PNG bytes come
// from a local file (Adobe/Firefly export) or an http(s) URL.
//
// Usage:
//   node scripts/upload-cutout.js <productId> <localPathOrUrl> [targetName]
//   node scripts/upload-cutout.js cmpp62yje00015xup5h8pgwx0 ~/Downloads/icetray-cutout.png
//   node scripts/upload-cutout.js <id> ./bd.png backdrop-S1.png

const fs = require('fs');
const path = require('path');

function readEnv() {
  const raw = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  const map = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) map[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return map;
}

async function loadBytes(src) {
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`source fetch ${res.status} for ${src}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const resolved = src.startsWith('~')
    ? path.join(process.env.HOME || '', src.slice(1))
    : src;
  return fs.readFileSync(resolved);
}

async function main() {
  const [productId, src, targetName = 'cutout.png'] = process.argv.slice(2);
  if (!productId || !src) {
    console.log('USAGE: node scripts/upload-cutout.js <productId> <localPathOrUrl> [targetName=cutout.png]');
    process.exit(1);
  }

  const env = readEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log('MISSING_ENV url=' + !!url + ' key=' + !!key);
    process.exit(1);
  }

  const buf = await loadBytes(src);
  // Reject obvious non-PNG so we never cache a JPEG at cutout.png (the engine
  // pads the cutout as transparent — a JPEG has no alpha and would letterbox).
  const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (!isPng) {
    console.log('NOT_PNG: cutout/backdrop must be a transparent PNG. Got ' + buf.length + ' bytes, header ' + buf.slice(0, 4).toString('hex'));
    process.exit(1);
  }
  console.log('SRC_OK bytes=' + buf.length);

  const objectPath = productId + '/' + targetName;
  const base = url.replace(/\/$/, '');
  const uploadUrl = base + '/storage/v1/object/product-assets/' + objectPath;

  const upRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'image/png',
      'x-upsert': 'true',
    },
    body: buf,
  });
  console.log('UPLOAD_STATUS=' + upRes.status);
  if (!upRes.ok) {
    console.log('UPLOAD_BODY=' + (await upRes.text()).slice(0, 300));
    process.exit(1);
  }
  console.log('PUBLIC_URL=' + base + '/storage/v1/object/public/product-assets/' + objectPath);
  console.log('NEXT: POST /api/thumbnail/' + productId + ' -> assetSource.cutout should be auto-cache');
}

main().catch((e) => {
  console.log('ERROR=' + (e && e.message ? e.message : String(e)));
  process.exit(1);
});
