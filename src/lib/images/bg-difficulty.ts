// src/lib/images/bg-difficulty.ts
// ============================================================================
// Background difficulty classifier (C-1).
// Authority: docs/design/REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md §3 / §3.2.
//
// Routes a representative-image finishing request to SIMPLE (in-app sharp
// white-flatten, free, instant) vs COMPLEX (Adobe cutout, operator-assisted).
// Heuristic: scan the BORDER RING of a small downsample.
//   - already-white/neutral + low-variance border => SIMPLE
//     (a plain white-flatten produces a compliant white-bg representative).
//   - dark / colored / high-variance border (leather, lifestyle scene) => COMPLEX
//     (needs real segmentation; in-app flatten cannot remove an opaque bg).
//
// Pure Buffer -> stats. No DB, no Naver. Node runtime (sharp).
// ============================================================================

import sharp from 'sharp';

/** difficulty < this => SIMPLE (in-app), else COMPLEX (Adobe). Documented threshold. */
export const SIMPLE_MAX_DIFFICULTY = 50;

const RING_SAMPLE = 64;        // downsample grid; the 1px border ring is scanned
const WHITE_LUMA_MIN = 232;    // bright corner threshold (matches naver-normalize)
const WHITE_CHROMA_MAX = 26;   // near-neutral (low saturation) threshold
const FULL_VARIANCE_STDDEV = 64; // luma std-dev treated as a "fully varied" border

export interface BgDifficulty {
  mode: 'SIMPLE' | 'COMPLEX';
  /** 0 (trivial white bg) .. 100 (complex scene). */
  difficulty: number;
  /** 0..1 fraction of border-ring pixels that are bright AND near-neutral. */
  whiteNeutralRatio: number;
  /** Luma standard deviation of the border ring (0..255). */
  edgeStdDev: number;
  /** English machine summary of the contributing factors. */
  reason: string;
}

/**
 * Assess how hard it is to turn this image into a white-background representative.
 * Scans the border ring of a 64x64 downsample for white-neutral coverage and
 * color variance, then blends them into a 0..100 difficulty score.
 */
export async function assessBgDifficulty(input: Buffer): Promise<BgDifficulty> {
  const { data, info } = await sharp(input)
    .resize(RING_SAMPLE, RING_SAMPLE, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const ch = info.channels; // 3 after removeAlpha

  const lumas: number[] = [];
  let whiteNeutral = 0;
  let total = 0;

  const sample = (x: number, y: number) => {
    const i = (y * w + x) * ch;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    lumas.push(luma);
    total += 1;
    if (luma >= WHITE_LUMA_MIN && chroma <= WHITE_CHROMA_MAX) whiteNeutral += 1;
  };

  // Border ring: top + bottom rows, then left + right columns (corners once).
  for (let x = 0; x < w; x++) { sample(x, 0); sample(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { sample(0, y); sample(w - 1, y); }

  const whiteNeutralRatio = total ? whiteNeutral / total : 0;
  const mean = lumas.reduce((s, v) => s + v, 0) / (lumas.length || 1);
  const variance = lumas.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (lumas.length || 1);
  const edgeStdDev = Math.sqrt(variance);

  // A non-white ring drives difficulty up (weight 70); border color variance
  // adds the remainder (weight 30, normalized to a "fully varied" std-dev).
  const notWhite = 1 - whiteNeutralRatio;
  const varied = Math.min(edgeStdDev / FULL_VARIANCE_STDDEV, 1);
  const difficulty = Math.round(Math.min(100, notWhite * 70 + varied * 30));
  const mode: BgDifficulty['mode'] = difficulty < SIMPLE_MAX_DIFFICULTY ? 'SIMPLE' : 'COMPLEX';

  const reason =
    `border white-neutral ${(whiteNeutralRatio * 100).toFixed(0)}%, edge luma stddev ${edgeStdDev.toFixed(0)} ` +
    `-> difficulty ${difficulty} (${mode}; SIMPLE when < ${SIMPLE_MAX_DIFFICULTY})`;

  return { mode, difficulty, whiteNeutralRatio, edgeStdDev, reason };
}
