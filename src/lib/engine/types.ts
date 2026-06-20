// src/lib/engine/types.ts
// ============================================================================
// Adaptive Image + SEO/ROI Strategy Engine — Stage 1 shared types.
// Authority: docs/design/IMAGE_SEO_STRATEGY_ENGINE.md.
//
// All-product common (#55): category knowledge lives in data (CategoryDnaCard),
// never in per-product branch code. These types are the in-app rich shape; the
// Prisma CategoryDna row stores the same data across its Json columns (see
// category-dna.ts serialize/deserialize).
//
// English identifiers only — no Korean string literals in this logic layer
// (Korean category/analysis content lives in the JSON seed data + i18n).
// ============================================================================

import type { MoodCode } from '@/lib/mood/types';

// The nine universal funnel slots (engine spec §4). Ordered, category-agnostic;
// only the CONTENT varies per category. Representative thumbnail is the `hero`.
export const SLOT_TYPES = [
  'hero',
  'problem',
  'solution_usp',
  'scent_note',
  'use_install',
  'size_duration',
  'trust',
  'gift',
  'cta',
] as const;
export type SlotType = (typeof SLOT_TYPES)[number];

// Realism lane (#71): PHOTOREAL is the universal default; AUTHENTIC_ART is
// reserved for real public-domain artwork contexts (label / S5 story) only.
export type RealismLane = 'photoreal' | 'authentic_art';

// Content job a slot performs in the conversion funnel.
export type ContentType = 'product_context' | 'mood' | 'explain' | 'spec';

// Image model route (engine spec §6). `cutout` = local cutout-strategy /
// sharp-composite path (no external image API at runtime, #37/#38).
export type ModelRoute =
  | 'firefly_native'
  | 'nano_banana_pro'
  | 'nano_banana_2'
  | 'cutout';

// Output aspect — representative thumbnail is 1:1, composites/additional 4:5.
export type SlotAspect = '1:1' | '4:5';

// ----------------------------------------------------------------------------
// Category DNA card — the reusable interface (engine spec §3).
// ----------------------------------------------------------------------------

export interface SeasonalitySignal {
  peakMonths: string[];
  troughMonth?: string;
  recoveryMonth?: string;
  shape?: string;
  implication?: string;
}

export interface DemographicsSignal {
  ageCore?: string[];
  ageLead?: string;
  ageNote?: string;
  genderNote?: string;
}

export interface PriceTierSignal {
  budget?: string;
  midPremium?: string;
  premiumElectronic?: string;
  note?: string;
}

export interface TitleConventionSignal {
  structure?: string;
  highFreqTokens?: string[];
  scentInTitle?: string[];
  giftFraming?: string[];
  bundleFraming?: string[];
  implication?: string;
}

export interface ThumbnailConventionSignal {
  rule?: string;
  source?: string;
}

export interface ToneMannerSignal {
  palette?: string;
  mood?: string;
  casting?: string;
}

// The canonical in-app DNA card. Maps to the Prisma CategoryDna row.
export interface CategoryDnaCard {
  categoryCode: string;
  categoryName: string;
  version: number;
  parentDnaId?: string | null;
  demographics: DemographicsSignal;
  seasonality: SeasonalitySignal;
  titleConventions: TitleConventionSignal;
  priceTiers: PriceTierSignal;
  materialCues?: { premium?: string[]; implication?: string };
  trustSignals: string[];
  thumbnailConventions: ThumbnailConventionSignal;
  toneManner: ToneMannerSignal;
  slotSequence: SlotType[];
  mandatorySlots: SlotType[];
  slotNotes?: Partial<Record<SlotType, string>>;
  provenance?: Record<string, unknown>;
  confidence: number;
  limitations?: string[];
  status?: 'draft' | 'active' | 'retired';
}

// ----------------------------------------------------------------------------
// Slot plan + assembled strategy.
// ----------------------------------------------------------------------------

// One resolved slot in a product's SlotPlan (stored as SlotPlan.slots[]).
export interface SlotPlanEntry {
  slotType: SlotType;
  conversionJob: string;
  contentType: ContentType;
  mood: MoodCode;
  realismLane: RealismLane;
  composition: string;
  legibility: string;
  textPolicy: 'text_free' | 'text_allowed';
  compositeFlag: boolean;
  groundingFlag: boolean;
  modelRoute: ModelRoute;
  aspect: SlotAspect;
  required: boolean;
  // Reuse pointer: which existing detail-section ids this slot maps onto
  // (skeleton/section system — view layer, not a re-implementation, #62).
  sectionIds: string[];
}

// Output of the strategy assembler for one slot (engine spec §5).
export interface AssembledSlotStrategy {
  slotType: SlotType;
  required: boolean;
  modelRoute: ModelRoute;
  aspect: SlotAspect;
  grounding: boolean;
  mood: MoodCode;
  realismLane: RealismLane;
  // Resolved English prompt from the 6-axis assembler (#86: no negativePrompt).
  resolvedPrompt: string;
  benchmarkDna: string[];
  // The camera spec key the mood resolved to (for variety auditing, #84).
  cameraKey: string;
  // Target generation resolution (2K/4K) from the camera spec — surfaced for the
  // E3 recommended-settings card so the operator matches Firefly to the spec.
  resolution: string;
  // C6 (#107): composite-method descriptor for composite slots (compositeFlag).
  // method='firefly_reference' = attach the product cutout as a reference and let
  // the recommended model place the REAL product (no redraw); local PIL/sharp
  // paste is the fallback only. null for non-composite slots (e.g. hero cutout).
  composite: SlotCompositeMethod | null;
}

// C6 (#107): how a composite slot is produced — the reference-composite standard.
export interface SlotCompositeMethod {
  method: 'firefly_reference';
  referenceRequired: true;
  recommendedModel: ModelRoute;
  fallback: 'local_paste';
}

export interface AssembledStrategy {
  productId: string;
  categoryCode: string;
  categoryDnaVersion: number;
  slots: AssembledSlotStrategy[];
}
