// src/lib/automation/layout-skeletons/s8-standard-event-set.ts
//
// S8 — standard-event-set, sensory/vivid/korean.
// "시즌 이벤트 비비드" — limited drops, seasonal kits.
// Five sections led by a seasonal-hook block instead of the usual hero.

import type { SkeletonSpec } from './index';

export const S8: SkeletonSpec = {
  id: 'S8',
  description: 'standard-event-set vivid korean — seasonal-drop layout',
  matchSignature: {
    concept: {
      pricePosition: ['standard'],
      context: ['event'],
      productType: ['set'],
    },
    tone: {
      emotionalTone: ['sensory'],
      colorMood: ['vivid'],
      genre: ['korean'],
    },
  },
  sections: [
    {
      id: 'seasonalHook',
      height: 1200,
      layout: 'seasonal_banner + date_window',
      copyTone: 'season name + sale window date range explicit',
      bgColorToken: 'accent_100',
    },
    {
      id: 'product',
      height: 1500,
      layout: 'product_grid_3x2 + headline',
      copyTone: 'short product name per tile',
    },
    {
      id: 'options',
      height: 1400,
      layout: 'option_grid_with_thumbnail_chips',
      copyTone: 'option name + key spec, single line each',
    },
    {
      id: 'usage',
      height: 1300,
      layout: 'seasonal_lifestyle_shot + caption',
      copyTone: 'seasonal scenario, two-sentence caption',
    },
    {
      id: 'cta',
      height: 800,
      layout: 'limited_stock + shipping + return',
      copyTone: 'time-window urgency phrasing within fair-trade rules',
    },
  ],
  totalHeight: 6200,
  width: 860,
  colorTokens: {
    primary: '#DC2626',
    secondary: '#FEF2F2',
    accent: '#7C2D12',
  },
  fonts: {
    title: 'Pretendard Bold',
    body: 'Pretendard Regular',
  },
  copyGlobalTone: 'vivid seasonal tone, explicit date windows, time-bound phrasing without false scarcity, zero emoji',
};
