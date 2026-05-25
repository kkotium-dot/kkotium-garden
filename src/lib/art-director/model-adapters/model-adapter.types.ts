// Sprint 7-M2 5-B — Prompt-asset engine: model adapter types.
//
// Five image intents x four image models. Each (intent, model) pair has a
// dedicated adapter that renders an AdapterInput into a model-specific
// AdapterOutput. Source spec: HANDOFF_PROMPT_ASSET_ENGINE.md §2-1.

export type ImageIntent =
  | 'lifestyle_room_set'
  | 'kitchen_top_down'
  | 'studio_packshot_white'
  | 'detail_macro'
  | 'season_holiday_variant';

export type ImageModel =
  | 'firefly-image-5'
  | 'nano-banana-pro'
  | 'gpt-image-2'
  | 'flux-2-pro';

export interface AdapterInput {
  productName: string;
  productCategory: string;
  colorMood: string;
  brandKeyword?: string;
  referenceImageUrls?: string[];
  // Only consumed by season_holiday_variant. Optional for other intents.
  season?: string;
}

export interface AdapterOutput {
  model: ImageModel;
  prompt: string;
  negativePrompt?: string;
  uiParams?: Record<string, string>;
  referenceImages?: string[];
  notes?: string;
}

export type AdapterFn = (input: AdapterInput) => AdapterOutput;

// Shared negative prompt — SEED_PROMPTS_DESIGN.md §0 common negative.
export const DEFAULT_NEGATIVE_PROMPT =
  'blurred product, distorted text, low resolution, watermark, ' +
  'extra fingers, unrealistic shadows, color shift on product, AI artifacts';
