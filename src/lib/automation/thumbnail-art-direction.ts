// src/lib/automation/thumbnail-art-direction.ts
//
// Sprint 7-M2 Phase G8-ENGINE-Q3 — 2-step art direction resolver.
//
// Spec: docs/research/KKOTIUM_ART_DIRECTION_RESEARCH_2026-05-29.md (authority)
//       + docs/handoff/HANDOFF_g8_engine_q3_2026-05-29.md (§2-D)
//
// Q1 was a 1-step resolver (conceptTone -> palette). Q3 makes it 2-step:
//   step 1: mapCategoryToTone(conceptTone, category) -> ToneDirective
//           (the category's trust signal decides the base tone — research §8)
//   step 2: applyPersonaModulation(toneDirective, conceptTone) -> ArtDirection
//           (persona x pricePosition modulate craft + accessibility)
//
// The palette + craft parameters stay *derived from data* (diagnosis +
// category), not designer intuition. Designer intuition is reserved for the
// craft recipe (shadows, reflection, spotlight) in the generator.
//
// Pure module: no IO, no external image API. Safe to unit-test.

import type { ConceptTone } from '../diagnosis/concept-tone-inference';
import {
  mapCategoryToTone,
  type ToneDirective,
  type BaseTone,
  type MapCategoryToToneOptions,
} from './category-tone-mapper';

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
  // ── G8-ENGINE-Q3 additions ────────────────────────────────────────────
  /** Step-1 categorical directive (research §8). Surfaced in the API response
   *  so Desktop / UI can confirm the category-driven tone decision. */
  toneDirective: ToneDirective;
  /** WCAG contrast target for overlaid text. 4.5 default, 7.0 for senior. */
  contrastMin: number;
  /** Enforced ink color for dark-on-light text. '#111111' for senior (no gray),
   *  otherwise the standard near-black. */
  textColor: string;
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

const DEFAULT_DIRECTION: Omit<ArtDirection, 'palette' | 'toneDirective'> = {
  productScale: 1.0,
  typeScale: 1.0,
  spotlightStrength: 0.42,
  vignette: false,
  horizon: 0.62,
  contrastMin: 4.5,
  textColor: '#1C1917',
};

/** Cinematic dark cyclorama for foreign-cinematic / darkPremium categories
 *  (research §4-D — Jo Malone-like premium fragrance read). */
const DARK_PALETTE: ArtPalette = {
  topRgb: [26, 25, 28],
  floorRgb: [16, 15, 17],
  accent: '#C9A24B',
  spotlight: '#FFF6E2',
};

function mixRgbToward(rgb: Rgb, target: Rgb, amount: number): Rgb {
  const m = (a: number, b: number) => Math.round(a + (b - a) * amount);
  return [m(rgb[0], target[0]), m(rgb[1], target[1]), m(rgb[2], target[2])];
}

function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hexFromRgb(rgb: Rgb): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(rgb[0])}${c(rgb[1])}${c(rgb[2])}`;
}

/** Darken a hex toward ink by `amount` (0..1) — lifts white-on-accent contrast
 *  for the senior persona so the badge text clears WCAG AAA. */
function darkenHex(hex: string, amount: number): string {
  return hexFromRgb(mixRgbToward(hexToRgb(hex), [17, 17, 17], amount));
}

/** Apply the categorical baseTone to a colorMood palette. modern-minimal keeps
 *  the bright studio palette; the others shift toward their signature read. */
function applyBaseTone(
  palette: ArtPalette,
  baseTone: BaseTone,
  darkPremium: boolean,
  premium: boolean,
): { palette: ArtPalette; vignette: boolean; spotlightBoost: number } {
  if (baseTone === 'foreign-cinematic' || (darkPremium && premium)) {
    return { palette: { ...DARK_PALETTE }, vignette: true, spotlightBoost: 0.12 };
  }
  switch (baseTone) {
    case 'korean-traditional':
      return {
        palette: {
          topRgb: mixRgbToward(palette.topRgb, [232, 225, 213], 0.6),
          floorRgb: mixRgbToward(palette.floorRgb, [244, 239, 230], 0.5),
          accent: '#8A7B66',
          spotlight: '#FBF7EE',
        },
        vignette: true,
        spotlightBoost: 0,
      };
    case 'kinfolk':
      return {
        palette: {
          ...palette,
          topRgb: mixRgbToward(palette.topRgb, [236, 230, 220], 0.4),
          floorRgb: mixRgbToward(palette.floorRgb, [248, 244, 237], 0.3),
        },
        vignette: false,
        spotlightBoost: 0,
      };
    case 'pastel-friendly':
      return {
        palette: {
          ...palette,
          floorRgb: mixRgbToward(palette.floorRgb, [255, 252, 250], 0.5),
          accent: '#E68AA6',
        },
        vignette: false,
        spotlightBoost: 0.04,
      };
    case 'modern-minimal':
    default:
      return { palette, vignette: false, spotlightBoost: 0 };
  }
}

/**
 * Step 1 + 2 entry. Resolves the art direction from the diagnosis ConceptTone
 * and the product category. When no ConceptTone is available (diagnose not run)
 * the mapper falls back to the WARM general preset.
 */
export function pickArtDirection(
  conceptTone?: ConceptTone | null,
  opts: MapCategoryToToneOptions = {},
): ArtDirection {
  const toneDirective = mapCategoryToTone(conceptTone, opts);
  return applyPersonaModulation(toneDirective, conceptTone);
}

/**
 * Step 2 — apply persona x pricePosition x emotionalTone x genre modulation
 * onto the categorical ToneDirective, producing the final ArtDirection.
 */
export function applyPersonaModulation(
  toneDirective: ToneDirective,
  conceptTone?: ConceptTone | null,
): ArtDirection {
  const mood = toneDirective.colorMood;
  let palette: ArtPalette = PALETTES[mood] ?? PALETTES.warm;

  let productScale = DEFAULT_DIRECTION.productScale;
  let typeScale = DEFAULT_DIRECTION.typeScale;
  let spotlightStrength = DEFAULT_DIRECTION.spotlightStrength;
  let vignette = DEFAULT_DIRECTION.vignette;
  let contrastMin = DEFAULT_DIRECTION.contrastMin;
  let textColor = DEFAULT_DIRECTION.textColor;
  const horizon = DEFAULT_DIRECTION.horizon;

  const premium = conceptTone?.pricePosition === 'premium';

  // Step 2a — categorical baseTone shifts the palette + craft.
  const toned = applyBaseTone(palette, toneDirective.baseTone, toneDirective.darkPremium, premium);
  palette = toned.palette;
  vignette = toned.vignette || vignette;
  spotlightStrength += toned.spotlightBoost;

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
      spotlightStrength = Math.min(spotlightStrength, 0.5);
    } else if (
      conceptTone.emotionalTone === 'professional' ||
      conceptTone.emotionalTone === 'trust'
    ) {
      spotlightStrength += 0.06;
      vignette = true;
    } else if (conceptTone.emotionalTone === 'sensory') {
      spotlightStrength += 0.05;
    }

    // persona — senior gets larger, higher-contrast type + ink + darker accent
    // (research §5-C: Pretendard 18pt+, 7:1 contrast, no gray text).
    if (conceptTone.persona === 'senior') {
      typeScale = Math.max(typeScale, 1.30);
      contrastMin = 7.0;
      textColor = '#111111';
      palette = { ...palette, accent: darkenHex(palette.accent, 0.28) };
    }

    // genre — minimal favors negative space (smaller product).
    if (conceptTone.genre === 'minimal') {
      productScale *= 0.9;
    }
  }

  return {
    palette,
    productScale: clamp(productScale, 0.7, 1.15),
    typeScale: clamp(typeScale, 0.85, 1.35),
    spotlightStrength: clamp(spotlightStrength, 0, 0.7),
    vignette,
    horizon,
    toneDirective,
    contrastMin,
    textColor,
  };
}
