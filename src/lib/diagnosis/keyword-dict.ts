// Sprint 7-M2 Step 2 — keyword dictionaries for 9-axis CTI scoring.
//
// Source-of-truth Korean keyword sets consumed by score-engine.ts. Kept as
// literal Korean (no \uXXXX escape per work principle #29-c). All exported
// as readonly tuples so the score engine type-narrows on inclusion checks.

export const TONE_KEYWORDS = {
  emotional: [
    '무드', '감성', '우드', '분위기', '인테리어', '데코', '핸드메이드',
    '디자인', '빈티지', '러블리', '내추럴', '미니멀',
  ],
  practical: [
    '다용도', '수납', '정리', '청소', '편리', '기능', '효율',
    '실용', '대용량', '간편', '튼튼',
  ],
} as const;

export const SEASON_KEYWORDS = {
  spring: ['봄', '입학', '졸업', '화이트데이', '봄꽃', '벚꽃', '신학기'],
  summer: ['여름', '휴가', '캠핑', '피크닉', '바캉스', '쿨링', '냉감'],
  fall: ['가을', '추석', '단풍', '한가위', '풍요'],
  winter: ['겨울', '크리스마스', '연말', '신년', '눈꽃', '한파', '방한'],
} as const;

export const GIFT_KEYWORDS = [
  '선물', '집들이', '이사', '결혼', '신혼', '출산', '베이비',
  '임산부', '산모', '환갑', '어버이날', '스승의날', '기념일',
  '돌잔치', '생일', '개업', '취업', '입학선물',
] as const;

// Signals that imply a less-saturated marketplace niche — high score means
// the seller has more pricing latitude / less direct competition.
export const COMPETITION_KEYWORDS = [
  '핸드메이드', '한정', '인디', '디자이너', '빈티지', '소량',
  '수제', '커스텀', '맞춤', '제작', '주문제작',
] as const;

export type ToneClass = keyof typeof TONE_KEYWORDS;
export type SeasonClass = keyof typeof SEASON_KEYWORDS;

// Month -> season map used by calcT2Seasonality. Korean retail seasons are
// approximated to standard quarters; tune later if DataLab shows skew.
export function monthToSeason(month: number): SeasonClass {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}
