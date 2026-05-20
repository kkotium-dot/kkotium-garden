// src/lib/art-director/image-analyzer.ts
//
// Sprint 7-M2 5-B — Image analysis adapter for the art director.
//
// Design choice — kept as an INTERFACE not a runtime caller. Adobe MCP
// (asset_inline_preview) is only callable from sessions where the MCP
// server is connected; an HTTP route on Vercel doesn't have that. The
// caller (API route or background worker) is responsible for performing
// the actual MCP call and passing the result here as a plain object.
//
// What this module gives us
//   1. A typed contract for image analysis data flowing into the art
//      director (so the prompt translator never depends on Adobe internals).
//   2. A lightweight Sharp-based fallback path (extractFallbackPalette) for
//      when MCP is unavailable but we still want some color signal.
//   3. A confidence score that the status classifier reads to decide
//      auto_bloomed vs lets_refine vs needs_your_magic.

import sharp from 'sharp';

// ---------------------------------------------------------------------------
// Public types — used by prompt-translator and the API route
// ---------------------------------------------------------------------------

export interface ImageAnalysisResult {
  /** Top dominant colors as English descriptors ("warm beige", "soft white"). */
  dominantColors: string[];
  /** Visible objects ("ceramic vessel", "wooden surface"). May be empty if
   *  Adobe MCP did not run or the OCR/CV layer found nothing. */
  detectedObjects: string[];
  /** One-phrase lighting mood ("soft natural light", "harsh studio flash"). */
  lightingMood: string;
  /** 0..1 — how confident we are in the result (1 = MCP success, 0.3 = sharp
   *  palette fallback only, 0 = nothing). */
  confidence: number;
  /** Provenance, used by the cache layer to decide whether to invalidate. */
  source: 'adobe_mcp' | 'sharp_fallback' | 'none';
}

export const EMPTY_IMAGE_ANALYSIS: ImageAnalysisResult = {
  dominantColors: [],
  detectedObjects: [],
  lightingMood: '',
  confidence: 0,
  source: 'none',
};

// ---------------------------------------------------------------------------
// Sharp-based color palette fallback
// ---------------------------------------------------------------------------

interface RGBStat {
  r: number;
  g: number;
  b: number;
}

/** Sample the image at a low resolution and bin pixels into 8 color buckets,
 *  returning the top 3 by share. Cheap, no external API. */
async function samplePalette(buffer: Buffer): Promise<RGBStat[]> {
  const { data, info } = await sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize(64, 64, { fit: 'inside', withoutEnlargement: false })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const bins = new Map<string, { r: number; g: number; b: number; count: number }>();
  for (let i = 0; i + 2 < data.length; i += channels) {
    // Quantize each channel to 6 levels (~5-bit) to bucket similar colors.
    const r = Math.round(data[i] / 51) * 51;
    const g = Math.round(data[i + 1] / 51) * 51;
    const b = Math.round(data[i + 2] / 51) * 51;
    const key = `${r}-${g}-${b}`;
    const cur = bins.get(key);
    if (cur) {
      cur.count += 1;
    } else {
      bins.set(key, { r, g, b, count: 1 });
    }
  }
  const sorted = Array.from(bins.values()).sort((a, b) => b.count - a.count);
  return sorted.slice(0, 3).map(({ r, g, b }) => ({ r, g, b }));
}

/** Translate an RGB triplet to a short English color phrase. Heuristic — the
 *  goal is to give Firefly a palette hint, not nail a Pantone name. */
function describeColor(rgb: RGBStat): string {
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const luminance = (r + g + b) / 3;

  if (max - min < 25 && luminance > 200) return 'soft white';
  if (max - min < 25 && luminance > 130) return 'warm grey';
  if (max - min < 25 && luminance < 70) return 'deep charcoal';
  if (max - min < 25) return 'muted neutral';

  if (r >= g && r >= b) {
    if (g > b) return luminance > 150 ? 'warm beige' : 'earthy terracotta';
    return luminance > 150 ? 'soft pink' : 'deep crimson';
  }
  if (g >= r && g >= b) {
    return luminance > 150 ? 'fresh sage' : 'forest green';
  }
  // Blue dominant
  return luminance > 150 ? 'soft sky blue' : 'navy depth';
}

// ---------------------------------------------------------------------------
// Public entries
// ---------------------------------------------------------------------------

export interface FallbackOptions {
  /** Pass a pre-fetched Buffer to skip the network round-trip. */
  buffer?: Buffer;
  /** When buffer is omitted, fetch from this URL. */
  imageUrl?: string;
}

/**
 * Sharp-based fallback when Adobe MCP is unavailable. Returns palette only
 * (no object detection, no lighting). Sets source='sharp_fallback' and
 * confidence=0.3 so downstream status logic knows to lean toward lets_refine.
 */
export async function extractFallbackPalette(
  options: FallbackOptions,
): Promise<ImageAnalysisResult> {
  let buffer = options.buffer;
  if (!buffer && options.imageUrl) {
    try {
      const res = await fetch(options.imageUrl);
      if (!res.ok) return EMPTY_IMAGE_ANALYSIS;
      buffer = Buffer.from(await res.arrayBuffer());
    } catch {
      return EMPTY_IMAGE_ANALYSIS;
    }
  }
  if (!buffer) return EMPTY_IMAGE_ANALYSIS;

  try {
    const top = await samplePalette(buffer);
    return {
      dominantColors: top.map(describeColor),
      detectedObjects: [],
      lightingMood: '',
      confidence: 0.3,
      source: 'sharp_fallback',
    };
  } catch {
    return EMPTY_IMAGE_ANALYSIS;
  }
}

/**
 * Normalize a raw Adobe MCP `asset_inline_preview` result into the
 * ImageAnalysisResult contract. The caller is responsible for the MCP call;
 * this function only validates and shapes the input so the rest of the
 * art-director pipeline stays decoupled.
 */
export function fromAdobePreview(raw: {
  dominantColors?: unknown;
  detectedObjects?: unknown;
  lightingMood?: unknown;
}): ImageAnalysisResult {
  const colors = Array.isArray(raw.dominantColors)
    ? raw.dominantColors.filter((v): v is string => typeof v === 'string').slice(0, 5)
    : [];
  const objects = Array.isArray(raw.detectedObjects)
    ? raw.detectedObjects.filter((v): v is string => typeof v === 'string').slice(0, 5)
    : [];
  const lighting = typeof raw.lightingMood === 'string' ? raw.lightingMood : '';

  const hasAny = colors.length > 0 || objects.length > 0 || lighting.length > 0;
  return {
    dominantColors: colors,
    detectedObjects: objects,
    lightingMood: lighting,
    confidence: hasAny ? 1 : 0,
    source: hasAny ? 'adobe_mcp' : 'none',
  };
}
