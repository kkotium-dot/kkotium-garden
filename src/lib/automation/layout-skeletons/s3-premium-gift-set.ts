// src/lib/automation/layout-skeletons/s3-premium-gift-set.ts
//
// S3 — premium-gift-set, trust/detail/minimal.
// "프리미엄 선물세트" — holiday gift sets, premium beauty kits.
// Six sections including a dedicated story + package-shot pair.

import type { SkeletonSpec } from './index';

export const S3: SkeletonSpec = {
  id: 'S3',
  description: 'premium-gift-set trust detail — story-led premium gifting layout',
  matchSignature: {
    concept: {
      pricePosition: ['premium'],
      context: ['gift'],
      productType: ['set'],
    },
    tone: {
      emotionalTone: ['trust'],
      photoStyle: ['detail'],
      genre: ['minimal'],
    },
  },
  sections: [
    {
      id: 'hero',
      height: 1080,
      layout: 'centered_package_shot + brand_tagline',
      copyTone: 'composed, brand-led one-liner',
      bgColorToken: 'neutral_900',
    },
    {
      id: 'story',
      height: 1500,
      layout: 'brand_story_paragraph + signature_photo',
      copyTone: 'editorial paragraph, three to four sentences',
    },
    {
      id: 'product',
      height: 1600,
      layout: 'product_detail_grid_2x2',
      copyTone: 'material and texture description, restrained adjectives',
    },
    {
      id: 'package',
      height: 1200,
      layout: 'package_unboxing_sequence',
      copyTone: 'gift-handover scenario, two sentences',
    },
    {
      id: 'spec',
      height: 1100,
      layout: 'two_column_spec_table_with_components',
      copyTone: 'precise labels, gram or millilitre units',
    },
    {
      id: 'cta',
      height: 800,
      layout: 'gift_wrap_options + shipping + return',
      copyTone: 'reassurance phrasing for gift recipients',
    },
  ],
  totalHeight: 7280,
  width: 860,
  colorTokens: {
    primary: '#1F2937',
    secondary: '#C9A66B',
    accent: '#F8F7F4',
  },
  fonts: {
    title: 'Pretendard SemiBold',
    body: 'Pretendard Regular',
  },
  copyGlobalTone: 'editorial trust tone, restrained adjectives, package-as-gift framing, zero emoji',
};
