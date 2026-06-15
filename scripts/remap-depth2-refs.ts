// scripts/remap-depth2-refs.ts
// ============================================================================
// EXHAUSTIVE depth-2 DB reference remediation (no hardcoded column list).
//
// After the legacy storage backfill moved root-level files into stage
// subfolders, some DB columns still held the OLD depth-2 public URL
// (/product-assets/{pid}/{file}.ext) and now 404. The original updateDbRefs
// used a hardcoded column list and missed jsonb columns like quality_reasons.
//
// This pass is column-list-FREE: it fetches each Product row in full, scans
// EVERY column's JSON representation (incl. nested jsonb) for a depth-2 URL,
// and re-points it to the file's CURRENT canonical key (/{pid}/{stage}/{file})
// resolved from live storage. Dangling-only: a depth-2 URL is rewritten ONLY
// when (a) the depth-2 object no longer exists in storage AND (b) a canonical
// object with the same basename DOES exist (skip otherwise — never fabricate).
// Also scans asset_references / published_assets / asset_registry.
//
//   (default)        dry-run — capture every pending change, mutate NOTHING.
//   --go --confirm   execute the rewrites, then self-verify depth-2 ref == 0.
//
// English code; reads .env.local; product-agnostic. No Naver contact.
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';

const BUCKET = 'product-assets';
const IMG = '(?:png|jpe?g|webp|gif|avif)';

interface Env { url: string; key: string }

function readEnv(): Env {
  const raw = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  const map: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) map[m[1]] = m[2].replace(/^["']|["']$/g, '').replace(/\\\$/g, '$');
  }
  const url = map.NEXT_PUBLIC_SUPABASE_URL;
  const key = map.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('MISSING_ENV: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  if (map.DATABASE_URL && !process.env.DATABASE_URL) process.env.DATABASE_URL = map.DATABASE_URL;
  return { url: url.replace(/\/$/, ''), key };
}

interface StorageEntry { name: string; id: string | null }

async function listPrefix(env: Env, prefix: string): Promise<StorageEntry[]> {
  const res = await fetch(`${env.url}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: { apikey: env.key, Authorization: `Bearer ${env.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, limit: 1000, sortBy: { column: 'name', order: 'asc' } }),
  });
  if (!res.ok) throw new Error(`list('${prefix}') -> ${res.status}`);
  return (await res.json()) as StorageEntry[];
}

// Build, for one product, the maps needed to classify a depth-2 reference:
//   depth2Files:   basenames that STILL exist as root-level objects (not moved)
//   canonical:     basename -> live stage subfolder (excluding archive/)
async function storageMaps(env: Env, pid: string) {
  const depth2Files = new Set<string>();
  const canonical = new Map<string, string>();
  const top = await listPrefix(env, `${pid}/`);
  for (const e of top) {
    if (e.id) { depth2Files.add(e.name); continue; } // a real root-level file
    const stage = e.name; // subfolder placeholder
    if (stage === 'archive') continue; // backups share basenames — never canonical
    const files = await listPrefix(env, `${pid}/${stage}/`);
    for (const f of files) {
      if (!f.id) continue;
      if (!canonical.has(f.name)) canonical.set(f.name, stage);
    }
  }
  return { depth2Files, canonical };
}

// Rewrite depth-2 URLs for `pid` inside an arbitrary JSON string. Returns the
// rewritten string plus the list of (old -> new) rewrites actually applied.
function remapString(
  s: string,
  pid: string,
  maps: { depth2Files: Set<string>; canonical: Map<string, string> },
): { out: string; changes: Array<{ from: string; to: string }> } {
  const changes: Array<{ from: string; to: string }> = [];
  const re = new RegExp(`/product-assets/${pid}/([^/"'\\\\\\s]+\\.${IMG})`, 'g');
  const out = s.replace(re, (whole, file: string) => {
    if (maps.depth2Files.has(file)) return whole; // not moved yet — leave it
    const stage = maps.canonical.get(file);
    if (!stage) return whole; // canonical missing — orphan, do not fabricate
    const fixed = whole.replace(`/product-assets/${pid}/${file}`, `/product-assets/${pid}/${stage}/${file}`);
    changes.push({ from: whole, to: fixed });
    return fixed;
  });
  return { out, changes };
}

function countDepth2(s: string): number {
  const re = new RegExp(`/product-assets/[^/"'\\\\\\s]+/[^/"'\\\\\\s]+\\.${IMG}`, 'g');
  // Only depth-2 (exactly pid/file) — a canonical pid/stage/file has an extra
  // segment so the second [^/]+ would span a slash and not match. Verify by
  // splitting the matched tail on '/'.
  let n = 0;
  for (const m of s.matchAll(re)) {
    const tail = m[0].split('/product-assets/')[1];
    if (tail && tail.split('/').length === 2) n += 1;
  }
  return n;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const go = args.has('--go');
  const confirm = args.has('--confirm');
  const env = readEnv();
  const { prisma } = await import('../src/lib/prisma');

  const products = await prisma.product.findMany();
  const mapCache = new Map<string, Awaited<ReturnType<typeof storageMaps>>>();
  let fieldsChanged = 0;
  let replacements = 0;
  const touchedProducts = new Set<string>();
  const orphans: string[] = [];

  for (const row of products as Array<Record<string, unknown>>) {
    const pid = String(row.id);
    // Quick gate: does any column mention this pid's namespace at all?
    const rowText = JSON.stringify(row);
    if (!rowText.includes(`/product-assets/${pid}/`)) continue;

    let maps = mapCache.get(pid);
    if (!maps) { maps = await storageMaps(env, pid); mapCache.set(pid, maps); }

    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (k === 'id' || v == null) continue;
      const s = JSON.stringify(v);
      if (!s.includes(`/product-assets/${pid}/`)) continue;
      const { out, changes } = remapString(s, pid, maps);
      // Detect orphans (depth-2 present but not remapped).
      const re = new RegExp(`/product-assets/${pid}/([^/"'\\\\\\s]+\\.${IMG})`, 'g');
      for (const m of s.matchAll(re)) {
        const file = m[1];
        if (!maps.depth2Files.has(file) && !maps.canonical.get(file)) {
          orphans.push(`${pid}.${k} -> ${file} (canonical MISSING)`);
        }
      }
      if (out !== s) {
        data[k] = JSON.parse(out);
        fieldsChanged += 1;
        replacements += changes.length;
        touchedProducts.add(pid);
        console.log(`\n[${pid}] column "${k}" — ${changes.length} rewrite(s):`);
        for (const c of changes) console.log(`   CAPTURE old: ${c.from}\n   new:         ${c.to}`);
      }
    }
    if (go && confirm && Object.keys(data).length) {
      await prisma.product.update({ where: { id: pid }, data });
    }
  }

  // asset_references / published_assets — generic remap (empty today, future-proof).
  // (kept read-only-reported here; rewrite path identical if rows appear.)
  const refTextCount = (await prisma.assetReference.findMany({ select: { assetUrn: true } }))
    .reduce((n, r) => n + countDepth2(r.assetUrn ?? ''), 0);
  const pubTextCount = (await prisma.publishedAsset.findMany({ select: { assetUrn: true, naverImageUrl: true } }))
    .reduce((n, a) => n + countDepth2(a.assetUrn ?? '') + countDepth2(a.naverImageUrl ?? ''), 0);
  const regTextCount = (await prisma.assetRegistry.findMany({ select: { path: true } }))
    .reduce((n, r) => n + countDepth2(`/product-assets/${r.path}`), 0);

  console.log('\n================ DEPTH-2 REMAP SUMMARY ================');
  console.log(`Products scanned: ${products.length}`);
  console.log(`Pending: ${replacements} URL rewrite(s) across ${fieldsChanged} column(s) in ${touchedProducts.size} product(s).`);
  if (orphans.length) { console.log(`ORPHANS (canonical missing — NOT rewritten):`); for (const o of orphans) console.log(`   - ${o}`); }
  console.log(`Other tables depth-2 refs: asset_references=${refTextCount}, published_assets=${pubTextCount}, asset_registry=${regTextCount}`);

  if (!go) {
    console.log('\nDRY-RUN ONLY (captured above). Re-run with `--go --confirm` to apply.');
  } else if (!confirm) {
    console.error('\nREFUSING: --go requires --confirm.');
    process.exit(1);
  } else {
    // Self-verify: re-scan every product for any depth-2 ref.
    let residual = 0;
    for (const row of (await prisma.product.findMany()) as Array<Record<string, unknown>>) {
      residual += countDepth2(JSON.stringify(row));
    }
    residual += refTextCount + pubTextCount + regTextCount;
    console.log(`\nPOST SELF-VERIFY: residual depth-2 refs = ${residual} (must be 0).`);
    if (residual !== 0) { console.error('FAIL: residual depth-2 refs remain.'); await prisma.$disconnect(); process.exit(1); }
    console.log('OK — all depth-2 references remapped to canonical.');
  }
  console.log('======================================================');
  await prisma.$disconnect();
}

main().then(() => process.exit(0)).catch((e) => { console.error('ERROR:', e); process.exit(1); });
