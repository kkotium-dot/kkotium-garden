// src/lib/storage/automation-storage.ts
//
// Sprint 7-M2 Phase 3-A — Supabase Storage adapter for automation assets
// (thumbnail variants + 5-section detail page composites).
//
// Bucket layout (stage-folder taxonomy — docs/plan/ASSET_FOLDER_TAXONOMY_BUILD.md
// + docs/playbook/IMAGE_SEO_PIPELINE_PLAYBOOK.md §2):
//   product-assets/
//     {productId}/
//       source/{variant}-{ts}.png      Firefly-generated raw (pre-composite bg/material)
//       cutout/{variant}-{ts}.png      transparent cutouts
//       composite/{variant}-{ts}.png   mood / new-bg composites
//       thumb/{variant}-{ts}.png       1:1 representative candidates
//       detail/{variant}-{ts}.png      detail-page sections
//       archive/{variant}-{ts}.png     superseded assets
//   Legacy flat files ({productId}/{kind}-{variant}-{ts}.png) are NOT moved
//   (their stored URLs stay valid); listProductAssets / findCachedAsset read
//   both the flat root and the new stage subfolders (backward-compatible).
//
// The bucket is separate from `product-images` (which holds user-uploaded
// raw product photos) so:
//   - lifecycle policies can differ (automation outputs are regenerable)
//   - CDN cache TTL can be longer (immutable timestamped paths)
//   - access patterns are clear in the audit log
//
// Server-side only: uses SUPABASE_SERVICE_ROLE_KEY for full bucket access.
// Never import this from a client component.

import { createClient } from '@supabase/supabase-js';
import { STAGE_DIRS, LEGACY_STAGE_DIRS } from './asset-taxonomy';
import { parseAssetTokens } from './asset-naming';
import { prisma } from '@/lib/prisma';

const BUCKET_NAME = 'product-assets';

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'automation-storage: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are required',
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      // Force every Supabase Storage/REST request to bypass the Next.js Data
      // Cache. Storage can change OUT-OF-BAND (backfill / remap scripts), and
      // this is operator-facing low-traffic tooling, so a stale listing must
      // never be served. Without this, a cached pre-backfill listing persisted
      // across deploys and rendered dead depth-2 URLs (2026-06-15 Desktop #45).
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: 'no-store' }),
    },
  });
}

// v2 taxonomy (2026-06-12): + plate, + reference, thumb -> thumbnail. The legacy
// 'thumb' folder is still READ (LEGACY_STAGE_DIRS) but no longer a writable kind.
export type AssetKind =
  | 'source' | 'cutout' | 'plate' | 'reference' | 'composite' | 'thumbnail' | 'detail' | 'archive';

export interface UploadAssetOptions {
  productId: string;
  kind: AssetKind;
  /** Variant identifier for thumbnails (clean / price / badge / lifestyle),
   *  or skeletonId for detail pages (S1..S12). */
  variant: string;
  /** Image buffer in PNG format. */
  buffer: Buffer;
  /** Optional content type override. Defaults to image/png. */
  contentType?: string;
}

export interface UploadAssetResult {
  path: string;
  publicUrl: string;
  uploadedAt: string;
}

// Map a content type to the file extension used in the storage path so the
// stored object name matches its MIME body (avoids a `.png` path on a JPEG).
function extFromContentType(contentType: string): string {
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/png') return 'png';
  return 'png';
}

/**
 * Upload an image buffer to Supabase Storage and return the public URL.
 * Path format: `{productId}/{kind}/{variant}-{ts}.{ext}` (stage-folder taxonomy),
 * where {ext} is derived from the content type so the stored object name
 * matches its MIME body (a JPEG no longer lands on a `.png` path). Existing
 * uploads are untouched; only new objects use the derived extension.
 */
export async function uploadAutomationAsset(
  opts: UploadAssetOptions,
): Promise<UploadAssetResult> {
  const supabase = getServerClient();
  const ts = Date.now();
  const contentType = opts.contentType ?? 'image/png';
  const ext = extFromContentType(contentType);
  const path = `${opts.productId}/${opts.kind}/${opts.variant}-${ts}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, opts.buffer, {
      contentType,
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) {
    throw new Error(`automation-storage upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

  return {
    path,
    publicUrl: urlData.publicUrl,
    uploadedAt: new Date(ts).toISOString(),
  };
}

/**
 * Write-time registry intake (#62 — drift root-fix). Inserts an asset_registry
 * row for an asset just written via uploadAutomationAsset, so every generation
 * write-path (apply-composite / apply-cutout / finish-image / thumb-crop) lands
 * a registry row the same way the manual assets/upload route does. Without it
 * those writes updated Product + Storage only and left the registry index
 * behind (the storage-vs-registry drift, #128).
 *
 * Best-effort + idempotent: never throws (an upload must not fail on a registry
 * issue). Swallows P2002 (already registered — idempotent on the unique `path`)
 * and P2021/P2022 (table/column absent in the pre-migration window). Mirrors the
 * assets/upload payload (STAGE_NAMING tokens via parseAssetTokens). Returns
 * whether a new row was created.
 */
export async function registerUploadedAsset(opts: {
  productId: string;
  /** Canonical path from uploadAutomationAsset (`{pid}/{stage}/{file}`). */
  path: string;
  stage: AssetKind;
  width?: number | null;
  height?: number | null;
  sourceTag?: string | null;
}): Promise<boolean> {
  const fileName = opts.path.slice(opts.path.lastIndexOf('/') + 1);
  const tokens = parseAssetTokens(fileName);
  try {
    await prisma.assetRegistry.create({
      data: {
        productId: opts.productId,
        stage: opts.stage,
        angle: tokens.angle ?? null,
        mood: tokens.mood ?? null,
        slot: tokens.slot ?? null,
        context: tokens.context ?? null,
        fileName,
        path: opts.path,
        width: opts.width ?? null,
        height: opts.height ?? null,
        sourceTag: opts.sourceTag ?? null,
      },
    });
    return true;
  } catch {
    // P2002 = already registered (idempotent); P2021/P2022 = pre-migration.
    return false;
  }
}

/**
 * Resolve the public URL of a fixed-name cached asset under `{productId}/`,
 * or null when it does not exist. Used by the asset-source-resolver to find
 * designer-deposited cutout / backdrop overrides (e.g. `cutout.png`,
 * `backdrop-S5.png`) without a DB round-trip. Never throws — a Storage error
 * resolves to null so callers degrade to the fallback source path.
 */
export async function findCachedAsset(
  productId: string,
  fileName: string,
): Promise<string | null> {
  try {
    const supabase = getServerClient();
    // Resolve fileName under one prefix, or null. Returns the public URL on hit.
    const searchDir = async (prefix: string): Promise<string | null> => {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(prefix, { limit: 100, search: fileName });
      if (error || !data) return null;
      const hit = data.find((f) => f.name === fileName);
      if (!hit) return null;
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(`${prefix}/${fileName}`);
      return urlData.publicUrl;
    };
    // Root first (designer-deposited fixed names: cutout.png, backdrop-S6.png),
    // then the stage subfolders (backward-compatible).
    const rootHit = await searchDir(productId);
    if (rootHit) return rootHit;
    for (const dir of [...STAGE_DIRS, ...LEGACY_STAGE_DIRS]) {
      const hit = await searchDir(`${productId}/${dir}`);
      if (hit) return hit;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Move an asset to a new path within the same bucket and return its new public
 * URL. Reversible (the operator can move it back); nothing is deleted. Used by
 * the asset-browser archive action to relocate a superseded asset into
 * `{productId}/archive/` AFTER the caller has de-referenced it from the DB
 * (mainImage / extra_images), so no stored URL is left dangling.
 */
export async function moveAutomationAsset(
  fromPath: string,
  toPath: string,
): Promise<{ path: string; publicUrl: string }> {
  const supabase = getServerClient();
  const { error } = await supabase.storage.from(BUCKET_NAME).move(fromPath, toPath);
  if (error) {
    throw new Error(`automation-storage move failed: ${error.message}`);
  }
  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(toPath);
  return { path: toPath, publicUrl: urlData.publicUrl };
}

/**
 * Delete an asset by storage path. Useful when regenerating to clean up
 * stale uploads before issuing a new one.
 */
export async function deleteAutomationAsset(path: string): Promise<void> {
  const supabase = getServerClient();
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);
  if (error) {
    throw new Error(`automation-storage delete failed: ${error.message}`);
  }
}

/**
 * List all automation assets for a given productId. Returns up to 100
 * entries sorted by createdAt descending.
 */
export interface ProductAssetEntry {
  path: string;
  publicUrl: string;
  createdAt: string;
  size: number;
  /** Stage folder the asset lives in: 'root' (legacy flat) or an AssetKind. */
  stage: string;
}

export async function listProductAssets(productId: string): Promise<ProductAssetEntry[]> {
  const supabase = getServerClient();
  const out: ProductAssetEntry[] = [];

  const collect = async (prefix: string, stage: string) => {
    // NOTE: do NOT pass sortBy:{column:'created_at'} here. Supabase Storage
    // list() reliably sorts only by 'name'; specifying 'created_at' on a
    // NESTED prefix ({pid}/cutout) returns an empty array in this project's
    // storage version, silently dropping real files (root happened to pass,
    // nested stages came back 0 — see /assets cutout=0 bug 2026-06-11).
    // Sort by name asc (stable) and let callers order by createdAt if needed.
    const listOnce = (p: string) =>
      supabase.storage
        .from(BUCKET_NAME)
        .list(p, { limit: 100, sortBy: { column: 'name', order: 'asc' } });

    const first = await listOnce(prefix);
    // Surface the error instead of swallowing it: a silent return here is what
    // masked the nested-prefix failure for a full session.
    if (first.error) {
      console.error(
        `[listProductAssets] list('${prefix}') failed: ${first.error.message}`,
      );
      return;
    }
    // Supabase returns subfolder placeholders with a null id — skip non-files.
    let rows = (first.data ?? []).filter((f) => f.id);

    // Defensive retry: some storage-api/client/key combinations return only a
    // folder placeholder (or an empty page) for a NON-empty nested prefix when
    // the prefix lacks a trailing slash. The trailing-slash form is the proven-
    // reliable shape (verified against storage.search / search_v2 /
    // list_objects_with_delimiter). Only fires when the first pass found 0 real
    // files, so it never changes correct results — it just heals silent drops.
    if (rows.length === 0) {
      const retry = await listOnce(`${prefix}/`);
      if (!retry.error && retry.data) {
        const retryRows = retry.data.filter((f) => f.id);
        if (retryRows.length > 0) {
          console.warn(
            `[listProductAssets] '${prefix}' returned 0 but '${prefix}/' returned ${retryRows.length}; using trailing-slash result`,
          );
          rows = retryRows;
        }
      }
    }

    for (const f of rows) {
      const path = `${prefix}/${f.name}`;
      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
      out.push({
        path,
        publicUrl: urlData.publicUrl,
        createdAt: f.created_at ?? new Date(0).toISOString(),
        size: f.metadata?.size ?? 0,
        stage,
      });
    }
  };

  // Root = legacy flat uploads (backward-compatible), then each stage subfolder,
  // then legacy stage folders (e.g. pre-v2 'thumb') so old URLs still surface.
  await collect(productId, 'root');
  for (const dir of STAGE_DIRS) {
    await collect(`${productId}/${dir}`, dir);
  }
  for (const dir of LEGACY_STAGE_DIRS) {
    await collect(`${productId}/${dir}`, dir);
  }
  return out;
}

/**
 * Enumerate the immediate subfolder names under `{productId}/` in storage.
 *
 * listProductAssets only scans stages it KNOWS (STAGE_DIRS + legacy), so a stage
 * folder that is physically present but absent from the taxonomy (e.g. a future
 * `plate`-style surprise) is invisible to it. The integrity guard uses this to
 * detect such undefined stages (#94). Supabase returns subfolder placeholders
 * with a null id; real root files carry a non-null id and are excluded here.
 */
export async function listProductStageFolders(productId: string): Promise<string[]> {
  const supabase = getServerClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(productId, { limit: 100, sortBy: { column: 'name', order: 'asc' } });
  if (error || !data) return [];
  return data.filter((f) => !f.id).map((f) => f.name);
}

// ----------------------------------------------------------------------------
// Sprint 7-M2 Phase 2-c-2 — Lifestyle backdrop library helpers
//
// Lifestyle assets live under the same bucket but a dedicated path prefix:
//   product-assets/
//     lifestyle/
//       {assetId}.{ext}
//
// Same bucket means the same RLS + lifecycle policy as automation outputs;
// the path prefix keeps the audit trail clean and lets us list them with
// a single `.list('lifestyle')` call when needed.
// ----------------------------------------------------------------------------

export interface UploadLifestyleAssetOptions {
  /** Pre-allocated cuid for the LifestyleAsset row. Caller owns the id so
   *  the storage path matches the DB primary key 1:1 and rollback is
   *  trivial (delete the storage object before INSERT or after FAILED
   *  upload). */
  assetId: string;
  /** Image buffer in PNG/JPEG/WebP. */
  buffer: Buffer;
  /** Lowercase file extension without the leading dot (e.g. 'png'). */
  ext: string;
  /** Optional content type override. Defaults to image/{ext}. */
  contentType?: string;
}

export interface UploadLifestyleAssetResult {
  path: string;
  publicUrl: string;
  uploadedAt: string;
}

export async function uploadLifestyleAsset(
  opts: UploadLifestyleAssetOptions,
): Promise<UploadLifestyleAssetResult> {
  const supabase = getServerClient();
  const safeExt = opts.ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png';
  const path = `lifestyle/${opts.assetId}.${safeExt}`;
  const contentType = opts.contentType ?? `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, opts.buffer, {
      contentType,
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) {
    throw new Error(`uploadLifestyleAsset failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

  return {
    path,
    publicUrl: urlData.publicUrl,
    uploadedAt: new Date().toISOString(),
  };
}

export async function deleteLifestyleAsset(path: string): Promise<void> {
  const supabase = getServerClient();
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);
  if (error) {
    throw new Error(`deleteLifestyleAsset failed: ${error.message}`);
  }
}
