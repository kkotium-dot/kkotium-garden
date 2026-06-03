// scripts/upload-common-notice-assets.js
//
// 작업1 (2026-06-03) — Upload the store-wide COMMON notice slot images to the
// FIXED Storage path the detailContent builder / register route consume:
//
//   product-assets/common/notice-top.jpg     (상단: 개인정보 동의 + 배송·교환반품 안내)
//   product-assets/common/notice-bottom.jpg  (하단: 전화상담·카카오채널 + THANKS 에코백)
//
// Why a script (not Supabase MCP): the Supabase MCP is SQL-only and cannot write
// Storage objects. Desktop containers are not wired to Supabase Storage either.
// Same Code-env-only pattern as scripts/upload-backdrop.js (.env.local service
// role key). upsert:true so re-running overwrites in place — the public URL is
// stable, so a design refresh needs zero code changes (대표 self-replace).
//
// Usage (defaults read the repo asset folder):
//   node scripts/upload-common-notice-assets.js
//   node scripts/upload-common-notice-assets.js <topPathOrUrl> <bottomPathOrUrl>
//
// Default sources:
//   docs/research/assets/notice-top.jpg
//   docs/research/assets/notice-bottom.jpg
//
// After a successful run it prints the two public URLs and the SQL to persist
// them onto store_settings (notice_top_image_url / notice_bottom_image_url).

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
    return { ok: true, contentType: 'image/png', ext: 'png' };
  }
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ok: true, contentType: 'image/jpeg', ext: 'jpg' };
  }
  return { ok: false, contentType: null, ext: null };
}

async function uploadOne(base, key, objectPath, buf, contentType) {
  const uploadUrl = base + '/storage/v1/object/product-assets/' + objectPath;
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: buf,
  });
  if (!res.ok) {
    throw new Error('UPLOAD_FAILED ' + res.status + ': ' + (await res.text()).slice(0, 300));
  }
  return base + '/storage/v1/object/public/product-assets/' + objectPath;
}

async function main() {
  const [topArg, bottomArg] = process.argv.slice(2);
  const topSrc = topArg || 'docs/research/assets/notice-top.jpg';
  const bottomSrc = bottomArg || 'docs/research/assets/notice-bottom.jpg';

  const env = readEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log('MISSING_ENV url=' + !!url + ' key=' + !!key);
    process.exit(1);
  }
  const base = url.replace(/\/$/, '');

  // Fixed object names (the register-route DEFAULT_NOTICE_* constants and DB
  // columns must match these exactly). Always keep the .jpg name even if a
  // source is PNG — the public URL is served as-is and the browser sniffs bytes.
  const slots = [
    { label: 'top', src: topSrc, objectPath: 'common/notice-top.jpg', dbCol: 'notice_top_image_url' },
    { label: 'bottom', src: bottomSrc, objectPath: 'common/notice-bottom.jpg', dbCol: 'notice_bottom_image_url' },
  ];

  const results = [];
  for (const slot of slots) {
    let buf;
    try {
      buf = await loadBytes(slot.src);
    } catch (e) {
      console.log('SOURCE_MISSING ' + slot.label + ' (' + slot.src + '): ' + (e && e.message ? e.message : String(e)));
      console.log('  -> 대표가 ' + slot.src + ' 에 이미지를 저장한 뒤 다시 실행하세요.');
      process.exit(1);
    }
    const kind = sniff(buf);
    if (!kind.ok) {
      console.log('NOT_IMAGE ' + slot.label + ': must be PNG or JPEG. Got ' + buf.length + ' bytes, header ' + buf.slice(0, 4).toString('hex'));
      process.exit(1);
    }
    console.log('SRC_OK ' + slot.label + ' bytes=' + buf.length + ' type=' + kind.contentType);
    const publicUrl = await uploadOne(base, key, slot.objectPath, buf, kind.contentType);
    console.log('UPLOADED ' + slot.label + ' -> ' + publicUrl);
    results.push({ ...slot, publicUrl });
  }

  console.log('\n--- store_settings 갱신 SQL (Supabase MCP execute_sql) ---');
  const sets = results.map((r) => `  ${r.dbCol} = '${r.publicUrl}'`).join(',\n');
  console.log(`UPDATE store_settings SET\n${sets}\nWHERE id = 'default';`);
  console.log('\nNEXT: dryRun 재실행 -> payloadPreview.noticeSlots.topImageUrlPresent/bottomImageUrlPresent = true 확인');
}

main().catch((e) => {
  console.log('ERROR=' + (e && e.message ? e.message : String(e)));
  process.exit(1);
});
