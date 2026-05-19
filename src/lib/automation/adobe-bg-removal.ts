// src/lib/automation/adobe-bg-removal.ts
//
// Sprint 7-M2 Step 4 — background-removal adapter for the L1 automation
// pipeline.
//
// Strategy (decided in the Step 4 hand-off):
//   1. PRIMARY  : Cloudinary `e_background_removal` URL transform. The
//                 transform is a pure URL builder (no upload), so this module
//                 stays Vercel-edge-safe and adds zero runtime credentials.
//   2. CACHE    : Record successful runs in AssetLibrary (asset_type =
//                 'auto_bg_removed') keyed by source URL. Subsequent calls
//                 for the same source URL skip the rebuild and return the
//                 cached CDN URL.
//   3. FALLBACK : When the Cloudinary cloud name env var is missing or the
//                 builder throws, return the original source URL with
//                 `degraded: true`. The L1 pipeline can still proceed; the
//                 caller decides whether to surface a warning.
//
// Adobe MCP (image_remove_background) is NOT callable from server runtime —
// it lives in the Claude Web session only. The handoff explicitly accepts
// this constraint and chose Cloudinary as the primary path. The module name
// keeps `adobe-` for the broader product positioning ("Adobe-grade asset
// pipeline") even though the runtime engine is Cloudinary.

import { prisma } from '@/lib/prisma';
import { urlCleanWhiteWithBgRemoval } from './cloudinary-pipeline';

export type BgRemovalSource = 'cloudinary' | 'cache' | 'fallback';

export interface BgRemovalResult {
  /** Final CDN/CDN-equivalent URL. Always set (falls back to sourceUrl). */
  cdnUrl: string;
  /** Where the URL came from. */
  source: BgRemovalSource;
  /** True when the primary engine failed and the caller should surface a
   *  warning to the user (e.g. retry manually later). */
  degraded: boolean;
  /** AssetLibrary row id when a new row was created or an existing one was
   *  bumped (lastUsedAt + usageCount). */
  assetLibraryId: string | null;
  /** Cost estimate in Cloudinary credits — 0 on cache hit, 1 on miss, 0 on
   *  fallback. The number is approximate; Cloudinary bills on actual
   *  transform delivery. */
  costEstimate: number;
}

export interface BgRemovalRequest {
  sourceUrl: string;
  /** Optional category tag stored on the AssetLibrary row. */
  category?: string | null;
  /** When true, skip cache lookup and force a fresh transform. Useful in
   *  doorbell verification runs. */
  skipCache?: boolean;
}

const ASSET_TYPE = 'auto_bg_removed';

function hasCloudName(): boolean {
  return !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
}

async function findCachedAsset(sourceUrl: string) {
  return prisma.assetLibrary.findFirst({
    where: {
      assetType: ASSET_TYPE,
      metadata: { path: ['sourceUrl'], equals: sourceUrl },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function bumpAssetUsage(id: string): Promise<void> {
  await prisma.assetLibrary.update({
    where: { id },
    data: {
      lastUsedAt: new Date(),
      usageCount: { increment: 1 },
    },
  });
}

async function createAssetRow(
  sourceUrl: string,
  cdnUrl: string,
  category: string | null,
): Promise<string | null> {
  try {
    const row = await prisma.assetLibrary.create({
      data: {
        assetType: ASSET_TYPE,
        category,
        storageUrl: sourceUrl,
        cdnUrl,
        metadata: { sourceUrl, engine: 'cloudinary', transform: 'e_background_removal' },
        lastUsedAt: new Date(),
        usageCount: 1,
      },
    });
    return row.id;
  } catch {
    return null;
  }
}

export async function removeBackground(req: BgRemovalRequest): Promise<BgRemovalResult> {
  const { sourceUrl, category = null, skipCache = false } = req;

  if (!sourceUrl) {
    return {
      cdnUrl: '',
      source: 'fallback',
      degraded: true,
      assetLibraryId: null,
      costEstimate: 0,
    };
  }

  if (!hasCloudName()) {
    return {
      cdnUrl: sourceUrl,
      source: 'fallback',
      degraded: true,
      assetLibraryId: null,
      costEstimate: 0,
    };
  }

  if (!skipCache) {
    const cached = await findCachedAsset(sourceUrl).catch(() => null);
    if (cached?.cdnUrl) {
      await bumpAssetUsage(cached.id).catch(() => undefined);
      return {
        cdnUrl: cached.cdnUrl,
        source: 'cache',
        degraded: false,
        assetLibraryId: cached.id,
        costEstimate: 0,
      };
    }
  }

  let cdnUrl: string;
  try {
    cdnUrl = urlCleanWhiteWithBgRemoval(sourceUrl);
  } catch {
    return {
      cdnUrl: sourceUrl,
      source: 'fallback',
      degraded: true,
      assetLibraryId: null,
      costEstimate: 0,
    };
  }

  const assetLibraryId = await createAssetRow(sourceUrl, cdnUrl, category);

  return {
    cdnUrl,
    source: 'cloudinary',
    degraded: false,
    assetLibraryId,
    costEstimate: 1,
  };
}
