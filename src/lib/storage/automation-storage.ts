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
import { STAGE_DIRS } from './asset-taxonomy';

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
  });
}

export type AssetKind = 'source' | 'thumb' | 'detail' | 'cutout' | 'composite' | 'archive';

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
    for (const dir of STAGE_DIRS) {
      const hit = await searchDir(`${productId}/${dir}`);
      if (hit) return hit;
    }
    return null;
  } catch {
    return null;
  }
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
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(prefix, { limit: 100, sortBy: { column: 'name', order: 'asc' } });
    // Surface the error instead of swallowing it: a silent return here is what
    // masked the nested-prefix failure for a full session.
    if (error) {
      console.error(
        `[listProductAssets] list('${prefix}') failed: ${error.message}`,
      );
      return;
    }
    if (!data) return;
    for (const f of data) {
      // Supabase returns subfolder placeholders with a null id — skip non-files.
      if (!f.id) continue;
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

  // Root = legacy flat uploads (backward-compatible), then each stage subfolder.
  await collect(productId, 'root');
  for (const dir of STAGE_DIRS) {
    await collect(`${productId}/${dir}`, dir);
  }
  return out;
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
