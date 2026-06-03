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
  /** Reference palette — mirrors globals.css [data-preset] --preset-* tokens. */
  palette: {
    surface: string;
    surfaceSubtle: string;
    accent: string;
    text: string;
    textMuted: string;
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
      surface: '#F3EFE7', surfaceSubtle: '#FAF7F0',
      accent: '#76864C', text: '#3A352E', textMuted: '#7A7468',
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
      surface: '#FDF4EC', surfaceSubtle: '#FFFAF4',
      accent: '#C9912F', text: '#3B3127', textMuted: '#86796A',
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
      surface: '#F4ECE0', surfaceSubtle: '#FBF6EE',
      accent: '#9B2D30', text: '#1C1C1C', textMuted: '#6F645A',
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
      surface: '#FBF3EC', surfaceSubtle: '#FFF8F3',
      accent: '#E08A4B', text: '#2C2620', textMuted: '#7E7468',
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
      surface: '#FFFFFF', surfaceSubtle: '#F2F7FB',
      accent: '#2F6FB0', text: '#1A1A1A', textMuted: '#5C6770',
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
