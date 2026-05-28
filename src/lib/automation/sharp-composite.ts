// src/lib/automation/sharp-composite.ts
//
// Sprint 7-M1 (v3.1 FINAL Smart Asset Workflow) — Sharp building blocks.
//
// Reusable Buffer-level helpers for thumbnail-generator.ts and (later)
// section-builder.ts. Every function here takes input Buffers / URLs and
// returns output Buffers. Storage and upload concerns live in the caller.
//
// Design notes
//   - Sharp runs in Node runtime only. Any API route consuming this must
//     export `runtime = 'nodejs'`.
//   - All overlays use raw SVG strings, sent through Sharp.composite(). No
//     fonts are loaded from disk — Pretendard is embedded via web-safe
//     CSS fallback (`-apple-system, sans-serif`) so the build never breaks
//     on a missing font file. Designer-grade typography lands in Sprint
//     7-M2 with a Pretendard webfont injection step.
//   - SVG text is escaped via xmlEscape() to prevent injection from
//     untrusted product names.

import sharp from 'sharp';
import { buildImageFetchHeaders } from '@/lib/image-fetch-headers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CanvasSize {
  width: number;
  height: number;
}

export interface PaletteTokens {
  primary: string;
  secondary: string;
  accent: string;
}

export interface TextOverlayOptions {
  text: string;
  /** Anchor point in pixels relative to canvas top-left. */
  x: number;
  y: number;
  fontSizePx: number;
  /** Hex color string, e.g. "#1C1917". */
  color: string;
  /** Optional max width; longer text wraps. */
  maxWidth?: number;
  /** Optional weight (defaults to 600 for hero, 400 for body). */
  fontWeight?: number;
  /** Optional letter spacing in em. */
  letterSpacingEm?: number;
}

export interface BadgeOverlayOptions {
  label: string;
  x: number;
  y: number;
  fillColor: string;
  textColor: string;
  paddingXPx?: number;
  paddingYPx?: number;
  fontSizePx?: number;
  /** Corner radius. Defaults to 12. */
  radius?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape a string for safe inclusion in an SVG text node. */
export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Approximate the rendered width of a string in pixels at a given font size.
 *  Used by autosize routines; not exact (we have no font metrics) — assumes
 *  an average advance of ~0.55em which matches Pretendard medium well enough
 *  for layout safety margins. */
export function estimateTextWidthPx(text: string, fontSizePx: number): number {
  return Math.ceil(text.length * fontSizePx * 0.55);
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

/** Solid-color canvas of the given dimensions. */
export async function createCanvas(
  size: CanvasSize,
  bgColor: string,
): Promise<Buffer> {
  return sharp({
    create: {
      width: size.width,
      height: size.height,
      channels: 4,
      background: bgColor,
    },
  })
    .png()
    .toBuffer();
}

/** Fetch a remote image into a Sharp-compatible Buffer. Caller is responsible
 *  for trusting the URL host (we don't do SSRF screening here — Cloudinary
 *  fetch URLs already pass through Cloudinary's domain allow-list). Hotlink-
 *  protected supplier CDNs (domeggook) require browser UA + Referer headers. */
export async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  const res = await fetch(imageUrl, { headers: buildImageFetchHeaders(imageUrl) });
  if (!res.ok) {
    throw new Error(`fetchImageBuffer: ${res.status} ${res.statusText} for ${imageUrl}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** Resize+fit an image to the given dimensions with a contain strategy and
 *  optional background padding. Returns PNG. */
export async function fitImage(
  imageBuffer: Buffer,
  size: CanvasSize,
  bgColor: string = '#FFFFFF',
): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(size.width, size.height, {
      fit: 'contain',
      background: bgColor,
    })
    .png()
    .toBuffer();
}

/** Render a text overlay layer at the given anchor as a transparent PNG of
 *  the same dimensions as the canvas. Composite this on top of a canvas via
 *  overlayOnto(). */
export async function renderTextOverlay(
  canvas: CanvasSize,
  opts: TextOverlayOptions,
): Promise<Buffer> {
  const escaped = xmlEscape(opts.text);
  const weight = opts.fontWeight ?? 600;
  const letterSpacing = opts.letterSpacingEm
    ? `letter-spacing="${opts.letterSpacingEm}em"`
    : '';
  // Use textLength + lengthAdjust when maxWidth is given so long titles
  // condense rather than overflow.
  const lengthAttrs = opts.maxWidth
    ? `textLength="${opts.maxWidth}" lengthAdjust="spacingAndGlyphs"`
    : '';
  const svg = `<svg width="${canvas.width}" height="${canvas.height}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .t { font-family: -apple-system, "Pretendard", BlinkMacSystemFont, sans-serif;
           font-size: ${opts.fontSizePx}px;
           font-weight: ${weight};
           fill: ${opts.color}; }
    </style>
    <text x="${opts.x}" y="${opts.y}" class="t" ${letterSpacing} ${lengthAttrs}>${escaped}</text>
  </svg>`;
  return Buffer.from(svg);
}

/** Render a rounded-rect badge with centered label text. Returns a
 *  transparent PNG of the canvas dimensions for compositing. */
export async function renderBadgeOverlay(
  canvas: CanvasSize,
  opts: BadgeOverlayOptions,
): Promise<Buffer> {
  const escaped = xmlEscape(opts.label);
  const fontSize = opts.fontSizePx ?? 28;
  const padX = opts.paddingXPx ?? 28;
  const padY = opts.paddingYPx ?? 14;
  const radius = opts.radius ?? 12;
  const textWidth = estimateTextWidthPx(opts.label, fontSize);
  const badgeWidth = textWidth + padX * 2;
  const badgeHeight = fontSize + padY * 2;
  const svg = `<svg width="${canvas.width}" height="${canvas.height}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .b { font-family: -apple-system, "Pretendard", BlinkMacSystemFont, sans-serif;
           font-size: ${fontSize}px;
           font-weight: 700;
           fill: ${opts.textColor}; }
    </style>
    <rect x="${opts.x}" y="${opts.y}" width="${badgeWidth}" height="${badgeHeight}"
          rx="${radius}" ry="${radius}" fill="${opts.fillColor}" />
    <text x="${opts.x + padX}" y="${opts.y + padY + fontSize * 0.8}" class="b">${escaped}</text>
  </svg>`;
  return Buffer.from(svg);
}

/** Composite a list of overlay layers onto a base canvas. Layers are applied
 *  in order — later layers paint on top of earlier ones. */
export async function overlayOnto(
  base: Buffer,
  overlays: Buffer[],
): Promise<Buffer> {
  if (overlays.length === 0) return base;
  return sharp(base)
    .composite(overlays.map((input) => ({ input })))
    .png()
    .toBuffer();
}

/** Apply a soft vignette to the bottom half of the canvas — useful for
 *  lifestyle variants where overlaid copy needs contrast against busy
 *  backgrounds. */
export async function applyBottomVignette(
  base: Buffer,
  size: CanvasSize,
  opacity: number = 0.45,
): Promise<Buffer> {
  const svg = `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="black" stop-opacity="0" />
        <stop offset="100%" stop-color="black" stop-opacity="${opacity}" />
      </linearGradient>
    </defs>
    <rect width="${size.width}" height="${size.height}" fill="url(#vignette)" />
  </svg>`;
  return overlayOnto(base, [Buffer.from(svg)]);
}

/** Export the final composite as a JPEG for transport efficiency. */
export async function exportJpeg(
  buffer: Buffer,
  quality: number = 90,
): Promise<Buffer> {
  return sharp(buffer).jpeg({ quality, mozjpeg: true }).toBuffer();
}
