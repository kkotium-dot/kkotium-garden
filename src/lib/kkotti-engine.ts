// src/lib/kkotti-engine.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 꼬띠 단독 평가 엔진
// 반환: types/naver.ts KkottiEvaluation (breakdown 10항목 합계 100점)
// margin(20) + keywords(20) + description(15) + images(10)
// + competitiveness(10) + inventory(10) + shipping(5)
// + reviews(5) + options(3) + brand(2) = 100
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type {
  KkottiEvaluation,
  KkottiMood,
  KkottiScoreBreakdown,
} from '@/types/naver';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 네이버 스마트스토어 카테고리별 수수료율 (2026 기준)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const NAVER_FEE_RATES: Record<string, number> = {
  // 패션/의류
  '패션의류':       0.06,
  '패션잡화':       0.06,
  '여성의류':       0.06,
  '남성의류':       0.06,
  '아동의류':       0.06,
  // 뷰티
  '화장품/미용':    0.06,
  '뷰티':           0.06,
  '헤어케어':       0.06,
  // 생활/홈
  '생활/건강':      0.055,
  '홈인테리어':     0.055,
  '주방용품':       0.055,
  '욕실용품':       0.055,
  // 디지털/가전
  '디지털/가전':    0.036,
  '컴퓨터':         0.036,
  '스마트폰':       0.036,
  // 식품
  '식품':           0.055,
  '신선식품':       0.055,
  '건강식품':       0.055,
  // 스포츠
  '스포츠/레저':    0.06,
  '등산/캠핑':      0.06,
  // 출판/문구
  '도서':           0.02,
  '문구':           0.05,
  // 반려동물
  '반려동물':       0.055,
  // 기본
  'default':        0.058,
};

/** 카테고리명으로 수수료율 조회 */
export function getNaverFeeRate(category?: string): number {
  if (!category) return NAVER_FEE_RATES['default'];
  const key = Object.keys(NAVER_FEE_RATES).find(k =>
    k !== 'default' && category.includes(k)
  );
  return key ? NAVER_FEE_RATES[key] : NAVER_FEE_RATES['default'];
}

/** 실전 마진 계산 (네이버 스마트스토어 기준) */
export function calcMarginDetail(params: {
  supplierPrice: number;
  salePrice: number;
  shippingFee?: number;   // 판매자 부담 배송비
  category?: string;
  naverFeeRateOverride?: number; // 직접 지정 시
}) {
  const { supplierPrice, salePrice, shippingFee = 0, category, naverFeeRateOverride } = params;
  const feeRate = naverFeeRateOverride ?? getNaverFeeRate(category);
  const naverFee   = Math.round(salePrice * feeRate);
  const totalCost  = supplierPrice + shippingFee;
  const profit     = salePrice - totalCost - naverFee;
  const marginRate = salePrice > 0 ? (profit / salePrice) * 100 : 0;
  const roi        = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  return { feeRate, naverFee, totalCost, profit, marginRate, roi };
}

export interface KkottiEvaluationInput {
  name?: string;
  description?: string;
  salePrice?: number;
  supplierPrice?: number;
  mainImage?: string;
  images?: string[];
  brand?: string;
  category?: string;
  keywords?: string[];
  stock?: number;
  hasOptions?: boolean;
  shippingFee?: number;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export function evaluateKkotti(input: KkottiEvaluationInput): KkottiEvaluation {
  const suggestions: string[] = [];

  // 1) margin — max 20점
  let margin = 10;
  if (input.salePrice && input.supplierPrice) {
    const rate = (input.salePrice - input.supplierPrice) / input.salePrice;
    if (rate < 0.05) {
      margin = 2;
      suggestions.push('마진율이 너무 낮아요. 판매가를 올리거나 공급가를 조정해 보세요.');
    } else if (rate < 0.15) {
      margin = 8;
      suggestions.push('마진율이 다소 낮습니다. 옵션가·배송비 등을 재검토해 보세요.');
    } else if (rate < 0.3) {
      margin = 15;
    } else {
      margin = 20;
    }
  } else {
    suggestions.push('공급가와 판매가를 입력하면 꼬띠가 마진을 정확히 평가해 줄 수 있어요.');
  }

  // 2) keywords — max 20점
  const kwCount = input.keywords?.length ?? 0;
  let keywords = 0;
  if (kwCount === 0) {
    keywords = 2;
    suggestions.push('검색 키워드를 5개 이상 등록해 보세요. 노출 범위가 넓어집니다.');
  } else if (kwCount < 3) {
    keywords = 10;
    suggestions.push('키워드를 5개 이상으로 늘리면 더 많은 검색에 노출돼요.');
  } else if (kwCount <= 10) {
    keywords = 20;
  } else {
    keywords = 16;
    suggestions.push('키워드가 너무 많으면 분산될 수 있어요. 핵심 키워드 위주로 정리해 보세요.');
  }

  // 3) description — max 15점
  const descLen = (input.description ?? '').trim().length;
  let description = 0;
  if (descLen === 0) {
    description = 0;
    suggestions.push('상세 설명을 입력하면 전환율이 크게 올라가요. 장점·사용법을 적어 주세요.');
  } else if (descLen < 50) {
    description = 5;
    suggestions.push('설명을 50자 이상으로 늘려 보세요. 소재·사이즈·A/S 정보를 추가하면 좋아요.');
  } else if (descLen < 200) {
    description = 10;
  } else {
    description = 15;
  }

  // 4) images — max 10점
  const imgCount = (input.images?.length ?? 0) + (input.mainImage ? 1 : 0);
  let images = 0;
  if (imgCount === 0) {
    images = 0;
    suggestions.push('대표 이미지를 최소 1장 이상 등록해 주세요.');
  } else if (imgCount < 3) {
    images = 5;
    suggestions.push('이미지를 3장 이상 등록하면 전환율이 더 좋아질 수 있어요.');
  } else {
    images = 10;
  }

  // 5) competitiveness — max 10점
  let competitiveness = 7;
  if (input.salePrice && input.supplierPrice) {
    const ratio = input.salePrice / input.supplierPrice;
    if (ratio >= 1.3 && ratio <= 2.5) {
      competitiveness = 10;
    } else if (ratio < 1.1) {
      competitiveness = 3;
      suggestions.push('판매가가 공급가에 비해 너무 낮아요. 가격 경쟁력을 재검토해 보세요.');
    }
  }

  // 6) inventory — max 10점
  let inventory = 7;
  if (typeof input.stock === 'number') {
    if (input.stock <= 0) {
      inventory = 2;
      suggestions.push('재고가 0입니다. 품절 상태라면 상태값을 확인해 주세요.');
    } else if (input.stock < 3) {
      inventory = 5;
      suggestions.push('재고가 매우 적어요. 인기 상품이라면 미리 확보해 두세요.');
    } else if (input.stock >= 10) {
      inventory = 10;
    }
  }

  // 7) shipping — max 5점
  let shipping = 3;
  if (typeof input.shippingFee === 'number') {
    if (input.shippingFee === 0) {
      shipping = 5;
    } else if (input.shippingFee <= 3000) {
      shipping = 4;
    } else if (input.shippingFee <= 5000) {
      shipping = 2;
      suggestions.push('배송비가 다소 높습니다. 무료배송 조건이나 프로모션을 고민해 보세요.');
    } else {
      shipping = 1;
      suggestions.push('배송비가 높아 이탈이 발생할 수 있어요. 무료배송 임계값을 검토해 보세요.');
    }
  }

  // 8) reviews — max 5점 (신규 기본 0)
  const reviews = 0;

  // 9) options — max 3점
  const options = input.hasOptions ? 3 : 1;

  // 10) brand — max 2점
  const brand = (input.brand ?? '').trim().length > 0 ? 2 : 0;

  const breakdown: KkottiScoreBreakdown = {
    margin, keywords, description, images,
    competitiveness, inventory, shipping,
    reviews, options, brand,
  };

  const totalScore = clamp(
    margin + keywords + description + images +
    competitiveness + inventory + shipping +
    reviews + options + brand,
    0, 100
  );

  let mood: KkottiMood;
  let message: string;
  if (totalScore >= 90) {
    mood = 'celebrate';
    message = '와우! 거의 완벽해요. 이 상태로 네이버에 바로 올려도 되겠어요! 🎉';
  } else if (totalScore >= 75) {
    mood = 'happy';
    message = '아주 좋아요! 몇 가지만 살짝 손보면 더 잘 팔릴 준비가 돼 있어요 😊';
  } else if (totalScore >= 60) {
    mood = 'excited';
    message = '기본기는 잡혀 있어요. 꼬띠가 알려주는 포인트만 수정해 볼까요? 😃';
  } else if (totalScore >= 40) {
    mood = 'thinking';
    message = '음… 아직은 조금 아쉬워요. 그래도 충분히 성장 가능성이 보여요! 🤔';
  } else {
    mood = 'worried';
    message = '지금 상태로는 전환이 잘 안 나올 수 있어요. 꼬띠랑 같이 하나씩 개선해 봐요 😟';
  }

  return { totalScore, breakdown, mood, message, suggestions };
}
