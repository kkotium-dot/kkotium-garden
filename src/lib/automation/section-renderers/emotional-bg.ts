// src/lib/automation/section-renderers/emotional-bg.ts
//
// Shared background helpers for emotional sections (STEP 2-spread group 2).
//
// emotional sections expose the mood backdrop, but their text/cards are designed
// dark-on-light, so a raw photo behind them would break contrast. The hard
// requirement is "text contrast must be guaranteed". So in mood mode we lay the
// cover-fit mood photo, then a tuned white readability scrim over it: the base
// becomes a light, mood-tinted wash where every existing dark-on-light layer
// stays legible while the photo's color/texture still reads through.
//
// In solid mode (no lifestyleAssetUrl) the helper returns exactly the prior
// createCanvas(size, bg) — byte-identical, regression 0 (P0 publish assets).
//
// MOOD_SCRIM_ALPHA is the single knob for mood intensity: lower = more photo
// shows (bolder mood), higher = whiter (safer contrast). Start conservative.

import sharp from 'sharp';
import { createCanvas, fetchImageBuffer } from '../sharp-composite';
import type { SectionRenderContext } from './types';

/** White scrim opacity over the mood photo. 0 = full photo, 1 = solid white.
 *  Conservative default guarantees legibility; tunable on Desktop feedback. */
export const MOOD_SCRIM_ALPHA = 0.62;

export interface EmotionalBackdrop {
  /** The section base buffer (mood-tinted wash, or the solid color fallback). */
  canvas: Buffer;
  /** True only when a mood photo was successfully laid. */
  usedLifestyle: boolean;
}

/**
 * Resolve an emotional section's base. Mood mode → cover-fit photo + white
 * readability scrim. Solid mode / fetch error → createCanvas(size, bg)
 * (byte-identical to the prior behavior).
 */
export async function resolveEmotionalBackdrop(
  ctx: SectionRenderContext,
  size: { width: number; height: number },
  bg: string,
): Promise<EmotionalBackdrop> {
  if (!ctx.lifestyleAssetUrl) {
    return { canvas: await createCanvas(size, bg), usedLifestyle: false };
  }
  try {
    const buf = await fetchImageBuffer(ctx.lifestyleAssetUrl);
    const cover = await sharp(buf)
      .resize(size.width, size.height, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();
    const scrim = Buffer.from(
      `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">` +
        `<rect width="${size.width}" height="${size.height}" fill="rgba(255,255,255,${MOOD_SCRIM_ALPHA})" />` +
        '</svg>',
    );
    const canvas = await sharp(cover)
      .composite([{ input: scrim, top: 0, left: 0 }])
      .png()
      .toBuffer();
    return { canvas, usedLifestyle: true };
  } catch {
    return { canvas: await createCanvas(size, bg), usedLifestyle: false };
  }
}

/**
 * A faint, blurred contact-shadow ellipse on a full-size transparent layer,
 * centered under a product cutout's base so it does not look pasted onto the
 * scene. emotional/mood-mode only — never composited on the solid path.
 */
export async function groundShadowLayer(
  size: { width: number; height: number },
  opts: { centerX: number; baseY: number; width: number },
): Promise<Buffer> {
  const rx = Math.max(40, Math.round(opts.width * 0.42));
  const ry = Math.max(8, Math.round(opts.width * 0.06));
  const pad = 36;
  const sw = rx * 2 + pad * 2;
  const sh = ry * 2 + pad * 2;
  const ellipse = Buffer.from(
    `<svg width="${sw}" height="${sh}" xmlns="http://www.w3.org/2000/svg">` +
      `<ellipse cx="${Math.round(sw / 2)}" cy="${Math.round(sh / 2)}" rx="${rx}" ry="${ry}" fill="rgba(0,0,0,0.18)" />` +
      '</svg>',
  );
  // Blur the small ellipse buffer (reliable, no SVG-filter dependency), then
  // place it onto a full-size transparent layer at the product's base point.
  const blurred = await sharp(ellipse).blur(12).png().toBuffer();
  const left = Math.round(opts.centerX - sw / 2);
  const top = Math.round(opts.baseY - sh / 2);
  return sharp({
    create: { width: size.width, height: size.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: blurred, top, left }])
    .png()
    .toBuffer();
}
