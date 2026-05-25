// Sprint 7-M2 5-B — kitchen_top_down adapters (3 models).
// Source prompts: SEED_PROMPTS_DESIGN.md §2-3.

import type { AdapterFn } from './model-adapter.types';
import { DEFAULT_NEGATIVE_PROMPT } from './model-adapter.types';

export const fireflyKitchenTopDown: AdapterFn = (input) => ({
  model: 'firefly-image-5',
  prompt:
    `Top-down flat lay of ${input.productName} on a ${input.colorMood} ` +
    `kitchen counter, fresh ingredients scattered around, soft overhead ` +
    `softbox light, subtle shadow, commercial food-adjacent styling, ` +
    `photoreal, 1:1, no text in image`,
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
  uiParams: {
    Aesthetic: 'Clean',
    Composition: 'overhead',
  },
});

export const nanoBananaProKitchenTopDown: AdapterFn = (input) => ({
  model: 'nano-banana-pro',
  prompt:
    `Create a top-down flat lay of the ${input.productName} on a ` +
    `${input.colorMood} kitchen counter with a few fresh ingredients around it. ` +
    `Keep the product shape, color, and details exact. Soft overhead light, ` +
    `subtle natural shadow, clean modern composition, 1:1 ratio, photoreal.`,
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
  referenceImages: input.referenceImageUrls ?? [],
});

export const gptImage2KitchenTopDown: AdapterFn = (input) => ({
  model: 'gpt-image-2',
  prompt:
    `Generate a top-down flat lay photograph of ${input.productName} on a ` +
    `${input.colorMood} kitchen counter with scattered fresh ingredients. ` +
    `Constraints: do not alter product geometry or color; soft overhead light ` +
    `from above; realistic shadow; clean grid composition; 1:1; no text in ` +
    `image; photographic realism.`,
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
});
