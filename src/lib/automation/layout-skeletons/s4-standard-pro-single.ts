// src/lib/automation/layout-skeletons/s4-standard-pro-single.ts
//
// S4 — standard-pro-single, professional/white/minimal.
// "표준 전문 신뢰" — appliances, tools, medical-adjacent devices.
// Five sections leading with core-performance spec and a comparison block.
//
// Verification case (v3.1 Section 4-C, example C): 18V drill 7-piece set
// matches here. The matcher hits S4 via context=pro + emotionalTone=professional
// + pricePosition=standard.

import type { SkeletonSpec } from './index';

export const S4: SkeletonSpec = {
  id: 'S4',
  description: 'standard-pro-single professional — specs-first trust layout',
  matchSignature: {
    concept: {
      pricePosition: ['standard'],
      context: ['pro'],
      productType: ['single'],
    },
    tone: {
      emotionalTone: ['professional'],
      photoStyle: ['white'],
      genre: ['minimal'],
    },
  },
  sections: [
    {
      id: 'hero',
      height: 1080,
      layout: 'centered_product_white_bg + model_number',
      copyTone: 'product name plus key specification number',
      bgColorToken: 'neutral_0',
    },
    {
      id: 'corePerformance',
      height: 1500,
      layout: 'four_metric_cards_with_icons',
      copyTone: 'metric labels with explicit units (W, V, dB, kg)',
    },
    {
      id: 'comparison',
      height: 1400,
      layout: 'comparison_table_vs_predecessor',
      copyTone: 'side-by-side fact rows, no marketing adjectives',
    },
    {
      id: 'warranty',
      height: 1100,
      layout: 'warranty_terms + certification_logos',
      copyTone: 'cert numbers and warranty period exact',
    },
    {
      id: 'cta',
      height: 800,
      layout: 'shipping + return + as_center_info',
      copyTone: 'after-sales channel guidance',
    },
  ],
  totalHeight: 5880,
  width: 860,
  colorTokens: {
    primary: '#0F172A',
    secondary: '#E2E8F0',
    accent: '#2563EB',
  },
  fonts: {
    title: 'Pretendard SemiBold',
    body: 'Pretendard Regular',
  },
  copyGlobalTone: 'professional factual tone, numbers and units first, no exaggeration adjectives, zero emoji',
};
