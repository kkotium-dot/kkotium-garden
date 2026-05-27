// src/lib/diagnosis/image-quality.ts
//
// Sprint 7-Diag MVP (v3.1 FINAL Smart Asset Workflow) — Phase 1 foundation.
//
// Sharp 4-axis image quality scoring + colorMood / photoStyle 1st-pass inference.
// The concept-tone-inference.ts module consumes this output as inputs for two of
// the eight CTI tone axes (#5 colorMood, #7 photoStyle), and the grading module
// uses qualityScore as one of the L1~L4 grade gates.
//
// Design notes
//   - Pure library: no DB, no env-dependent network calls. Safe to unit-test.
//   - Sharp requires Node runtime; any API route or cron consuming this MUST
//     export `runtime = 'nodejs'`. Edge runtime is not supported by Sharp.
//   - Returns plain TS object (not a DB row). The diagnose API persists it
//     into Diagnosis.qualitySignals (jsonb) + Diagnosis.qualityScore (float).
//   - The four axes are weighted: resolution 0.30 + composition 0.20 +
//     bgUniformity 0.25 + exposure 0.25. Weights derived from
//     docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md Section 2.
//
// Verification seeds (PDF Part 1 #3 — see SMART_ASSET_WORKFLOW Section 4-C):
//   - Kids silicone tray  -> expect colorMood=warm,  photoStyle=white
//   - German premium candle -> expect colorMood=calm, photoStyle=detail
//   - Power drill 18V     -> expect colorMood=mono,  photoStyle=white

import sharp from 'sharp';

export interface ImageQualitySignals {
  /** 0-100. Higher = larger resolution + acceptable aspect ratio. */
  resolution: number;
  /** 0-100. Higher = subject (saturation density) concentrated near center. */
  composition: number;
  /** 0-100. Higher = uniform background edges (likely clean white / studio). */
  bgUniformity: number;
  /** 0-100. Higher = mean luminance in the sweet zone with healthy histogram. */
  exposure: number;
}

export type ColorMood = 'warm' | 'calm' | 'vivid' | 'mono';
export type PhotoStyle = 'white' | 'lifestyle' | 'detail';

export interface ImageQualityRawStats {
  width: number;
  height: number;
  /** Channel-wise mean RGB (0-255). */
  avgRGB: [number, number, number];
  /** Mean HSV saturation (0-1). */
  avgSaturation: number;
  /** Variance of edge-strip pixel intensities (0-65025). */
  bgVariance: number;
  /** Mean luminance (0-255). */
  avgLuminance: number;
  /** Channel-wise standard deviation of RGB (0-255). */
  rgbStdev: [number, number, number];
}

export interface ImageQualityResult {
  /** Weighted 0-100 score (resolution 0.30 + composition 0.20 + bgUniformity 0.25 + exposure 0.25). */
  qualityScore: number;
  qualitySignals: ImageQualitySignals;
  /** 1st-pass tone-axis suggestion. concept-tone-inference.ts finalizes. */
  colorMood: ColorMood;
  /** 1st-pass tone-axis suggestion. concept-tone-inference.ts finalizes. */
  photoStyle: PhotoStyle;
  rawStats: ImageQualityRawStats;
}

const RESOLUTION_WEIGHT = 0.30;
const COMPOSITION_WEIGHT = 0.20;
const BG_UNIFORMITY_WEIGHT = 0.25;
const EXPOSURE_WEIGHT = 0.25;

const EDGE_STRIP_RATIO = 0.08; // outer 8% of width/height treated as background edge
const CENTER_GRID_RATIO = 6 / 8; // central 6/8 of width/height = subject zone

/**
 * Fetch image bytes if input is a URL, otherwise pass through the Buffer.
 * Note: caller is responsible for trusting the URL; this module performs
 * no allowlist check. The diagnose API should validate origin first.
 */
// B-4: bare fetch() has no default timeout and could hang the entire diagnose
// pipeline if the supplier CDN stalls. 15s abort covers slow-but-recoverable
// transfers while staying well under the route's 60s maxDuration.
const FETCH_TIMEOUT_MS = 15_000;

async function resolveBuffer(input: Buffer | string): Promise<Buffer> {
  if (Buffer.isBuffer(input)) return input;
  if (typeof input !== 'string') {
    throw new Error('image-quality: input must be Buffer or URL string');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(input, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`image-quality: fetch ${input} failed with ${res.status}`);
    }
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`image-quality: fetch ${input} timed out after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function clamp(value: number, min = 0, max = 100): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function scoreResolution(width: number, height: number): number {
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);
  let base: number;
  if (longSide < 300) base = 0;
  else if (longSide < 600) base = 20 + ((longSide - 300) / 300) * 20;
  else if (longSide < 1000) base = 50 + ((longSide - 600) / 400) * 20;
  else if (longSide < 2000) base = 80 + ((longSide - 1000) / 1000) * 15;
  else base = 95 + Math.min(5, (longSide - 2000) / 1000);
  // Aspect ratio penalty: anything beyond 1:2 loses up to 10 points
  const ratio = longSide / Math.max(1, shortSide);
  const ratioPenalty = ratio > 1.5 ? Math.min(10, (ratio - 1.5) * 10) : 0;
  return clamp(base - ratioPenalty);
}

/**
 * Composition score via 9-grid (3x3) heuristic.
 * High score = central cell carries more saturation/edge information than corners.
 * Uses raw RGB bytes converted to a cheap HSV-ish saturation proxy.
 */
function scoreComposition(
  raw: Buffer,
  width: number,
  height: number,
  channels: number,
): number {
  const w = width;
  const h = height;
  // 3x3 grid bounds
  const colStart = [0, Math.floor(w / 3), Math.floor((2 * w) / 3)];
  const colEnd = [Math.floor(w / 3), Math.floor((2 * w) / 3), w];
  const rowStart = [0, Math.floor(h / 3), Math.floor((2 * h) / 3)];
  const rowEnd = [Math.floor(h / 3), Math.floor((2 * h) / 3), h];
  const cellSat: number[] = new Array(9).fill(0);
  const cellCount: number[] = new Array(9).fill(0);
  // Downsample stride for performance (~10k samples max)
  const stride = Math.max(1, Math.floor(Math.sqrt((w * h) / 10000)));
  for (let r = 0; r < h; r += stride) {
    let rowIdx = 0;
    if (r >= rowStart[1]) rowIdx = r >= rowStart[2] ? 2 : 1;
    for (let c = 0; c < w; c += stride) {
      let colIdx = 0;
      if (c >= colStart[1]) colIdx = c >= colStart[2] ? 2 : 1;
      const p = (r * w + c) * channels;
      const R = raw[p];
      const G = raw[p + 1];
      const B = raw[p + 2];
      const maxC = Math.max(R, G, B);
      const minC = Math.min(R, G, B);
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
      const cell = rowIdx * 3 + colIdx;
      cellSat[cell] += sat;
      cellCount[cell] += 1;
    }
  }
  const centerAvg = cellCount[4] > 0 ? cellSat[4] / cellCount[4] : 0;
  let cornerSum = 0;
  let cornerCount = 0;
  for (const idx of [0, 2, 6, 8]) {
    if (cellCount[idx] > 0) {
      cornerSum += cellSat[idx] / cellCount[idx];
      cornerCount += 1;
    }
  }
  const cornerAvg = cornerCount > 0 ? cornerSum / cornerCount : 0;
  // Higher when center saturation > corner saturation
  const diff = centerAvg - cornerAvg;
  // Map [-0.3..+0.3] to [0..100], anchored at 50
  return clamp(50 + (diff / 0.3) * 50);
}

/**
 * Edge-strip background uniformity. Lower stdev across outer strip = cleaner backdrop.
 * Also returns the underlying variance so callers can persist it.
 */
function scoreBgUniformity(
  raw: Buffer,
  width: number,
  height: number,
  channels: number,
): { score: number; variance: number } {
  const stripW = Math.max(1, Math.floor(width * EDGE_STRIP_RATIO));
  const stripH = Math.max(1, Math.floor(height * EDGE_STRIP_RATIO));
  const samples: number[] = [];
  const stride = Math.max(1, Math.floor(Math.sqrt((width * height) / 5000)));
  // Top + bottom strips
  for (let r = 0; r < stripH; r += stride) {
    for (let c = 0; c < width; c += stride) {
      const pTop = (r * width + c) * channels;
      const pBot = ((height - 1 - r) * width + c) * channels;
      samples.push((raw[pTop] + raw[pTop + 1] + raw[pTop + 2]) / 3);
      samples.push((raw[pBot] + raw[pBot + 1] + raw[pBot + 2]) / 3);
    }
  }
  // Left + right strips (skip corners already covered)
  for (let r = stripH; r < height - stripH; r += stride) {
    for (let c = 0; c < stripW; c += stride) {
      const pL = (r * width + c) * channels;
      const pR = (r * width + (width - 1 - c)) * channels;
      samples.push((raw[pL] + raw[pL + 1] + raw[pL + 2]) / 3);
      samples.push((raw[pR] + raw[pR + 1] + raw[pR + 2]) / 3);
    }
  }
  if (samples.length === 0) return { score: 50, variance: 0 };
  const mean = samples.reduce((acc, v) => acc + v, 0) / samples.length;
  const variance =
    samples.reduce((acc, v) => acc + (v - mean) ** 2, 0) / samples.length;
  const stdev = Math.sqrt(variance);
  // stdev 0 -> 100, stdev 50+ -> 0 (linear)
  const score = clamp(100 - stdev * 2);
  return { score, variance };
}

/**
 * Exposure score from sharp().stats() per-channel mean.
 * Sweet zone 90~170 mean luminance. Penalty grows toward 0 and 255.
 */
function scoreExposure(avgLuminance: number, rgbStdev: number[]): number {
  let base: number;
  if (avgLuminance < 40 || avgLuminance > 220) base = 0;
  else if (avgLuminance < 60) base = ((avgLuminance - 40) / 20) * 40;
  else if (avgLuminance < 90) base = 40 + ((avgLuminance - 60) / 30) * 30;
  else if (avgLuminance <= 170) base = 70 + ((170 - Math.abs(avgLuminance - 130)) / 40) * 30;
  else if (avgLuminance < 200) base = 70 - ((avgLuminance - 170) / 30) * 30;
  else base = 40 - ((avgLuminance - 200) / 20) * 40;
  // Healthy histogram has some stdev (not flat). Bonus 0~5 when avg stdev > 30.
  const avgStdev = (rgbStdev[0] + rgbStdev[1] + rgbStdev[2]) / 3;
  const bonus = avgStdev > 30 ? Math.min(5, (avgStdev - 30) / 10) : 0;
  return clamp(base + bonus);
}

function inferColorMood(
  avgRGB: [number, number, number],
  avgSaturation: number,
): ColorMood {
  // Saturation threshold for mono — very low color content
  if (avgSaturation < 0.12) return 'mono';
  const [r, g, b] = avgRGB;
  // Warm = red/orange/yellow dominance over blue
  const warmth = (r + g) / 2 - b;
  if (avgSaturation > 0.35 && warmth > 20) return 'vivid';
  if (warmth > 10) return 'warm';
  // Otherwise calm (low-mid sat, no strong warm bias)
  if (avgSaturation < 0.25) return 'calm';
  // Mid-saturation cool / neutral — treat as vivid only if very saturated
  return avgSaturation > 0.45 ? 'vivid' : 'calm';
}

function inferPhotoStyle(
  bgUniformityScore: number,
  compositionScore: number,
): PhotoStyle {
  // Clean studio backdrop strongly suggests white-bg product shot
  if (bgUniformityScore >= 78) return 'white';
  // Tight subject + busy background -> detail (close-up macro)
  if (bgUniformityScore < 55 && compositionScore >= 60) return 'detail';
  // Otherwise treat as a lifestyle composition
  if (bgUniformityScore < 50) return 'lifestyle';
  // Mid-range default: pick by composition strength
  return compositionScore >= 65 ? 'detail' : 'lifestyle';
}

/**
 * Public entry point. Accepts a Buffer (already-downloaded bytes) or a URL string.
 * Throws on invalid input or fetch failure; callers should treat errors as
 * unrecoverable for the diagnose-API request and surface a 4xx to clients.
 */
export async function assessImageQuality(
  input: Buffer | string,
): Promise<ImageQualityResult> {
  const buffer = await resolveBuffer(input);
  const image = sharp(buffer, { failOn: 'none' }).rotate(); // auto-orient EXIF
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('image-quality: failed to read image dimensions');
  }
  const width = metadata.width;
  const height = metadata.height;

  // Channel statistics from sharp's accelerated path
  const stats = await image.stats();
  const meanR = stats.channels[0]?.mean ?? 0;
  const meanG = stats.channels[1]?.mean ?? 0;
  const meanB = stats.channels[2]?.mean ?? 0;
  const stdR = stats.channels[0]?.stdev ?? 0;
  const stdG = stats.channels[1]?.stdev ?? 0;
  const stdB = stats.channels[2]?.stdev ?? 0;

  // Luminance via Rec.709 luma
  const avgLuminance = meanR * 0.2126 + meanG * 0.7152 + meanB * 0.0722;
  // HSV-like saturation from channel means
  const maxMean = Math.max(meanR, meanG, meanB);
  const minMean = Math.min(meanR, meanG, meanB);
  const avgSaturation = maxMean === 0 ? 0 : (maxMean - minMean) / maxMean;

  // Raw RGB buffer for grid-based composition + edge-strip uniformity.
  // Downscale to keep compute bounded for large product photos.
  const maxSide = 720;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));
  const { data, info } = await sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize(targetW, targetH, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const compositionScore = scoreComposition(data, info.width, info.height, info.channels);
  const { score: bgUniformityScore, variance: bgVariance } = scoreBgUniformity(
    data,
    info.width,
    info.height,
    info.channels,
  );
  const resolutionScore = scoreResolution(width, height);
  const exposureScore = scoreExposure(avgLuminance, [stdR, stdG, stdB]);

  const qualityScore = clamp(
    resolutionScore * RESOLUTION_WEIGHT +
      compositionScore * COMPOSITION_WEIGHT +
      bgUniformityScore * BG_UNIFORMITY_WEIGHT +
      exposureScore * EXPOSURE_WEIGHT,
  );

  const colorMood = inferColorMood([meanR, meanG, meanB], avgSaturation);
  const photoStyle = inferPhotoStyle(bgUniformityScore, compositionScore);

  return {
    qualityScore: Math.round(qualityScore * 10) / 10,
    qualitySignals: {
      resolution: Math.round(resolutionScore * 10) / 10,
      composition: Math.round(compositionScore * 10) / 10,
      bgUniformity: Math.round(bgUniformityScore * 10) / 10,
      exposure: Math.round(exposureScore * 10) / 10,
    },
    colorMood,
    photoStyle,
    rawStats: {
      width,
      height,
      avgRGB: [
        Math.round(meanR * 10) / 10,
        Math.round(meanG * 10) / 10,
        Math.round(meanB * 10) / 10,
      ],
      avgSaturation: Math.round(avgSaturation * 1000) / 1000,
      bgVariance: Math.round(bgVariance * 10) / 10,
      avgLuminance: Math.round(avgLuminance * 10) / 10,
      rgbStdev: [
        Math.round(stdR * 10) / 10,
        Math.round(stdG * 10) / 10,
        Math.round(stdB * 10) / 10,
      ],
    },
  };
}
