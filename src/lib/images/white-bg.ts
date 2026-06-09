// src/lib/images/white-bg.ts
// ============================================================================
// In-app SIMPLE white-background finisher (C-1).
// Authority: docs/design/REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md §3 / §6.
//
// For a source that already sits on a light/neutral background (bg-difficulty
// SIMPLE), produce a Naver-compliant representative WITHOUT any AI segmentation:
//   1. flatten transparency onto white
//   2. trim a uniform border (optional) so the product centers evenly
//   3. CONTAIN the whole product inside a white 1:1 1000px canvas + margin
//      -> corners are guaranteed white (passes the seo-guard white-bg pixel
//         check) and the product is never clipped.
//
// Guards are SHARED with the crop tool (§6): the CropWarning type +
// OCR-text guard (ocrFullFrame) + resolution floor (MIN_SOURCE_FOR_THUMB) +
// the white-bg pixel re-check (naver-normalize.assertWhiteBackground). True
// segmentation of a NON-white background is COMPLEX (Adobe, route C-2) — flagged
// here via BACKGROUND_NOT_WHITE rather than faked (#46).
//
// Pure Buffer transforms + OCR. No DB, no Naver. Node runtime (sharp + tesseract).
// ============================================================================

import sharp from 'sharp';
import { ocrFullFrame } from '../diagnosis/p-filter-watermark';
import { assertWhiteBackground, RepresentativePolicyError } from './naver-normalize';
import { CANVAS_EXPAND, TEXT_REMOVE, BG_CLEAN } from '../jobs/job-type-routing';
import { type CropWarning, MIN_SOURCE_FOR_THUMB, NAVER_THUMB_SIZE } from './simple-crop';

export const NAVER_WHITEBG_SIZE = NAVER_THUMB_SIZE; // 1000px, 1:1 representative

const WHITE = { r: 255, g: 255, b: 255 };
const DEFAULT_MARGIN = 0.06; // white padding fraction around the contained product
const MIN_TRIM_SIDE = 16;    // reject a degenerate trim result

export interface WhiteBgResult {
  buffer: Buffer;
  source: { width: number; height: number };
  outputSize: number;        // 1000
  trimmed: boolean;          // a uniform border was trimmed before padding
  ocrText: string | null;    // text the OCR guard found (null = none)
  whiteBgVerified: boolean;  // output corners passed the white-bg pixel re-check
  warnings: CropWarning[];
}

export interface WhiteBgOptions {
  ocr?: boolean;     // run the OCR policy guard (default true)
  trim?: boolean;    // trim a uniform border before padding (default true)
  margin?: number;   // white padding fraction (default 0.06)
}

/**
 * Finish a representative image as a white-background 1:1 1000px JPEG by
 * flattening + containing on white (NO segmentation). Warns on low-resolution
 * sources, OCR-detected text (block), and a non-white result background (the
 * source needs a real Adobe cutout — COMPLEX).
 */
export async function whiteBgFinish(
  input: Buffer,
  opts: WhiteBgOptions = {},
): Promise<WhiteBgResult> {
  const warnings: CropWarning[] = [];
  const size = NAVER_WHITEBG_SIZE;
  const margin = opts.margin ?? DEFAULT_MARGIN;

  const meta = await sharp(input).metadata();
  const sw = meta.width ?? 0;
  const sh = meta.height ?? 0;

  if (Math.max(sw, sh) < MIN_SOURCE_FOR_THUMB) {
    warnings.push({
      code: 'SOURCE_TOO_SMALL',
      severity: 'warn',
      remediation: CANVAS_EXPAND,
      message: `source long side ${Math.max(sw, sh)}px is below ${MIN_SOURCE_FOR_THUMB}px — the white-bg representative will upscale-blur; use a higher-resolution source or 1:1 canvas-expand`,
    });
  }

  // 1) flatten transparency onto white.
  let working = await sharp(input).flatten({ background: WHITE }).png().toBuffer();

  // 2) optional trim of a uniform (white) border so the product centers evenly.
  let trimmed = false;
  if (opts.trim !== false) {
    try {
      const t = await sharp(working).trim().toBuffer({ resolveWithObject: true });
      if (t.info.width >= MIN_TRIM_SIDE && t.info.height >= MIN_TRIM_SIDE) {
        working = t.data;
        trimmed = true;
      }
    } catch {
      // no uniform border to trim — keep the flattened buffer.
    }
  }

  // 3) contain the product inside a white 1:1 canvas with margin padding.
  const inner = Math.max(1, Math.round(size * (1 - 2 * margin)));
  const pad = Math.round((size - inner) / 2);
  const out = await sharp(working)
    .resize(inner, inner, { fit: 'contain', background: WHITE })
    .extend({ top: pad, bottom: size - inner - pad, left: pad, right: size - inner - pad, background: WHITE })
    .flatten({ background: WHITE })
    .toColorspace('srgb')
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  // 4) OCR policy guard — representative must be text-free (Naver 2024-10-28).
  let ocrText: string | null = null;
  if (opts.ocr !== false) {
    const ocr = await ocrFullFrame(out, {});
    if (ocr.hasText) {
      ocrText = ocr.text;
      warnings.push({
        code: 'TEXT_DETECTED',
        severity: 'block',
        remediation: TEXT_REMOVE,
        message: `OCR detected text ("${ocr.text.slice(0, 40)}") in the white-bg result — representative images must be text-free (Naver 2024-10-28); use a text-free source or run text-remove (inpaint)`,
      });
    }
  }

  // 5) white-bg pixel re-check (self-validation). Padding makes the corners
  //    white, so a failure means the source had a non-white background that a
  //    plain flatten cannot remove — route to an Adobe cutout (bg_clean).
  let whiteBgVerified = true;
  try {
    await assertWhiteBackground(out);
  } catch (e) {
    if (e instanceof RepresentativePolicyError && e.reason === 'BACKGROUND_NOT_WHITE') {
      whiteBgVerified = false;
      warnings.push({
        code: 'BACKGROUND_NOT_WHITE',
        severity: 'warn',
        remediation: BG_CLEAN,
        message: 'result background is not uniformly white — the source has a non-white background that in-app flatten cannot remove; route to an Adobe cutout (bg_clean)',
      });
    }
    // TOO_SMALL or a decode error: cannot confirm, but it is not a white failure.
  }

  return {
    buffer: out,
    source: { width: sw, height: sh },
    outputSize: size,
    trimmed,
    ocrText,
    whiteBgVerified,
    warnings,
  };
}
