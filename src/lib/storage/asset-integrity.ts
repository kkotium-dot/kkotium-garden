// src/lib/storage/asset-integrity.ts
// ============================================================================
// Asset-integrity guard (#80 follow-up). Drift between the canonical store and a
// product's DB image refs used to be invisible until a human opened the studio
// (the stale-listing bug). This module turns that into a STANDING, per-product
// check driven by the LIVE storage listing (listProductAssets is no-store), and
// a 1-click remediation that mirrors the backfill/remap logic.
//
// Signals (no image downloads in the default path — listing + DB only):
//   - depth2:   files still at the legacy root (`{pid}/{file}`) = normalization
//               missing (should live under a stage subfolder).
//   - deadRefs: a DB ref points at a product-assets key that is NOT in the live
//               listing (a 404 — e.g. a pre-backfill depth-2 URL).
//   - ratio:    (OPT-IN) composite != 4:5 / thumbnail != 1:1 — Sharp metadata
//               only, bounded, never in the default sweep.
//
// English code; product-agnostic (#55); Sharp-only (no external image API, #37).
// ============================================================================

import { prisma } from '@/lib/prisma';
import {
  listProductAssets,
  listProductStageFolders,
  moveAutomationAsset,
  deleteAutomationAsset,
  type ProductAssetEntry,
} from './automation-storage';
import { kindForSource, STAGE_DIRS, LEGACY_STAGE_DIRS } from './asset-taxonomy';
import { RATIO_SCENT_SCENE, RATIO_REPRESENTATIVE, ratioValue } from '@/lib/config/image-slot-matrix';

const IMG_EXT = '(?:png|jpe?g|webp|gif|avif)';
const RATIO_TOLERANCE = 0.03;
const RATIO_SCAN_CAP = 16; // bounded — never download more than this per product

export interface DeadRef {
  /** Where the ref was found, e.g. 'Product.mainImage' or 'asset_references'. */
  source: string;
  url: string;
  key: string;
  /** Basename has a live canonical target the 1-click fix can re-point to. */
  fixable: boolean;
}

export interface RatioFlag {
  stage: string;
  path: string;
  actual: string;
  expected: string;
}

export interface OrphanRef {
  path: string;
  stage: string;
}

/**
 * REGISTRY <-> STORAGE drift (#62 / #93 / #94). The #80 guard cross-checks
 * storage vs DB image refs; this cross-checks the live storage listing against
 * the asset_registry index. A single side never reveals an orphan:
 *   - storageOnly:   a live file (non-root, non-archive) with NO registry row.
 *                    Pre-registry-era assets (before 2026-06-13) are all here.
 *   - registryOnly:  a registry row whose file is gone from the live listing.
 *   - undefinedStages: physical stage folders absent from the taxonomy.
 * Advisory only — does NOT gate `ok` (the #80 1-click fix can't resolve these;
 * orphan reconcile is an operator decision = register-vs-archive, COMPOSITE-
 * CLEANUP). Product-agnostic (#55), listing + DB only (no image downloads).
 */
export interface RegistryDrift {
  storageOnly: OrphanRef[];
  registryOnly: OrphanRef[];
  undefinedStages: string[];
  storageOnlyCount: number;
  registryOnlyCount: number;
  /** True when storage and the registry fully agree. */
  reconciled: boolean;
}

export interface AssetIntegrityReport {
  productId: string;
  total: number;
  /** Files still at the legacy root prefix (normalization missing). */
  depth2Count: number;
  depth2Files: string[];
  deadRefs: DeadRef[];
  ratioFlags: RatioFlag[];
  /** REGISTRY <-> STORAGE drift (advisory — does NOT gate `ok`). */
  registryDrift: RegistryDrift;
  /** True when there is nothing to remediate (depth2 == 0 && deadRefs == 0). */
  ok: boolean;
  /** What the 1-click fix can resolve: root files to move + dead refs to remap. */
  fixableDepth2: number;
  fixableDeadRefs: number;
}

/** Cross-check the live storage listing against the asset_registry index. */
async function computeRegistryDrift(
  productId: string,
  entries: ProductAssetEntry[],
  livePaths: Set<string>,
): Promise<RegistryDrift> {
  let registryRows: { path: string; stage: string }[] = [];
  try {
    registryRows = await prisma.assetRegistry.findMany({
      where: { productId },
      select: { path: true, stage: true },
    });
  } catch {
    // table unmigrated — non-fatal (drift simply reports storage side only).
  }
  const registryPaths = new Set(registryRows.map((r) => r.path));

  // storage-only: a live file that is NOT a legacy-root file (depth2 signal
  // owns those) and NOT an archive backup (backups are intentionally
  // unregistered), with no matching registry row.
  const storageOnly: OrphanRef[] = entries
    .filter((e) => e.stage !== 'root' && e.stage !== 'archive' && !registryPaths.has(e.path))
    .map((e) => ({ path: e.path, stage: e.stage }));

  // registry-only: a registry row whose physical file is gone.
  const registryOnly: OrphanRef[] = registryRows
    .filter((r) => !livePaths.has(r.path))
    .map((r) => ({ path: r.path, stage: r.stage }));

  // undefined stages: physical subfolders absent from the taxonomy. plate /
  // reference are already in STAGE_DIRS (v2), so a real surprise is needed to
  // flag here — invisible to listProductAssets otherwise.
  const known = new Set<string>([...STAGE_DIRS, ...LEGACY_STAGE_DIRS, 'root']);
  const folders = await listProductStageFolders(productId).catch(() => []);
  const undefinedStages = folders.filter((f) => !known.has(f));

  return {
    storageOnly,
    registryOnly,
    undefinedStages,
    storageOnlyCount: storageOnly.length,
    registryOnlyCount: registryOnly.length,
    reconciled:
      storageOnly.length === 0 && registryOnly.length === 0 && undefinedStages.length === 0,
  };
}

/** Extract the storage key (after `/product-assets/`) from a public URL, or null. */
function keyFromUrl(url: string): string | null {
  const i = url.indexOf('/product-assets/');
  if (i < 0) return null;
  const tail = url.slice(i + '/product-assets/'.length);
  // Strip any query string / trailing quote noise.
  return tail.split(/[?"'\s]/)[0] || null;
}

/** basename -> live stage subfolder (excluding archive/ — backups share names). */
function canonicalBasenameMap(entries: ProductAssetEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of entries) {
    if (e.stage === 'root' || e.stage === 'archive') continue;
    const base = e.path.slice(e.path.lastIndexOf('/') + 1);
    if (!map.has(base)) map.set(base, e.stage);
  }
  return map;
}

/** All depth-2 URL refs for `pid` found anywhere in a JSON-serializable value. */
function findDepth2Refs(value: unknown, pid: string): string[] {
  if (value == null) return [];
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  const re = new RegExp(`/product-assets/${pid}/[^/"'\\\\\\s]+\\.${IMG_EXT}`, 'g');
  return [...s.matchAll(re)].map((m) => m[0]);
}

/**
 * Read-only integrity check for one product against the LIVE storage listing.
 * `includeRatio` triggers a bounded Sharp-metadata pass over composite/thumbnail
 * (off by default to keep the sweep download-free).
 */
export async function checkProductIntegrity(
  productId: string,
  opts: { includeRatio?: boolean } = {},
): Promise<AssetIntegrityReport> {
  const entries = await listProductAssets(productId);
  const livePaths = new Set(entries.map((e) => e.path));
  const canonical = canonicalBasenameMap(entries);

  const rootEntries = entries.filter((e) => e.stage === 'root');
  const depth2Files = rootEntries.map((e) => e.path.slice(e.path.lastIndexOf('/') + 1));

  // Dead refs: scan the product row exhaustively (every column, incl. nested
  // jsonb) plus asset_references / published_assets for product-assets URLs of
  // this pid whose key is not in the live listing.
  const deadRefs: DeadRef[] = [];
  const seen = new Set<string>();
  const consider = (source: string, urls: string[]) => {
    for (const url of urls) {
      const key = keyFromUrl(url);
      if (!key || !key.startsWith(`${productId}/`)) continue;
      if (livePaths.has(key)) continue; // ref resolves — fine
      const dedup = `${source}|${url}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);
      const base = key.slice(key.lastIndexOf('/') + 1);
      deadRefs.push({ source, url, key, fixable: canonical.has(base) });
    }
  };

  const product = (await prisma.product.findUnique({ where: { id: productId } })) as Record<
    string,
    unknown
  > | null;
  if (product) {
    for (const [k, v] of Object.entries(product)) {
      if (k === 'id' || v == null) continue;
      consider(`Product.${k}`, findDepth2Refs(v, productId));
    }
  }
  try {
    const refs = await prisma.assetReference.findMany({ select: { assetUrn: true } });
    for (const r of refs) consider('asset_references', findDepth2Refs(r.assetUrn, productId));
    const pub = await prisma.publishedAsset.findMany({ select: { assetUrn: true, naverImageUrl: true } });
    for (const a of pub) {
      consider('published_assets', findDepth2Refs(a.assetUrn, productId));
      consider('published_assets', findDepth2Refs(a.naverImageUrl, productId));
    }
  } catch {
    // tables unmigrated — non-fatal
  }

  // Optional, bounded ratio check (Sharp metadata only).
  const ratioFlags: RatioFlag[] = [];
  if (opts.includeRatio) {
    const sharp = (await import('sharp')).default;
    const targets = entries
      .filter((e) => e.stage === 'composite' || e.stage === 'thumbnail')
      .slice(0, RATIO_SCAN_CAP);
    const expectFor = (stage: string) =>
      stage === 'composite' ? RATIO_SCENT_SCENE : RATIO_REPRESENTATIVE;
    for (const e of targets) {
      try {
        const res = await fetch(e.publicUrl, { cache: 'no-store' });
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        const meta = await sharp(buf).metadata();
        if (!meta.width || !meta.height) continue;
        const actual = meta.width / meta.height;
        const want = ratioValue(expectFor(e.stage));
        if (Math.abs(actual - want) > RATIO_TOLERANCE) {
          const exp = expectFor(e.stage);
          ratioFlags.push({
            stage: e.stage,
            path: e.path,
            actual: actual.toFixed(3),
            expected: `${exp.w}:${exp.h}`,
          });
        }
      } catch {
        // unreadable image — skip (best-effort)
      }
    }
  }

  const registryDrift = await computeRegistryDrift(productId, entries, livePaths);

  const fixableDeadRefs = deadRefs.filter((d) => d.fixable).length;
  return {
    productId,
    total: entries.length,
    depth2Count: rootEntries.length,
    depth2Files,
    deadRefs,
    ratioFlags,
    registryDrift,
    ok: rootEntries.length === 0 && deadRefs.length === 0,
    fixableDepth2: rootEntries.length,
    fixableDeadRefs,
  };
}

export interface IntegrityFixResult {
  productId: string;
  moved: number;
  remappedFields: number;
  remappedRefs: number;
  after: AssetIntegrityReport;
}

/**
 * 1-click remediation (irreversible — callers MUST gate on explicit confirm).
 * Mirrors the backfill/remap: move each legacy-root file into its canonical
 * stage (retiring the root original into archive/ as a reversible backup), then
 * EXHAUSTIVELY re-point any depth-2 DB ref to the file's canonical URL. Idempotent.
 */
export async function fixProductIntegrity(productId: string): Promise<IntegrityFixResult> {
  // 1) Move legacy-root files into their canonical stage folder.
  let moved = 0;
  const before = await listProductAssets(productId);
  for (const e of before.filter((x) => x.stage === 'root')) {
    const name = e.path.slice(e.path.lastIndexOf('/') + 1);
    const kind = kindForSource(name);
    const toKey = `${productId}/${kind}/${name}`;
    if (e.path === toKey) continue;
    const exists = before.some((x) => x.path === toKey);
    if (exists) {
      // Canonical already present (a prior partial run) — retire the root dup.
      await moveAutomationAsset(e.path, `${productId}/archive/${name}`).catch(async () => {
        await deleteAutomationAsset(e.path);
      });
    } else {
      await moveAutomationAsset(e.path, toKey);
    }
    moved += 1;
  }

  // 2) Re-point depth-2 DB refs to canonical, using the now-current listing.
  const after = await listProductAssets(productId);
  const canonical = canonicalBasenameMap(after);
  const livePaths = new Set(after.map((x) => x.path));
  const injectStage = (s: string): string =>
    s.replace(
      new RegExp(`/product-assets/${productId}/([^/"'\\\\\\s]+\\.${IMG_EXT})`, 'g'),
      (whole, file: string) => {
        const key = `${productId}/${file}`;
        if (livePaths.has(key)) return whole; // still a live root file — leave
        const stage = canonical.get(file);
        if (!stage) return whole; // orphan — never fabricate
        return whole.replace(`/product-assets/${productId}/${file}`, `/product-assets/${productId}/${stage}/${file}`);
      },
    );

  let remappedFields = 0;
  let remappedRefs = 0;
  const product = (await prisma.product.findUnique({ where: { id: productId } })) as Record<
    string,
    unknown
  > | null;
  if (product) {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(product)) {
      if (k === 'id' || v == null) continue;
      const s = JSON.stringify(v);
      const next = injectStage(s);
      if (next !== s) {
        data[k] = JSON.parse(next);
        remappedFields += 1;
      }
    }
    if (Object.keys(data).length) await prisma.product.update({ where: { id: productId }, data });
  }
  try {
    for (const r of await prisma.assetReference.findMany({ select: { id: true, assetUrn: true } })) {
      const next = injectStage(r.assetUrn ?? '');
      if (next !== (r.assetUrn ?? '')) {
        await prisma.assetReference.update({ where: { id: r.id }, data: { assetUrn: next } });
        remappedRefs += 1;
      }
    }
    for (const a of await prisma.publishedAsset.findMany({ select: { id: true, assetUrn: true, naverImageUrl: true } })) {
      const nu = injectStage(a.assetUrn ?? '');
      const nn = injectStage(a.naverImageUrl ?? '');
      if (nu !== (a.assetUrn ?? '') || nn !== (a.naverImageUrl ?? '')) {
        await prisma.publishedAsset.update({ where: { id: a.id }, data: { assetUrn: nu, naverImageUrl: nn } });
        remappedRefs += 1;
      }
    }
  } catch {
    // tables unmigrated — non-fatal
  }

  const report = await checkProductIntegrity(productId);
  return { productId, moved, remappedFields, remappedRefs, after: report };
}

// ----------------------------------------------------------------------------
// REGISTRY <-> STORAGE reconcile (#62 P2). Unlike fixProductIntegrity (which
// auto-remediates depth2/deadRefs), drift reconcile is an OPERATOR DECISION per
// orphan: a storage-only file is either a keeper (register it) or stale (archive
// it); a registry-only row points at a gone file (clear it). The caller supplies
// the decisions; this only acts on paths that are STILL confirmed orphans on the
// live listing (never fabricates). register = additive (reversible by clear),
// archive = move (reversible), clear = delete a stale row. Idempotent.
// ----------------------------------------------------------------------------

/**
 * Archive specific REGISTERED assets by registry id (#62 cleanup util). Moves
 * each asset's storage file into {pid}/archive/ and flips its registry row to
 * stage='archive' (path updated). Ordered (move -> DB) and idempotent (a row
 * already at stage='archive' is skipped). Reversible; gate callers on confirm
 * (#46). Used to retire wrong-variant / superseded / test composites so the
 * asset-integrity + variant cards clear. Product-scoped (never crosses products).
 */
export async function archiveAssets(
  productId: string,
  registryIds: string[],
): Promise<{ archived: number; skipped: Array<{ id: string; reason: string }> }> {
  let archived = 0;
  const skipped: Array<{ id: string; reason: string }> = [];
  for (const id of registryIds) {
    const row = await prisma.assetRegistry.findUnique({ where: { id } }).catch(() => null);
    if (!row || row.productId !== productId) {
      skipped.push({ id, reason: 'not found for product' });
      continue;
    }
    if (row.stage === 'archive') {
      skipped.push({ id, reason: 'already archived' });
      continue;
    }
    const fileName = row.path.slice(row.path.lastIndexOf('/') + 1);
    const toPath = `${productId}/archive/${fileName}`;
    if (row.path !== toPath) {
      await moveAutomationAsset(row.path, toPath).catch(async () => {
        // Source already gone (a prior partial run) — proceed to flip the row.
      });
    }
    await prisma.assetRegistry.update({ where: { id }, data: { stage: 'archive', path: toPath } });
    archived += 1;
  }
  return { archived, skipped };
}

export interface ReconcileDecisions {
  /** storage-only paths to register into asset_registry (keepers). */
  register?: string[];
  /** storage-only paths to retire into {pid}/archive/ (stale). */
  archive?: string[];
  /** registry-only paths whose stale row should be deleted (file is gone). */
  clearRegistry?: string[];
}

export interface ReconcileResult {
  productId: string;
  registered: number;
  archived: number;
  cleared: number;
  after: AssetIntegrityReport;
}

export async function reconcileRegistryDrift(
  productId: string,
  decisions: ReconcileDecisions,
): Promise<ReconcileResult> {
  // Re-check live so we only act on paths that are genuinely orphans right now.
  const report = await checkProductIntegrity(productId);
  const storageOnly = new Set(report.registryDrift.storageOnly.map((o) => o.path));
  const registryOnly = new Set(report.registryDrift.registryOnly.map((o) => o.path));

  let registered = 0;
  let archived = 0;
  let cleared = 0;

  // register — insert an asset_registry row inferred from the canonical path
  // ({pid}/{stage}/{file}). Idempotent: skip if a row for this path exists.
  for (const path of decisions.register ?? []) {
    if (!storageOnly.has(path)) continue;
    const parts = path.split('/');
    if (parts[0] !== productId || parts.length < 3) continue;
    const stage = parts[1];
    const fileName = parts[parts.length - 1];
    const exists = await prisma.assetRegistry.findUnique({ where: { path } }).catch(() => null);
    if (exists) continue;
    await prisma.assetRegistry.create({ data: { productId, stage, fileName, path } });
    registered += 1;
  }

  // archive — retire a stale storage-only file into archive/ (reversible move).
  for (const path of decisions.archive ?? []) {
    if (!storageOnly.has(path)) continue;
    const fileName = path.slice(path.lastIndexOf('/') + 1);
    await moveAutomationAsset(path, `${productId}/archive/${fileName}`);
    archived += 1;
  }

  // clearRegistry — delete a registry row whose physical file is gone.
  for (const path of decisions.clearRegistry ?? []) {
    if (!registryOnly.has(path)) continue;
    const res = await prisma.assetRegistry.deleteMany({ where: { productId, path } });
    cleared += res.count;
  }

  const after = await checkProductIntegrity(productId);
  return { productId, registered, archived, cleared, after };
}
