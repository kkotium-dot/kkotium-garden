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

/** kind -> mirrored Adobe CC folder name (numbered workspace, 1:1 with stages). */
export const STAGE_FOLDER: Record<AssetKind, string> = {
  cutout: '01_cutout',
  composite: '02_composite',
  thumb: '03_thumbnail',
  detail: '04_detail',
  archive: '99_archive',
};

/** The stage subfolders under {productId}/ (also used by listProductAssets). */
export const STAGE_DIRS: readonly AssetKind[] = [
  'cutout', 'composite', 'thumb', 'detail', 'archive',
];

// Source-label -> stage rules (first match wins). Lets a recovery route classify
// an asset automatically from its source/variant label.
const SOURCE_KIND_RULES: ReadonlyArray<{ test: RegExp; kind: AssetKind }> = [
  { test: /cutout|whitefront|nukki|transparent|remove[_-]?bg|knockout/i, kind: 'cutout' },
  { test: /composite|mood|newbg|new[_-]?bg|firefly|lifestyle|scene|carleather/i, kind: 'composite' },
  { test: /archive|old|prev|backup|reject|deprecated/i, kind: 'archive' },
  { test: /detail|section|hero|notice|story/i, kind: 'detail' },
  { test: /thumb|crop|whitebg|white[_-]?bg|represent|main/i, kind: 'thumb' },
];

/** Infer the stage AssetKind from a free-form source label (default 'thumb'). */
export function kindForSource(source: string): AssetKind {
  const s = source ?? '';
  for (const r of SOURCE_KIND_RULES) {
    if (r.test.test(s)) return r.kind;
  }
  return 'thumb'; // representative-candidate is the safe default
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
