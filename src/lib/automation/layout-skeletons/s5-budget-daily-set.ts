// src/lib/automation/layout-skeletons/s5-budget-daily-set.ts
//
// S5 — budget-daily-set, friendly/vivid/korean.
// "가성비 키즈맘 한국형" — food multi-packs, kitchen accessories, kids items.
// Four sections with vivid colors and an option-grid second section.
//
// Verification case (v3.1 Section 4-C, example A): silicone baby food trays
// (4-piece set, ₩15,000) matches here via persona=kidsmom +
// pricePosition=budget + productType=set.

import type { SkeletonSpec } from './index';

export const S5: SkeletonSpec = {
  id: 'S5',
  description: 'budget-daily-set kidsmom korean — vivid value-first multi-pack layout',
  matchSignature: {
    concept: {
      persona: ['kidsmom'],
      pricePosition: ['budget'],
      context: ['daily'],
      productType: ['set'],
    },
    tone: {
      emotionalTone: ['friendly'],
      colorMood: ['vivid'],
      genre: ['korean'],
    },
  },
  sections: [
    {
      id: 'hero',
      height: 1080,
      layout: 'set_overview_with_count_badge',
      copyTone: 'count + variety hook, single line',
      bgColorToken: 'warm_100',
    },
    {
      id: 'optionIntro',
      height: 1600,
      layout: 'option_grid_with_color_chips',
      copyTone: 'short name per option, color or use label',
    },
    {
      id: 'usage',
      height: 1500,
      layout: 'family_kitchen_lifestyle_shot + caption',
      copyTone: 'family scenario, casual two-sentence caption',
    },
    {
      id: 'cta',
      height: 800,
      layout: 'shipping + return + bulk_discount_badge',
      copyTone: 'bundle savings phrasing, fair-trade boilerplate',
    },
  ],
  totalHeight: 4980,
  width: 860,
  colorTokens: {
    primary: '#FB923C',
    secondary: '#FEF3C7',
    accent: '#7C2D12',
  },
  fonts: {
    title: 'Pretendard Bold',
    body: 'Pretendard Regular',
  },
  copyGlobalTone: 'friendly mom-to-mom tone, count and variety up front, zero emoji',
};
