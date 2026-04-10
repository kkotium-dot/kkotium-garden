// src/lib/naver-margin-advisor.ts
// Naver Smart Store 2026 — Power Seller Margin Advisory System
//
// [설계 원칙]
// - 네이버 스마트스토어 파워셀러 10년 경험 기반
// - 카테고리 세분류(D3) 단위로 반품률/시즌성/배송비 반영
// - 손익분기 공식: (도매가 + 배송비) / (1 - 수수료율 - 반품리스크율)
// - 목표 마진 = 순마진(배송비·수수료 차감 후) 기준
//
// [2026 네이버 수수료]
// 중소3 등급: 주문관리 3.003% + 판매수수료 2.73% = 5.733%

export interface MarginAdvice {
  // Category info
  d1: string;
  d2: string;
  d3: string;

  // Fee info
  naverFeeRate: number;        // 0.05733 (중소3 기준)

  // Return risk
  returnRateMin: number;       // % (예: 5)
  returnRateMax: number;       // % (예: 15)
  returnRateTypical: number;   // % 일반적 반품률
  returnRateReason: string;    // 반품률 높은 이유

  // Seasonality
  isSeasonal: boolean;
  seasonMonths?: number[];     // 성수기 월 (1-12)
  seasonNote?: string;

  // Shipping
  shippingWeight: 'light' | 'medium' | 'heavy' | 'bulky';
  typicalShippingFee: number;  // 원

  // Margin recommendations (순마진율 기준)
  marginMin: number;           // 최소 생존 마진율
  marginRecommended: number;   // 파워셀러 권장 마진율
  marginGood: number;          // 상위 20% 셀러 마진율
  marginExcellent: number;     // 상위 5% 마진율

  // Pricing strategy
  pricingStrategy: string;     // 핵심 전략
  warnings: string[];          // 주의사항
  tips: string[];              // 실전 팁
}

// ─────────────────────────────────────────────────
// D3 세분류 마진 데이터베이스 (파워셀러 기준 2026)
// ─────────────────────────────────────────────────
const MARGIN_DB: Record<string, Omit<MarginAdvice, 'd1' | 'd2' | 'd3'>> = {

  // ══ 패션의류 ══════════════════════════════════════
  '패션의류|여성의류|레깅스': {
    naverFeeRate: 0.05733,
    returnRateMin: 8, returnRateMax: 20, returnRateTypical: 12,
    returnRateReason: '사이즈 미스 빈번, 컬러 차이',
    isSeasonal: true, seasonMonths: [3,4,5,9,10], seasonNote: '봄/가을 성수기, 여름 수영복과 겹침',
    shippingWeight: 'light', typicalShippingFee: 3000,
    marginMin: 28, marginRecommended: 38, marginGood: 48, marginExcellent: 55,
    pricingStrategy: '사이즈 다양화로 반품률 방어, 시즌 전 재고 소진 필수',
    warnings: ['사이즈표 필수 첨부 (반품률 -5%)', '컬러 실물 사진 3장 이상', '시즌 종료 후 재고 할인 계획 필요'],
    tips: ['색상/사이즈 조합 스타일당 5종 이상 확보 시 알고리즘 유리', '구매후기 사진 포인트 강화로 전환율 +15%'],
  },
  '패션의류|여성의류|잠옷/홈웨어': {
    naverFeeRate: 0.05733,
    returnRateMin: 3, returnRateMax: 8, returnRateTypical: 5,
    returnRateReason: '홈웨어 특성상 사이즈 관대, 반품 낮음',
    isSeasonal: true, seasonMonths: [10,11,12,1], seasonNote: '겨울 수면잠옷 성수기 (11-1월)',
    shippingWeight: 'light', typicalShippingFee: 3000,
    marginMin: 25, marginRecommended: 35, marginGood: 45, marginExcellent: 52,
    pricingStrategy: '계절별 소재 변환 (여름 쿨링, 겨울 극세사) + 세트 구성',
    warnings: ['소재 명시 필수 (극세사/면/모달 등)', '겨울 성수기 전 9월 재고 확보'],
    tips: ['세트 구성(상하의) 판매 시 객단가 +60%', '마감처리/봉제 품질 사진 상세 첨부 필수'],
  },
  '패션의류|여성의류|원피스': {
    naverFeeRate: 0.05733,
    returnRateMin: 10, returnRateMax: 25, returnRateTypical: 15,
    returnRateReason: '핏/기장/소재 불만족 높음',
    isSeasonal: true, seasonMonths: [3,4,5,6], seasonNote: '봄/여름 시즌',
    shippingWeight: 'light', typicalShippingFee: 3000,
    marginMin: 30, marginRecommended: 40, marginGood: 50, marginExcellent: 58,
    pricingStrategy: '핏 사진 다양화 (다른 체형 모델 2명 이상), 소재 상세 안내',
    warnings: ['반품률 15% 이상 예상하고 마진 설정', '사이즈 상세 (가슴/허리/총장cm 필수)'],
    tips: ['허리 조절 기능 추가 시 반품률 대폭 감소', '스타일링 제안 이미지 전환율 +20%'],
  },
  '패션의류|여성의류|블라우스': {
    naverFeeRate: 0.05733,
    returnRateMin: 8, returnRateMax: 18, returnRateTypical: 11,
    returnRateReason: '어깨/소매 사이즈 미스',
    isSeasonal: false,
    shippingWeight: 'light', typicalShippingFee: 3000,
    marginMin: 28, marginRecommended: 38, marginGood: 48, marginExcellent: 55,
    pricingStrategy: '사무용/캐주얼 겸용 소재 선택으로 연중 판매',
    warnings: ['소재 투명도 사진 필수', '어깨너비 수치 cm 기재'],
    tips: ['화이트 계열은 속이 비침 여부 반드시 안내'],
  },
  '패션의류|남성의류|티셔츠': {
    naverFeeRate: 0.05733,
    returnRateMin: 5, returnRateMax: 12, returnRateTypical: 7,
    returnRateReason: '사이즈 이슈 (남성 티는 상대적으로 관대)',
    isSeasonal: true, seasonMonths: [4,5,6,7,8], seasonNote: '봄~여름 성수기',
    shippingWeight: 'light', typicalShippingFee: 3000,
    marginMin: 22, marginRecommended: 32, marginGood: 42, marginExcellent: 50,
    pricingStrategy: '컬러/사이즈 다양화, 묶음 할인으로 객단가 향상',
    warnings: ['경쟁 치열 카테고리 — 차별화 소재나 디자인 필요'],
    tips: ['3장 묶음 구성 시 객단가 및 리뷰 수 증가'],
  },
  '패션의류|남성의류|바지': {
    naverFeeRate: 0.05733,
    returnRateMin: 8, returnRateMax: 15, returnRateTypical: 10,
    returnRateReason: '허리/밑위 사이즈 미스',
    isSeasonal: false,
    shippingWeight: 'light', typicalShippingFee: 3000,
    marginMin: 25, marginRecommended: 35, marginGood: 45, marginExcellent: 52,
    pricingStrategy: '허리 사이즈 상세 표기, 밑위/허벅지/통 수치 기재',
    warnings: ['허리 수치 오차 1cm 이내 보증 문구 효과적'],
    tips: ['신축성 있는 소재로 사이즈 범위 넓히면 반품 감소'],
  },

  // ══ 스포츠/레저 ══════════════════════════════════
  '스포츠/레저|스포츠의류|요가복': {
    naverFeeRate: 0.05733,
    returnRateMin: 6, returnRateMax: 15, returnRateTypical: 9,
    returnRateReason: '레깅스와 동일한 사이즈 이슈',
    isSeasonal: true, seasonMonths: [1,2,3,4,9,10], seasonNote: '연초 다이어트 시즌 + 봄 운동 시즌',
    shippingWeight: 'light', typicalShippingFee: 3000,
    marginMin: 28, marginRecommended: 38, marginGood: 48, marginExcellent: 55,
    pricingStrategy: '기능성 강조 (흡습속건/압박/신축성) + 세트 구성',
    warnings: ['소재 성분표 필수', '스포츠 착용 사진 다양한 자세 필요'],
    tips: ['상하의 세트 + 단품 모두 운영 시 객단가 및 유입 증가'],
  },
  '스포츠/레저|스포츠의류|수영복': {
    naverFeeRate: 0.05733,
    returnRateMin: 5, returnRateMax: 12, returnRateTypical: 8,
    returnRateReason: '착용감/컬러 불만',
    isSeasonal: true, seasonMonths: [5,6,7,8], seasonNote: '여름 시즌 집중 (수영복 성수기)',
    shippingWeight: 'light', typicalShippingFee: 3000,
    marginMin: 30, marginRecommended: 40, marginGood: 50, marginExcellent: 58,
    pricingStrategy: '시즌 전 3-4월 미리 재고 확보, 시즌 후 즉시 할인 처분',
    warnings: ['시즌 후 재고 = 손실, 시즌 전 소량 다품목으로 수요 파악 후 추가 주문'],
    tips: ['자외선 차단 기능 추가 시 프리미엄 가격 가능'],
  },

  // ══ 가구/인테리어 ═══════════════════════════════
  '가구/인테리어|침구|이불': {
    naverFeeRate: 0.05733,
    returnRateMin: 3, returnRateMax: 8, returnRateTypical: 5,
    returnRateReason: '부피가 커서 반품 번거로움 → 반품률 낮음',
    isSeasonal: true, seasonMonths: [9,10,11], seasonNote: '가을 침구 교체 시즌',
    shippingWeight: 'heavy', typicalShippingFee: 5000,
    marginMin: 22, marginRecommended: 32, marginGood: 42, marginExcellent: 50,
    pricingStrategy: '배송비 포함가로 표시, 조건부 무료배송 5만원 이상 설정',
    warnings: ['부피 무게 택배비 실제 계산 필수 (부피중량 적용)', '세탁 방법 안내 필수'],
    tips: ['이불+베개 커버 세트 구성으로 객단가 향상', '소재(면/극세사/모달) 상세 어필'],
  },
  '가구/인테리어|가구|소파': {
    naverFeeRate: 0.05733,
    returnRateMin: 2, returnRateMax: 6, returnRateTypical: 3,
    returnRateReason: '대형 가구 반품 배송비 부담으로 낮음',
    isSeasonal: false,
    shippingWeight: 'bulky', typicalShippingFee: 30000,
    marginMin: 25, marginRecommended: 35, marginGood: 45, marginExcellent: 52,
    pricingStrategy: '설치 서비스 포함 가격으로 차별화, 배송+설치 패키지',
    warnings: ['화물 배송비 별도 책정 필수', '반품 시 왕복 배송비 약 6만원 고객 부담 안내'],
    tips: ['360도 사진/영상 제공으로 반품률 추가 감소'],
  },

  // ══ 화장품/미용 ══════════════════════════════════
  '화장품/미용|스킨케어|스킨/토너': {
    naverFeeRate: 0.05733,
    returnRateMin: 3, returnRateMax: 8, returnRateTypical: 5,
    returnRateReason: '개봉 후 반품 불가 특성',
    isSeasonal: false,
    shippingWeight: 'medium', typicalShippingFee: 3000,
    marginMin: 25, marginRecommended: 35, marginGood: 45, marginExcellent: 55,
    pricingStrategy: '성분 강조 마케팅, 피부타입별 추천으로 재구매율 향상',
    warnings: ['전성분 표시 의무', '피부 트러블 이슈 시 신속 대응 체계 필요'],
    tips: ['미니 샘플 동봉으로 재구매율 +25%', '성분 분석 상세페이지 SEO 효과 높음'],
  },

  // ══ 생활/건강 ═════════════════════════════════════
  '생활/건강|생활용품|청소용품': {
    naverFeeRate: 0.05733,
    returnRateMin: 3, returnRateMax: 8, returnRateTypical: 4,
    returnRateReason: '소모품 특성, 기능 불만 시 반품',
    isSeasonal: false,
    shippingWeight: 'medium', typicalShippingFee: 3000,
    marginMin: 18, marginRecommended: 25, marginGood: 35, marginExcellent: 45,
    pricingStrategy: '기능성 입증 영상 제작, 묶음 구성으로 객단가 향상',
    warnings: ['가격 경쟁 심한 카테고리 — 차별화 포인트 필수'],
    tips: ['사용 전/후 비교 사진/영상이 전환율에 결정적'],
  },

  // ══ 식품 ════════════════════════════════════════
  '식품|커피/음료|커피': {
    naverFeeRate: 0.05733,
    returnRateMin: 2, returnRateMax: 5, returnRateTypical: 3,
    returnRateReason: '개봉 후 반품 불가, 불량 외 반품 거의 없음',
    isSeasonal: false,
    shippingWeight: 'medium', typicalShippingFee: 3000,
    marginMin: 18, marginRecommended: 25, marginGood: 35, marginExcellent: 45,
    pricingStrategy: '구독 모델 or 정기배송 유도, 시음 포장으로 재구매 유도',
    warnings: ['유통기한 관리 필수', '여름 냉장 배송 필요 여부 확인'],
    tips: ['샘플 소용량 + 대용량 세트 구성 효과적'],
  },

  // ══ 디지털/가전 ══════════════════════════════════
  '디지털/가전|휴대폰액세서리|케이블/젠더': {
    naverFeeRate: 0.048,
    returnRateMin: 5, returnRateMax: 12, returnRateTypical: 7,
    returnRateReason: '기기 호환 문제',
    isSeasonal: false,
    shippingWeight: 'light', typicalShippingFee: 3000,
    marginMin: 20, marginRecommended: 30, marginGood: 40, marginExcellent: 50,
    pricingStrategy: '기기 호환표 상세 기재, 보증 기간 표시',
    warnings: ['호환 기기 명시 필수', '불량률 높은 경우 AS 정책 필요'],
    tips: ['MFi 인증 등 공식 인증 취득 시 프리미엄 가격'],
  },
  '디지털/가전|음향기기|이어폰': {
    naverFeeRate: 0.048,
    returnRateMin: 8, returnRateMax: 20, returnRateTypical: 12,
    returnRateReason: '음질/착용감 불만, 위생 이슈',
    isSeasonal: false,
    shippingWeight: 'light', typicalShippingFee: 3000,
    marginMin: 20, marginRecommended: 28, marginGood: 38, marginExcellent: 48,
    pricingStrategy: '음질 샘플 제공, 위생 새제품 포장 강조',
    warnings: ['개봉 후 반품 불가 정책 명시', '음질 특성 명확히 표기'],
    tips: ['노이즈캔슬링/방수 등 기능 명확히 어필'],
  },

  // ══ 반려동물 ═════════════════════════════════════
  '반려동물|강아지|사료/간식': {
    naverFeeRate: 0.05733,
    returnRateMin: 2, returnRateMax: 6, returnRateTypical: 3,
    returnRateReason: '유통기한 미확인 반품 소량',
    isSeasonal: false,
    shippingWeight: 'medium', typicalShippingFee: 3500,
    marginMin: 18, marginRecommended: 25, marginGood: 35, marginExcellent: 45,
    pricingStrategy: '정기배송 설정, 대용량 할인으로 재구매율 극대화',
    warnings: ['유통기한 최소 6개월 이상 제품 선택', '성분/원산지 표시 의무'],
    tips: ['소포장 체험팩 → 대용량 유도 전략 효과적'],
  },
};

// Default advice for unlisted subcategories
const DEFAULT_ADVICE: Omit<MarginAdvice, 'd1' | 'd2' | 'd3'> = {
  naverFeeRate: 0.05733,
  returnRateMin: 5, returnRateMax: 12, returnRateTypical: 7,
  returnRateReason: '일반적인 반품률 범위',
  isSeasonal: false,
  shippingWeight: 'medium', typicalShippingFee: 3000,
  marginMin: 20, marginRecommended: 30, marginGood: 40, marginExcellent: 50,
  pricingStrategy: '상품 차별화 포인트 발굴 및 상세페이지 완성도 향상',
  warnings: ['카테고리 경쟁 강도 확인 후 마진 조정', '반품 정책 명확히 안내'],
  tips: ['상위 판매자 상세페이지 벤치마킹', '리뷰 포인트 설정으로 리뷰 수 증가'],
};

// D1-level advice for unknown D3
const D1_DEFAULTS: Record<string, Partial<typeof DEFAULT_ADVICE>> = {
  '패션의류':     { returnRateMin: 8, returnRateMax: 20, returnRateTypical: 12, marginMin: 28, marginRecommended: 38, marginGood: 48, marginExcellent: 55 },
  '패션잡화':     { returnRateMin: 8, returnRateMax: 20, returnRateTypical: 12, marginMin: 28, marginRecommended: 38, marginGood: 48, marginExcellent: 55 },
  '화장품/미용':  { returnRateMin: 3, returnRateMax: 8,  returnRateTypical: 5,  marginMin: 25, marginRecommended: 35, marginGood: 45, marginExcellent: 55 },
  '뷰티':         { returnRateMin: 3, returnRateMax: 8,  returnRateTypical: 5,  marginMin: 25, marginRecommended: 35, marginGood: 45, marginExcellent: 55 },
  '디지털/가전':  { returnRateMin: 5, returnRateMax: 15, returnRateTypical: 8,  marginMin: 12, marginRecommended: 18, marginGood: 25, marginExcellent: 35, naverFeeRate: 0.048 },
  '식품':         { returnRateMin: 2, returnRateMax: 6,  returnRateTypical: 3,  marginMin: 15, marginRecommended: 22, marginGood: 30, marginExcellent: 40 },
  '가구/인테리어':{ returnRateMin: 2, returnRateMax: 8,  returnRateTypical: 4,  marginMin: 22, marginRecommended: 32, marginGood: 42, marginExcellent: 50 },
  '스포츠/레저':  { returnRateMin: 5, returnRateMax: 15, returnRateTypical: 8,  marginMin: 22, marginRecommended: 32, marginGood: 42, marginExcellent: 50 },
  '출산/육아':    { returnRateMin: 4, returnRateMax: 10, returnRateTypical: 6,  marginMin: 22, marginRecommended: 30, marginGood: 40, marginExcellent: 50 },
  '반려동물':     { returnRateMin: 2, returnRateMax: 8,  returnRateTypical: 4,  marginMin: 18, marginRecommended: 25, marginGood: 35, marginExcellent: 45 },
  '생활/건강':    { returnRateMin: 3, returnRateMax: 8,  returnRateTypical: 5,  marginMin: 18, marginRecommended: 25, marginGood: 35, marginExcellent: 45 },
};

// ─────────────────────────────────────────────────
// Main API
// ─────────────────────────────────────────────────

export function getMarginAdvice(d1: string, d2: string, d3: string): MarginAdvice {
  // Try exact D3 key first
  const key = `${d1}|${d2}|${d3}`;
  const exact = MARGIN_DB[key];
  if (exact) return { d1, d2, d3, ...exact };

  // Try D1-level default
  const d1default = D1_DEFAULTS[d1];
  if (d1default) {
    return {
      d1, d2, d3,
      ...DEFAULT_ADVICE,
      ...d1default,
    };
  }

  return { d1, d2, d3, ...DEFAULT_ADVICE };
}

// Calculate breakeven price
// Formula: salePrice * (1 - naverFee - returnRisk) = supplierPrice + shippingFee
export function calcBreakevenPrice(
  supplierPrice: number,
  shippingFee: number,
  naverFeeRate: number,
  returnRatePercent: number
): number {
  const denominator = 1 - naverFeeRate - (returnRatePercent / 100);
  if (denominator <= 0) return supplierPrice * 3; // safety
  return Math.ceil((supplierPrice + shippingFee) / denominator);
}

// Calculate recommended sale price given target margin
export function calcRecommendedPrice(
  supplierPrice: number,
  shippingFee: number,
  naverFeeRate: number,
  returnRatePercent: number,
  targetMarginPercent: number
): number {
  const denominator = 1 - naverFeeRate - (returnRatePercent / 100) - (targetMarginPercent / 100);
  if (denominator <= 0) return supplierPrice * 3;
  return Math.ceil((supplierPrice + shippingFee) / denominator / 100) * 100; // round to 100
}

// Calculate actual net margin
export function calcNetMargin(
  supplierPrice: number,
  salePrice: number,
  shippingFee: number,
  naverFeeRate: number,
  returnRatePercent: number
): number {
  if (salePrice <= 0) return 0;
  const naverFee = Math.round(salePrice * naverFeeRate);
  const returnRisk = Math.round(salePrice * returnRatePercent / 100);
  const profit = salePrice - supplierPrice - shippingFee - naverFee - returnRisk;
  return Math.round((profit / salePrice) * 1000) / 10; // round to 1dp
}

// Get current season context
export function getSeasonContext(advice: MarginAdvice): {
  isNowPeakSeason: boolean;
  isNowOffSeason: boolean;
  peakMonthsLabel: string;
} {
  if (!advice.isSeasonal || !advice.seasonMonths) {
    return { isNowPeakSeason: false, isNowOffSeason: false, peakMonthsLabel: '' };
  }
  const currentMonth = new Date().getMonth() + 1;
  const isNowPeakSeason = advice.seasonMonths.includes(currentMonth);
  // Off-season: far from peak (>3 months away)
  const minDist = Math.min(...advice.seasonMonths.map(m => {
    const d = Math.abs(m - currentMonth);
    return Math.min(d, 12 - d);
  }));
  const isNowOffSeason = minDist > 3;
  const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const peakMonthsLabel = advice.seasonMonths.map(m => monthNames[m-1]).join(', ');
  return { isNowPeakSeason, isNowOffSeason, peakMonthsLabel };
}
