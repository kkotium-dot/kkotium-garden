// scripts/backfill-asset-registry.ts
// ============================================================================
// Asset registry ↔ storage reconciliation backfill (systemic #93 / #241).
// Authority: docs/research/ASSET_REGISTRY_STORAGE_RECONCILIATION_2026-07-10.md.
//
// PROBLEM (2026-07-10 Desktop audit): asset_registry indexes only a SUBSET of
// the product-assets bucket. 62 storage files have NO registry row (orphans);
// 0 registry rows point to a missing file (dangling). The registry system was
// added AFTER the asset pipeline, so pre-registry generations and a few write
// paths never landed a row.
//
// FIX = BACKFILL, never delete (★ non-destructive — every file is a real,
// irreversible asset). We only INSERT missing registry rows:
//   - ACTIVE stage orphans ({pid}/{stage}/{file}, stage != archive)  -> register
//   - SHARED orphans (common/*, lifestyle/*)                          -> register
//       under a namespace-sentinel productId ('common' / 'lifestyle'), because
//       asset_registry.product_id is NOT nullable in the current schema (a null
//       scope would need a migration; the sentinel avoids an unapproved prod
//       schema change and still makes the registry a complete inventory).
//   - ARCHIVE orphans ({pid}/archive/{file})                          -> SKIP
//       (intentional cold storage; the registry indexes ACTIVE assets only —
//       documented policy so the drift audit never re-flags them, §3.2).
//
// path is UNIQUE, so every INSERT is idempotent (a re-run inserts nothing new).
//
// MODES:
//   (default) --audit   read-only: enumerate storage + registry, print the
//                       orphan/dangling counts and the per-class plan. Mutates
//                       NOTHING.
//   --go --confirm      execute the backfill (double-gated). Re-audits after.
//
// Run:
//   npx tsx scripts/backfill-asset-registry.ts                 # audit / dry-run
//   npx tsx scripts/backfill-asset-registry.ts --go --confirm  # execute
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { STAGE_DIRS, LEGACY_STAGE_DIRS } from '../src/lib/storage/asset-taxonomy';
import { parseAssetTokens } from '../src/lib/storage/asset-naming';

const BUCKET = 'product-assets';
const BACKFILL_TAG = 'backfill-2026-07';

// Active stages the registry indexes. 'archive' is deliberately EXCLUDED — cold
// storage is not tracked (§3.2). Legacy 'thumb' is still a real (readable) stage.
const ACTIVE_STAGES = new Set<string>([
  ...STAGE_DIRS.filter((s) => s !== 'archive'),
  ...LEGACY_STAGE_DIRS,
]);
// Non-product shared namespaces → registered under a sentinel productId.
const SHARED_PREFIXES = new Set<string>(['common', 'lifestyle']);

interface Env {
  url: string;
  key: string;
}

function readEnv(): Env {
  const raw = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  const map: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) map[m[1]] = m[2].replace(/^["']|["']$/g, '').replace(/\\\$/g, '$');
  }
  const url = map.NEXT_PUBLIC_SUPABASE_URL;
  const key = map.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('MISSING_ENV: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required');
  }
  if (map.DATABASE_URL && !process.env.DATABASE_URL) process.env.DATABASE_URL = map.DATABASE_URL;
  return { url: url.replace(/\/$/, ''), key };
}

interface StorageEntry {
  name: string;
  id: string | null; // null = a subfolder placeholder
  metadata?: { size?: number; mimetype?: string } | null;
}

async function listPrefix(env: Env, prefix: string): Promise<StorageEntry[]> {
  const res = await fetch(`${env.url}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: {
      apikey: env.key,
      Authorization: `Bearer ${env.key}`,
      'Content-Type': 'application/json',
    },
    // cache:no-store — storage can change out-of-band; never read a stale page.
    cache: 'no-store',
    body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
  });
  if (!res.ok) throw new Error(`list('${prefix}') -> ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as StorageEntry[];
}

// Recursively enumerate EVERY real file object (id != null) in the bucket.
// Depth is small ({pid}/{stage}/{file}); a guard caps runaway recursion.
async function listAllFiles(env: Env): Promise<string[]> {
  const files: string[] = [];
  const walk = async (prefix: string, depth: number): Promise<void> => {
    if (depth > 4) return;
    const entries = await listPrefix(env, prefix);
    for (const e of entries) {
      const full = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id) files.push(full); // real file
      else await walk(full, depth + 1); // subfolder placeholder — recurse
    }
  };
  await walk('', 0);
  return files;
}

function publicUrl(env: Env, key: string): string {
  return `${env.url}/storage/v1/object/public/${BUCKET}/${key}`;
}

async function probeDimensions(env: Env, key: string): Promise<{ width: number | null; height: number | null }> {
  try {
    const res = await fetch(publicUrl(env, key), { cache: 'no-store' });
    if (!res.ok) return { width: null, height: null };
    const buf = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buf).metadata();
    return { width: meta.width ?? null, height: meta.height ?? null };
  } catch {
    return { width: null, height: null };
  }
}

type OrphanClass = 'active' | 'archive' | 'shared' | 'unknown';

interface Classified {
  key: string;
  cls: OrphanClass;
  productId: string; // real pid or namespace sentinel
  stage: string;
  fileName: string;
}

// Classify one orphan storage key into a reconciliation action.
function classify(key: string): Classified {
  const segs = key.split('/');
  const fileName = segs[segs.length - 1];

  // Shared namespaces (common/…, lifestyle/…) — sentinel-scoped registration.
  if (SHARED_PREFIXES.has(segs[0])) {
    const stage = segs[0] === 'lifestyle' ? 'lifestyle' : 'notice';
    return { key, cls: 'shared', productId: segs[0], stage, fileName };
  }

  // {pid}/{stage}/{file} — the canonical stage-folder shape.
  if (segs.length >= 3) {
    const productId = segs[0];
    const stage = segs[1];
    if (stage === 'archive') return { key, cls: 'archive', productId, stage, fileName };
    if (ACTIVE_STAGES.has(stage)) return { key, cls: 'active', productId, stage, fileName };
    return { key, cls: 'unknown', productId, stage, fileName };
  }

  // {pid}/{file} — legacy flat root (rare). Cannot infer a canonical stage from
  // the folder; leave to the legacy relocation backfill, not this indexer.
  return { key, cls: 'unknown', productId: segs[0] ?? '', stage: 'root', fileName };
}

async function loadRegistryPaths(): Promise<Set<string>> {
  const mod = await import('../src/lib/prisma');
  const rows = await mod.prisma.assetRegistry.findMany({ select: { path: true } });
  return new Set(rows.map((r: { path: string }) => r.path));
}

interface Report {
  storageCount: number;
  registryCount: number;
  orphans: Classified[];
  dangling: string[]; // registry paths with no storage file
  byClass: Record<OrphanClass, number>;
}

async function audit(env: Env): Promise<Report> {
  const [files, registryPaths] = await Promise.all([listAllFiles(env), loadRegistryPaths()]);
  const fileSet = new Set(files);

  const orphans = files.filter((f) => !registryPaths.has(f)).map(classify);
  const dangling = [...registryPaths].filter((p) => !fileSet.has(p));

  const byClass: Record<OrphanClass, number> = { active: 0, archive: 0, shared: 0, unknown: 0 };
  for (const o of orphans) byClass[o.cls] += 1;

  return {
    storageCount: files.length,
    registryCount: registryPaths.size,
    orphans,
    dangling,
    byClass,
  };
}

function printReport(r: Report, label: string): void {
  console.log(`\n================ ${label} ================`);
  console.log(`storage files : ${r.storageCount}`);
  console.log(`registry rows : ${r.registryCount}`);
  console.log(`orphans       : ${r.orphans.length}  (active=${r.byClass.active} archive=${r.byClass.archive} shared=${r.byClass.shared} unknown=${r.byClass.unknown})`);
  console.log(`dangling      : ${r.dangling.length}`);
  const willBackfill = r.orphans.filter((o) => o.cls === 'active' || o.cls === 'shared');
  const willSkip = r.orphans.filter((o) => o.cls === 'archive' || o.cls === 'unknown');
  if (willBackfill.length > 0) {
    console.log(`\n  → BACKFILL (${willBackfill.length}):`);
    for (const o of willBackfill) console.log(`     [${o.cls}] ${o.key}  (pid=${o.productId} stage=${o.stage})`);
  }
  if (willSkip.length > 0) {
    console.log(`\n  → SKIP (${willSkip.length}, policy: archive=cold-storage / unknown=out-of-scope):`);
    for (const o of willSkip) console.log(`     [${o.cls}] ${o.key}`);
  }
  if (r.dangling.length > 0) {
    console.log(`\n  ⚠ DANGLING registry rows (path with no storage file) — investigate, do NOT auto-delete:`);
    for (const p of r.dangling) console.log(`     ${p}`);
  }
  console.log('==================================================\n');
}

async function execute(env: Env, orphans: Classified[]): Promise<void> {
  const mod = await import('../src/lib/prisma');
  const prisma = mod.prisma;
  const targets = orphans.filter((o) => o.cls === 'active' || o.cls === 'shared');

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  for (const o of targets) {
    try {
      const { width, height } = await probeDimensions(env, o.key);
      const tokens = parseAssetTokens(o.fileName);
      await prisma.assetRegistry.create({
        data: {
          productId: o.productId,
          stage: o.stage,
          angle: tokens.angle ?? null,
          mood: tokens.mood ?? null,
          slot: tokens.slot ?? null,
          context: tokens.context ?? null,
          fileName: o.fileName,
          path: o.key,
          width,
          height,
          sourceTag: BACKFILL_TAG,
        },
      });
      ok += 1;
      console.log(`OK   ${o.key}  (${width ?? '?'}x${height ?? '?'})`);
    } catch (e) {
      // P2002 = path already registered (idempotent re-run) — count as skipped.
      const code = (e as { code?: string })?.code;
      if (code === 'P2002') {
        skipped += 1;
        console.log(`SKIP ${o.key}  (already registered)`);
      } else {
        failed += 1;
        console.error(`FAIL ${o.key}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }
  console.log(`\nDONE: ${ok} inserted, ${skipped} already-present, ${failed} failed, ${targets.length} targeted`);
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const go = args.has('--go');
  const confirm = args.has('--confirm');
  const env = readEnv();

  const before = await audit(env);
  printReport(before, 'ASSET REGISTRY RECONCILIATION — AUDIT');

  if (!go) {
    console.log('AUDIT/DRY-RUN ONLY. Nothing was changed. Re-run with `--go --confirm` to backfill.');
    console.log('(Backfill is INSERT-only — no file or row is ever deleted.)');
    return;
  }
  if (!confirm) {
    console.error('REFUSING: --go requires --confirm (double gate). Nothing changed.');
    process.exit(1);
  }

  console.log('--go --confirm: EXECUTING backfill (INSERT-only)...\n');
  await execute(env, before.orphans);

  const after = await audit(env);
  printReport(after, 'RE-AUDIT (post-backfill)');
  const remaining = after.orphans.filter((o) => o.cls !== 'archive');
  if (remaining.length === 0) {
    console.log('✅ Reconciled: the only remaining orphans are archive (cold storage) — as intended.');
  } else {
    console.log(`⚠ ${remaining.length} non-archive orphan(s) still unregistered — inspect above.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('ERROR:', e instanceof Error ? e.message : e);
    process.exit(1);
  });
