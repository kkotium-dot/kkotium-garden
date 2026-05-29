// KKOTIUM Adobe Express Brand Kit — typed system constant.
//
// Exposes the brand kit so it can be applied consistently across Express
// outputs (manual import today, future Express API automation).
// Pure module: no IO, no network.
//
// Authority:
//   docs/handoff/HANDOFF_g8_engine_q4_2026-05-29.md §2-D
//   docs/research/KKOTIUM_ART_DIRECTION_RESEARCH_2026-05-29.md §5
//     (senior 18pt+ size scale / WCAG AAA contrast).

export const KKOTIUM_BRAND_KIT = {
  colors: {
    brandRed: '#E62310',
    brandPink: '#FFCCEA',
    ink: '#111111',
    paper: '#FFFFFF',
  },
  typography: {
    korean: 'Pretendard',
    english: 'Inter',
    sizeScale: {
      senior: 1.3, // 18pt+ (research §5)
      default: 1.0,
    },
  },
  contrastMin: {
    senior: 7.0, // WCAG AAA
    default: 4.5, // WCAG AA
  },
} as const;

export type BrandKit = typeof KKOTIUM_BRAND_KIT;
