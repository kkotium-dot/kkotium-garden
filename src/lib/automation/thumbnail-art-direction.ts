// src/lib/automation/thumbnail-art-direction.ts
//
// Sprint 7-M2 Phase G8-ENGINE-Q1 — conceptTone -> art direction resolver.
//
// Spec: docs/handoff/THUMBNAIL_ART_DIRECTION_SYSTEM_2026-05-28.md
//
// The palette + craft parameters of a thumbnail are *derived from the
// diagnosis* (ConceptTone), not from designer intuition. This keeps tone
// aligned with the product identity (e.g. a warm kitchen product never gets a
// cold palette). Designer intuition is reserved for the craft recipe (shadows,
// reflection, spotlight) which lives in the generator.
//
// Pure module: no IO, no external image API. Safe to unit-test.

import type { ConceptTone } from '../diagnosis/concept-tone-inference';

/** RGB triple, 0..255 per channel. */
export type Rgb = [number, number, number];

export interface ArtPalette {
  /** Cyclorama wall color (gradient top). */
  topRgb: Rgb;
  /** Cyclorama floor color (gradient bottom). */
  floorRgb: Rgb;
  /** Accent hex for pills / rules / kickers. */
  accent: string;
  /** Soft spotlight glow color (near-white, slightly tinted). */
  spotlight: string;
}

export interface ArtDirection {
  palette: ArtPalette;
  /** Product slot scale multiplier (1.0 = default footprint). */
  productScale: number;
  /** Typography scale multiplier (1.0 = default). */
  typeScale: number;
  /** Radial spotlight opacity, 0..1. */
  spotlightStrength: number;
  /** Add an edge vignette for premium / professional drama. */
  vignette: boolean;
  /** Horizon position (0..1) where the cyclorama wall meets the floor. */
  horizon: number;
}

// ---------------------------------------------------------------------------
// Palette presets — keyed to the real ColorMood enum (warm/calm/vivid/mono)
// ---------------------------------------------------------------------------

const PALETTES: Record<ConceptTone['colorMood'], ArtPalette> = {
  // warm — kitchen / food / friendly daily goods
  warm: {
    topRgb: [244, 238, 230],
    floorRgb: [252, 248, 242],
    accent: '#D6965A',
    spotlight: '#FFFDF8',
  },
  // calm — clean / tech / fresh (the "cool" family)
  calm: {
    topRgb: [236, 240, 244],
    floorRgb: [250, 251, 253],
    accent: '#5E8BAE',
    spotlight: '#FFFFFF',
  },
  // vivid — high-impact / event
  vivid: {
    topRgb: [250, 240, 244],
    floorRgb: [255, 250, 252],
    accent: '#E62310',
    spotlight: '#FFFFFF',
  },
  // mono — monochrome / minimal neutral
  mono: {
    topRgb: [238, 238, 240],
    floorRgb: [250, 250, 251],
    accent: '#3A3A3C',
    spotlight: '#FFFFFF',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Pull an RGB triple toward neutral gray by `amount` (0..1). Used for the
 *  premium price tier where a lower-saturation backdrop reads as upscale. */
function desaturate(rgb: Rgb, amount: number): Rgb {
  const gray = Math.round((rgb[0] + rgb[1] + rgb[2]) / 3);
  const mix = (c: number): number => Math.round(c + (gray - c) * amount);
  return [mix(rgb[0]), mix(rgb[1]), mix(rgb[2])];
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

const DEFAULT_DIRECTION: Omit<ArtDirection, 'palette'> = {
  productScale: 1.0,
  typeScale: 1.0,
  spotlightStrength: 0.42,
  vignette: false,
  horizon: 0.62,
};

/**
 * Resolve the art direction (palette + craft parameters) from the diagnosis
 * ConceptTone. When no ConceptTone is available (diagnose not run) the WARM
 * preset is used as the safest general-purpose fallback.
 */
export function pickArtDirection(conceptTone?: ConceptTone | null): ArtDirection {
  // Base palette from colorMood (default warm).
  const mood = conceptTone?.colorMood;
  let palette: ArtPalette = mood && PALETTES[mood] ? PALETTES[mood] : PALETTES.warm;

  let productScale = DEFAULT_DIRECTION.productScale;
  let typeScale = DEFAULT_DIRECTION.typeScale;
  let spotlightStrength = DEFAULT_DIRECTION.spotlightStrength;
  let vignette = DEFAULT_DIRECTION.vignette;
  const horizon = DEFAULT_DIRECTION.horizon;

  if (conceptTone) {
    // pricePosition — budget reads bright + close; premium reads restrained.
    if (conceptTone.pricePosition === 'budget') {
      spotlightStrength += 0.08;
    } else if (conceptTone.pricePosition === 'premium') {
      palette = {
        ...palette,
        topRgb: desaturate(palette.topRgb, 0.35),
        floorRgb: desaturate(palette.floorRgb, 0.25),
      };
      productScale *= 0.92; // more negative space
      vignette = true;
    }

    // emotionalTone — friendly = soft, professional/trust = focused drama.
    if (conceptTone.emotionalTone === 'friendly') {
      spotlightStrength = Math.min(spotlightStrength, 0.42);
    } else if (
      conceptTone.emotionalTone === 'professional' ||
      conceptTone.emotionalTone === 'trust'
    ) {
      spotlightStrength += 0.06;
      vignette = true;
    } else if (conceptTone.emotionalTone === 'sensory') {
      spotlightStrength += 0.05;
    }

    // persona — senior gets larger, higher-contrast type.
    if (conceptTone.persona === 'senior') {
      typeScale *= 1.15;
    }

    // genre — minimal favors negative space (smaller product).
    if (conceptTone.genre === 'minimal') {
      productScale *= 0.9;
    }
  }

  return {
    palette,
    productScale: clamp(productScale, 0.7, 1.15),
    typeScale: clamp(typeScale, 0.85, 1.3),
    spotlightStrength: clamp(spotlightStrength, 0, 0.7),
    vignette,
    horizon,
  };
}
