// src/lib/diagnosis/p-filter.ts
//
// Sprint 8-PF — Pre-flight image quality diagnosis (P-Filter).
//
// Wraps assessImageQuality() with five additional stages and produces a
// L1~L4 verdict that gates the rest of the 9-axis diagnose pipeline.
//
// Stages
//   1. Metadata scan        (reused from assessImageQuality.rawStats)
//   2. Blur detection       (Laplacian variance via sharp.convolve)
//   3. Exposure check       (reused — mean luminance threshold)
//   4. White balance cast   (channel ratio deviation from neutral)
//   5. Watermark OCR        (tesseract.js top + bottom 15% bands)
//   6. Background uniformity(reused — bgVariance threshold)
//   7. Object ratio         (sharp.trim() bbox vs canvas, optional)
//   8. Grade resolution     (priority list — first hit wins)
//
// Runtime contract
//   - Node runtime only (sharp + tesseract). Edge is unsupported.
//   - Pure library: no DB writes, no env-dependent fetches except for the
//     input image URL (already validated by callers).

import sharp from 'sharp';
import {
  assessImageQuality,
  type ImageQualityResult,
} from './image-quality';
import { detectWatermark } from './p-filter-watermark';
import sellerMessages from '@/lib/i18n/p-filter-messages.ko.json';
import type {
  PFilterGrade,
  PFilterResult,
  PFilterSignals,
  WhiteBalanceDirection,
} from './p-filter-types';

// ---------------------------------------------------------------------------
// Thresholds (single source of truth — adjust here, never inline)
// ---------------------------------------------------------------------------

const RESOLUTION_FAIL_PX = 600;
const RESOLUTION_UPSCALE_PX = 860;

// Laplacian variance thresholds (computed on luminance, normalised by px count)
const BLUR_SEVERE = 100;
const BLUR_WARNING = 300;

// Exposure (reused thresholds from spec)
const EXPOSURE_DARK = 30;
const EXPOSURE_BRIGHT = 225;

// White balance — fractional deviation from RGB mean
const WB_CAST_DEVIATION = 0.05;

// Background uniformity (edge-strip variance from rawStats)
const BG_UNIFORM_MAX = 1500;

// Object ratio (bbox area / canvas area)
const OBJECT_RATIO_MIN = 0.3;
const OBJECT_RATIO_MAX = 0.7;

// ---------------------------------------------------------------------------
// Message helpers (i18n)
// ---------------------------------------------------------------------------

interface MessagesShape {
  grades: Record<PFilterGrade, string>;
  autoFix: Record<string, string>;
}

const MESSAGES = sellerMessages as unknown as MessagesShape;

function gradeLabel(grade: PFilterGrade): string {
  return MESSAGES.grades[grade] ?? grade;
}

function autoFix(key: string): string {
  return MESSAGES.autoFix[key] ?? key;
}

// ---------------------------------------------------------------------------
// Buffer helper (mirrors image-quality.ts, kept private to avoid coupling)
// ---------------------------------------------------------------------------

async function resolveBuffer(input: Buffer | string): Promise<Buffer> {
  if (Buffer.isBuffer(input)) return input;
  if (typeof input !== 'string') {
    throw new Error('p-filter: input must be Buffer or URL string');
  }
  const res = await fetch(input);
  if (!res.ok) {
    throw new Error(`p-filter: fetch ${input} failed with ${res.status}`);
  }
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

// ---------------------------------------------------------------------------
// Stage 2 — Blur via Laplacian variance
// ---------------------------------------------------------------------------

const LAPLACIAN_KERNEL = {
  width: 3,
  height: 3,
  kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0],
} as const;

async function measureBlur(buffer: Buffer): Promise<number> {
  // Downscale for speed; blur signal is scale-invariant enough at 480px wide.
  const grayscale = await sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize(480, undefined, { fit: 'inside', withoutEnlargement: true })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: src, info } = grayscale;
  const w = info.width;
  const h = info.height;

  // Apply Laplacian via sharp.convolve, then read variance from raw output.
  const convolved = await sharp(src, {
    raw: { width: w, height: h, channels: 1 },
  })
    .convolve({
      width: LAPLACIAN_KERNEL.width,
      height: LAPLACIAN_KERNEL.height,
      kernel: [...LAPLACIAN_KERNEL.kernel],
    })
    .raw()
    .toBuffer();

  // Variance of the Laplacian. We use a one-pass online algorithm.
  let mean = 0;
  let m2 = 0;
  let n = 0;
  for (let i = 0; i < convolved.length; i += 1) {
    n += 1;
    const x = convolved[i];
    const delta = x - mean;
    mean += delta / n;
    m2 += delta * (x - mean);
  }
  if (n === 0) return 0;
  return m2 / n;
}

// ---------------------------------------------------------------------------
// Stage 4 — White balance cast detection
// ---------------------------------------------------------------------------

function detectCast(
  avgRGB: [number, number, number],
): { cast: boolean; direction?: WhiteBalanceDirection; deviation: number } {
  const [r, g, b] = avgRGB;
  const mean = (r + g + b) / 3;
  if (mean <= 0) return { cast: false, deviation: 0 };
  const dr = (r - mean) / mean;
  const dg = (g - mean) / mean;
  const db = (b - mean) / mean;
  const deviation = Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db));
  if (deviation < WB_CAST_DEVIATION) {
    return { cast: false, deviation };
  }
  // Direction: largest channel deviation defines the cast label
  const channels: Array<['warm' | 'cool' | 'green' | 'magenta', number]> = [
    ['warm', dr],
    ['cool', db],
    ['green', dg],
    // Magenta = red + blue lifted relative to green
    ['magenta', (dr + db) / 2 - dg],
  ];
  channels.sort((a, b2) => Math.abs(b2[1]) - Math.abs(a[1]));
  return { cast: true, direction: channels[0][0], deviation };
}

// ---------------------------------------------------------------------------
// Stage 7 — Object ratio via sharp.trim()
// ---------------------------------------------------------------------------

async function measureObjectRatio(
  buffer: Buffer,
  width: number,
  height: number,
): Promise<{ ratio: number; appropriate: boolean } | null> {
  try {
    const trimmed = await sharp(buffer, { failOn: 'none' })
      .rotate()
      .trim({ threshold: 10 })
      .toBuffer({ resolveWithObject: true });
    const tw = trimmed.info.width;
    const th = trimmed.info.height;
    if (!tw || !th) return null;
    const ratio = (tw * th) / (width * height);
    return {
      ratio: Math.round(ratio * 1000) / 1000,
      appropriate: ratio >= OBJECT_RATIO_MIN && ratio <= OBJECT_RATIO_MAX,
    };
  } catch {
    // trim() can throw on images without a uniform border — skip silently.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Stage 8 — Grade resolution
// ---------------------------------------------------------------------------

function resolveGrade(signals: PFilterSignals): PFilterGrade {
  // Priority: first match wins. Mirrors spec §4.2.
  if (!signals.resolution.sufficient) return 'L4';
  if (signals.blur.level === 'severe') return 'L3';
  if (signals.watermark.detected) return 'L2';
  if (!signals.exposure.ok) return 'L2';
  if (signals.whiteBalance.cast) return 'L2';
  if (!signals.background.uniform) return 'L3';
  return 'L1';
}

function buildAutoFixSuggestions(signals: PFilterSignals): string[] {
  const out: string[] = [];
  if (!signals.resolution.sufficient) {
    out.push(autoFix('resolution_insufficient'));
  } else if (signals.resolution.width < RESOLUTION_UPSCALE_PX) {
    out.push(autoFix('resolution_upscale_candidate'));
  }
  if (signals.blur.level === 'severe') {
    out.push(autoFix('blur_severe'));
  } else if (signals.blur.level === 'warning') {
    out.push(autoFix('blur_warning'));
  }
  if (!signals.exposure.ok) {
    out.push(autoFix(signals.exposure.mean < EXPOSURE_DARK ? 'exposure_dark' : 'exposure_bright'));
  }
  if (signals.whiteBalance.cast && signals.whiteBalance.direction) {
    out.push(autoFix(`white_balance_${signals.whiteBalance.direction}`));
  }
  if (signals.watermark.detected) {
    out.push(autoFix('watermark_detected'));
  }
  if (!signals.background.uniform) {
    out.push(autoFix('background_complex'));
  }
  if (signals.objectRatio === null) {
    out.push(autoFix('object_ratio_skipped'));
  } else if (signals.objectRatio && !signals.objectRatio.appropriate) {
    out.push(
      autoFix(signals.objectRatio.ratio < OBJECT_RATIO_MIN ? 'object_too_small' : 'object_too_large'),
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export interface RunPFilterOptions {
  /** Disable watermark OCR (useful for unit tests). Default true. */
  enableWatermark?: boolean;
  /** Disable object ratio estimation. Default true. */
  enableObjectRatio?: boolean;
  /** Reuse a pre-computed ImageQualityResult to skip re-fetching. */
  precomputedImageQuality?: ImageQualityResult;
}

export async function runPFilter(
  input: Buffer | string,
  options: RunPFilterOptions = {},
): Promise<PFilterResult> {
  const startedAt = Date.now();

  const buffer = await resolveBuffer(input);
  const imageQuality =
    options.precomputedImageQuality ?? (await assessImageQuality(buffer));

  const { width, height, avgRGB, bgVariance, avgLuminance } = imageQuality.rawStats;

  const [blurVariance, watermark, objectRatio] = await Promise.all([
    measureBlur(buffer),
    options.enableWatermark === false
      ? Promise.resolve({ detected: false, regions: [] })
      : detectWatermark(buffer, width, height, { enabled: true }),
    options.enableObjectRatio === false
      ? Promise.resolve(null)
      : measureObjectRatio(buffer, width, height),
  ]);

  const wb = detectCast(avgRGB);

  const blurLevel: PFilterSignals['blur']['level'] =
    blurVariance < BLUR_SEVERE ? 'severe' : blurVariance < BLUR_WARNING ? 'warning' : 'ok';

  const exposureOk = avgLuminance >= EXPOSURE_DARK && avgLuminance <= EXPOSURE_BRIGHT;

  const signals: PFilterSignals = {
    resolution: {
      width,
      height,
      sufficient: width >= RESOLUTION_FAIL_PX,
    },
    blur: {
      variance: Math.round(blurVariance * 10) / 10,
      level: blurLevel,
    },
    exposure: {
      mean: avgLuminance,
      ok: exposureOk,
    },
    whiteBalance: {
      cast: wb.cast,
      direction: wb.direction,
      deviation: Math.round(wb.deviation * 1000) / 1000,
    },
    watermark: {
      detected: watermark.detected,
      regions: watermark.regions.map((r) => r.region),
      texts: watermark.regions.map((r) => r.text),
    },
    background: {
      variance: bgVariance,
      uniform: bgVariance <= BG_UNIFORM_MAX,
    },
    objectRatio,
  };

  const grade = resolveGrade(signals);
  const autoFixSuggestions = buildAutoFixSuggestions(signals);

  return {
    grade,
    gradeLabel: gradeLabel(grade),
    passed: grade === 'L1' || grade === 'L2',
    signals,
    autoFixSuggestions,
    requiresSellerReview: grade === 'L2' || grade === 'L3',
    elapsedMs: Date.now() - startedAt,
    imageQuality,
  };
}

// ---------------------------------------------------------------------------
// Exports for testing
// ---------------------------------------------------------------------------

export const _internals = {
  measureBlur,
  detectCast,
  resolveGrade,
  buildAutoFixSuggestions,
  thresholds: {
    RESOLUTION_FAIL_PX,
    RESOLUTION_UPSCALE_PX,
    BLUR_SEVERE,
    BLUR_WARNING,
    EXPOSURE_DARK,
    EXPOSURE_BRIGHT,
    WB_CAST_DEVIATION,
    BG_UNIFORM_MAX,
    OBJECT_RATIO_MIN,
    OBJECT_RATIO_MAX,
  },
};
