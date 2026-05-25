// Sprint 7-M2 5-B — season_holiday_variant adapters (3 models).
// Source prompts: SEED_PROMPTS_DESIGN.md §2-5.

import type { AdapterFn } from './model-adapter.types';
import { DEFAULT_NEGATIVE_PROMPT } from './model-adapter.types';

// Falls back to a neutral seasonal token when caller omits input.season —
// caller is expected to substitute before generation, but the prompt stays
// well-formed for previews.
const seasonOf = (input: { season?: string }) =>
  input.season && input.season.trim().length > 0 ? input.season : 'seasonal';

export const fireflySeasonHolidayVariant: AdapterFn = (input) => ({
  model: 'firefly-image-5',
  prompt:
    `${input.productName} in a ${seasonOf(input)} themed setting with seasonal ` +
    `props, ${input.colorMood} palette, warm festive lighting, editorial ` +
    `lifestyle, photoreal, 4:5, negative space for copy, no text in image`,
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
  uiParams: {
    Aesthetic: 'Editorial',
    'Style intensity': '65%',
  },
});

export const nanoBananaProSeasonHolidayVariant: AdapterFn = (input) => ({
  model: 'nano-banana-pro',
  prompt:
    `Place the ${input.productName} in a ${seasonOf(input)} themed scene with ` +
    `subtle seasonal props and a ${input.colorMood} palette. Keep the product ` +
    `shape, branding, and details exact. Warm festive light, gift-giving mood, ` +
    `4:5, negative space for a headline, photoreal lifestyle.`,
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
  referenceImages: input.referenceImageUrls ?? [],
  notes: 'Recommend pairing a product reference with a season moodboard.',
});

export const gptImage2SeasonHolidayVariant: AdapterFn = (input) => ({
  model: 'gpt-image-2',
  prompt:
    `Generate a ${seasonOf(input)} themed lifestyle photograph of ` +
    `${input.productName} with seasonal props and a ${input.colorMood} palette. ` +
    `Constraints: do not change product color or shape; warm festive light; ` +
    `gift context; 4:5; negative space for copy; no text in image.`,
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
});
