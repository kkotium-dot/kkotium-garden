// src/lib/images/naver-normalize.ts
// ============================================================================
// Naver image-spec normalization (Sharp, Node runtime only). Phase 2 task 5.
// Authority: KKOTIUM_PRODUCT_SWAP_LOOP_DESIGN_2026-06-06.md §5.
//
//   Representative: 1:1, 1300px, sRGB, JPEG q80, mozjpeg, no-enlarge,
//     flattened onto WHITE. Policy: representative is a white-background product
//     cutout ONLY — never a lifestyle/mood composite (Naver 2024-10-28 rule).
//   Detail: width 860px, height segmented at <= 5000px.
//
// Pure Buffer transforms — no DB, no Naver, no storage. Callers own I/O.
// A route consuming this MUST `export const runtime = 'nodejs'` (Sharp needs it).
// ============================================================================

import sharp from 'sharp';

export const NAVER_REPRESENTATIVE_SIZE = 1300;   // px, 1:1
export const NAVER_DETAIL_WIDTH = 860;           // px
export const NAVER_DETAIL_MAX_HEIGHT = 5000;     // px per segment

const WHITE = { r: 255, g: 255, b: 255 } as const;

export class RepresentativePolicyError extends Error {
  reason: string;
  constructor(message: string, reason: string) {
    super(message);
    this.name = 'RepresentativePolicyError';
    this.reason = reason;
  }
}

// Asset kinds that may legitimately become a representative image. A lifestyle
// / mood composite must NOT — it belongs to detail/additional slots only.
const REP_ALLOWED_ASSET_KINDS = new Set(['product_cutout', 'white_bg', 'naver_normalize']);

/**
 * Metadata guard: reject routing a non-cutout (e.g. mood_bg composite) into the
 * representative slot. Cheap pre-check before the pixel-level guard.
 */
export function assertRepresentativeAssetKind(assetKind: string): void {
  if (!REP_ALLOWED_ASSET_KINDS.has(assetKind)) {
    throw new RepresentativePolicyError(
      `representative image must be a white-bg cutout (asset_kind=${assetKind} is detail/additional only)`,
      'ASSET_KIND_NOT_CUTOUT',
    );
  }
}

/**
 * Pixel-level guard: sample the four corners and require a light, near-neutral
 * background. Catches a lifestyle/mood composite (colored/dark scene) that was
 * mistakenly routed to the representative slot even if its metadata looked ok.
 */
export async function assertWhiteBackground(
  input: Buffer,
  opts: { minLuma?: number; maxChroma?: number } = {},
): Promise<void> {
  const minLuma = opts.minLuma ?? 232;   // corners must be bright
  const maxChroma = opts.maxChroma ?? 26; // and near-neutral (low saturation)

  const base = sharp(input).flatten({ background: WHITE });
  const meta = await base.metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  if (W < 8 || H < 8) {
    throw new RepresentativePolicyError('cannot check representative image — image too small', 'TOO_SMALL');
  }
  const pw = Math.max(4, Math.round(W * 0.08));
  const ph = Math.max(4, Math.round(H * 0.08));
  const corners: Array<{ left: number; top: number }> = [
    { left: 0, top: 0 },
    { left: W - pw, top: 0 },
    { left: 0, top: H - ph },
    { left: W - pw, top: H - ph },
  ];

  for (const c of corners) {
    // Re-create the pipeline per extract (Sharp single-use after a terminal op).
    const stats = await sharp(input)
      .flatten({ background: WHITE })
      .extract({ left: c.left, top: c.top, width: pw, height: ph })
      .stats();
    const [r, g, b] = stats.channels;
    const luma = 0.299 * r.mean + 0.587 * g.mean + 0.114 * b.mean;
    const chroma = Math.max(r.mean, g.mean, b.mean) - Math.min(r.mean, g.mean, b.mean);
    if (luma < minLuma || chroma > maxChroma) {
      throw new RepresentativePolicyError(
        `representative background is not white/neutral (corner luma=${luma.toFixed(0)}, chroma=${chroma.toFixed(0)}) ` +
        '— a lifestyle composite cannot be used as the representative image',
        'BACKGROUND_NOT_WHITE',
      );
    }
  }
}

/**
 * Normalize to a Naver-compliant representative image: white background, square,
 * 1300px, sRGB, JPEG q80 (mozjpeg). By default enforces the white-background
 * policy guard; pass enforceWhiteBg:false only for assets already proven white.
 */
export async function normalizeRepresentative(
  input: Buffer,
  opts: { enforceWhiteBg?: boolean; assetKind?: string } = {},
): Promise<Buffer> {
  if (opts.assetKind) assertRepresentativeAssetKind(opts.assetKind);
  if (opts.enforceWhiteBg !== false) await assertWhiteBackground(input);

  return sharp(input)
    .flatten({ background: WHITE })
    .resize(NAVER_REPRESENTATIVE_SIZE, NAVER_REPRESENTATIVE_SIZE, {
      fit: 'contain',
      background: WHITE,
      withoutEnlargement: true,
    })
    .toColorspace('srgb')
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

/**
 * Normalize a detail image to 860px width, segmented so each piece is
 * <= 5000px tall (Naver recommends short segments). Lifestyle/mood composites
 * are allowed here — this is the detail/additional slot. Returns 1..N JPEG
 * buffers top-to-bottom.
 */
export async function normalizeDetail(input: Buffer): Promise<Buffer[]> {
  const scaled = sharp(input).resize(NAVER_DETAIL_WIDTH, null, { withoutEnlargement: false });
  const buf = await scaled.toColorspace('srgb').png().toBuffer();
  const meta = await sharp(buf).metadata();
  const W = meta.width ?? NAVER_DETAIL_WIDTH;
  const H = meta.height ?? 0;

  if (H <= NAVER_DETAIL_MAX_HEIGHT) {
    const out = await sharp(buf).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    return [out];
  }

  const segments: Buffer[] = [];
  for (let top = 0; top < H; top += NAVER_DETAIL_MAX_HEIGHT) {
    const h = Math.min(NAVER_DETAIL_MAX_HEIGHT, H - top);
    const seg = await sharp(buf)
      .extract({ left: 0, top, width: W, height: h })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    segments.push(seg);
  }
  return segments;
}
