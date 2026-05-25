// Sprint 7-M2 5-B — detail_macro adapters (3 models).
// Source prompts: SEED_PROMPTS_DESIGN.md §2-4.

import type { AdapterFn } from './model-adapter.types';
import { DEFAULT_NEGATIVE_PROMPT } from './model-adapter.types';

export const fireflyDetailMacro: AdapterFn = (input) => ({
  model: 'firefly-image-5',
  prompt:
    `Macro close-up of ${input.productName} surface texture and material detail, ` +
    `soft natural side light, visible fabric/material weave, shallow depth of ` +
    `field, editorial product photography, photoreal, 4:5, no text in image`,
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
  uiParams: {
    Effect: 'Sharp detail',
    Composition: 'close-up',
  },
});

export const nanoBananaProDetailMacro: AdapterFn = (input) => ({
  model: 'nano-banana-pro',
  prompt:
    `Macro close-up showing the texture and material detail of the ` +
    `${input.productName}. Keep the exact material, color, and surface as the ` +
    `reference. Soft natural side lighting, visible texture, shallow depth of ` +
    `field, 4:5, photoreal.`,
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
  referenceImages: input.referenceImageUrls ?? [],
});

export const gptImage2DetailMacro: AdapterFn = (input) => ({
  model: 'gpt-image-2',
  prompt:
    `Generate a macro close-up photograph of ${input.productName} emphasizing ` +
    `material texture and craftsmanship detail. Constraints: preserve exact ` +
    `material and color; soft natural side light; shallow depth of field; 4:5; ` +
    `no text; photographic realism.`,
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
});
