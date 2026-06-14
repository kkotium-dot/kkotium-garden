// src/lib/images/slot-ratio.ts
// ============================================================================
// Slot aspect-ratio normalization (Sharp, Node runtime only). The pipeline-time
// half of the 2-layer ratio defense (authority §1): edit-mode generation has no
// aspect-ratio UI control, so whatever ratio Firefly/Nano-Banana emits must LAND
// at the slot ratio here before the asset is stored/used. Scent scene -> 4:5,
// representative -> 1:1 (ratios from src/lib/config/image-slot-matrix.ts).
//
// Pure Buffer transform — no DB, no Naver, no storage. A route consuming this
// MUST `export const runtime = 'nodejs'` (Sharp needs it). Conformant inputs
// (already within tolerance of the target ratio) pass through UNCHANGED, so this
// is a gate that corrects only off-ratio assets — never a blanket re-encode.
// ============================================================================

import sharp from 'sharp';
import { type AspectRatio, ratioValue, type NormalizePolicy } from '@/lib/config/image-slot-matrix';

const WHITE = { r: 255, g: 255, b: 255 } as const;

export interface SlotRatioResult {
  /** The conformed buffer (or the original when no change was needed). */
  buffer: Buffer;
  /** True when the pixels were actually re-framed. */
  changed: boolean;
  /** Input ratio (w/h), or null when dimensions were unreadable. */
  fromRatio: number | null;
  /** Target ratio (w/h). */
  toRatio: number;
  width: number | null;
  height: number | null;
  /** Effective content type of `buffer` (the contain-white path may flip a
   *  PNG to JPEG since the padded result is opaque). Equals the input type when
   *  unchanged. Callers use this for the stored object extension. */
  contentType: string;
}

function encode(pipeline: sharp.Sharp, contentType: string): sharp.Sharp {
  // Preserve PNG (keeps any alpha for the cover path); everything else -> JPEG.
  return contentType === 'image/png'
    ? pipeline.png()
    : pipeline.jpeg({ quality: 86, mozjpeg: true });
}

/**
 * Conform an image buffer to a slot aspect ratio.
 *
 *  - 'sharp_cover'         crop-to-ratio keeping the salient region (scene /
 *                          composite); no flatten, alpha preserved for PNG.
 *  - 'sharp_contain_white' pad-to-ratio onto a white canvas (representative
 *                          cutout) — nothing is cropped off the product.
 *
 * Any other policy (transparent_png / detail_width / original) is a pass-through
 * (returns the input unchanged) — ratio is normalized elsewhere or not at all.
 *
 * `tolerance` (default 0.02 = 2%) lets an already-conformant ratio pass without
 * a re-encode, so Firefly outputs that are already 4:5 stay byte-identical.
 */
export async function conformToSlotRatio(
  input: Buffer,
  ratio: AspectRatio,
  opts: { policy: NormalizePolicy; contentType?: string; tolerance?: number },
): Promise<SlotRatioResult> {
  const target = ratioValue(ratio);
  const contentType = opts.contentType ?? 'image/png';
  const tolerance = opts.tolerance ?? 0.02;

  // Only the two Sharp ratio policies re-frame; others pass through untouched.
  if (opts.policy !== 'sharp_cover' && opts.policy !== 'sharp_contain_white') {
    return { buffer: input, changed: false, fromRatio: null, toRatio: target, width: null, height: null, contentType };
  }

  let iw = 0;
  let ih = 0;
  try {
    const meta = await sharp(input).metadata();
    iw = meta.width ?? 0;
    ih = meta.height ?? 0;
  } catch {
    // Unreadable metadata — never fail the caller; pass the input through.
    return { buffer: input, changed: false, fromRatio: null, toRatio: target, width: null, height: null, contentType };
  }
  if (iw < 8 || ih < 8) {
    return { buffer: input, changed: false, fromRatio: iw && ih ? iw / ih : null, toRatio: target, width: iw || null, height: ih || null, contentType };
  }

  const cur = iw / ih;
  if (Math.abs(cur - target) / target <= tolerance) {
    // Already conformant — return as-is (no re-encode).
    return { buffer: input, changed: false, fromRatio: cur, toRatio: target, width: iw, height: ih, contentType };
  }

  if (opts.policy === 'sharp_cover') {
    // Largest target-ratio box that FITS INSIDE the input (crop, no enlarge).
    let outW = iw;
    let outH = Math.round(iw / target);
    if (outH > ih) {
      outH = ih;
      outW = Math.round(ih * target);
    }
    const buffer = await encode(
      sharp(input).resize(outW, outH, { fit: 'cover', position: sharp.strategy.attention }),
      contentType,
    ).toBuffer();
    // cover keeps the input encoding (png stays png; anything else -> jpeg).
    const outType = contentType === 'image/png' ? 'image/png' : 'image/jpeg';
    return { buffer, changed: true, fromRatio: cur, toRatio: target, width: outW, height: outH, contentType: outType };
  }

  // sharp_contain_white — smallest target-ratio box that CONTAINS the input,
  // padded onto white (nothing cropped off the product). The padded result is
  // opaque, so a PNG input is emitted as JPEG.
  let outW = iw;
  let outH = Math.round(iw / target);
  if (outH < ih) {
    outH = ih;
    outW = Math.round(ih * target);
  }
  const outType = contentType === 'image/png' ? 'image/jpeg' : contentType;
  const buffer = await encode(
    sharp(input)
      .flatten({ background: WHITE })
      .resize(outW, outH, { fit: 'contain', background: WHITE }),
    outType,
  ).toBuffer();
  return { buffer, changed: true, fromRatio: cur, toRatio: target, width: outW, height: outH, contentType: outType };
}
