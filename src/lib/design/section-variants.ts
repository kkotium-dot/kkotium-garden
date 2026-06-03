// src/lib/design/section-variants.ts
//
// Detail-page 7-section variants (CONCEPT_PRESET_SYSTEM.md §6-C).
//
// The preset palette/typography cascade is delivered at runtime via the
// `[data-preset]` token layer in src/app/globals.css (set `data-preset` +
// `data-intensity` on the detail <article> root). These variants only resolve
// the STRUCTURAL axes — whitespace density (by intensity) and section emphasis
// — into Tailwind classes that reference the --preset-* tokens.
//
// A tiny, dependency-free `cva`-style factory is used instead of the
// `class-variance-authority` package: with <=5 presets the manual path is
// sufficient (CONCEPT_PRESET_SYSTEM.md §6-D, "과잉엔지니어링 금지"). The factory
// is API-compatible enough to swap for cva() later without call-site churn.

import type { ConceptPreset, PresetIntensity } from './concept-presets';
import { getPresetDefinition } from './concept-presets';

// ── Canonical 7 sections (DETAIL_PAGE_PLAYBOOK.md §2, fixed order) ────────────

export type DetailSectionId =
  | 'hook' | 'value' | 'spec' | 'usage' | 'trust' | 'cta' | 'notice';

export const DETAIL_SECTION_IDS: DetailSectionId[] = [
  'hook', 'value', 'spec', 'usage', 'trust', 'cta', 'notice',
];

// ── Minimal type-safe cva-style factory (no dependency) ──────────────────────

type ClassValue = string | undefined | null | false;
type VariantShape = Record<string, Record<string, ClassValue>>;

interface VariantConfig<V extends VariantShape> {
  base?: ClassValue;
  variants: V;
  defaultVariants?: { [K in keyof V]?: keyof V[K] & string };
}

type VariantProps<V extends VariantShape> = {
  [K in keyof V]?: (keyof V[K] & string);
};

function cx(...parts: ClassValue[]): string {
  return parts.filter(Boolean).join(' ');
}

/** CVA-compatible variant resolver. Returns a merged className string. */
function defineVariants<V extends VariantShape>(config: VariantConfig<V>) {
  return (props?: VariantProps<V>): string => {
    const chosen: ClassValue[] = [config.base];
    for (const key of Object.keys(config.variants) as (keyof V)[]) {
      const picked = props?.[key] ?? config.defaultVariants?.[key];
      if (picked != null) chosen.push(config.variants[key][picked as string]);
    }
    return cx(...chosen);
  };
}

// ── Detail root variant (article wrapper) ────────────────────────────────────
//
// Density maps from intensity: l1=compact, l2=cozy, l3=airy. Tailwind
// arbitrary-value classes reference the --preset-* runtime tokens.

export const detailRootVariants = defineVariants({
  base: 'mx-auto w-full max-w-[860px] bg-[var(--preset-surface)] text-[var(--preset-text)]',
  variants: {
    intensity: {
      l1: 'space-y-6',
      l2: 'space-y-10',
      l3: 'space-y-16',
    },
  },
  defaultVariants: { intensity: 'l1' },
});

// ── Per-section variant ──────────────────────────────────────────────────────
//
// `intensity` controls vertical rhythm; `emphasis` controls visual weight.

export const detailSectionVariants = defineVariants({
  base: 'px-5',
  variants: {
    intensity: {
      l1: 'py-6',
      l2: 'py-10',
      l3: 'py-14',
    },
    emphasis: {
      flat: '',
      card: 'rounded-2xl bg-[var(--preset-surface-subtle)] px-6',
      hero: 'rounded-3xl bg-[var(--preset-surface-subtle)] text-center',
    },
  },
  defaultVariants: { intensity: 'l1', emphasis: 'flat' },
});

// ── Section emphasis resolution per (preset, intensity) ──────────────────────

type Emphasis = 'flat' | 'card' | 'hero';

/**
 * Level 3 (layoutVariation) gets a hero hook + carded value/trust sections;
 * lower intensities stay flat. Section ORDER never changes — only emphasis —
 * so the conversion-validated sequence (DETAIL_PAGE_PLAYBOOK.md §2) is intact.
 */
function emphasisFor(section: DetailSectionId, intensity: PresetIntensity, layoutVariation: boolean): Emphasis {
  if (intensity === 'l3' && layoutVariation) {
    if (section === 'hook') return 'hero';
    if (section === 'value' || section === 'trust') return 'card';
  }
  if (intensity === 'l2' && (section === 'value' || section === 'trust')) return 'card';
  return 'flat';
}

export interface ResolvedSection {
  id: DetailSectionId;
  className: string;
  emphasis: Emphasis;
}

export interface ResolvedDetailLayout {
  rootClassName: string;
  /** `data-preset` / `data-intensity` to spread onto the <article> root. */
  dataAttrs: { 'data-preset': ConceptPreset; 'data-intensity': PresetIntensity };
  sections: ResolvedSection[];
}

/**
 * Resolve the full 7-section layout for a (preset, intensity) pair. The caller
 * sets `dataAttrs` on the <article> so the globals.css `[data-preset]` cascade
 * supplies colors/typography; per-section className supplies structure.
 */
export function resolveDetailLayout(
  preset: ConceptPreset,
  intensity: PresetIntensity,
): ResolvedDetailLayout {
  const def = getPresetDefinition(preset);
  return {
    rootClassName: detailRootVariants({ intensity }),
    dataAttrs: { 'data-preset': preset, 'data-intensity': intensity },
    sections: DETAIL_SECTION_IDS.map((id) => {
      const emphasis = emphasisFor(id, intensity, def.layoutVariation);
      return { id, emphasis, className: detailSectionVariants({ intensity, emphasis }) };
    }),
  };
}
