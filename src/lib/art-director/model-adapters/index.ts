// Sprint 7-M2 5-B — Prompt-asset model adapter registry.
//
// Dispatches (intent, model) -> AdapterFn. Five intents x three implemented
// models = 15 adapters. The flux-2-pro slot in ImageModel is reserved by the
// type but not yet implemented; calling renderAdapter with it throws.

import type {
  AdapterFn,
  AdapterInput,
  AdapterOutput,
  ImageIntent,
  ImageModel,
} from './model-adapter.types';

import {
  fireflyStudioPackshotWhite,
  nanoBananaProStudioPackshotWhite,
  gptImage2StudioPackshotWhite,
} from './studio-packshot-white';

import {
  fireflyLifestyleRoomSet,
  nanoBananaProLifestyleRoomSet,
  gptImage2LifestyleRoomSet,
} from './lifestyle-room-set';

import {
  fireflyKitchenTopDown,
  nanoBananaProKitchenTopDown,
  gptImage2KitchenTopDown,
} from './kitchen-top-down';

import {
  fireflyDetailMacro,
  nanoBananaProDetailMacro,
  gptImage2DetailMacro,
} from './detail-macro';

import {
  fireflySeasonHolidayVariant,
  nanoBananaProSeasonHolidayVariant,
  gptImage2SeasonHolidayVariant,
} from './season-holiday-variant';

type ImplementedModel = Exclude<ImageModel, 'flux-2-pro'>;

type AdapterMatrix = Record<ImageIntent, Record<ImplementedModel, AdapterFn>>;

export const adapterMatrix: AdapterMatrix = {
  studio_packshot_white: {
    'firefly-image-5': fireflyStudioPackshotWhite,
    'nano-banana-pro': nanoBananaProStudioPackshotWhite,
    'gpt-image-2': gptImage2StudioPackshotWhite,
  },
  lifestyle_room_set: {
    'firefly-image-5': fireflyLifestyleRoomSet,
    'nano-banana-pro': nanoBananaProLifestyleRoomSet,
    'gpt-image-2': gptImage2LifestyleRoomSet,
  },
  kitchen_top_down: {
    'firefly-image-5': fireflyKitchenTopDown,
    'nano-banana-pro': nanoBananaProKitchenTopDown,
    'gpt-image-2': gptImage2KitchenTopDown,
  },
  detail_macro: {
    'firefly-image-5': fireflyDetailMacro,
    'nano-banana-pro': nanoBananaProDetailMacro,
    'gpt-image-2': gptImage2DetailMacro,
  },
  season_holiday_variant: {
    'firefly-image-5': fireflySeasonHolidayVariant,
    'nano-banana-pro': nanoBananaProSeasonHolidayVariant,
    'gpt-image-2': gptImage2SeasonHolidayVariant,
  },
};

export function renderAdapter(
  intent: ImageIntent,
  model: ImageModel,
  input: AdapterInput,
): AdapterOutput {
  if (model === 'flux-2-pro') {
    throw new Error('flux-2-pro adapter is reserved but not yet implemented.');
  }
  return adapterMatrix[intent][model](input);
}

export type { AdapterFn, AdapterInput, AdapterOutput, ImageIntent, ImageModel };
export { DEFAULT_NEGATIVE_PROMPT } from './model-adapter.types';
