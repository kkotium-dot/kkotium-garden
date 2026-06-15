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
  moveAutomationAsset,
  deleteAutomationAsset,
  type ProductAssetEntry,
} from './automation-storage';
import { kindForSource } from './asset-taxonomy';
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

export interface AssetIntegrityReport {
  productId: string;
  total: number;
  /** Files still at the legacy root prefix (normalization missing). */
  depth2Count: number;
  depth2Files: string[];
  deadRefs: DeadRef[];
  ratioFlags: RatioFlag[];
  /** True when there is nothing to remediate (depth2 == 0 && deadRefs == 0). */
  ok: boolean;
  /** What the 1-click fix can resolve: root files to move + dead refs to remap. */
  fixableDepth2: number;
  fixableDeadRefs: number;
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

  const fixableDeadRefs = deadRefs.filter((d) => d.fixable).length;
  return {
    productId,
    total: entries.length,
    depth2Count: rootEntries.length,
    depth2Files,
    deadRefs,
    ratioFlags,
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
