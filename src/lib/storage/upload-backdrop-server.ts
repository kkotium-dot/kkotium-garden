// src/lib/storage/upload-backdrop-server.ts
//
// Track B Phase 1 — server-side backdrop adoption utility (2026-05-30).
//
// Authority: docs/research/FIREFLY_AUTOMATION_RESEARCH_2026-05-30.md §6e + §8.
//
// Reusable replacement for the scripts/upload-backdrop.js CLI: lets server
// routes (POST /api/backdrop/ingest, future worker callbacks) upload to the
// FIXED Storage path the asset-source-resolver looks up:
//
//   product-assets/{productId}/backdrop-{skeletonId}.png
//
// Server-only: imports SUPABASE_SERVICE_ROLE_KEY. NEVER import this from a
// client component, never expose the key via NEXT_PUBLIC_*. The service-role
// key bypasses RLS by design (research §8) and must stay in server context.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'product-assets';

let _client: SupabaseClient | null = null;

function getServerClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'upload-backdrop-server: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are required',
    );
  }
  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}

/** Sanitize the skeleton id the same way the asset-source-resolver does, so
 *  the file name can never escape the product folder. */
function backdropFileName(skeletonId: string): string {
  const safe = skeletonId.replace(/[^a-zA-Z0-9-]/g, '') || 'S0';
  return `backdrop-${safe}.png`;
}

/** Fixed-name backdrop object path: product-assets/{productId}/backdrop-{Sx}.png */
export function backdropStoragePath(productId: string, skeletonId: string): string {
  return `${productId}/${backdropFileName(skeletonId)}`;
}

export interface UploadBackdropResult {
  path: string;
  publicUrl: string;
}

/**
 * Upload a PNG buffer at the fixed backdrop cache path. Uses upsert so
 * re-running the ingest pipeline overwrites the prior asset rather than
 * 409-conflicting. The resolver consumes the resulting public URL.
 */
export async function uploadBackdropServer(
  productId: string,
  skeletonId: string,
  buffer: Buffer,
): Promise<UploadBackdropResult> {
  const supabase = getServerClient();
  const path = backdropStoragePath(productId, skeletonId);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: 'image/png',
      // Phase 1 spec: upsert:true so ingest is idempotent end-to-end.
      upsert: true,
      cacheControl: '31536000',
    });
  if (error) {
    throw new Error(`uploadBackdropServer failed: ${error.message}`);
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/**
 * Cleanup helper used by integration tests / human-review rollback. Deletes
 * the backdrop object at the fixed path — does NOT touch any other asset.
 */
export async function deleteBackdropServer(
  productId: string,
  skeletonId: string,
): Promise<void> {
  const supabase = getServerClient();
  const path = backdropStoragePath(productId, skeletonId);
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    throw new Error(`deleteBackdropServer failed: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Phase 3 — staging area for async VLM gate.
//
// The asset-source-resolver only ever scans `{productId}/backdrop-*.png`, so
// a bucket-root prefix like `_staging/` is invisible to the live thumbnail
// renderer. A job's normalized PNG sits in staging while the VLM runs (out of
// the request lifecycle), then either gets moved to the fixed path (pass) or
// deleted (reject).
// ---------------------------------------------------------------------------

const STAGING_PREFIX = '_staging';

/** Per-job staging object path. jobId is a cuid (alphanumeric, path-safe). */
export function stagingStoragePath(jobId: string): string {
  const safe = jobId.replace(/[^a-zA-Z0-9-]/g, '') || 'unknown';
  return `${STAGING_PREFIX}/${safe}.png`;
}

export async function uploadStagedPng(
  jobId: string,
  buffer: Buffer,
): Promise<UploadBackdropResult> {
  const supabase = getServerClient();
  const path = stagingStoragePath(jobId);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: 'image/png',
      upsert: true,
      // Short cache: staging objects are ephemeral.
      cacheControl: '60',
    });
  if (error) {
    throw new Error(`uploadStagedPng failed: ${error.message}`);
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function downloadStagedPng(jobId: string): Promise<Buffer | null> {
  const supabase = getServerClient();
  const path = stagingStoragePath(jobId);
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteStagedPng(jobId: string): Promise<void> {
  const supabase = getServerClient();
  const path = stagingStoragePath(jobId);
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    // Best-effort: a missing staging object is not an error worth surfacing.
    // eslint-disable-next-line no-console
    console.warn('[upload-backdrop-server] staging delete warning:', error.message);
  }
}
