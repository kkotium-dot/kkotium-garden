// src/lib/automation/layout-skeletons/s1-budget-daily-single.ts
//
// S1 — budget-daily-single, friendly/white/minimal.
// "가성비 일상 미니멀" — single-SKU low-cost everyday items.
// Categories: small accessories, stationery, light appliances.
//
// Distribution note (v3.1 Section 4-A): S1 + S2 + S5 cover ~80% of sapling
// seller SKUs. S1 is the fastest lane — three sections, no lifestyle shot.

import type { SkeletonSpec } from './index';

export const S1: SkeletonSpec = {
  id: 'S1',
  description: 'budget-daily-single minimal — fast lane for low-cost single SKUs',
  matchSignature: {
    concept: {
      pricePosition: ['budget'],
      context: ['daily'],
      productType: ['single'],
    },
    tone: {
      emotionalTone: ['friendly'],
      photoStyle: ['white'],
      genre: ['minimal'],
    },
  },
  sections: [
    {
      id: 'hero',
      height: 1000,
      layout: 'centered_product + single_line_hook',
      copyTone: 'plain friendly tone, single-line hook, no emoji',
      bgColorToken: 'neutral_50',
    },
    {
      id: 'spec',
      height: 1100,
      layout: 'two_column_spec_table',
      copyTone: 'short factual labels, numbers first',
      bgColorToken: 'neutral_0',
    },
    {
      id: 'shipping',
      height: 700,
      layout: 'shipping_return_badges',
      copyTone: 'fair-trade boilerplate, no exaggeration',
      bgColorToken: 'neutral_100',
    },
  ],
  totalHeight: 2800,
  width: 860,
  colorTokens: {
    primary: '#F5F5F4',
    secondary: '#E7E5E4',
    accent: '#1C1917',
  },
  fonts: {
    title: 'Pretendard Bold',
    body: 'Pretendard Regular',
  },
  copyGlobalTone: 'plain friendly tone, value-first phrasing, zero emoji, no exaggerated adjectives',
};
