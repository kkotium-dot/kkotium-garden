// scripts/upload-backdrop.js
//
// Deposit a Firefly/designer-produced lifestyle backdrop at the fixed Storage
// cache path the asset-source-resolver looks up, so the lifestyle variant's
// backdrop flips from `fallback` to `auto-cache`.
//
//   product-assets/{productId}/backdrop-{skeletonId}.png
//
// The skeletonId (S1..S12) keys the backdrop so different matched skeletons can
// carry different scenes. Same pattern as scripts/upload-cutout.js: Code-env
// only (.env.local service role), since Desktop cannot write Storage.
//
// Usage:
//   node scripts/upload-backdrop.js <productId> <skeletonId> <localPathOrUrl>
//   node scripts/upload-backdrop.js cmpp62yje00015xup5h8pgwx0 S1 ~/Downloads/Firefly_D.jpg

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
  const resolved = src.startsWith('~') ? path.join(process.env.HOME || '', src.slice(1)) : src;
  return fs.readFileSync(resolved);
}

function sniff(buf) {
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { ok: true, contentType: 'image/png' };
  }
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ok: true, contentType: 'image/jpeg' };
  }
  return { ok: false, contentType: null };
}

async function main() {
  const [productId, skeletonId, src] = process.argv.slice(2);
  if (!productId || !skeletonId || !src) {
    console.log('USAGE: node scripts/upload-backdrop.js <productId> <skeletonId> <localPathOrUrl>');
    process.exit(1);
  }
  // Sanitize skeletonId the same way the resolver does (backdropFileName).
  const safeSkeleton = String(skeletonId).replace(/[^a-zA-Z0-9-]/g, '') || 'S0';

  const env = readEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log('MISSING_ENV url=' + !!url + ' key=' + !!key);
    process.exit(1);
  }

  const buf = await loadBytes(src);
  const kind = sniff(buf);
  if (!kind.ok) {
    console.log('NOT_IMAGE: backdrop must be PNG or JPEG. Got ' + buf.length + ' bytes, header ' + buf.slice(0, 4).toString('hex'));
    process.exit(1);
  }
  console.log('SRC_OK bytes=' + buf.length + ' type=' + kind.contentType);

  // The resolver looks for backdrop-{skeletonId}.png by name; keep the .png
  // suffix on the object name regardless of the source encoding (the public URL
  // is consumed by Sharp which sniffs the real bytes, not the extension).
  const objectPath = productId + '/backdrop-' + safeSkeleton + '.png';
  const base = url.replace(/\/$/, '');
  const uploadUrl = base + '/storage/v1/object/product-assets/' + objectPath;

  const upRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': kind.contentType,
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
  console.log('NEXT: POST /api/thumbnail/' + productId + ' -> assetSource.backdrop should be auto-cache (lifestyle variant)');
}

main().catch((e) => {
  console.log('ERROR=' + (e && e.message ? e.message : String(e)));
  process.exit(1);
});
