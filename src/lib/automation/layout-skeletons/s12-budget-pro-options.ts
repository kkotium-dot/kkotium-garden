// src/lib/automation/layout-skeletons/s12-budget-pro-options.ts
//
// S12 — budget-pro-options, professional/calm/minimal.
// "산업 도구 차분" — industrial tools, consumable parts, B2B basics.
// Five sections led by spec table and regulatory compliance.

import type { SkeletonSpec } from './index';

export const S12: SkeletonSpec = {
  id: 'S12',
  description: 'budget-pro-options professional calm — spec-table-first industrial layout',
  matchSignature: {
    concept: {
      pricePosition: ['budget'],
      context: ['pro'],
      productType: ['options'],
    },
    tone: {
      emotionalTone: ['professional'],
      colorMood: ['mono', 'calm'],
      genre: ['minimal'],
    },
  },
  sections: [
    {
      id: 'hero',
      height: 1000,
      layout: 'centered_product_white_bg + sku_code',
      copyTone: 'product name plus SKU code line',
      bgColorToken: 'neutral_0',
    },
    {
      id: 'specTable',
      height: 1500,
      layout: 'full_width_spec_table',
      copyTone: 'parameter rows with explicit units (mm, kg, V, A)',
    },
    {
      id: 'specifications',
      height: 1200,
      layout: 'regulation_and_compliance_grid',
      copyTone: 'KS standard, certification numbers, exact codes',
    },
    {
      id: 'usage',
      height: 1200,
      layout: 'application_scenarios_three_bullets',
      copyTone: 'use case bullet, one sentence each',
    },
    {
      id: 'shipping',
      height: 800,
      layout: 'shipping + return + bulk_order_contact',
      copyTone: 'B2B bulk-order channel, fair-trade boilerplate',
    },
  ],
  totalHeight: 5700,
  width: 860,
  colorTokens: {
    primary: '#374151',
    secondary: '#E5E7EB',
    accent: '#111827',
  },
  fonts: {
    title: 'Pretendard SemiBold',
    body: 'Pretendard Regular',
  },
  copyGlobalTone: 'calm professional tone, code and unit specificity, no marketing adjectives, zero emoji',
};
