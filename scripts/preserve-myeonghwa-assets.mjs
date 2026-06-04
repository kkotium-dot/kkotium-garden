// scripts/preserve-myeonghwa-assets.mjs
//
// One-shot: preserve the 3 Adobe-processed 명화 디퓨저 assets into Supabase
// product-assets, permanently. Run LOCALLY (Code CLI) where
// SUPABASE_SERVICE_ROLE_KEY already lives — the key must NEVER transit a chat
// transcript (security principle, ref Gemini-key-exposure incident).
//
// Authored by Desktop 2026-06-04 after verifying all 3 Adobe short URLs alive
// (http 200, magic-bytes OK): main 1000x1000 jpeg 65.8KB / cutout 253x776 RGBA
// png 195.9KB / backdrop 860x860 jpeg 73.8KB.
//
// Usage:
//   node scripts/preserve-myeonghwa-assets.mjs
// Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
// SAFETY:
//   - Re-verifies each Adobe URL is alive (http 200 + expected mime) BEFORE
//     upload. Aborts the whole run if any URL has expired (no partial/garbage
//     upload). If aborted, ask Desktop to regenerate from the durable Firefly
//     URNs (asset_search) and reissue fresh short URLs.
//   - Storage write only (product-assets bucket, upsert). NO DB row mutate, NO
//     Product publish-field touch (product stays DRAFT). Fully reversible.
//   - Bucket path co-locates by productId so the asset-source-resolver and the
//     detail page can find them later.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'product-assets';

// Adobe processed-asset short URLs (verified alive 2026-06-04 by Desktop).
// If any 404/expire at run time, the guard below aborts cleanly.
const ASSETS = [
  {
    label: 'representative-image',
    url: 'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:649fa7f6-c70d-481e-86fb-aa3ec968c5d4',
    fileName: 'myeonghwa-main-1000.jpg',
    expectMime: 'image/jpeg',
    contentType: 'image/jpeg',
  },
  {
    label: 'product-cutout',
    url: 'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:fbf8e86b-521f-4105-9a86-b8ed2be96aa9',
    fileName: 'myeonghwa-cutout.png',
    expectMime: 'image/png',
    contentType: 'image/png',
  },
  {
    label: 'backdrop-stage',
    url: 'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:c30f6728-d663-4f27-8f0d-aa1f5d0a0093',
    fileName: 'myeonghwa-backdrop-860.jpg',
    expectMime: 'image/jpeg',
    contentType: 'image/jpeg',
  },
];

function die(msg) {
  console.error(`[ABORT] ${msg}`);
  process.exit(1);
}

if (!SUPABASE_URL || !SERVICE_KEY) {
  die('NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required in local env.');
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Resolve the 명화 디퓨저 product id (path co-location). Adjust the filter if
// the product name differs. Prisma table is "Product" (quoted camelCase cols).
// NOTE (2026-06-04 run): this PostgREST lookup returns "permission denied for
// schema public" in this project (Prisma-managed tables are not exposed to the
// REST API). The RELIABLE path is to pass PRODUCT_ID explicitly, e.g.
//   PRODUCT_ID=cmpnooli40001f0gveaxr8iim node --env-file=.env.local scripts/preserve-myeonghwa-assets.mjs
// The Storage upload below uses the Storage API (not PostgREST) and works.
async function resolveProductId() {
  const { data, error } = await supabase
    .from('Product')
    .select('id,name')
    .ilike('name', '%명화%')
    .limit(5);
  if (error) die(`product lookup failed: ${error.message}`);
  if (!data || data.length === 0) die('no product matched %명화% — pass productId manually.');
  if (data.length > 1) {
    console.warn('[WARN] multiple 명화 matches:', data.map((d) => `${d.id}:${d.name}`).join(' | '));
  }
  return data[0].id;
}

async function fetchAlive(asset) {
  const res = await fetch(asset.url);
  if (!res.ok) die(`${asset.label} URL not alive (http ${res.status}) — likely expired. Regenerate via Desktop (Firefly URNs) and reissue.`);
  const mime = res.headers.get('content-type') || '';
  if (!mime.includes(asset.expectMime.split('/')[1])) {
    die(`${asset.label} mime mismatch: got "${mime}", expected ${asset.expectMime}.`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) die(`${asset.label} payload too small (${buf.length}B) — suspect bad fetch.`);
  return buf;
}

async function main() {
  const productId = process.env.PRODUCT_ID || (await resolveProductId());
  console.log(`[info] target product folder: product-assets/${productId}/`);

  // Phase 1 — fetch + verify ALL before any upload (atomic-ish: abort on first dead URL).
  const buffers = [];
  for (const a of ASSETS) {
    const buf = await fetchAlive(a);
    console.log(`[ok] fetched ${a.label} (${buf.length}B, ${a.expectMime})`);
    buffers.push({ asset: a, buf });
  }

  // Phase 2 — upload all (upsert). Storage-only; no DB mutate.
  const results = [];
  for (const { asset, buf } of buffers) {
    const path = `${productId}/${asset.fileName}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
      contentType: asset.contentType,
      upsert: true,
      cacheControl: '31536000',
    });
    if (error) die(`upload ${asset.label} failed: ${error.message}`);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    results.push({ label: asset.label, path, publicUrl: data.publicUrl });
    console.log(`[ok] uploaded ${asset.label} -> ${path}`);
  }

  // Phase 3 — verify each public URL resolves (200).
  for (const r of results) {
    const res = await fetch(r.publicUrl, { method: 'GET' });
    console.log(`[verify] ${r.label}: http ${res.status} <- ${r.publicUrl}`);
  }

  console.log('\n=== PERMANENT URLS (record these) ===');
  for (const r of results) console.log(`${r.label}: ${r.publicUrl}`);
}

main().catch((e) => die(e instanceof Error ? e.message : String(e)));
