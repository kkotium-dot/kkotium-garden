// src/lib/automation/asset-source-resolver.ts
//
// Sprint 7-M2 Phase G8-ENGINE — Source Priority Resolver.
//
// Decides which cutout (background-removed product PNG) and which backdrop
// (lifestyle background) the thumbnail generator should composite, per the
// design line proven in HANDOFF_g8_engine_design_line_proven_2026-05-28.md.
//
// This module is a *pure decision* layer — it never composites images and
// never calls an external image API at runtime (workflow principle #38).
// It only checks Supabase Storage for designer-deposited override assets and
// returns URLs. The actual Sharp composition stays in thumbnail-generator.ts.
//
// Source priority (highest first):
//   1. manual    — a designer-supplied override URL (B layer, designer veto)
//   2. auto-cache — a fixed-name asset deposited in Storage by the offline
//                   Adobe/Firefly pipeline (product-assets/{id}/cutout.png,
//                   /backdrop-{skeletonId}.png)
//   3. fallback   — null: the generator degrades to fitImage(sourceImageUrl)
//                   for the cutout, and a brand-color backdrop for lifestyle
//
// Adobe MCP (image_remove_background, Firefly) only runs in the Desktop
// session and only accepts Adobe-CC presignedAssetUrls, so production never
// generates these assets on the fly — it consumes the Storage cache the
// Desktop pipeline deposits.

import { findCachedAsset } from '@/lib/storage/automation-storage';

/** Where a resolved asset URL came from. Used for UI source badges. */
export type AssetSource = 'manual' | 'auto-cache' | 'fallback';

export interface ResolveAssetSourcesInput {
  /** Product.id — used as the Storage folder name. */
  productId: string;
  /** Matched/overridden skeleton id (S1..S12) — keys the backdrop cache. */
  skeletonId: string;
  /** Designer-supplied cutout override URL (highest priority). */
  manualCutoutUrl?: string | null;
  /** Designer-supplied backdrop override URL (highest priority). */
  manualBackdropUrl?: string | null;
}

export interface ResolvedAssetSources {
  /** Transparent product cutout PNG, or null to fall back to fitImage. */
  cutoutUrl: string | null;
  /** Lifestyle backdrop image, or null to fall back to brand color. */
  backdropUrl: string | null;
  cutoutSource: AssetSource;
  backdropSource: AssetSource;
}

const CUTOUT_FILE = 'cutout.png';

/** Fixed cache file name for the per-skeleton backdrop. Sanitize the skeleton
 *  id so it can never escape the product folder. */
function backdropFileName(skeletonId: string): string {
  const safe = skeletonId.replace(/[^a-zA-Z0-9-]/g, '') || 'S0';
  return `backdrop-${safe}.png`;
}

function nonEmpty(s: string | null | undefined): string | null {
  return typeof s === 'string' && s.trim().length > 0 ? s.trim() : null;
}

/**
 * Resolve cutout + backdrop URLs for a product/variant using the manual >
 * auto-cache > fallback priority. Never throws — Storage lookups degrade to
 * null so a thumbnail render is never blocked by a missing override.
 */
export async function resolveAssetSources(
  input: ResolveAssetSourcesInput,
): Promise<ResolvedAssetSources> {
  // ── Cutout ────────────────────────────────────────────────────────────
  let cutoutUrl: string | null = null;
  let cutoutSource: AssetSource = 'fallback';
  const manualCutout = nonEmpty(input.manualCutoutUrl);
  if (manualCutout) {
    cutoutUrl = manualCutout;
    cutoutSource = 'manual';
  } else {
    const cached = await findCachedAsset(input.productId, CUTOUT_FILE);
    if (cached) {
      cutoutUrl = cached;
      cutoutSource = 'auto-cache';
    }
  }

  // ── Backdrop (lifestyle) ──────────────────────────────────────────────
  let backdropUrl: string | null = null;
  let backdropSource: AssetSource = 'fallback';
  const manualBackdrop = nonEmpty(input.manualBackdropUrl);
  if (manualBackdrop) {
    backdropUrl = manualBackdrop;
    backdropSource = 'manual';
  } else {
    const cached = await findCachedAsset(input.productId, backdropFileName(input.skeletonId));
    if (cached) {
      backdropUrl = cached;
      backdropSource = 'auto-cache';
    }
  }

  return { cutoutUrl, backdropUrl, cutoutSource, backdropSource };
}
