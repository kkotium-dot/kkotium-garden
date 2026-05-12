// src/lib/automation/layout-skeletons/s9-budget-daily-natural.ts
//
// S9 — budget-daily-single, friendly/warm/natural.
// "자연주의 따뜻" — eco goods, pet items, indoor plants.
// Four sections leading with material origin instead of spec table.

import type { SkeletonSpec } from './index';

export const S9: SkeletonSpec = {
  id: 'S9',
  description: 'budget-daily-single natural warm — material-led eco layout',
  matchSignature: {
    concept: {
      pricePosition: ['budget'],
      context: ['daily'],
      productType: ['single'],
    },
    tone: {
      emotionalTone: ['friendly'],
      colorMood: ['warm'],
      genre: ['natural'],
    },
  },
  sections: [
    {
      id: 'hero',
      height: 1080,
      layout: 'centered_product_on_natural_surface + tagline',
      copyTone: 'origin or material name + soft hook',
      bgColorToken: 'sage_50',
    },
    {
      id: 'material',
      height: 1500,
      layout: 'material_macro_shot + origin_caption',
      copyTone: 'origin, certifications, composition percent',
    },
    {
      id: 'usage',
      height: 1500,
      layout: 'home_or_outdoor_lifestyle_shot + caption',
      copyTone: 'natural daily scenario, two sentences',
    },
    {
      id: 'shipping',
      height: 800,
      layout: 'shipping + return + recyclable_packaging',
      copyTone: 'packaging detail + fair-trade boilerplate',
    },
  ],
  totalHeight: 4880,
  width: 860,
  colorTokens: {
    primary: '#84A98C',
    secondary: '#F4F1E8',
    accent: '#52796F',
  },
  fonts: {
    title: 'Pretendard SemiBold',
    body: 'Pretendard Regular',
  },
  copyGlobalTone: 'warm natural tone, origin and material vocabulary, restrained adjectives, zero emoji',
};
