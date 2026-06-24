// src/lib/seo/copy-tone.ts
// ============================================================================
// HOOK-HYBRID-1 (#153 / #151) — PURE copy-tone classifier + SEO keyword check.
// The hybrid copy engine generates 3 detail tones (benefit/emotion/trust); this
// module DETERMINISTICALLY recommends one of them from product data (price +
// category) so the recommendation is predictable and ROI-consistent, instead of
// letting the AI pick. No I/O, no React — safe to call anywhere.

export type CopyTone = 'benefit' | 'emotion' | 'trust';

export interface CopyToneRecommendation {
  tone: CopyTone;
  reason: string;
}

// Category cue sets (substring match on the category path). Operator rules:
//  - 신선도민감·기업형·보장성(화환/생화/대형관엽) -> trust (forced, overrides price)
//  - 대량/소모품 -> benefit
//  - 선물·인테리어 -> emotion
const FRESH_GUARANTEE = ['화환', '생화', '근조', '개업', '축하화환', '관엽', '화분', '꽃다발', '화훼', '식물'];
const CONSUMABLE_BULK = ['세제', '생활용품', '위생', '일회용', '소모', '리필', '묶음', '대용량', '물티슈', '주방', '청소'];
const GIFT_INTERIOR = ['선물', '인테리어', '가구', '조명', '장식', '디퓨저', '캔들', '방향', '소품', '오브제', '홈데코'];

function hasCue(path: string, cues: string[]): boolean {
  return cues.some(c => path.includes(c));
}

/**
 * Deterministically recommend a detail copy tone from price + category.
 * PURE. price in KRW (0 / undefined = unknown). categoryPath optional.
 */
export function classifyCopyTone(price: number | undefined, categoryPath: string | undefined): CopyToneRecommendation {
  const path = (categoryPath ?? '').trim();
  const p = typeof price === 'number' && price > 0 ? price : 0;

  // 1) Forced trust for freshness-sensitive / guarantee categories (overrides price).
  if (hasCue(path, FRESH_GUARANTEE)) {
    return { tone: 'trust', reason: '신선도·보장이 중요한 카테고리 — 배송 보장·품질 데이터로 신뢰를 강조해요.' };
  }
  // 2) Benefit for low ticket or consumable/bulk.
  if ((p > 0 && p <= 10000) || hasCue(path, CONSUMABLE_BULK)) {
    return {
      tone: 'benefit',
      reason: p > 0 && p <= 10000
        ? '객단가 1만원 이하 — 가성비·묶음·수량 같은 구체 혜택이 잘 통해요.'
        : '대량·소모품 카테고리 — 가성비·묶음 혜택을 앞세우는 게 좋아요.',
    };
  }
  // 3) Emotion for high ticket or gift/interior.
  if (p >= 30000 || hasCue(path, GIFT_INTERIOR)) {
    return {
      tone: 'emotion',
      reason: p >= 30000
        ? '객단가 3만원 이상 — TPO·공간/심리 변화를 그리는 감성 카피가 어울려요.'
        : '선물·인테리어 카테고리 — 공간·감성 변화를 그리는 카피가 어울려요.',
    };
  }
  // 4) Middle band (1~3만): default to emotion (space/feeling) as the safe pick.
  return { tone: 'emotion', reason: '중간 가격대 — 공간·감성 변화를 그리는 카피를 기본 추천해요.' };
}

/** PURE: does the copy contain at least one target keyword? (SEO 신호등) */
export function copyContainsKeyword(copy: string, keywords: string[]): boolean {
  const c = (copy ?? '').toLowerCase();
  return (keywords ?? []).some(k => {
    const kw = k.trim().toLowerCase();
    return kw.length > 0 && c.includes(kw);
  });
}
