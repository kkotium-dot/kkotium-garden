// src/lib/storage/asset-taxonomy.ts
// ============================================================================
// Asset folder taxonomy — stage-based classification for product-assets.
// Authority: docs/plan/ASSET_FOLDER_TAXONOMY_BUILD.md + workrule #57.
//
// The Supabase storage path uses the AssetKind directly as a stage folder
// ({productId}/{kind}/{variant}-{ts}.png). STAGE_FOLDER maps each kind to the
// MIRRORED Adobe CC folder name (numbered, for the operator's workspace) — a
// separate concern from the storage path. kindForSource infers the stage from a
// free-form source label so a recovery route (apply-cutout / apply-composite)
// can self-classify (#57). Pure constants + string helpers — no IO.
// ============================================================================

import type { AssetKind } from './automation-storage';

/** kind -> mirrored Adobe CC folder name (numbered workspace). Existing numbers
 *  are kept stable (they match the operator's live Adobe folders); plate /
 *  reference are appended with new non-colliding numbers. */
export const STAGE_FOLDER: Record<AssetKind, string> = {
  source: '00_source',
  cutout: '01_cutout',
  composite: '02_composite',
  thumbnail: '03_thumbnail',
  detail: '04_detail',
  archive: '99_archive',
  plate: '05_plate',
  reference: '06_reference',
};

/** The stage subfolders under {productId}/ (also used by listProductAssets).
 *  Ordered by pipeline stage. v2 (2026-06-12) adds plate + reference and renames
 *  thumb -> thumbnail. */
export const STAGE_DIRS: readonly AssetKind[] = [
  'source', 'cutout', 'plate', 'reference', 'composite', 'thumbnail', 'detail', 'archive',
];

/** Legacy stage folder names still READ for backward compatibility (their stored
 *  URLs stay valid) but never written to. `thumb` is the pre-v2 thumbnail key. */
export const LEGACY_STAGE_DIRS: readonly string[] = ['thumb'];

// Source-label -> stage rules (first match wins). Lets a recovery route classify
// an asset automatically from its source/variant label.
//
// Order matters (first match wins). Two corrections from the 2026-06-14 backfill
// audit (authority ADAPTIVE_IMAGE_ENGINE_AND_FOLDER_SYSTEM_2026-06-14.md §7,
// operator GO decisions A/B):
//   A) 'backdrop' is added to the plate rule. A backdrop (the asset-source-
//      resolver loads backdrop-{skeletonId}.png as a COMPOSITE INPUT background)
//      is semantically a clean background plate, not a finished composite.
//   B) The archive rule is moved AHEAD of composite/detail/thumbnail so a
//      retire marker wins over a content marker: 'composite-old.png' classifies
//      as archive (retire intent), not composite (content). cutout / reference /
//      plate stay ahead of archive (a live working asset keeps its stage).
const SOURCE_KIND_RULES: ReadonlyArray<{ test: RegExp; kind: AssetKind }> = [
  { test: /cutout|whitefront|nukki|transparent|remove[_-]?bg|knockout/i, kind: 'cutout' },
  { test: /reference|ref[_-]?slot|ref[_-]?drop|refcut/i, kind: 'reference' },
  { test: /plate|backplate|back[_-]?plate|backdrop|turntable|clean[_-]?plate/i, kind: 'plate' },
  { test: /archive|old|prev|backup|reject|deprecated/i, kind: 'archive' },
  { test: /composite|mood|newbg|new[_-]?bg|firefly|lifestyle|scene|carleather/i, kind: 'composite' },
  { test: /detail|section|hero|notice|story/i, kind: 'detail' },
  { test: /thumb|thumbnail|crop|whitebg|white[_-]?bg|represent|main/i, kind: 'thumbnail' },
];

/** Infer the stage AssetKind from a free-form source label (default 'thumbnail'). */
export function kindForSource(source: string): AssetKind {
  const s = source ?? '';
  for (const r of SOURCE_KIND_RULES) {
    if (r.test.test(s)) return r.kind;
  }
  return 'thumbnail'; // representative-candidate is the safe default
}

/** Adobe CC mirror folder name for a kind. */
export function stageFolderFor(kind: AssetKind): string {
  return STAGE_FOLDER[kind];
}

/**
 * Sanitize a free-form (possibly non-ASCII) label into a storage-path-safe
 * variant token. Falls back to `fallback` when nothing usable remains.
 */
export function safeVariant(label: string | null | undefined, fallback: string): string {
  const slug = (label ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || fallback;
}
