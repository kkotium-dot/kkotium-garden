// src/lib/design/concept-presets.ts
//
// Concept preset registry — code-ification of docs/design/CONCEPT_PRESET_SYSTEM.md.
//
// Core principle: the brand core (logo, signature Red #E62310 / Pink #FFCCEA,
// Pretendard, mascot) is FIXED. The product-concept layer is swapped per
// category at three variable intensities (Level 1..3).
//
// SEO is ORTHOGONAL to presets (CONCEPT_PRESET_SYSTEM.md §7): product-name
// length, 1:1 white-background main image and category accuracy are validated
// elsewhere (src/lib/product-name-checker.ts etc.) and are NOT touched here.
//
// Korean display strings live in src/lib/i18n/concept-presets.ko.json — this
// module only holds English literal constants (CLAUDE.md §3-1).

// ── Preset identity ──────────────────────────────────────────────────────────

/** Concept preset key. Stored in Product.concept_preset (default 'kitchen'). */
export type ConceptPreset = 'aroma' | 'gift' | 'tradition' | 'kitchen' | 'pet';

/** Variable-intensity grade. Stored in Product.preset_intensity (default 'l1'). */
export type PresetIntensity = 'l1' | 'l2' | 'l3';

export const CONCEPT_PRESETS: ConceptPreset[] = [
  'aroma', 'gift', 'tradition', 'kitchen', 'pet',
];

export const PRESET_INTENSITIES: PresetIntensity[] = ['l1', 'l2', 'l3'];

/** Defaults mirror the Prisma column defaults (schema.prisma Product). */
export const DEFAULT_PRESET: ConceptPreset = 'kitchen';
export const DEFAULT_INTENSITY: PresetIntensity = 'l1';

// ── Variable-layer structural axes (English unions — no Korean literals) ──────

/** Headline typography choice. Body always stays Pretendard (brand core). */
export type FontPairing = 'sans' | 'serif-display';

/** Whitespace density of the detail body. */
export type Density = 'compact' | 'cozy' | 'airy';

/** Dominant imagery treatment for product / lifestyle shots. */
export type ImageStyle =
  | 'clean-cutout' | 'lifestyle' | 'styled-mood' | 'unboxing' | 'hanji-texture';

/** Copy voice for headlines and body. */
export type CopyTone =
  | 'functional' | 'friendly' | 'narrative' | 'warm' | 'heritage';

/**
 * The six elements every preset defines (CONCEPT_PRESET_SYSTEM.md §4 line 60):
 * (1) palette (2) font pairing (3) whitespace density (4) image style
 * (5) copy tone (6) layout variation (Level 3 only).
 *
 * `palette` holds reference hex values for non-CSS contexts (preview swatches,
 * server-side image renderers). The RUNTIME authority for the cascade is the
 * `[data-preset]` token layer in src/app/globals.css — keep the two in sync;
 * each file cross-references the other.
 */
export interface ConceptPresetDefinition {
  preset: ConceptPreset;
  /** Recommended default intensity for this preset's category character. */
  defaultIntensity: PresetIntensity;
  fontPairing: FontPairing;
  density: Density;
  imageStyle: ImageStyle;
  copyTone: CopyTone;
  /** Level 3 only: section order / hero format may vary. */
  layoutVariation: boolean;
  /**
   * Reference palette — mirrors globals.css [data-preset] semantic tokens
   * (ADAPTIVE_IMAGE_SEO_ENGINE.md §7.2, values verbatim). For non-CSS contexts
   * (preview swatches, server-side image renderers); the runtime authority for
   * the cascade is still the [data-preset] layer in globals.css.
   */
  palette: {
    surface: string;
    surfaceSubtle: string;
    surfaceDeep: string;
    accent: string;
    accentSoft: string;
    ink: string;
    inkSoft: string;
    line: string;
    card: string;
    /** aroma-only object tokens; other presets fall back to accent/accentSoft. */
    terracotta?: string;
    roseDust?: string;
  };
}

export const PRESET_DEFINITIONS: Record<ConceptPreset, ConceptPresetDefinition> = {
  // Emotional consumables → strong variation (Level 3).
  aroma: {
    preset: 'aroma',
    defaultIntensity: 'l3',
    fontPairing: 'serif-display',
    density: 'airy',
    imageStyle: 'styled-mood',
    copyTone: 'narrative',
    layoutVariation: true,
    palette: {
      surface: '#F3EFE7', surfaceSubtle: '#FAF7F0', surfaceDeep: '#E9E2D4',
      accent: '#76864C', accentSoft: '#A4A879',
      ink: '#3A352E', inkSoft: '#7A7468', line: '#DAD2C2', card: '#FBF9F4',
      terracotta: '#B5694C', roseDust: '#C98AA2',
    },
  },
  gift: {
    preset: 'gift',
    defaultIntensity: 'l3',
    fontPairing: 'serif-display',
    density: 'airy',
    imageStyle: 'unboxing',
    copyTone: 'warm',
    layoutVariation: true,
    palette: {
      surface: '#FBF3EE', surfaceSubtle: '#FFFBF7', surfaceDeep: '#F3E2D6',
      accent: '#C98A3E', accentSoft: '#E3B98C',
      ink: '#3A2E28', inkSoft: '#7A6A60', line: '#EAD9CC', card: '#FFFBF7',
    },
  },
  tradition: {
    preset: 'tradition',
    defaultIntensity: 'l3',
    fontPairing: 'serif-display',
    density: 'airy',
    imageStyle: 'hanji-texture',
    copyTone: 'heritage',
    layoutVariation: true,
    palette: {
      surface: '#F4ECE0', surfaceSubtle: '#FAF4EA', surfaceDeep: '#E7D9C4',
      accent: '#9B2D30', accentSoft: '#C28A5E',
      ink: '#1C1C1C', inkSoft: '#5A5247', line: '#D8C9B2', card: '#FBF6EC',
    },
  },
  // Lifestyle / pet → moderate variation (Level 2).
  pet: {
    preset: 'pet',
    defaultIntensity: 'l2',
    fontPairing: 'sans',
    density: 'cozy',
    imageStyle: 'lifestyle',
    copyTone: 'friendly',
    layoutVariation: false,
    palette: {
      surface: '#FBF6EF', surfaceSubtle: '#FFFCF7', surfaceDeep: '#F0E6D8',
      accent: '#C77A4A', accentSoft: '#E0A877',
      ink: '#34302A', inkSoft: '#6E665C', line: '#E4D8C8', card: '#FEFBF6',
    },
  },
  // Practical consumables → restrained variation (Level 1).
  kitchen: {
    preset: 'kitchen',
    defaultIntensity: 'l1',
    fontPairing: 'sans',
    density: 'compact',
    imageStyle: 'clean-cutout',
    copyTone: 'functional',
    layoutVariation: false,
    palette: {
      surface: '#FFFFFF', surfaceSubtle: '#F6F9FC', surfaceDeep: '#EEF3F8',
      accent: '#2F6FB0', accentSoft: '#7FA8D0',
      ink: '#1A1A1A', inkSoft: '#5B6470', line: '#E2E8EF', card: '#FFFFFF',
    },
  },
};

// ── Type guards + safe accessors ─────────────────────────────────────────────

export function isConceptPreset(v: unknown): v is ConceptPreset {
  return typeof v === 'string' && (CONCEPT_PRESETS as string[]).includes(v);
}

export function isPresetIntensity(v: unknown): v is PresetIntensity {
  return typeof v === 'string' && (PRESET_INTENSITIES as string[]).includes(v);
}

/** Coerce a possibly-null DB value into a valid preset (falls back to default). */
export function normalizePreset(v: unknown): ConceptPreset {
  return isConceptPreset(v) ? v : DEFAULT_PRESET;
}

export function normalizeIntensity(v: unknown): PresetIntensity {
  return isPresetIntensity(v) ? v : DEFAULT_INTENSITY;
}

export function getPresetDefinition(v: unknown): ConceptPresetDefinition {
  return PRESET_DEFINITIONS[normalizePreset(v)];
}

/**
 * Category → preset recommendation (CONCEPT_PRESET_SYSTEM.md §8 step 2).
 *
 * Intentionally a thin stub keyed by an internal category-family hint rather
 * than the full 4,993-row Naver tree — the exhaustive mapping is data work for
 * a later phase (avoid over-engineering, CONCEPT_PRESET_SYSTEM.md §6-D). Callers
 * pass a coarse family string; unknown families fall back to the default preset.
 */
export type CategoryFamily =
  | 'fragrance' | 'gift' | 'craft' | 'kitchen' | 'living' | 'pet' | 'digital';

const FAMILY_PRESET_MAP: Record<CategoryFamily, ConceptPreset> = {
  fragrance: 'aroma',
  gift: 'gift',
  craft: 'tradition',
  kitchen: 'kitchen',
  living: 'kitchen',
  pet: 'pet',
  digital: 'kitchen',
};

export function recommendPreset(family: CategoryFamily | string | null | undefined): {
  preset: ConceptPreset;
  intensity: PresetIntensity;
} {
  const preset = (family && family in FAMILY_PRESET_MAP)
    ? FAMILY_PRESET_MAP[family as CategoryFamily]
    : DEFAULT_PRESET;
  return { preset, intensity: PRESET_DEFINITIONS[preset].defaultIntensity };
}
