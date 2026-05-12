// src/lib/automation/layout-skeletons/s11-standard-event-vintage.ts
//
// S11 — standard-event-single, friendly/vivid/vintage.
// "빈티지 한정" — collabs, vintage drops, limited-edition single SKUs.
// Four sections compressed for fast scroll-through.

import type { SkeletonSpec } from './index';

export const S11: SkeletonSpec = {
  id: 'S11',
  description: 'standard-event-single vintage vivid — limited-edition collab layout',
  matchSignature: {
    concept: {
      pricePosition: ['standard'],
      context: ['event'],
      productType: ['single'],
    },
    tone: {
      emotionalTone: ['friendly'],
      colorMood: ['vivid'],
      genre: ['vintage'],
    },
  },
  sections: [
    {
      id: 'hero',
      height: 1100,
      layout: 'product_on_vintage_backdrop + collab_badge',
      copyTone: 'collab name + drop tagline single line',
      bgColorToken: 'sepia_100',
    },
    {
      id: 'eventDetails',
      height: 1400,
      layout: 'drop_calendar + edition_meta',
      copyTone: 'edition number, drop date, quantity exact',
    },
    {
      id: 'benefits',
      height: 1200,
      layout: 'three_perk_cards_with_icons',
      copyTone: 'short perk title + one-line value',
    },
    {
      id: 'cta',
      height: 800,
      layout: 'limited_stock + shipping + return',
      copyTone: 'time-window urgency phrasing within fair-trade rules',
    },
  ],
  totalHeight: 4500,
  width: 860,
  colorTokens: {
    primary: '#92400E',
    secondary: '#FEF3C7',
    accent: '#451A03',
  },
  fonts: {
    title: 'Pretendard Bold',
    body: 'Pretendard Regular',
  },
  copyGlobalTone: 'vintage friendly tone, edition and date specifics, no false scarcity, zero emoji',
};
