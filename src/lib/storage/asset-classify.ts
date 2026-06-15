// src/lib/storage/asset-classify.ts
// ============================================================================
// Content-aware stage classification (authority §8). The filename-only regex
// (kindForSource) knows nothing about the pixels — a generically-named export
// always fell through to 'thumbnail'. This combines the FILENAME hint with cheap
// Sharp METADATA signals (alpha, aspect ratio, resolution) to produce a stage
// recommendation plus a confidence and any quality flags.
//
// Decision (authority §8):
//   - name hint == content signal      -> high confidence
//   - name hint XOR content signal      -> medium confidence (the present one)
//   - name hint != content signal      -> conflict: surface BOTH, low confidence
//   - neither                          -> 'thumbnail' fallback, low confidence
//
// Pure function — no IO. English code; product-agnostic (#55). The metadata is
// read by the caller (upload / ingest / classify routes already run Sharp).
// ============================================================================

import { kindHintForSource } from './asset-taxonomy';
import type { AssetKind } from './automation-storage';

export type Confidence = 'high' | 'medium' | 'low';

export interface ClassifySignals {
  fileName: string;
  width?: number | null;
  height?: number | null;
  /** Sharp metadata.hasAlpha — channel PRESENCE only, not real transparency. */
  hasAlpha?: boolean | null;
  /** Sharp metadata.channels (4 = RGBA). */
  channels?: number | null;
  /**
   * Sharp stats().isOpaque — true when the alpha channel is fully opaque.
   * Canvas / Firefly / design-tool PNGs are RGBA yet opaque, so the alpha
   * CHANNEL existing (hasAlpha) is NOT a cutout signal; only genuinely
   * transparent pixels (isOpaque === false) are. Null when not computed.
   */
  isOpaque?: boolean | null;
}

export interface ClassifyResult {
  /** The recommended stage. */
  stage: AssetKind;
  confidence: Confidence;
  /** Non-fatal quality warnings, e.g. 'low_resolution'. */
  qualityFlags: string[];
  /** Stage implied by the filename, or null when the name has no hint. */
  nameStage: AssetKind | null;
  /** Stage implied by the pixel signals, or null when nothing resolved. */
  contentStage: AssetKind | null;
  /** True when name and content disagree (operator confirmation urged). */
  conflict: boolean;
  /**
   * True only when the image has genuinely transparent pixels (the real cutout
   * signal). False for opaque images including opaque RGBA. Surfaced so the UI
   * chip can show WHY 'cutout' was or was not the content signal.
   */
  hasTransparency: boolean;
}

// Aspect-ratio bands (width / height).
const SQUARE_LO = 0.95;
const SQUARE_HI = 1.05;
const VERTICAL_45_LO = 0.74; // 4:5 = 0.80, allow a little slack
const VERTICAL_45_HI = 0.86;
const TALL_STRIP_MAX = 0.4; // h:w >= 2.5  ->  w/h <= 0.4
const LOW_RES_LONG_EDGE = 800; // longest edge below this is flagged low-res

/**
 * Real transparency = an alpha channel exists AND at least one pixel is actually
 * transparent (Sharp stats().isOpaque === false). Channel presence alone is NOT
 * transparency — opaque RGBA exports (canvas / Firefly / design tools) carry an
 * alpha channel but no transparent pixels. When isOpaque is unknown (null), we
 * do NOT assume a cutout — falling back to the ratio signal is the safe default.
 */
function hasTransparencyFromSignals(s: ClassifySignals): boolean {
  const hasAlphaChannel = s.hasAlpha === true || s.channels === 4;
  return hasAlphaChannel && s.isOpaque === false;
}

/** Derive a stage purely from pixel signals, or null when nothing resolves. */
function contentStageFromSignals(s: ClassifySignals): AssetKind | null {
  // Genuine transparency is the strongest single signal — but opaque RGBA must
  // fall through to the ratio bands, not mis-route to 'cutout' (the bug fix).
  if (hasTransparencyFromSignals(s)) return 'cutout';

  const w = s.width ?? 0;
  const h = s.height ?? 0;
  if (w < 1 || h < 1) return null;
  const ratio = w / h;

  if (ratio <= TALL_STRIP_MAX) return 'detail'; // tall strip = detail section
  if (ratio >= SQUARE_LO && ratio <= SQUARE_HI) return 'thumbnail'; // square = representative
  if (ratio >= VERTICAL_45_LO && ratio <= VERTICAL_45_HI) return 'composite'; // 4:5 vertical scene
  return null; // an in-between ratio gives no confident content signal
}

function qualityFlagsFor(s: ClassifySignals): string[] {
  const flags: string[] = [];
  const w = s.width ?? 0;
  const h = s.height ?? 0;
  if (w > 0 && h > 0 && Math.max(w, h) < LOW_RES_LONG_EDGE) flags.push('low_resolution');
  return flags;
}

export function classifyAsset(s: ClassifySignals): ClassifyResult {
  const nameStage = kindHintForSource(s.fileName);
  const contentStage = contentStageFromSignals(s);
  const qualityFlags = qualityFlagsFor(s);

  let stage: AssetKind;
  let confidence: Confidence;
  let conflict = false;

  if (nameStage && contentStage) {
    if (nameStage === contentStage) {
      stage = nameStage;
      confidence = 'high';
    } else {
      // Conflict — respect the explicit name for the default, but flag it low so
      // the UI surfaces both and urges confirmation.
      stage = nameStage;
      confidence = 'low';
      conflict = true;
    }
  } else if (nameStage) {
    stage = nameStage;
    confidence = 'medium';
  } else if (contentStage) {
    // The improvement over the old unconditional 'thumbnail' default.
    stage = contentStage;
    confidence = 'medium';
  } else {
    stage = 'thumbnail';
    confidence = 'low';
  }

  return {
    stage,
    confidence,
    qualityFlags,
    nameStage,
    contentStage,
    conflict,
    hasTransparency: hasTransparencyFromSignals(s),
  };
}
