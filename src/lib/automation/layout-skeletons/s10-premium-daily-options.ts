// src/lib/automation/layout-skeletons/s10-premium-daily-options.ts
//
// S10 — premium-daily-options, sensory/calm/minimal.
// "프리미엄 일상 감각" — designer fashion, premium daily-use apparel.
// Six sections including a philosophy block and customer-review block.
//
// Verification case (v3.1 Section 4-C, example B): premium German candle
// (₩150,000, single SKU) matches here via pricePosition=premium +
// context=daily. The matcher decision tree prefers S10 over S6 when
// pricePosition is premium.

import type { SkeletonSpec } from './index';

export const S10: SkeletonSpec = {
  id: 'S10',
  description: 'premium-daily-options sensory calm — philosophy-led premium daily layout',
  matchSignature: {
    concept: {
      pricePosition: ['premium'],
      context: ['daily'],
      productType: ['single', 'options'],
    },
    tone: {
      emotionalTone: ['sensory'],
      colorMood: ['calm'],
      genre: ['minimal'],
    },
  },
  sections: [
    {
      id: 'hero',
      height: 1200,
      layout: 'centered_product_calm_bg + brand_tagline',
      copyTone: 'restrained one-line hook, brand-led',
      bgColorToken: 'neutral_100',
    },
    {
      id: 'philosophy',
      height: 1400,
      layout: 'brand_philosophy_paragraph',
      copyTone: 'editorial paragraph, three sentences, value-led',
    },
    {
      id: 'detail',
      height: 1500,
      layout: 'detail_macro_grid_2x2',
      copyTone: 'material, stitching, finishing description',
    },
    {
      id: 'usage',
      height: 1300,
      layout: 'styled_lifestyle_shot + caption',
      copyTone: 'daily-use scenario, one sentence',
    },
    {
      id: 'reviews',
      height: 1100,
      layout: 'three_customer_review_cards',
      copyTone: 'verbatim review quotes, attribution, single line each',
    },
    {
      id: 'cta',
      height: 800,
      layout: 'shipping + return + concierge_chat',
      copyTone: 'concierge-led reassurance phrasing',
    },
  ],
  totalHeight: 7300,
  width: 860,
  colorTokens: {
    primary: '#1F2937',
    secondary: '#F3F4F6',
    accent: '#9CA3AF',
  },
  fonts: {
    title: 'Pretendard SemiBold',
    body: 'Pretendard Regular',
  },
  copyGlobalTone: 'calm sensory tone, restrained adjectives, philosophy-first framing, zero emoji',
};
