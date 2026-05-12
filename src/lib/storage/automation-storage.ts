// src/lib/storage/automation-storage.ts
//
// Sprint 7-M2 Phase 3-A — Supabase Storage adapter for automation assets
// (thumbnail variants + 5-section detail page composites).
//
// Bucket layout:
//   product-assets/
//     {productId}/
//       thumb-{variant}-{ts}.png
//       detail-{skeletonId}-{ts}.png
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

export type AssetKind = 'thumb' | 'detail';

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

/**
 * Upload a PNG buffer to Supabase Storage and return the public URL.
 * Path format: `{productId}/{kind}-{variant}-{ts}.png`.
 */
export async function uploadAutomationAsset(
  opts: UploadAssetOptions,
): Promise<UploadAssetResult> {
  const supabase = getServerClient();
  const ts = Date.now();
  const path = `${opts.productId}/${opts.kind}-${opts.variant}-${ts}.png`;
  const contentType = opts.contentType ?? 'image/png';

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
export async function listProductAssets(productId: string): Promise<
  Array<{ path: string; publicUrl: string; createdAt: string; size: number }>
> {
  const supabase = getServerClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(productId, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) {
    throw new Error(`automation-storage list failed: ${error.message}`);
  }
  return (data ?? []).map((f) => {
    const path = `${productId}/${f.name}`;
    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    return {
      path,
      publicUrl: urlData.publicUrl,
      createdAt: f.created_at ?? new Date(0).toISOString(),
      size: f.metadata?.size ?? 0,
    };
  });
}
