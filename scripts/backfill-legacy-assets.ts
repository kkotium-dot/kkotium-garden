// scripts/backfill-legacy-assets.ts
// ============================================================================
// Legacy flat-asset backfill (product-agnostic, all products). Authority
// docs/playbook/ADAPTIVE_IMAGE_ENGINE_AND_FOLDER_SYSTEM_2026-06-14.md §3 + §7.
//
// Root flat files ({pid}/file.ext, no stage subfolder) are a deliberate
// backward-compat residue — their URLs stay valid, readers read both shapes. The
// backfill classifies each via kindForSource() and relocates it into the canonical
// {pid}/{kind}/ stage subfolder, keeping the SAME basename so the variant token
// survives.
//
// SAFETY (authority §3 + §7 GO-decision #1):
//   - Scope: ONLY top-level prefixes that exist in the Product table. The
//     non-product namespaces common/ and lifestyle/ are permanently excluded
//     (stable URLs, not product assets).
//   - Order is COPY -> update DB URL refs -> verify -> retire original. NEVER
//     move-then-update (that would 404 a live URL between the two steps).
//   - Idempotent: a file already inside a subfolder is skipped.
//
// MODES:
//   (default)            dry-run — print the move plan, mutate NOTHING, STOP.
//   --go --confirm       execute (double-gated; operator GO required).
//
// Run:
//   npx tsx scripts/backfill-legacy-assets.ts            # dry-run report
//   npx tsx scripts/backfill-legacy-assets.ts --go --confirm
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { kindForSource } from '../src/lib/storage/asset-taxonomy';

const BUCKET = 'product-assets';
// common/ and lifestyle/ are non-product namespaces — never backfilled (§3).
const EXCLUDED_PREFIXES = new Set(['common', 'lifestyle']);

interface Env {
  url: string;
  key: string;
  databaseUrl: string;
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
  const databaseUrl = map.DATABASE_URL;
  if (!url || !key) throw new Error('MISSING_ENV: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required');
  // Make DATABASE_URL available to the Prisma singleton (dynamic import below).
  if (databaseUrl && !process.env.DATABASE_URL) process.env.DATABASE_URL = databaseUrl;
  return { url: url.replace(/\/$/, ''), key, databaseUrl };
}

interface StorageEntry {
  name: string;
  id: string | null; // null = a subfolder placeholder
  created_at?: string;
  metadata?: { size?: number } | null;
}

async function listPrefix(env: Env, prefix: string): Promise<StorageEntry[]> {
  const res = await fetch(`${env.url}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: {
      apikey: env.key,
      Authorization: `Bearer ${env.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prefix,
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    }),
  });
  if (!res.ok) throw new Error(`list('${prefix}') -> ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as StorageEntry[];
}

function publicUrl(env: Env, key: string): string {
  return `${env.url}/storage/v1/object/public/${BUCKET}/${key}`;
}

async function copyObject(env: Env, fromKey: string, toKey: string): Promise<void> {
  const res = await fetch(`${env.url}/storage/v1/object/copy`, {
    method: 'POST',
    headers: {
      apikey: env.key,
      Authorization: `Bearer ${env.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bucketId: BUCKET, sourceKey: fromKey, destinationKey: toKey }),
  });
  if (!res.ok) throw new Error(`copy ${fromKey} -> ${toKey} : ${res.status} ${(await res.text()).slice(0, 200)}`);
}

async function moveObject(env: Env, fromKey: string, toKey: string): Promise<void> {
  const res = await fetch(`${env.url}/storage/v1/object/move`, {
    method: 'POST',
    headers: {
      apikey: env.key,
      Authorization: `Bearer ${env.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bucketId: BUCKET, sourceKey: fromKey, destinationKey: toKey }),
  });
  if (!res.ok) throw new Error(`move ${fromKey} -> ${toKey} : ${res.status} ${(await res.text()).slice(0, 200)}`);
}

async function removeObject(env: Env, key: string): Promise<void> {
  const res = await fetch(`${env.url}/storage/v1/object/${BUCKET}/${key}`, {
    method: 'DELETE',
    headers: { apikey: env.key, Authorization: `Bearer ${env.key}` },
  });
  if (!res.ok) throw new Error(`delete ${key} : ${res.status} ${(await res.text()).slice(0, 200)}`);
}

async function urlReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

interface PlanItem {
  pid: string;
  fromKey: string;
  toKey: string;
  kind: string;
  fileName: string;
  retire: { op: 'move' | 'delete'; toKey?: string };
}

// Load the set of Product ids (the scope gate). Returns null when the DB is
// unreachable so the caller can decide to abort rather than guess.
async function loadProductIds(): Promise<Set<string> | null> {
  try {
    const mod = await import('../src/lib/prisma');
    const prisma = mod.prisma;
    const rows = await prisma.product.findMany({ select: { id: true } });
    return new Set(rows.map((r: { id: string }) => r.id));
  } catch (e) {
    console.error('DB_WARN: could not load Product ids:', e instanceof Error ? e.message : e);
    return null;
  }
}

async function buildPlan(env: Env, productIds: Set<string>): Promise<PlanItem[]> {
  const plan: PlanItem[] = [];
  const top = await listPrefix(env, '');
  for (const folder of top) {
    const pid = folder.name;
    if (folder.id) continue; // a stray top-level file, not a product folder
    if (EXCLUDED_PREFIXES.has(pid)) continue; // common / lifestyle
    if (!productIds.has(pid)) continue; // not a Product — out of scope (§3)

    const entries = await listPrefix(env, `${pid}/`);
    for (const e of entries) {
      if (!e.id) continue; // subfolder placeholder — already classified, skip (idempotent)
      if (!/\.(png|jpe?g|webp|gif|avif)$/i.test(e.name)) continue; // images only
      const kind = kindForSource(e.name);
      const fromKey = `${pid}/${e.name}`;
      const toKey = `${pid}/${kind}/${e.name}`;
      if (fromKey === toKey) continue; // defensive (kind never empty)
      // Retire plan: a file classified as 'archive' already lands in archive/,
      // so the root original is just deleted; otherwise the root original is
      // moved into archive/ as a reversible backup.
      const retire: PlanItem['retire'] =
        kind === 'archive'
          ? { op: 'delete' }
          : { op: 'move', toKey: `${pid}/archive/${e.name}` };
      plan.push({ pid, fromKey, toKey, kind, fileName: e.name, retire });
    }
  }
  return plan;
}

function printPlan(plan: PlanItem[]): void {
  const byPid = new Map<string, PlanItem[]>();
  for (const item of plan) {
    const arr = byPid.get(item.pid) ?? [];
    arr.push(item);
    byPid.set(item.pid, arr);
  }
  console.log('================ LEGACY BACKFILL DRY-RUN PLAN ================');
  for (const [pid, items] of byPid) {
    console.log(`\n[${pid}]  (${items.length} files)`);
    for (const it of items) {
      console.log(`  ${it.fromKey}  ->  ${it.toKey}   (kind=${it.kind}, retire=${it.retire.op})`);
    }
  }
  console.log(`\nTOTAL: ${plan.length} files across ${byPid.size} product(s)`);
  console.log('=============================================================');
}

async function execute(env: Env, plan: PlanItem[]): Promise<void> {
  let ok = 0;
  let failed = 0;
  for (const it of plan) {
    try {
      // 1) COPY (both URLs valid now — no live URL is ever 404 mid-flight).
      await copyObject(env, it.fromKey, it.toKey);
      // 2) UPDATE DB url refs.
      await updateDbRefs(env, it);
      // 3) VERIFY new URL is reachable before retiring the original.
      if (!(await urlReachable(publicUrl(env, it.toKey)))) {
        throw new Error(`verify failed: new URL not reachable (${it.toKey})`);
      }
      // 3.5) SELF-CHECK: no DB field may still reference the old key/URL, else
      // retire would dangle a live reference. Skip retire (keep both copies) on
      // a non-zero count so the operator can inspect — never blind-retire.
      const residual = await residualRefCount(env, it);
      if (residual > 0) {
        throw new Error(`residual refs still point to old key (${residual}) — NOT retiring ${it.fromKey}`);
      }
      // 4) RETIRE original.
      if (it.retire.op === 'delete') await removeObject(env, it.fromKey);
      else await moveObject(env, it.fromKey, it.retire.toKey!);
      ok += 1;
      console.log(`OK  ${it.fromKey} -> ${it.toKey}`);
    } catch (e) {
      failed += 1;
      console.error(`FAIL ${it.fromKey}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`\nDONE: ${ok} ok, ${failed} failed, ${plan.length} planned`);
}

// EXHAUSTIVE swap of one old public URL -> new public URL across EVERY Product
// column (including nested jsonb such as quality_reasons) — no hardcoded column
// list (a hardcoded list missed quality_reasons and dangled it). The full row is
// fetched, each column's JSON form is string-replaced, and only changed columns
// are written. Idempotent (no-op when the old URL is absent). AssetRegistry holds
// keys, re-pointed by key; asset_references / published_assets are URN-based.
async function updateDbRefs(env: Env, it: PlanItem): Promise<void> {
  const mod = await import('../src/lib/prisma');
  const prisma = mod.prisma;
  const oldUrl = publicUrl(env, it.fromKey);
  const newUrl = publicUrl(env, it.toKey);

  const product = (await prisma.product.findUnique({ where: { id: it.pid } })) as Record<string, unknown> | null;
  if (product) {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(product)) {
      if (k === 'id' || v == null) continue;
      const s = JSON.stringify(v);
      if (!s.includes(oldUrl)) continue;
      data[k] = JSON.parse(s.split(oldUrl).join(newUrl));
    }
    if (Object.keys(data).length > 0) {
      await prisma.product.update({ where: { id: it.pid }, data });
    }
  }

  // URN-based tables — rewrite any row that embeds the old URL (generic).
  for (const r of await prisma.assetReference.findMany({ where: { assetUrn: { contains: oldUrl } }, select: { id: true, assetUrn: true } })) {
    await prisma.assetReference.update({ where: { id: r.id }, data: { assetUrn: r.assetUrn.split(oldUrl).join(newUrl) } });
  }
  for (const a of await prisma.publishedAsset.findMany({ where: { OR: [{ assetUrn: { contains: oldUrl } }, { naverImageUrl: { contains: oldUrl } }] }, select: { id: true, assetUrn: true, naverImageUrl: true } })) {
    await prisma.publishedAsset.update({
      where: { id: a.id },
      data: {
        assetUrn: a.assetUrn ? a.assetUrn.split(oldUrl).join(newUrl) : a.assetUrn,
        naverImageUrl: a.naverImageUrl ? a.naverImageUrl.split(oldUrl).join(newUrl) : a.naverImageUrl,
      },
    });
  }

  // AssetRegistry path is unique — re-point the row to the new key/stage.
  try {
    await prisma.assetRegistry.updateMany({
      where: { productId: it.pid, path: it.fromKey },
      data: { path: it.toKey, stage: it.kind, fileName: it.fileName },
    });
  } catch {
    // table not migrated / no row — non-fatal.
  }
}

// Pre-retire self-check: count ANY DB field still referencing the OLD public URL
// (or old key for AssetRegistry), via an EXHAUSTIVE full-row scan — not a column
// list. MUST be 0 before retiring the original, else retire would 404 a live ref.
async function residualRefCount(env: Env, it: PlanItem): Promise<number> {
  const mod = await import('../src/lib/prisma');
  const prisma = mod.prisma;
  const oldUrl = publicUrl(env, it.fromKey);
  let n = 0;

  const product = await prisma.product.findUnique({ where: { id: it.pid } });
  if (product && JSON.stringify(product).includes(oldUrl)) n += 1;

  n += await prisma.assetReference.count({ where: { assetUrn: { contains: oldUrl } } });
  n += await prisma.publishedAsset.count({
    where: { OR: [{ assetUrn: { contains: oldUrl } }, { naverImageUrl: { contains: oldUrl } }] },
  });
  // AssetRegistry holds KEYS, not URLs — the old key must no longer be present.
  n += await prisma.assetRegistry.count({ where: { path: it.fromKey } });

  return n;
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const go = args.has('--go');
  const confirm = args.has('--confirm');
  const env = readEnv();

  const productIds = await loadProductIds();
  if (!productIds) {
    console.error('ABORT: Product id set unavailable — refusing to guess scope (§3 requires Product-table membership).');
    process.exit(1);
  }

  const plan = await buildPlan(env, productIds);
  printPlan(plan);

  if (!go) {
    console.log('\nDRY-RUN ONLY. Nothing was changed. Re-run with `--go --confirm` after operator GO.');
    return;
  }
  if (!confirm) {
    console.error('\nREFUSING: --go requires --confirm (double gate). Nothing changed.');
    process.exit(1);
  }
  console.log('\n--go --confirm: EXECUTING backfill (COPY -> DB -> verify -> retire)...');
  await execute(env, plan);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('ERROR:', e instanceof Error ? e.message : e);
    process.exit(1);
  });
