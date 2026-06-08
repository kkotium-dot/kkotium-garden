// src/lib/images/quality-classifier.ts
// ============================================================================
// Adaptive 3-mode quality classifier — quantitative first pass (Sharp, Node
// runtime only). Phase 3, handoff task 2.
// Authority: docs/research/KKOTIUM_ADAPTIVE_SEO_IMAGE_SYSTEM_2026-06-06.md §1.
//
// Scores a product image 0-100 over six free, fast metrics and recommends a
// pipeline mode:
//   SIMPLE  (>= SIMPLE_THRESHOLD)  : detail-page crop + minimal SEO
//   ENHANCE (>= ENHANCE_THRESHOLD) : crop + copy/image enrichment
//   NEW     (<  ENHANCE_THRESHOLD) : B-plan cutout + AI background (full)
//
// The VLM second pass (assessWithVlm) is a SIGNATURE-ONLY stub here — borderline
// (40-70) calls are the next step. The quantitative gate keeps VLM cost low by
// resolving the clear high/low cases on its own.
//
// Pure Buffer in → assessment out. No DB, no Naver, no network. A route using
// this MUST `export const runtime = 'nodejs'` (Sharp needs it). Thresholds are
// calibration constants (research §1: "calibrate while operating") — export so they can be
// retuned once the mode-recommendation acceptance rate is measured.
// ============================================================================

import sharp from 'sharp';

export type RecommendedMode = 'SIMPLE' | 'ENHANCE' | 'NEW';

export interface QualityReason {
  metric: string;   // stable key (English) — UI maps to Korean via strings JSON
  value: number;    // measured raw value
  points: number;   // points awarded
  max: number;      // max points for this metric
  note: string;     // short English diagnostic
}

export interface QualityAssessment {
  score: number;                   // 0-100 (sum of metric points, clamped)
  recommendedMode: RecommendedMode;
  needsVlm: boolean;               // borderline → phase-3 VLM second pass
  reasons: QualityReason[];
  meta: { width: number; height: number };
}

// ── Mode thresholds (calibration constants) ─────────────────────────────────
export const SIMPLE_THRESHOLD = 70;   // >= → SIMPLE
export const ENHANCE_THRESHOLD = 40;  // >= → ENHANCE, else NEW
export const VLM_LOW = 40;            // borderline band needing VLM second pass
export const VLM_HIGH = 70;

// ── Per-metric weights (sum = 100) ──────────────────────────────────────────
export const WEIGHTS = {
  resolution: 20,
  sharpness: 20,
  subject: 20,
  background: 15,
  watermark: 15,
  square: 10,
} as const;

// Downscaled analysis size — keeps every metric to a few ms regardless of input.
const ANALYSIS_SIZE = 384;
const EPS = 1e-6;

function variance(data: Uint8Array | Buffer): number {
  const n = data.length;
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += data[i];
  const mean = sum / n;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const d = data[i] - mean;
    acc += d * d;
  }
  return acc / n;
}

function modeFor(score: number): RecommendedMode {
  if (score >= SIMPLE_THRESHOLD) return 'SIMPLE';
  if (score >= ENHANCE_THRESHOLD) return 'ENHANCE';
  return 'NEW';
}

/**
 * Quantitative quality assessment. Six metrics, each producing a QualityReason
 * so the operator sees WHY a mode was recommended.
 */
export async function assessImageQuality(input: Buffer): Promise<QualityAssessment> {
  const reasons: QualityReason[] = [];

  // Original dimensions drive resolution + square-fit (analysis is downscaled).
  const meta = await sharp(input).metadata();
  const ow = meta.width ?? 0;
  const oh = meta.height ?? 0;
  const longSide = Math.max(ow, oh);

  // ── 1. Resolution ─────────────────────────────────────────────────────────
  let resPts: number;
  if (longSide >= 1300) resPts = 20;
  else if (longSide >= 1000) resPts = 17;
  else if (longSide >= 700) resPts = 12;
  else if (longSide >= 400) resPts = 6;
  else resPts = 2;
  reasons.push({
    metric: 'resolution', value: longSide, points: resPts, max: WEIGHTS.resolution,
    note: `long side ${longSide}px`,
  });

  // ── 6. Square fit (1:1 crop friendliness) ──────────────────────────────────
  const ratio = longSide > 0 ? Math.min(ow, oh) / Math.max(ow, oh) : 0;
  let sqPts: number;
  if (ratio >= 0.95) sqPts = 10;
  else if (ratio >= 0.8) sqPts = 8;
  else if (ratio >= 0.6) sqPts = 5;
  else if (ratio >= 0.4) sqPts = 2;
  else sqPts = 0;
  reasons.push({
    metric: 'square', value: Number(ratio.toFixed(3)), points: sqPts, max: WEIGHTS.square,
    note: `aspect ${ratio.toFixed(2)}:1`,
  });

  // ── Greyscale Laplacian (sharpness + text-band heuristic share one pass) ────
  const lap = await sharp(input)
    .greyscale()
    .resize(ANALYSIS_SIZE, ANALYSIS_SIZE, { fit: 'inside', withoutEnlargement: false })
    .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const lapData = lap.data;
  const lw = lap.info.width;
  const lh = lap.info.height;

  // ── 2. Sharpness (Laplacian variance) ───────────────────────────────────────
  const lapVar = variance(lapData);
  let sharpPts: number;
  if (lapVar >= 300) sharpPts = 20;
  else if (lapVar >= 150) sharpPts = 16;
  else if (lapVar >= 80) sharpPts = 12;
  else if (lapVar >= 30) sharpPts = 8;
  else if (lapVar >= 10) sharpPts = 4;
  else sharpPts = 1;
  reasons.push({
    metric: 'sharpness', value: Math.round(lapVar), points: sharpPts, max: WEIGHTS.sharpness,
    note: `laplacian var ${Math.round(lapVar)}`,
  });

  // ── 5. Watermark / text heuristic (edge-band concentration) ──────────────────
  // Text/watermarks concentrate high-frequency energy into a few rows. Compare
  // the densest sliding band of rows to the overall mean edge energy. Coarse
  // pre-filter only — OCR/VLM refinement is the phase-3 second pass.
  const rowMean = new Float64Array(lh);
  let overall = 0;
  for (let y = 0; y < lh; y++) {
    let s = 0;
    const base = y * lw;
    for (let x = 0; x < lw; x++) s += lapData[base + x];
    const rm = s / lw;
    rowMean[y] = rm;
    overall += rm;
  }
  overall = overall / Math.max(1, lh);
  const band = Math.max(3, Math.round(lh * 0.08));
  let bandMax = 0;
  let running = 0;
  for (let y = 0; y < lh; y++) {
    running += rowMean[y];
    if (y >= band) running -= rowMean[y - band];
    if (y >= band - 1) bandMax = Math.max(bandMax, running / band);
  }
  const textiness = bandMax / (overall + EPS);
  let wmPts: number;
  if (textiness >= 4) wmPts = 4;
  else if (textiness >= 3) wmPts = 8;
  else if (textiness >= 2.3) wmPts = 11;
  else wmPts = 15;
  reasons.push({
    metric: 'watermark', value: Number(textiness.toFixed(2)), points: wmPts, max: WEIGHTS.watermark,
    note: `text-band ratio ${textiness.toFixed(2)}`,
  });

  // ── RGB raw for background uniformity + subject occupancy ────────────────────
  const rgb = await sharp(input)
    .removeAlpha()
    .resize(ANALYSIS_SIZE, ANALYSIS_SIZE, { fit: 'inside', withoutEnlargement: false })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px = rgb.data;
  const rw = rgb.info.width;
  const rh = rgb.info.height;
  const ch = rgb.info.channels; // 3 after removeAlpha

  // Border ring = outer 7% — proxies the background.
  const ringX = Math.max(2, Math.round(rw * 0.07));
  const ringY = Math.max(2, Math.round(rh * 0.07));
  let rSum = 0, gSum = 0, bSum = 0, ringN = 0;
  const isRing = (x: number, y: number) =>
    x < ringX || x >= rw - ringX || y < ringY || y >= rh - ringY;
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      if (!isRing(x, y)) continue;
      const i = (y * rw + x) * ch;
      rSum += px[i]; gSum += px[i + 1]; bSum += px[i + 2];
      ringN++;
    }
  }
  const bgR = rSum / Math.max(1, ringN);
  const bgG = gSum / Math.max(1, ringN);
  const bgB = bSum / Math.max(1, ringN);

  // Background uniformity = mean per-channel stdev across the ring.
  let vr = 0, vg = 0, vb = 0;
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      if (!isRing(x, y)) continue;
      const i = (y * rw + x) * ch;
      vr += (px[i] - bgR) ** 2;
      vg += (px[i + 1] - bgG) ** 2;
      vb += (px[i + 2] - bgB) ** 2;
    }
  }
  const ringStd = (Math.sqrt(vr / Math.max(1, ringN)) +
                   Math.sqrt(vg / Math.max(1, ringN)) +
                   Math.sqrt(vb / Math.max(1, ringN))) / 3;

  // ── 4. Background uniformity (lower stdev = cleaner) ────────────────────────
  let bgPts: number;
  if (ringStd <= 10) bgPts = 15;
  else if (ringStd <= 20) bgPts = 11;
  else if (ringStd <= 35) bgPts = 7;
  else if (ringStd <= 60) bgPts = 3;
  else bgPts = 0;
  reasons.push({
    metric: 'background', value: Math.round(ringStd), points: bgPts, max: WEIGHTS.background,
    note: `edge stdev ${Math.round(ringStd)}`,
  });

  // ── 3. Subject occupancy (fraction differing from background) ───────────────
  const SUBJECT_DELTA = 40; // Euclidean RGB distance from bg → "subject"
  let subjN = 0, totalN = 0;
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const i = (y * rw + x) * ch;
      const dr = px[i] - bgR, dg = px[i + 1] - bgG, db = px[i + 2] - bgB;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      if (dist > SUBJECT_DELTA) subjN++;
      totalN++;
    }
  }
  const occupancy = subjN / Math.max(1, totalN);
  // Ideal product cut leaves a little margin (0.5-0.85). Too small (lost in frame)
  // or too full (no breathing room / busy lifestyle scene) both lose points.
  let subjPts: number;
  if (occupancy >= 0.5 && occupancy <= 0.85) subjPts = 20;
  else if ((occupancy >= 0.35 && occupancy < 0.5) || (occupancy > 0.85 && occupancy <= 0.92)) subjPts = 14;
  else if (occupancy >= 0.2 && occupancy < 0.35) subjPts = 8;
  else subjPts = 4;
  reasons.push({
    metric: 'subject', value: Number(occupancy.toFixed(3)), points: subjPts, max: WEIGHTS.subject,
    note: `subject ${(occupancy * 100).toFixed(0)}%`,
  });

  // ── Aggregate ───────────────────────────────────────────────────────────────
  const raw = reasons.reduce((s, r) => s + r.points, 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const recommendedMode = modeFor(score);
  const needsVlm = score >= VLM_LOW && score <= VLM_HIGH;

  return { score, recommendedMode, needsVlm, reasons, meta: { width: ow, height: oh } };
}

// ── Image strategy tier (handoff IMAGE_SEO_STRATEGY_ENGINE §B, item 3) ───────
// Maps a quality assessment of the supplier REPRESENTATIVE (site thumb) and the
// supplier DETAIL page into a cheapest-first image strategy tier:
//   T0 USE_AS_IS  : rep is already publish-grade (>=1000px, clean bg, text-free,
//                   single subject) — use the supplier representative as-is.
//   T1 DETAIL_CROP: rep weak but the detail page has a croppable >=1000px subject.
//   T2 ENHANCE    : a subject exists but needs cutout + clean background.
//   T3 NEW        : sources too sparse — cutout + AI background (B-plan).
// Pure: derives only from already-computed QualityAssessments. Korean-free
// (stable English keys; UI maps to Korean).

export type ImageTier = 'T0' | 'T1' | 'T2' | 'T3';
export type ImageStrategySource = 'representative' | 'detail-crop' | 'enhance' | 'new';

export interface ImageStrategy {
  tier: ImageTier;
  source: ImageStrategySource;
  reasons: string[];   // stable English keys explaining the tier
}

function metricPoints(a: QualityAssessment, metric: string): number {
  return a.reasons.find(r => r.metric === metric)?.points ?? 0;
}
function metricValue(a: QualityAssessment, metric: string): number {
  return a.reasons.find(r => r.metric === metric)?.value ?? 0;
}

// Representative is "use-as-is": hi-res + clean uniform background + text-free +
// a single well-framed subject. Thresholds mirror the per-metric point bands.
export function isUseAsIs(a: QualityAssessment): boolean {
  return metricValue(a, 'resolution') >= 1000   // >= 1000px long side
    && metricPoints(a, 'background') >= 11        // ring stdev <= 20 (uniform)
    && metricPoints(a, 'watermark') >= 11         // text-band ratio low (text-free)
    && metricPoints(a, 'subject') >= 14;          // single subject, good occupancy
}

// Detail page carries a croppable >=1000px region with a discernible subject.
export function isDetailCroppable(a: QualityAssessment): boolean {
  return metricValue(a, 'resolution') >= 1000 && metricPoints(a, 'subject') >= 8;
}

/**
 * Derive the image strategy tier from the representative and (optional) detail
 * assessments. Cheapest-first: T0 before T1 before T2 before T3.
 */
export function deriveImageTier(
  rep: QualityAssessment | null,
  detail: QualityAssessment | null,
): ImageStrategy {
  const reasons: string[] = [];

  if (rep && isUseAsIs(rep)) {
    return { tier: 'T0', source: 'representative', reasons: ['rep_publish_grade'] };
  }
  if (rep) reasons.push('rep_below_use_as_is');
  else reasons.push('rep_absent');

  if (detail && isDetailCroppable(detail)) {
    return { tier: 'T1', source: 'detail-crop', reasons: [...reasons, 'detail_croppable'] };
  }
  if (detail) reasons.push('detail_not_croppable');

  if (rep && metricPoints(rep, 'subject') >= 8) {
    return { tier: 'T2', source: 'enhance', reasons: [...reasons, 'subject_present_needs_enhance'] };
  }

  return { tier: 'T3', source: 'new', reasons: [...reasons, 'sparse_source'] };
}

// ── VLM second pass (signature only — phase 3 step 3) ───────────────────────
export interface VlmAssessInput {
  buffer?: Buffer;
  imageUrl?: string;
  quantitative: QualityAssessment;
}

/**
 * Borderline (40-70) VLM re-scoring. NOT IMPLEMENTED — this is the documented
 * next step (handoff task 2: "VLM second pass = signature only"). Returning null means
 * "no VLM verdict; trust the quantitative score". Wiring a vision model here
 * (detail:low, OCR run alongside) is phase 3 step 3.
 */
export async function assessWithVlm(_input: VlmAssessInput): Promise<QualityAssessment | null> {
  return null;
}

// ── Subject bounding box (T6 crop full-subject containment) ───────────────────
// Reuses the SAME background-ring + SUBJECT_DELTA detection as the subject
// occupancy metric, but returns the BBOX of the subject pixels in SOURCE px.
// Column/row projection thresholding rejects stray noise so the box hugs the
// actual product. Returns null when no clear subject is found (near-empty frame).
export interface SubjectBBox {
  x: number; y: number; width: number; height: number; // source px
  imageWidth: number; imageHeight: number;
}

const SUBJECT_BBOX_ANALYSIS = 256;          // analysis long side
const SUBJECT_PROJECTION_FLOOR = 0.03;      // row/col is "subject" at >= 3% of the cross dimension

export async function detectSubjectBBox(input: Buffer): Promise<SubjectBBox | null> {
  const meta = await sharp(input).metadata();
  const ow = meta.width ?? 0;
  const oh = meta.height ?? 0;
  if (ow < 2 || oh < 2) return null;

  const scale = SUBJECT_BBOX_ANALYSIS / Math.max(ow, oh);
  const aw = Math.max(1, Math.round(ow * scale));
  const ah = Math.max(1, Math.round(oh * scale));
  const rgb = await sharp(input).removeAlpha()
    .resize(aw, ah, { fit: 'fill' })
    .raw().toBuffer({ resolveWithObject: true });
  const px = rgb.data;
  const w = rgb.info.width, h = rgb.info.height, ch = rgb.info.channels;

  // Background ring color (outer 7%) — same proxy as the occupancy metric.
  const ringX = Math.max(1, Math.round(w * 0.07));
  const ringY = Math.max(1, Math.round(h * 0.07));
  const isRing = (x: number, y: number) => x < ringX || x >= w - ringX || y < ringY || y >= h - ringY;
  let rSum = 0, gSum = 0, bSum = 0, ringN = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!isRing(x, y)) continue;
    const i = (y * w + x) * ch;
    rSum += px[i]; gSum += px[i + 1]; bSum += px[i + 2]; ringN++;
  }
  const bgR = rSum / Math.max(1, ringN), bgG = gSum / Math.max(1, ringN), bgB = bSum / Math.max(1, ringN);

  const colCount = new Array<number>(w).fill(0);
  const rowCount = new Array<number>(h).fill(0);
  let subjTotal = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * ch;
    const dr = px[i] - bgR, dg = px[i + 1] - bgG, db = px[i + 2] - bgB;
    if (Math.sqrt(dr * dr + dg * dg + db * db) > SUBJECT_DELTA_BBOX) { colCount[x]++; rowCount[y]++; subjTotal++; }
  }
  if (subjTotal < w * h * 0.01) return null; // no discernible subject

  const colFloor = Math.max(2, Math.round(h * SUBJECT_PROJECTION_FLOOR));
  const rowFloor = Math.max(2, Math.round(w * SUBJECT_PROJECTION_FLOOR));
  let minX = -1, maxX = -1, minY = -1, maxY = -1;
  for (let x = 0; x < w; x++) if (colCount[x] >= colFloor) { if (minX < 0) minX = x; maxX = x; }
  for (let y = 0; y < h; y++) if (rowCount[y] >= rowFloor) { if (minY < 0) minY = y; maxY = y; }
  if (minX < 0 || minY < 0) return null; // all below the noise floor

  const sx = ow / w, sy = oh / h;
  const x = Math.max(0, Math.floor(minX * sx));
  const y = Math.max(0, Math.floor(minY * sy));
  const x2 = Math.min(ow, Math.ceil((maxX + 1) * sx));
  const y2 = Math.min(oh, Math.ceil((maxY + 1) * sy));
  return { x, y, width: Math.max(1, x2 - x), height: Math.max(1, y2 - y), imageWidth: ow, imageHeight: oh };
}

const SUBJECT_DELTA_BBOX = 40; // mirror of SUBJECT_DELTA (occupancy metric)
