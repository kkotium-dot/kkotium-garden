// Sprint 7-M2 5-B — lifestyle_room_set adapters (3 models).
// Source prompts: SEED_PROMPTS_DESIGN.md §2-2.

import type { AdapterFn } from './model-adapter.types';
import { DEFAULT_NEGATIVE_PROMPT } from './model-adapter.types';

export const fireflyLifestyleRoomSet: AdapterFn = (input) => ({
  model: 'firefly-image-5',
  prompt:
    `${input.productName} placed in a ${input.colorMood} Scandinavian living ` +
    `room, soft morning window light, linen textures, editorial lifestyle ` +
    `photography, shallow depth of field, eye-level, photoreal, 4:5, ` +
    `negative space on right for copy, no text in image`,
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
  uiParams: {
    Aesthetic: 'Editorial',
    'Style intensity': '60%',
  },
});

export const nanoBananaProLifestyleRoomSet: AdapterFn = (input) => ({
  model: 'nano-banana-pro',
  prompt:
    `Place the ${input.productName} in a sun-drenched ${input.colorMood} ` +
    `Scandinavian living room scene. Keep the product shape, branding, and ` +
    `details exact. Soft morning light from a window, linen and wood textures, ` +
    `cozy hygge atmosphere, shallow depth of field, 4:5 ratio, leave negative ` +
    `space on the right for a headline, photoreal lifestyle.`,
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
  referenceImages: input.referenceImageUrls ?? [],
  notes: 'Recommend pairing a product reference with a moodboard reference.',
});

export const gptImage2LifestyleRoomSet: AdapterFn = (input) => ({
  model: 'gpt-image-2',
  prompt:
    `Generate a lifestyle photograph placing ${input.productName} in a ` +
    `${input.colorMood} Scandinavian living room. Constraints: do not change ` +
    `product color or shape; natural morning window light; realistic shadow ` +
    `and reflection; cozy editorial mood; 4:5; negative space on the right ` +
    `for copy; no text in image.`,
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
});
