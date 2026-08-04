// src/lib/policy/exclusion-rules.ts
// 취급 제외 정책 엔진 (전 상품 공통) — PRD `docs/design/KKOTTI_AGENT_SYSTEM_PRD.md` §5-2 확정.
// 소싱·수집·발행이 이 함수 하나를 공유한다. 각자 판정 로직을 새로 만들지 않는다.
// P1 범위: 소싱(sourcing-recommender.ts)만 연결. 수집·발행 확장은 P6.

import { NAVER_CATEGORIES_FULL } from '@/lib/naver/naver-categories-full';

export type ExclusionKind = 'FOOD' | 'COSMETIC' | 'BRAND';

export interface ExclusionVerdict {
  excluded: boolean;
  kind: ExclusionKind | null;
  reason: string | null; // 화면 노출용 한글 사유
  confidence: 'certain' | 'heuristic';
}

const D1_BY_CODE = new Map(NAVER_CATEGORIES_FULL.map((c) => [c.code, c.d1]));

const FOOD_D1 = '식품';
const COSMETIC_D1 = '화장품/미용';

// 브랜드 취급 제외 신호어 — 운영자가 계속 추가 가능. 새 브랜드/신호어를 추가할 때는
// 아래 배열에 그대로 추가하면 된다(재배포만 하면 즉시 반영, 별도 설정 불필요).
const BRAND_DENYLIST: string[] = [
  '나이키', '아디다스', '뉴발란스', '샤넬', '루이비통', '구찌', '애플', '삼성전자',
];

const BRAND_SIGNAL_WORDS = ['정품', '공식', 'authentic', 'official'];
const BRAND_BRACKET_PATTERN = /\[[^\]]+\]/; // "[브랜드]" 대괄호 표기

function judgeCategory(categoryCode?: string | null, categoryD1?: string | null): ExclusionKind | null {
  const d1 = categoryD1 ?? (categoryCode ? D1_BY_CODE.get(categoryCode) : undefined);
  if (!d1) return null;
  if (d1 === FOOD_D1) return 'FOOD';
  if (d1 === COSMETIC_D1) return 'COSMETIC';
  return null;
}

function judgeBrand(productName?: string | null): boolean {
  if (!productName) return false;
  const name = productName.trim();
  if (name.length === 0) return false;

  if (BRAND_DENYLIST.some((brand) => name.includes(brand))) return true;
  if (BRAND_SIGNAL_WORDS.some((word) => name.toLowerCase().includes(word.toLowerCase()))) return true;
  if (BRAND_BRACKET_PATTERN.test(name)) return true;

  return false;
}

/**
 * 취급 제외 여부 판정. 보수적으로 판단한다 — 확실하지 않으면 배제하지 않는다
 * (오탐으로 정상 상품을 막는 손실이 더 크다, PRD §5-2).
 */
export function judgeExclusion(input: {
  categoryCode?: string | null;
  categoryD1?: string | null;
  productName?: string | null;
}): ExclusionVerdict {
  const categoryKind = judgeCategory(input.categoryCode, input.categoryD1);
  if (categoryKind === 'FOOD') {
    return { excluded: true, kind: 'FOOD', reason: '식품 카테고리는 취급 제외 대상이에요', confidence: 'certain' };
  }
  if (categoryKind === 'COSMETIC') {
    return { excluded: true, kind: 'COSMETIC', reason: '화장품/미용 카테고리는 취급 제외 대상이에요', confidence: 'certain' };
  }

  if (judgeBrand(input.productName)) {
    return { excluded: true, kind: 'BRAND', reason: '브랜드 상품으로 추정돼 취급 제외 대상이에요', confidence: 'heuristic' };
  }

  return { excluded: false, kind: null, reason: null, confidence: 'heuristic' };
}
