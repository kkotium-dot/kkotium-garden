// src/lib/detail/build-preset-content.ts
//
// Grounded DetailContent assembler for the preset detail engine (Phase B-3).
//
// Data sections (spec rows, trust badges, scents, hero chips) are built from
// GroundedFacts ONLY (#46 — no fabricated product claims). The narrative
// sections use neutral, superlative-free starting copy from
// detail-content-templates.ko.json (Korean lives in JSON, not code — §3-1) that
// the operator refines via the customization slots; per-preset tone
// specialization (ADAPTIVE §3) is a later refinement. The preset choice already
// supplies the visual skin via the [data-preset] cascade.

import type { ConceptPreset, PresetIntensity } from '@/lib/design/concept-presets';
import type { GroundedFacts } from '@/lib/automation/section-renderers/types';
import type {
  DetailContent, ValueIcon, ScentItem, ScentSwatch, SpecRow, NoticeCard,
} from '@/components/detail/preset';
import TEMPLATES from '@/lib/i18n/detail-content-templates.ko.json';

interface TemplatesShape {
  presetEyebrow: Record<ConceptPreset, string>;
  labels: { valueEyebrow: string; specEyebrow: string; usageEyebrow: string; reviewEyebrow: string };
  heroSub: string;
  fixed: Record<string, string>;
  specRowLabels: { category: string; origin: string; distributor: string; detail: string };
  specRowDetailValue: string;
  trustLabels: { origin: string; distributor: string; composition: string };
  trustFallback: { origin: string; compositionSingle: string; compositionMulti: string };
  domesticOriginName: string;
  chips: { domestic: string; optionCount: string };
  values: Array<{ title: string; body: string }>;
  steps: Array<{ title: string; body: string }>;
  scentDescFallback: string;
  noticeCards: NoticeCard[];
}

const T = TEMPLATES as unknown as TemplatesShape;

const PRESET_VALUE_ICONS: Record<ConceptPreset, [ValueIcon, ValueIcon, ValueIcon]> = {
  aroma: ['frame', 'wind', 'sparkles'],
  tradition: ['palette', 'sparkles', 'heart'],
  kitchen: ['snowflake', 'droplet', 'shield-check'],
  gift: ['package', 'heart', 'sparkles'],
  pet: ['heart', 'shield-check', 'sparkles'],
};

const SCENT_SWATCHES: ScentSwatch[] = ['lemon', 'april', 'cherry'];

export interface BuildPresetContentInput {
  preset: ConceptPreset;
  intensity: PresetIntensity;
  productName: string;
  groundedFacts: GroundedFacts;
  /** Pre-formatted price string (e.g. "29,000 KRW"); falls back to template. */
  priceText?: string;
}

function buildSpecRows(gf: GroundedFacts): SpecRow[] {
  const rows: SpecRow[] = [];
  if (gf.categoryLeaf) rows.push({ label: T.specRowLabels.category, value: gf.categoryLeaf });
  if (gf.optionName && gf.optionValues?.length) {
    rows.push({ label: gf.optionName, value: gf.optionValues.join(' · ') });
  }
  if (gf.originCountry) rows.push({ label: T.specRowLabels.origin, value: gf.originCountry });
  rows.push({ label: T.specRowLabels.distributor, value: gf.distributorLabel ?? T.fixed.brandMarkLead });
  rows.push({ label: T.specRowLabels.detail, value: T.specRowDetailValue });
  return rows;
}

function buildHeroChips(gf: GroundedFacts): string[] {
  const chips: string[] = [];
  if (gf.originCountry === T.domesticOriginName) chips.push(T.chips.domestic);
  else if (gf.originCountry) chips.push(gf.originCountry);
  if (gf.optionCount && gf.optionCount > 1) {
    chips.push(T.chips.optionCount.replace('{count}', String(gf.optionCount)));
  }
  return chips;
}

function buildScents(preset: ConceptPreset, gf: GroundedFacts): ScentItem[] | undefined {
  if (preset !== 'aroma' || !gf.optionValues?.length) return undefined;
  return gf.optionValues.map((v, i) => ({
    name: v,
    en: '',
    line: '',
    desc: T.scentDescFallback,
    swatch: SCENT_SWATCHES[i % SCENT_SWATCHES.length],
  }));
}

/** Assemble a grounded, preset-skinned DetailContent for a product. */
export function buildPresetDetailContent(input: BuildPresetContentInput): DetailContent {
  const { preset, productName, groundedFacts: gf } = input;
  const subject = gf.categoryLeaf || productName;
  const icons = PRESET_VALUE_ICONS[preset];
  const composition = gf.optionCount && gf.optionCount > 1
    ? T.trustFallback.compositionMulti.replace('{count}', String(gf.optionCount))
    : T.trustFallback.compositionSingle;
  const priceText = input.priceText || T.fixed.priceFallback;
  const ctaReassure = `${gf.originCountry ? `${gf.originCountry} · ` : ''}${T.fixed.ctaReassureSuffix}`;

  return {
    eyebrow: T.presetEyebrow[preset],
    headlineLead: productName,
    heroSub: T.heroSub.replace('{subject}', subject),
    heroChips: buildHeroChips(gf),
    heroProductLabel: T.fixed.heroProductLabel,

    valueEyebrow: T.labels.valueEyebrow,
    valueTitle: T.fixed.valueTitle,
    values: T.values.map((v, i) => ({
      num: `No.${i + 1}`, title: v.title, body: v.body, icon: icons[i] ?? 'sparkles',
    })),

    specEyebrow: T.labels.specEyebrow,
    specTitle: T.fixed.specTitle,
    scents: buildScents(preset, gf),
    specHeader: T.fixed.specHeader,
    specRows: buildSpecRows(gf),

    usageEyebrow: T.labels.usageEyebrow,
    usageTitle: T.fixed.usageTitle,
    steps: T.steps.map((s, i) => ({ no: String(i + 1), title: s.title, body: s.body })),

    storyTitle: T.fixed.storyTitle,
    storyBody: T.fixed.storyBody,
    storySign: T.fixed.storySign,
    trustBadges: [
      { k: T.trustLabels.origin, v: gf.originCountry ?? T.trustFallback.origin },
      { k: T.trustLabels.distributor, v: gf.distributorLabel ?? T.fixed.brandMarkLead },
      { k: T.trustLabels.composition, v: composition },
    ],
    reviewSlotEyebrow: T.labels.reviewEyebrow,
    reviewSlotBody: T.fixed.reviewBody,

    ctaTitle: T.fixed.ctaTitle,
    ctaSub: T.fixed.ctaSub,
    priceText,
    shipText: T.fixed.shipText,
    ctaButton: T.fixed.ctaButton,
    ctaReassure,

    noticeCards: T.noticeCards,
    noticeSlotLabel: T.fixed.noticeSlotLabel,
    brandMarkLead: T.fixed.brandMarkLead,
    brandMarkTail: T.fixed.brandMarkTail,
    brandTip: T.fixed.brandTip,
    stickyPrice: `${priceText} · ${T.fixed.shipText}`,
    stickyButton: T.fixed.stickyButton,
  };
}
