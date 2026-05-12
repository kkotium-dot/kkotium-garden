// src/lib/automation/layout-skeletons/s2-standard-daily-options.ts
//
// S2 — standard-daily-options, friendly/lifestyle/korean. The default
// fallback in skeleton-matcher when no specialised branch fires.
// "표준 일상 친근 (주력)" — the sapling seller's workhorse layout.
// Categories: living goods, household items.
//
// Source: v3.1 Section 4 "골격 1개 구조 예시 (S2)" — this file mirrors the
// YAML example one-to-one (5 sections, total height 6380, warm palette).

import type { SkeletonSpec } from './index';

export const S2: SkeletonSpec = {
  id: 'S2',
  description: 'standard-daily friendly lifestyle (default workhorse)',
  matchSignature: {
    concept: {
      pricePosition: ['standard'],
      context: ['daily'],
      productType: ['single', 'options'],
    },
    tone: {
      emotionalTone: ['friendly'],
      photoStyle: ['lifestyle'],
      genre: ['korean'],
    },
  },
  sections: [
    {
      id: 'hero',
      height: 1080,
      layout: 'centered_product + tagline',
      copyTone: 'friendly tone, single-line hook',
      bgColorToken: 'warm_50',
    },
    {
      id: 'problem',
      height: 1400,
      layout: 'three_bullet_with_icons',
      copyTone: 'empathic question + three pain points',
    },
    {
      id: 'solution',
      height: 1600,
      layout: 'product_closeup + three_benefits',
      copyTone: 'concrete strengths, include at least one number',
    },
    {
      id: 'usage',
      height: 1500,
      layout: 'lifestyle_shot + caption',
      copyTone: 'one-to-two sentence daily scenario',
    },
    {
      id: 'cta',
      height: 800,
      layout: 'shipping + return + good_service_badge',
      copyTone: 'reassurance phrasing, fair-trade boilerplate',
    },
  ],
  totalHeight: 6380,
  width: 860,
  colorTokens: {
    primary: '#E89B73',
    secondary: '#F4E4D7',
    accent: '#3D2C1E',
  },
  fonts: {
    title: 'Pretendard Bold',
    body: 'Pretendard Regular',
  },
  copyGlobalTone: 'friendly, first-person invitation phrasing, zero emoji',
};
