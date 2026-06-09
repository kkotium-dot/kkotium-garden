// src/components/detail/preset/types.ts
//
// Content contract for the concept-preset detail renderer (Phase B-1).
//
// The renderer is 100% props-driven — NO Korean string literals live in the
// component code (CLAUDE.md §3-1). All user-facing copy arrives through
// `DetailContent`, produced by generate-detail (B-3) or sample fixtures
// (preset-preview). The preset/intensity choose the visual skin; the content
// fills it. Section ORDER is fixed (DETAIL_PAGE_PLAYBOOK §2).

import type { ConceptPreset, PresetIntensity } from '@/lib/design/concept-presets';

/** Lucide-mapped icon keys for the 3 value cards (JSX uses Lucide, never emoji). */
export type ValueIcon =
  | 'frame' | 'wind' | 'sparkles' | 'leaf' | 'droplet' | 'shield-check'
  | 'snowflake' | 'utensils' | 'ruler' | 'heart' | 'package' | 'palette' | 'sprout';

/** Notice-card icon keys. */
export type NoticeIcon = 'delivery' | 'exchange' | 'support';

/** Scent swatch identity (aroma only) — tied to scent, not preset. */
export type ScentSwatch = 'lemon' | 'april' | 'cherry' | 'a' | 'b' | 'c';

export interface ValueItem {
  num: string;        // "No.1"
  title: string;
  body: string;
  icon: ValueIcon;
}

export interface ScentItem {
  name: string;
  en: string;
  line: string;       // poetic one-liner
  desc: string;
  swatch: ScentSwatch;
  visualNote?: string; // overlay caption (A/C buildup hint)
}

export interface SpecRow {
  label: string;
  value: string;
}

export interface StepItem {
  no: string;         // "1"
  title: string;
  body: string;
}

export interface TrustBadge {
  k: string;          // small key label
  v: string;          // value
}

export interface NoticeCard {
  title: string;
  body: string;
  icon: NoticeIcon;
}

/**
 * Full detail-page content. Optional sections (scents, story caption) render
 * only when present — e.g. scents are aroma-specific and omitted for kitchen.
 */
export interface DetailContent {
  // S1 hook / hero
  eyebrow: string;
  /** Headline split so an emphasized fragment can render in --accent. */
  headlineLead: string;
  headlineEm?: string;
  headlineTail?: string;
  heroSub: string;
  heroChips: string[];
  heroProductLabel: string;
  tagA?: string;       // A-layer (background mood) caption
  tagC?: string;       // C-layer (foreground object) caption

  // S2 value
  valueEyebrow: string;
  valueTitle: string;
  values: ValueItem[];

  // S3 spec (+ optional scents)
  specEyebrow: string;
  specTitle: string;
  scents?: ScentItem[];
  specHeader: string;
  specRows: SpecRow[];

  // S4 usage
  usageEyebrow: string;
  usageTitle: string;
  steps: StepItem[];

  // S5 story + trust
  storyArtCaption?: string;   // public-domain artwork caption (art presets)
  storyTitle: string;
  storyBody: string;
  storySign: string;
  trustBadges: TrustBadge[];
  reviewSlotEyebrow?: string;
  reviewSlotBody?: string;

  // S6 cta
  ctaTitle: string;
  ctaSub: string;
  priceText: string;
  shipText: string;
  ctaButton: string;
  ctaReassure: string;

  // S7 notice + brand
  noticeCards: NoticeCard[];
  noticeSlotLabel: string;
  brandMarkLead: string;       // emphasized brand mark (the brand name)
  brandMarkTail: string;       // brand mark tail (e.g. "KKOTIUM")
  brandTip: string;
  stickyPrice: string;
  stickyButton: string;
}

/**
 * Customization slots (CONCEPT §5 "Rigid Flexibility"). Stored in
 * Product.preset_overrides JSONB. Only these 3 are operator-editable; the
 * brand core, price/CTA block and SEO fields stay locked.
 */
export interface PresetOverrides {
  /** Single accent override (injected as inline --accent). */
  accent?: string;
  /** Free-form hero headline (replaces headlineLead/Em/Tail when set). */
  heroCopy?: string;
  /** Hero mood image URL (replaces the token gradient backdrop when set). */
  moodImage?: string;
}

export interface DetailPresetArticleProps {
  preset: ConceptPreset;
  intensity: PresetIntensity;
  content: DetailContent;
  overrides?: PresetOverrides;
  /** Optional product cutout for the hero-product slot (S2 buildup). */
  heroProductImage?: string;
}
