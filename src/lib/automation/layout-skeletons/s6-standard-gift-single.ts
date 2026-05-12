// src/lib/automation/layout-skeletons/s6-standard-gift-single.ts
//
// S6 — standard-gift-single, sensory/lifestyle/minimal.
// "표준 선물 감각" — candles, home decor, small lifestyle gifts.
// Five sections with a styled-shot block emphasising texture and ambience.

import type { SkeletonSpec } from './index';

export const S6: SkeletonSpec = {
  id: 'S6',
  description: 'standard-gift-single sensory lifestyle — texture-led gift layout',
  matchSignature: {
    concept: {
      pricePosition: ['standard'],
      context: ['gift'],
      productType: ['single'],
    },
    tone: {
      emotionalTone: ['sensory'],
      photoStyle: ['lifestyle'],
      genre: ['minimal'],
    },
  },
  sections: [
    {
      id: 'hero',
      height: 1080,
      layout: 'product_in_ambient_setup + tagline',
      copyTone: 'one-line sensory hook (scent, texture, sound)',
      bgColorToken: 'neutral_50',
    },
    {
      id: 'story',
      height: 1400,
      layout: 'short_brand_story_paragraph',
      copyTone: 'editorial paragraph, two to three sentences',
    },
    {
      id: 'styledShot',
      height: 1600,
      layout: 'three_styled_lifestyle_shots',
      copyTone: 'one-line caption per shot, mood-led',
    },
    {
      id: 'spec',
      height: 1100,
      layout: 'two_column_spec_table',
      copyTone: 'size, material, scent family — explicit units',
    },
    {
      id: 'cta',
      height: 800,
      layout: 'gift_wrap + shipping + return',
      copyTone: 'gift-handover reassurance phrasing',
    },
  ],
  totalHeight: 5980,
  width: 860,
  colorTokens: {
    primary: '#A8A29E',
    secondary: '#F5F5F4',
    accent: '#44403C',
  },
  fonts: {
    title: 'Pretendard SemiBold',
    body: 'Pretendard Regular',
  },
  copyGlobalTone: 'sensory restrained tone, scent and texture vocabulary, zero emoji',
};
