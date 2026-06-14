// src/lib/config/image-slot-matrix.ts
// ============================================================================
// Adaptive generation settings matrix (authority
// docs/playbook/ADAPTIVE_IMAGE_ENGINE_AND_FOLDER_SYSTEM_2026-06-14.md §2).
//
// Per-slot DEFAULTS for the generation surface, model, Google-search grounding,
// and the target aspect ratio the pipeline normalizer enforces. Encoding these
// as app config (instead of re-deciding per cut) is itself the natural
// intervention point (#56): the operator sees the defaults and can override.
//
// Pure constants — no IO, no Korean string literals (rule 3-1), product-agnostic
// (#55). The ratio constants here are the single source of truth consumed by the
// Sharp slot-ratio normalizer (src/lib/images/slot-ratio.ts) and the asset
// intake routes (upload / ingest-firefly).
// ============================================================================

import type { AssetKind } from '@/lib/storage/automation-storage';

/** Aspect ratio as a w:h pair. value() returns w/h. */
export interface AspectRatio {
  readonly w: number;
  readonly h: number;
}

/** Scent-scene / vertical-scene slot ratio (authority §2: scent scene -> 4:5). */
export const RATIO_SCENT_SCENE: AspectRatio = { w: 4, h: 5 };
/** Representative / thumbnail slot ratio (authority §2: thumbnail/main -> 1:1). */
export const RATIO_REPRESENTATIVE: AspectRatio = { w: 1, h: 1 };

export function ratioValue(r: AspectRatio): number {
  return r.w / r.h;
}

/** Where the image is produced. */
export type GenerationSurface =
  | 'edit_mode' // Gemini / Nano Banana Pro edit-mode canvas
  | 'adobe_remove_bg' // Adobe MCP remove-background (cutout)
  | 'composite_crop' // in-app Sharp crop of a composite/source
  | 'none'; // authentic art — real public-domain work, no generation

/** Generation model (edit-mode surface only). */
export type GenerationModel = 'nano_banana_pro' | 'none';

/** How the pipeline normalizer conforms the asset before storage/use (§1). */
export type NormalizePolicy =
  | 'sharp_cover' // crop-to-ratio, keep full-bleed (scene/composite)
  | 'sharp_contain_white' // pad-to-ratio onto white (representative cutout)
  | 'transparent_png' // keep transparent cutout, no ratio change
  | 'detail_width' // 860px-width detail segmentation (separate normalizer)
  | 'original'; // leave untouched (authentic art)

/** The image-kind a slot represents (distinct from the storage AssetKind). */
export type ImageSlotKind =
  | 'scent_scene'
  | 'hero'
  | 'lifestyle'
  | 'composite'
  | 'cutout'
  | 'representative'
  | 'authentic_art';

export interface SlotMatrixEntry {
  readonly surface: GenerationSurface;
  readonly model: GenerationModel;
  /** Google-search grounding ON for new photoreal scenes where real-object
   *  fidelity matters (#71); OFF for composites of an existing cutout. */
  readonly googleSearch: boolean;
  /** Ratio the normalizer enforces, or null when ratio is not normalized. */
  readonly targetRatio: AspectRatio | null;
  readonly normalize: NormalizePolicy;
}

// hero / lifestyle / composite are vertical SCENE slots; the authority §2 marks
// their ratio as "slot" (slot-dependent). The vertical-scene default is 4:5
// (same as scent scene) — the operator can override per slot at intake.
export const IMAGE_SLOT_MATRIX: Record<ImageSlotKind, SlotMatrixEntry> = {
  scent_scene: {
    surface: 'edit_mode',
    model: 'nano_banana_pro',
    googleSearch: true,
    targetRatio: RATIO_SCENT_SCENE,
    normalize: 'sharp_cover',
  },
  hero: {
    surface: 'edit_mode',
    model: 'nano_banana_pro',
    googleSearch: true,
    targetRatio: RATIO_SCENT_SCENE,
    normalize: 'sharp_cover',
  },
  lifestyle: {
    surface: 'edit_mode',
    model: 'nano_banana_pro',
    googleSearch: true,
    targetRatio: RATIO_SCENT_SCENE,
    normalize: 'sharp_cover',
  },
  composite: {
    surface: 'edit_mode',
    model: 'nano_banana_pro',
    googleSearch: false, // existing-cutout composite — block external reference inflow
    targetRatio: RATIO_SCENT_SCENE,
    normalize: 'sharp_cover',
  },
  cutout: {
    surface: 'adobe_remove_bg',
    model: 'none',
    googleSearch: false,
    targetRatio: null,
    normalize: 'transparent_png',
  },
  representative: {
    surface: 'composite_crop',
    model: 'none',
    googleSearch: false,
    targetRatio: RATIO_REPRESENTATIVE,
    normalize: 'sharp_contain_white',
  },
  authentic_art: {
    surface: 'none',
    model: 'none',
    googleSearch: false,
    targetRatio: null,
    normalize: 'original',
  },
};

// Map a storage stage (AssetKind) -> the ratio-controlled slot kind that the
// intake normalizer should apply. Only the two stages with a deterministic slot
// ratio are listed; every other stage (source / cutout / plate / reference /
// detail / archive) passes through with NO ratio normalization at intake.
const STAGE_TO_RATIO_SLOT: Partial<Record<AssetKind, ImageSlotKind>> = {
  composite: 'composite',
  thumbnail: 'representative',
};

/** The ratio-normalization slot for a storage stage, or null when the stage is
 *  not ratio-normalized at intake (e.g. transparent cutout, variable-height
 *  detail, raw source). */
export function ratioSlotForStage(stage: AssetKind): SlotMatrixEntry | null {
  const slot = STAGE_TO_RATIO_SLOT[stage];
  return slot ? IMAGE_SLOT_MATRIX[slot] : null;
}
