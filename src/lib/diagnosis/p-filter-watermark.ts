// src/lib/diagnosis/p-filter-watermark.ts
//
// Sprint 8-PF — Watermark detection via tesseract.js OCR on the top and
// bottom 15% horizontal bands of a product image. Domemae original photos
// commonly carry a Korean/English supplier logo in those bands.
//
// Performance notes
//   - The first call after process boot pays ~1s for WASM + language data
//     download. We keep a lazy-initialised shared worker so subsequent calls
//     stay under 400ms per band.
//   - The worker uses 'kor+eng' so we catch both Korean shop names and
//     URLs/brand tokens. Confidence threshold is set generously because the
//     watermark detection only routes the product to L2 (one-click review).
//   - We never throw on OCR failure — a missing watermark signal is safer
//     than blocking the whole diagnose pipeline.

import sharp from 'sharp';
import { createWorker, type Worker } from 'tesseract.js';

const BAND_RATIO = 0.15;
const MIN_TEXT_LENGTH = 3;
const MIN_CONFIDENCE = 55;

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const w = await createWorker(['kor', 'eng']);
      return w;
    })();
  }
  return workerPromise;
}

/** Tear down the shared worker. Call once at process shutdown if needed. */
export async function terminateWatermarkWorker(): Promise<void> {
  if (!workerPromise) return;
  try {
    const w = await workerPromise;
    await w.terminate();
  } catch {
    // ignore — process is exiting anyway
  } finally {
    workerPromise = null;
  }
}

export interface WatermarkRegionResult {
  region: 'top' | 'bottom';
  text: string;
  confidence: number;
}

export interface WatermarkScanResult {
  detected: boolean;
  regions: WatermarkRegionResult[];
}

interface ScanOptions {
  /** Hard cap (ms) per band. OCR is aborted if it exceeds. */
  timeoutMs?: number;
  /** Allow caller to disable OCR (eg. tests). */
  enabled?: boolean;
}

/**
 * Extract the top + bottom 15% bands of the image and OCR them. Returns
 * `detected = true` when either band yields text of length >= MIN_TEXT_LENGTH
 * with confidence >= MIN_CONFIDENCE.
 */
export async function detectWatermark(
  buffer: Buffer,
  width: number,
  height: number,
  options: ScanOptions = {},
): Promise<WatermarkScanResult> {
  if (options.enabled === false) {
    return { detected: false, regions: [] };
  }

  const bandHeight = Math.max(20, Math.floor(height * BAND_RATIO));

  // Crop top and bottom bands. We resize down to a uniform 800px width so
  // tesseract sees a consistent input regardless of the source resolution.
  const targetWidth = Math.min(800, width);
  const topBand = await sharp(buffer, { failOn: 'none' })
    .rotate()
    .extract({ left: 0, top: 0, width, height: bandHeight })
    .resize(targetWidth, undefined, { fit: 'inside' })
    .grayscale()
    .normalise()
    .png()
    .toBuffer();
  const bottomBand = await sharp(buffer, { failOn: 'none' })
    .rotate()
    .extract({ left: 0, top: height - bandHeight, width, height: bandHeight })
    .resize(targetWidth, undefined, { fit: 'inside' })
    .grayscale()
    .normalise()
    .png()
    .toBuffer();

  const worker = await getWorker();
  const timeoutMs = options.timeoutMs ?? 2500;

  const runBand = async (band: 'top' | 'bottom', data: Buffer): Promise<WatermarkRegionResult | null> => {
    try {
      const recognition = await Promise.race([
        worker.recognize(data),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('ocr-timeout')), timeoutMs),
        ),
      ]);
      const text = (recognition.data.text ?? '').replace(/\s+/g, ' ').trim();
      const confidence = recognition.data.confidence ?? 0;
      if (text.length >= MIN_TEXT_LENGTH && confidence >= MIN_CONFIDENCE) {
        return { region: band, text, confidence };
      }
      return null;
    } catch {
      return null;
    }
  };

  const [top, bottom] = await Promise.all([
    runBand('top', topBand),
    runBand('bottom', bottomBand),
  ]);

  const regions: WatermarkRegionResult[] = [];
  if (top) regions.push(top);
  if (bottom) regions.push(bottom);

  return { detected: regions.length > 0, regions };
}
