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

// ---------------------------------------------------------------------------
// G8-ENGINE-Q1 — premium craft primitives (cyclorama sweep / spotlight /
// ground shadow / floor reflection / edge vignette)
// ---------------------------------------------------------------------------

function rgbCss(rgb: [number, number, number]): string {
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

/** Rasterize a seamless cyclorama "sweep" — a wall color fading into a floor
 *  color with a soft seam around the horizon (no hard line). Replaces the flat
 *  single-color fill so products read with depth instead of pasted-on. */
export async function renderSweep(
  size: CanvasSize,
  topRgb: [number, number, number],
  floorRgb: [number, number, number],
  horizon: number = 0.62,
): Promise<Buffer> {
  const top = rgbCss(topRgb);
  const floor = rgbCss(floorRgb);
  const seamStart = Math.max(0, (horizon - 0.14) * 100);
  const seamEnd = Math.min(100, (horizon + 0.06) * 100);
  const svg = `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sweep" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${top}" />
        <stop offset="${seamStart}%" stop-color="${top}" />
        <stop offset="${seamEnd}%" stop-color="${floor}" />
        <stop offset="100%" stop-color="${floor}" />
      </linearGradient>
    </defs>
    <rect width="${size.width}" height="${size.height}" fill="url(#sweep)" />
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Soft radial spotlight glow centered behind the product. Returned as an SVG
 *  overlay buffer (composited directly). */
export function renderRadialGlow(
  size: CanvasSize,
  cx: number,
  cy: number,
  radius: number,
  color: string = '#FFFFFF',
  strength: number = 0.4,
): Buffer {
  const mid = Math.max(0, strength * 0.4);
  const svg = `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="glow" cx="${cx}" cy="${cy}" r="${radius}" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${color}" stop-opacity="${strength}" />
        <stop offset="60%" stop-color="${color}" stop-opacity="${mid}" />
        <stop offset="100%" stop-color="${color}" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="${size.width}" height="${size.height}" fill="url(#glow)" />
  </svg>`;
  return Buffer.from(svg);
}

/** Rasterize a single blurred dark ellipse used as a ground shadow. Call twice
 *  (wide soft cast + tight dark contact) to ground the product with weight. */
export async function renderEllipseShadow(
  size: CanvasSize,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  opacity: number,
  blurSigma: number,
): Promise<Buffer> {
  const svg = `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="black" fill-opacity="${opacity}" />
  </svg>`;
  return sharp(Buffer.from(svg)).blur(Math.max(0.3, blurSigma)).png().toBuffer();
}

/** Build a faded vertical mirror of a product buffer for a studio floor
 *  reflection. Flips the product and applies a top-to-bottom alpha fade with
 *  `maxAlpha` at the contact edge fading to 0. Output matches the input size. */
export async function makeReflection(
  productBuffer: Buffer,
  maxAlpha: number = 0.2,
): Promise<Buffer> {
  const meta = await sharp(productBuffer).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w === 0 || h === 0) return productBuffer;
  // .flip() mirrors vertically (top<->bottom) so the contact edge stays on top.
  const flipped = await sharp(productBuffer).flip().png().toBuffer();
  const mask = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="white" stop-opacity="${maxAlpha}" />
        <stop offset="50%" stop-color="white" stop-opacity="0" />
        <stop offset="100%" stop-color="white" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#fade)" />
  </svg>`;
  return sharp(flipped)
    .composite([{ input: Buffer.from(mask), blend: 'dest-in' }])
    .png()
    .toBuffer();
}

/** Apply a subtle radial edge vignette (darker corners) for premium drama. */
export async function applyEdgeVignette(
  base: Buffer,
  size: CanvasSize,
  opacity: number = 0.16,
): Promise<Buffer> {
  const r = Math.round(Math.max(size.width, size.height) * 0.72);
  const svg = `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="edge" cx="${size.width / 2}" cy="${size.height / 2}" r="${r}" gradientUnits="userSpaceOnUse">
        <stop offset="55%" stop-color="black" stop-opacity="0" />
        <stop offset="100%" stop-color="black" stop-opacity="${opacity}" />
      </radialGradient>
    </defs>
    <rect width="${size.width}" height="${size.height}" fill="url(#edge)" />
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
