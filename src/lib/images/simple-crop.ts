// src/lib/images/simple-crop.ts
// ============================================================================
// SIMPLE-mode thumbnail crop. Phase 3, handoff task 5.
// Authority: docs/research/KKOTIUM_ADAPTIVE_SEO_IMAGE_SYSTEM_2026-06-06.md §4 +
//   HANDOFF_session_2026-06-06_3_simple_mode_correction.md.
//
// NOTE: SIMPLE mode = crop a thumbnail region OUT of the supplier detail-page image.
//   NO cutout, NO compositing. Pick a 1:1 region (operator box OR sharp's native
//   attention/entropy saliency), normalize to 1000px, run an OCR policy guard.
//
// Why sharp-native strategy instead of smartcrop-sharp: sharp already exposes
//   position: sharp.strategy.attention | entropy for a saliency 1:1 cover-crop —
//   same result with zero extra runtime dependency (serverless-safe, #38).
//
// Pure Buffer transforms + OCR. No DB, no Naver. Node runtime (sharp + tesseract).
// ============================================================================

import sharp from 'sharp';
import { ocrFullFrame } from '../diagnosis/p-filter-watermark';

export const NAVER_THUMB_SIZE = 1000;          // px, 1:1 representative
export const MIN_SOURCE_FOR_THUMB = 1000;      // long side floor → upscale-blur warning

export type CropStrategy = 'attention' | 'entropy';

export interface CropBox { x: number; y: number; width: number; height: number; }
export interface CropWarning { code: 'SOURCE_TOO_SMALL' | 'LOW_RESOLUTION' | 'TEXT_DETECTED'; message: string; }

export interface SimpleCropResult {
  buffer: Buffer;
  region: CropBox;                 // the square region actually used (source px)
  source: { width: number; height: number };
  cropSidePx: number;              // square side before the 1000px resize
  upscaled: boolean;               // true when the region was smaller than 1000px
  ocrText: string | null;          // text the OCR guard found (null = none)
  warnings: CropWarning[];
}

interface SimpleCropOptions {
  box?: CropBox;                   // operator-drawn region (wins over saliency)
  strategy?: CropStrategy;         // saliency strategy when no box (default attention)
  ocr?: boolean;                   // run the OCR policy guard (default true)
}

/** Clamp an operator box to the image bounds and square it (min side). */
function squareWithin(box: CropBox, sw: number, sh: number): CropBox {
  const x = Math.max(0, Math.min(Math.round(box.x), sw - 1));
  const y = Math.max(0, Math.min(Math.round(box.y), sh - 1));
  const maxW = sw - x;
  const maxH = sh - y;
  const side = Math.max(1, Math.min(Math.round(box.width), Math.round(box.height), maxW, maxH));
  return { x, y, width: side, height: side };
}

/**
 * Crop a 1:1 thumbnail from a detail-page image and normalize to 1000px JPEG.
 * No cutout / no compositing. Warns on low-resolution sources (e.g. a 437px
 * gallery shot upscales to a blurry thumbnail) and on any OCR-detected text
 * (representative images must be text-free, Naver 2024-10-28).
 */
export async function simpleCrop(
  input: Buffer,
  opts: SimpleCropOptions = {},
): Promise<SimpleCropResult> {
  const warnings: CropWarning[] = [];
  const meta = await sharp(input).metadata();
  const sw = meta.width ?? 0;
  const sh = meta.height ?? 0;

  if (Math.max(sw, sh) < MIN_SOURCE_FOR_THUMB) {
    warnings.push({
      code: 'SOURCE_TOO_SMALL',
      message: `source long side ${Math.max(sw, sh)}px is below ${MIN_SOURCE_FOR_THUMB}px (e.g. a 437px gallery shot) — thumbnail will upscale-blur; obtain a higher-resolution detail image`,
    });
  }

  // Determine the square region + crop it.
  let region: CropBox;
  let cropped: Buffer;
  if (opts.box) {
    region = squareWithin(opts.box, sw, sh);
    cropped = await sharp(input)
      .extract({ left: region.x, top: region.y, width: region.width, height: region.height })
      .resize(NAVER_THUMB_SIZE, NAVER_THUMB_SIZE, { fit: 'cover' })
      .toColorspace('srgb')
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
  } else {
    // Saliency 1:1 cover-crop via sharp's native strategy. The square side used
    // is the source's shorter dimension.
    const side = Math.min(sw, sh);
    const pos = opts.strategy === 'entropy' ? sharp.strategy.entropy : sharp.strategy.attention;
    region = { x: 0, y: 0, width: side, height: side }; // exact offset is internal to sharp
    cropped = await sharp(input)
      .resize(NAVER_THUMB_SIZE, NAVER_THUMB_SIZE, { fit: 'cover', position: pos })
      .toColorspace('srgb')
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
  }

  const cropSidePx = Math.min(region.width, region.height);
  const upscaled = cropSidePx < NAVER_THUMB_SIZE;
  if (upscaled) {
    warnings.push({
      code: 'LOW_RESOLUTION',
      message: `crop region ${cropSidePx}px is below ${NAVER_THUMB_SIZE}px — upscaled (some blur)`,
    });
  }

  // OCR policy guard: representative crop must be text-free.
  let ocrText: string | null = null;
  if (opts.ocr !== false) {
    const ocr = await ocrFullFrame(cropped, {});
    if (ocr.hasText) {
      ocrText = ocr.text;
      warnings.push({
        code: 'TEXT_DETECTED',
        message: `OCR detected text in the crop ("${ocr.text.slice(0, 40)}") — representative images must be text-free (Naver 2024-10-28); pick a text-free region`,
      });
    }
  }

  return { buffer: cropped, region, source: { width: sw, height: sh }, cropSidePx, upscaled, ocrText, warnings };
}
