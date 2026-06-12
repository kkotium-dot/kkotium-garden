// /api/products/[id]/assets
// ============================================================================
// READ-ONLY asset-location lookup. Surfaces where a product's generated /
// downloaded assets physically live in the canonical store (Supabase Storage
// `product-assets/{productId}/{stage}/`), grouped by pipeline stage, so the
// product detail panel can render a "생성 에셋 위치" section.
//
// Authority for the storage convention: docs/playbook/IMAGE_SEO_PIPELINE_PLAYBOOK.md §2.
// Wraps listProductAssets() (already stage-aware + legacy-root compatible) and
// projects every canonical stage — including empty ones — so the UI can show a
// "미적용" badge per stage. No writes, no Naver, no mutation. GET only.
// ============================================================================

import { NextResponse } from 'next/server';
import {
  listProductAssets,
  type AssetKind,
  type ProductAssetEntry,
} from '@/lib/storage/automation-storage';
import { STAGE_DIRS, STAGE_FOLDER, LEGACY_STAGE_DIRS } from '@/lib/storage/asset-taxonomy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUCKET_NAME = 'product-assets';

interface StageFile {
  name: string;
  path: string;
  publicUrl: string;
  size: number;
  createdAt: string;
}

interface StageGroup {
  /** Stage key: an AssetKind or 'root' (legacy flat uploads). */
  stage: string;
  /** Adobe CC mirror folder name (numbered workspace), null for legacy root. */
  adobeFolder: string | null;
  /** Canonical Supabase Storage path prefix for this stage. */
  storagePath: string;
  count: number;
  files: StageFile[];
}

function fileNameOf(path: string): string {
  const i = path.lastIndexOf('/');
  return i >= 0 ? path.slice(i + 1) : path;
}

function toStageFile(e: ProductAssetEntry): StageFile {
  return {
    name: fileNameOf(e.path),
    path: e.path,
    publicUrl: e.publicUrl,
    size: e.size,
    createdAt: e.createdAt,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  try {
    const entries = await listProductAssets(id);

    // Bucket entries by their reported stage.
    const byStage = new Map<string, ProductAssetEntry[]>();
    for (const e of entries) {
      const arr = byStage.get(e.stage) ?? [];
      arr.push(e);
      byStage.set(e.stage, arr);
    }

    // Project every canonical stage in pipeline order (empty stages included so
    // the UI can render a "미적용" badge), then append legacy 'root' if present.
    const stages: StageGroup[] = STAGE_DIRS.map((stage: AssetKind) => {
      const files = (byStage.get(stage) ?? []).map(toStageFile);
      return {
        stage,
        adobeFolder: STAGE_FOLDER[stage],
        storagePath: `${BUCKET_NAME}/${id}/${stage}/`,
        count: files.length,
        files,
      };
    });

    // Legacy stage folders (e.g. pre-v2 'thumb') — append only when present so
    // their stored URLs stay visible without polluting the canonical stage list.
    for (const legacy of LEGACY_STAGE_DIRS) {
      const legacyEntries = byStage.get(legacy);
      if (legacyEntries && legacyEntries.length > 0) {
        stages.push({
          stage: legacy,
          adobeFolder: null,
          storagePath: `${BUCKET_NAME}/${id}/${legacy}/`,
          count: legacyEntries.length,
          files: legacyEntries.map(toStageFile),
        });
      }
    }

    const rootEntries = byStage.get('root');
    if (rootEntries && rootEntries.length > 0) {
      stages.push({
        stage: 'root',
        adobeFolder: null,
        storagePath: `${BUCKET_NAME}/${id}/`,
        count: rootEntries.length,
        files: rootEntries.map(toStageFile),
      });
    }

    const total = entries.length;
    return NextResponse.json({
      success: true,
      productId: id,
      bucket: BUCKET_NAME,
      total,
      stages,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
