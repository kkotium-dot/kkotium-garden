// src/lib/automation/cloudinary-pipeline.ts
//
// Sprint 7-M1 (v3.1 FINAL Smart Asset Workflow) — Cloudinary URL builder.
//
// This module DOES NOT upload images. It only builds Cloudinary delivery URLs
// using `fetch` mode (Cloudinary fetches the source image from a public URL,
// applies transformations on the fly, and serves the result through its CDN).
//
// Vercel-safety rationale (workflow principle #38):
//   - No upload = no write credentials in the runtime path.
//   - Transformations are URL-encoded strings, so this module has zero
//     network side effects — every function here is a pure string builder.
//   - The only env var required at runtime is NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
//     which is public by design.
//
// Reference: https://cloudinary.com/documentation/fetch_remote_images

const FETCH_BASE = 'https://res.cloudinary.com';

function getCloudName(): string {
  const name = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!name) {
    throw new Error(
      'cloudinary-pipeline: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set',
    );
  }
  return name;
}

// ---------------------------------------------------------------------------
// Transformation primitives
// ---------------------------------------------------------------------------

export interface ResizeOptions {
  width?: number;
  height?: number;
  /** Cloudinary `c_*` crop mode. Defaults to 'pad' which preserves the
   *  whole subject (matches our "patient background" detail-page style). */
  crop?: 'pad' | 'limit' | 'fill' | 'fit' | 'scale' | 'thumb';
  /** Background color when crop mode adds padding. Hex without `#`. */
  background?: string;
  /** Gravity for crops that need it (auto-subject is the safest default). */
  gravity?: 'auto' | 'auto:subject' | 'center' | 'north' | 'south';
}

export interface QualityOptions {
  /** `q_auto` is the recommended default. Numeric override 1..100 supported. */
  quality?: 'auto' | 'auto:good' | 'auto:eco' | 'auto:low' | number;
  /** `f_auto` is the recommended default (serves WebP / AVIF when supported). */
  format?: 'auto' | 'jpg' | 'png' | 'webp';
}

export interface BackgroundRemovalOptions {
  /** Cloudinary background-removal add-on. `e_background_removal` requires
   *  the add-on to be enabled on the Cloudinary account; we wrap it with a
   *  feature flag check so dev environments without the add-on degrade
   *  gracefully (no transform applied). */
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

function encodeResize(opts: ResizeOptions | undefined): string | null {
  if (!opts) return null;
  const parts: string[] = [];
  if (opts.crop) parts.push(`c_${opts.crop}`);
  if (typeof opts.width === 'number') parts.push(`w_${opts.width}`);
  if (typeof opts.height === 'number') parts.push(`h_${opts.height}`);
  if (opts.background) parts.push(`b_rgb:${opts.background.replace(/^#/, '')}`);
  if (opts.gravity) parts.push(`g_${opts.gravity}`);
  return parts.length > 0 ? parts.join(',') : null;
}

function encodeQuality(opts: QualityOptions | undefined): string | null {
  if (!opts) return null;
  const parts: string[] = [];
  if (opts.quality !== undefined) parts.push(`q_${opts.quality}`);
  if (opts.format !== undefined) parts.push(`f_${opts.format}`);
  return parts.length > 0 ? parts.join(',') : null;
}

function encodeBackgroundRemoval(opts: BackgroundRemovalOptions | undefined): string | null {
  if (!opts?.enabled) return null;
  return 'e_background_removal';
}

export interface FetchUrlOptions {
  /** Source image URL — must be HTTPS and publicly accessible. */
  sourceUrl: string;
  resize?: ResizeOptions;
  quality?: QualityOptions;
  backgroundRemoval?: BackgroundRemovalOptions;
  /** Additional raw Cloudinary transformations appended at the end. */
  extra?: string[];
}

/**
 * Build a Cloudinary fetch URL. Returns a fully-qualified delivery URL.
 *
 * Example:
 *   buildFetchUrl({
 *     sourceUrl: 'https://example.com/p.jpg',
 *     resize: { crop: 'pad', width: 1080, height: 1080, background: 'FFFFFF' },
 *     quality: { quality: 'auto:good', format: 'auto' },
 *   })
 * -> https://res.cloudinary.com/<name>/image/fetch/c_pad,w_1080,h_1080,b_rgb:FFFFFF/q_auto:good,f_auto/https%3A%2F%2Fexample.com%2Fp.jpg
 */
export function buildFetchUrl(opts: FetchUrlOptions): string {
  const cloudName = getCloudName();
  const transformations: string[] = [];

  const bgRemoval = encodeBackgroundRemoval(opts.backgroundRemoval);
  if (bgRemoval) transformations.push(bgRemoval);

  const resize = encodeResize(opts.resize);
  if (resize) transformations.push(resize);

  const quality = encodeQuality(opts.quality);
  if (quality) transformations.push(quality);

  if (opts.extra && opts.extra.length > 0) {
    transformations.push(opts.extra.join(','));
  }

  const transformSegment = transformations.length > 0
    ? `${transformations.join('/')}/`
    : '';

  const encodedSource = encodeURIComponent(opts.sourceUrl);
  return `${FETCH_BASE}/${cloudName}/image/fetch/${transformSegment}${encodedSource}`;
}

// ---------------------------------------------------------------------------
// Named transformations (thumbnail-generator presets)
// ---------------------------------------------------------------------------

/** 1080×1080 white-bg padded fit. Use for the `clean` variant. */
export function urlCleanWhite(sourceUrl: string): string {
  return buildFetchUrl({
    sourceUrl,
    resize: { crop: 'pad', width: 1080, height: 1080, background: 'FFFFFF' },
    quality: { quality: 'auto:good', format: 'auto' },
  });
}

/** 1080×1080 white-bg padded fit with background-removal add-on. Falls back
 *  to padded-white when the add-on is disabled (no error thrown). */
export function urlCleanWhiteWithBgRemoval(sourceUrl: string): string {
  return buildFetchUrl({
    sourceUrl,
    backgroundRemoval: { enabled: true },
    resize: { crop: 'pad', width: 1080, height: 1080, background: 'FFFFFF' },
    quality: { quality: 'auto:good', format: 'auto' },
  });
}

/** 1080×1080 fit on a brand-color background. Pass the hex without `#`. */
export function urlCleanBrand(sourceUrl: string, bgHex: string): string {
  return buildFetchUrl({
    sourceUrl,
    resize: {
      crop: 'pad',
      width: 1080,
      height: 1080,
      background: bgHex.replace(/^#/, ''),
    },
    quality: { quality: 'auto:good', format: 'auto' },
  });
}

/** 860×860 thumb gallery preview (matches detail-page canvas width). */
export function urlGalleryThumb(sourceUrl: string): string {
  return buildFetchUrl({
    sourceUrl,
    resize: { crop: 'fill', width: 860, height: 860, gravity: 'auto:subject' },
    quality: { quality: 'auto:eco', format: 'auto' },
  });
}
