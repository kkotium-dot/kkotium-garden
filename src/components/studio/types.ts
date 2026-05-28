// src/components/studio/types.ts
//
// Sprint 7-M2 Phase 3-C-1 — Studio shared types + constants.
//
// Extracted from src/app/studio/page.tsx so the same types can be reused by
// the PLANT (씨앗 심기) 7th tab in Phase 3-C-2. Refactor only — types are
// byte-identical to the originals.

// ── Skeleton ids (12 layouts from layout-skeletons) ──────────────────────

export type SkeletonIdLiteral =
  | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6'
  | 'S7' | 'S8' | 'S9' | 'S10' | 'S11' | 'S12';

export const SKELETON_IDS: SkeletonIdLiteral[] = [
  'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12',
];

// ── Thumbnail variants (4 from thumbnail-generator) ──────────────────────

export const THUMB_VARIANTS = ['clean', 'price', 'badge', 'lifestyle'] as const;
export type ThumbVariant = (typeof THUMB_VARIANTS)[number];

// ── Product list row (slim subset of Product table) ──────────────────────

export interface ProductRow {
  id: string;
  name: string;
  mainImage: string | null;
  category: string | null;
  brand: string | null;
  supplierPrice: number | null;
  aiScore: number | null;
  status: string;
  naverProductId: string | null;
}

// ── API response shapes ───────────────────────────────────────────────────

export interface DiagnosisResult {
  grade: string;
  confidenceLevel: string;
  inferenceConfidence: number;
  qualityScore: number;
  skeletonId: string;
  conceptTone: Record<string, string>;
  persisted?: boolean;
}

export interface ThumbnailOutput {
  variant: ThumbVariant;
  base64: string;
  mimeType: string;
  copy?: Record<string, string>;
}

/** Where the resolver sourced the cutout / backdrop. Mirrors AssetSource in
 *  src/lib/automation/asset-source-resolver.ts (kept as a string union here so
 *  client code never imports the server-only resolver module). */
export type AssetSourceLiteral = 'manual' | 'auto-cache' | 'fallback';

export interface ThumbnailResult {
  productId: string;
  skeletonId: string;
  matchScore: number;
  matchAmbiguous: boolean;
  elapsedMs: number;
  outputs: ThumbnailOutput[];
  /** G8-ENGINE: where the cutout + backdrop came from (UI source badge). */
  assetSource?: { cutout: AssetSourceLiteral; backdrop: AssetSourceLiteral };
  /** G8-ENGINE: non-blocking low-res warning when source <=760px long side. */
  lowResolution?: { width: number; height: number; threshold: number } | null;
}

export interface DetailResult {
  ok: boolean;
  skeletonId: string;
  matchScore: number;
  matchAmbiguous: boolean;
  detailBase64: string;
  detailWidth: number;
  detailHeight: number;
  elapsedMs: number;
  sections: Array<{
    sectionId: string;
    dedicated: boolean;
    height: number;
    offsetY: number;
    copyFiltered: boolean;
  }>;
}

export interface SaveResult {
  ok: boolean;
  thumbUrl: string | null;
  detailUrl: string | null;
  savedAt: string;
}

export interface PublishResult {
  ok: boolean;
  naverProductId: string;
  patched: { thumbnail: boolean; detail: boolean };
  publishedAt: string;
}
