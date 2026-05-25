// Sprint 7-M2 5-B — studio_packshot_white adapters (3 models).
// Source prompts: SEED_PROMPTS_DESIGN.md §2-1.

import type { AdapterFn } from './model-adapter.types';
import { DEFAULT_NEGATIVE_PROMPT } from './model-adapter.types';

// Firefly: short + explicit, UI params separated.
export const fireflyStudioPackshotWhite: AdapterFn = (input) => ({
  model: 'firefly-image-5',
  prompt:
    `${input.productName} on a clean seamless white background, ` +
    `soft even studio lighting, subtle natural shadow beneath, ` +
    `centered composition, commercial product photography, photoreal, ` +
    `sharp focus, 1:1, no text in image`,
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
  uiParams: {
    Aesthetic: 'Product',
    'Style intensity': '40%',
    'Reference composition': 'center',
  },
});

// Nano Banana Pro: conversational + reference + "keep exact" clause.
export const nanoBananaProStudioPackshotWhite: AdapterFn = (input) => ({
  model: 'nano-banana-pro',
  prompt:
    `Place the ${input.productName} on a clean white seamless studio background. ` +
    `Keep the product shape, color, material, and branding exactly as in the ` +
    `reference image. Soft even lighting, subtle realistic contact shadow, ` +
    `centered, 1:1 ratio, photographic realism, no added text.`,
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
  referenceImages: input.referenceImageUrls ?? [],
  notes: 'Requires at least one product reference image for shape fidelity.',
});

// GPT Image 2: intent + context + constraint sentences.
export const gptImage2StudioPackshotWhite: AdapterFn = (input) => ({
  model: 'gpt-image-2',
  prompt:
    `Generate a studio product photograph of ${input.productName} on a seamless ` +
    `white background. Constraints: do not alter the product geometry, color, ` +
    `or material; soft even studio light; subtle contact shadow; centered; 1:1; ` +
    `no text in image; photographic realism.`,
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
});
