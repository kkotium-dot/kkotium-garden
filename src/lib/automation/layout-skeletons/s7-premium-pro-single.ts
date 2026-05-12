// src/lib/automation/layout-skeletons/s7-premium-pro-single.ts
//
// S7 — premium-pro-single, trust/white/minimal.
// "프리미엄 전문 신뢰" — health functional foods, medical devices.
// Six sections with technology, clinical, and comparison blocks.

import type { SkeletonSpec } from './index';

export const S7: SkeletonSpec = {
  id: 'S7',
  description: 'premium-pro-single trust white — clinical-evidence-led layout',
  matchSignature: {
    concept: {
      pricePosition: ['premium'],
      context: ['pro'],
      productType: ['single'],
    },
    tone: {
      emotionalTone: ['trust'],
      photoStyle: ['white'],
      genre: ['minimal'],
    },
  },
  sections: [
    {
      id: 'hero',
      height: 1080,
      layout: 'centered_product + certification_strip',
      copyTone: 'product name plus headline cert',
      bgColorToken: 'neutral_0',
    },
    {
      id: 'technology',
      height: 1500,
      layout: 'mechanism_diagram + caption',
      copyTone: 'mechanism explanation, scientific but readable',
    },
    {
      id: 'clinical',
      height: 1500,
      layout: 'clinical_data_bar_chart + study_meta',
      copyTone: 'study sample size, duration, outcome metric exact',
    },
    {
      id: 'comparison',
      height: 1300,
      layout: 'comparison_table_vs_category_average',
      copyTone: 'fact rows with units, no superlatives',
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
      layout: 'shipping + return + customer_support',
      copyTone: 'after-sales channel guidance',
    },
  ],
  totalHeight: 7280,
  width: 860,
  colorTokens: {
    primary: '#0C4A6E',
    secondary: '#E0F2FE',
    accent: '#0EA5E9',
  },
  fonts: {
    title: 'Pretendard SemiBold',
    body: 'Pretendard Regular',
  },
  copyGlobalTone: 'clinical trust tone, citations and units, restrained adjectives, zero emoji, no overclaiming',
};
