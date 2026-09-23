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
// GEMINI 무관, VERCEL_FUNCTIONS_STORAGE_2026-09-23 근본수정 — 정적 import는
// Next.js 파일 트레이서가 이 파일을 쓰는 모든 route(13개, next.config.js의
// OCR_ROUTES)에 tesseract.js-core(43MB)를 강제로 포함시킴(공식 vercel 기술
// 블로그 확인, 2026: "one heavy import taxes every route in that bundle").
// createWorker는 오직 getWorker() 내부(실제 OCR 실행 시점)에서만 쓰이므로
// 동적 import로 지연 로드 — #295 안전 경계: 기존 워커 크래시 3단계 수정
// (커밋 7c7502a/7d183f1/1bb914f, next.config.js의 outputFileTracingIncludes+
// serverComponentsExternalPackages)은 그대로 유지, "언제 모듈을 불러오는지"
// 만 바꾼다(그 수정들이 다루던 "무엇을 트레이싱에 포함할지"는 안 건드림).
import type { Worker } from 'tesseract.js';

const BAND_RATIO = 0.15;
const MIN_TEXT_LENGTH = 3;
const MIN_CONFIDENCE = 55;

// B-4: tesseract's `createWorker` downloads ~30MB of language data on first
// cold start and can stall indefinitely on Vercel serverless if the CDN is
// slow or blocked. Cap worker bootstrap so the whole diagnose pipeline can
// fail open (no watermark signal) instead of hanging the request.
const WORKER_INIT_TIMEOUT_MS = 8_000;

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      // 동적 import — 이 함수가 실제로 호출될 때만 tesseract.js(43MB WASM)를
      // 로드한다(번들 트레이싱 대상에서 빠져 함수 배포 크기에 영향 없음).
      const { createWorker } = await import('tesseract.js');
      const w = await Promise.race<Worker>([
        createWorker(['kor', 'eng']),
        new Promise<Worker>((_, reject) =>
          setTimeout(
            () => reject(new Error('worker-init-timeout')),
            WORKER_INIT_TIMEOUT_MS,
          ),
        ),
      ]);
      return w;
    })().catch((err) => {
      // Reset the cached promise so a subsequent request can retry instead of
      // permanently inheriting a rejected worker.
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

export interface FullFrameOcrResult {
  text: string;
  confidence: number;
  hasText: boolean;
}

/**
 * OCR the WHOLE (downscaled) image — used by the simple-crop policy guard to
 * reject a representative crop that contains any text (Naver 2024-10-28). Reuses
 * the shared worker (no second language-data download). Fails open (no text) on
 * worker/OCR error so it never blocks the crop tool.
 */
export async function ocrFullFrame(
  buffer: Buffer,
  options: ScanOptions = {},
): Promise<FullFrameOcrResult> {
  if (options.enabled === false) return { text: '', confidence: 0, hasText: false };

  const pre = await sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize(1000, undefined, { fit: 'inside', withoutEnlargement: true })
    .grayscale()
    .normalise()
    .png()
    .toBuffer();

  let worker: Worker;
  try {
    worker = await getWorker();
  } catch {
    return { text: '', confidence: 0, hasText: false };
  }
  const timeoutMs = options.timeoutMs ?? 4000;
  try {
    const recognition = await Promise.race([
      worker.recognize(pre),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('ocr-timeout')), timeoutMs)),
    ]);
    const text = (recognition.data.text ?? '').replace(/\s+/g, ' ').trim();
    const confidence = recognition.data.confidence ?? 0;
    // Count only alphanumeric/Hangul glyphs so stray punctuation noise is ignored.
    const meaningful = text.replace(/[^0-9A-Za-z가-힣]/g, '').length;
    const hasText = meaningful >= MIN_TEXT_LENGTH && confidence >= MIN_CONFIDENCE;
    return { text, confidence, hasText };
  } catch {
    return { text: '', confidence: 0, hasText: false };
  }
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

  // Fail open if worker bootstrap times out or errors — watermark detection
  // is advisory, never blocking. Returning no regions keeps the pipeline
  // moving toward CTI/grading.
  let worker: Worker;
  try {
    worker = await getWorker();
  } catch {
    return { detected: false, regions: [] };
  }
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
