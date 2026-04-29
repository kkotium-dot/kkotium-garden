// lib/naver-fee-rates-2026.ts
// Naver Smartstore Commission Rates — 2026 확정 기준 (2025.06.02 개편 반영)
//
// [2026 수수료 구조]
// ┌─────────────────────────────────────────────────────────────────────┐
// │ 총 수수료 = 주문관리수수료(네이버페이) + 판매수수료                      │
// │                                                                       │
// │ 주문관리수수료 (판매자 등급별, VAT 포함):                               │
// │   영세:  1.947%   중소1: 2.563%   중소2: 2.728%                       │
// │   중소3: 3.003%   일반:  3.630%                                        │
// │                                                                       │
// │ 판매수수료 (유입 채널별, 2025.06.02 개편):                              │
// │   일반 노출(쇼핑검색·플러스스토어 등):           2.73%                  │
// │   판매자 자체마케팅 링크(블로그/SNS/검색광고 등): 0.91%                  │
// │   ※ 기존 유입수수료 2% 폐지 → 판매수수료에 통합                          │
// │                                                                       │
// │ 스마트스토어 실질 마진 계산 기본값 (중소3 + 일반노출):                   │
// │   3.003% + 2.73% = 5.733%                                              │
// │ 자체마케팅 링크 유입 시 (중소3 + 마케팅):                                │
// │   3.003% + 0.91% = 3.913% (절감 1.82%p)                                │
// │                                                                       │
// │ 카테고리별 수수료 편차: 일반 카테고리는 동일                             │
// │   예외 — 디지털/가전(대형가전 포함) 4.8%, 도서(정가제) 4.5%             │
// │   ※ 예외 카테고리는 마케팅 링크 인하 미적용(보수적 적용)                 │
// │ Source: 네이버 스마트스토어센터 수수료 안내 (2025.06.02 개편 기준)       │
// └─────────────────────────────────────────────────────────────────────┘

// ──────────────────────────────────────────────────────────────────────────────
// Channel type — 유입 채널별 판매수수료 차등
// ──────────────────────────────────────────────────────────────────────────────
export type SalesChannel = 'normal' | 'marketing';

// ──────────────────────────────────────────────────────────────────────────────
// 2026 핵심 상수 — 단일 소스 보장
// ──────────────────────────────────────────────────────────────────────────────
/** Order management fee — 중소3 등급 (신규 셀러 기본) */
export const NAVER_ORDER_MGMT_RATE_DEFAULT = 0.03003;
/** Sales fee — 일반 노출(쇼핑검색·플러스스토어 등) */
export const NAVER_SALES_FEE_NORMAL = 0.0273;
/** Sales fee — 판매자 자체마케팅 링크(블로그/SNS/검색광고 등) */
export const NAVER_SALES_FEE_MARKETING = 0.0091;
/** Effective date of the 2025.06.02 fee reform */
export const FEE_REFORM_DATE = '2025-06-02';

const NAVER_FEE_BY_GRADE = {
  영세:  0.01947 + NAVER_SALES_FEE_NORMAL, // 4.677%
  중소1: 0.02563 + NAVER_SALES_FEE_NORMAL, // 5.293%
  중소2: 0.02728 + NAVER_SALES_FEE_NORMAL, // 5.458%
  중소3: 0.03003 + NAVER_SALES_FEE_NORMAL, // 5.733% ← 신규 셀러 기본 적용
  일반:  0.03630 + NAVER_SALES_FEE_NORMAL, // 6.360%
} as const;

/** 마진 계산 기본값: 중소3 + 일반 노출 (신규 셀러) */
export const NAVER_DEFAULT_FEE_RATE = NAVER_FEE_BY_GRADE['중소3']; // 0.05733
/** 자체마케팅 링크 유입 시 기본값: 중소3 + 마케팅 */
export const NAVER_DEFAULT_FEE_RATE_MARKETING = NAVER_ORDER_MGMT_RATE_DEFAULT + NAVER_SALES_FEE_MARKETING; // 0.03913

// D1 카테고리별 수수료 — 2026 기준 카테고리 구분 없음, 모두 동일
// 단, 대형가전/디지털 일부는 별도이므로 보수적으로 낮게 설정
export const NAVER_FEE_RATES_BY_D1: Record<string, number> = {
  '패션의류':     NAVER_DEFAULT_FEE_RATE,
  '패션잡화':     NAVER_DEFAULT_FEE_RATE,
  '화장품/미용':  NAVER_DEFAULT_FEE_RATE,
  '뷰티':         NAVER_DEFAULT_FEE_RATE,
  '디지털/가전':  0.048, // 대형가전 포함, 보수적 적용
  '식품':         NAVER_DEFAULT_FEE_RATE,
  '가구/인테리어':NAVER_DEFAULT_FEE_RATE,
  '스포츠/레저':  NAVER_DEFAULT_FEE_RATE,
  '출산/육아':    NAVER_DEFAULT_FEE_RATE,
  '완구/취미':    NAVER_DEFAULT_FEE_RATE,
  '도서':         0.045, // 도서정가제 적용 품목 별도
  '생활/건강':    NAVER_DEFAULT_FEE_RATE,
  '여가/생활편의':NAVER_DEFAULT_FEE_RATE,
  '반려동물':     NAVER_DEFAULT_FEE_RATE,
  '자동차용품':   NAVER_DEFAULT_FEE_RATE,
  '문구/오피스':  NAVER_DEFAULT_FEE_RATE,
  '주방용품/식기':NAVER_DEFAULT_FEE_RATE,
};

// ──────────────────────────────────────────────────────────────────────────────
// 카테고리별 권장 순마진율 (이커머스 파워셀러 기준 2026)
//
// [산정 기준]
// - 순마진 = (판매가 - 도매가 - 배송비 - 네이버수수료) / 판매가
// - 카테고리 특성: 반품률, 재구매율, 가격탄력성, 경쟁강도 반영
// - 최저선(min): 이것 미만이면 사실상 손해 위험 구간
// - 권장(recommended): 파워셀러 평균 목표치
// - 우수(good): 상위 20% 셀러 달성치
//
// [카테고리별 마진 특성 요약]
// 패션: 반품 많지만 마진 높음 → 목표 35%+
// 뷰티: 재구매 높고 단가 낮음 → 목표 30%+
// 식품: 단가 낮고 배송비 부담 → 목표 20%+
// 가전: 단가 높고 AS 부담 → 목표 15%+
// 생활용품: 경쟁 치열, 박리다매 → 목표 20%+
// ──────────────────────────────────────────────────────────────────────────────
export interface MarginProfile {
  min: number;          // 최소 마진율 (이 이하면 손해 위험)
  recommended: number;  // 권장 마진율 (파워셀러 목표)
  good: number;         // 우수 마진율 (상위 셀러)
  reason: string;       // 권장 이유 (짧게)
}

export const MARGIN_PROFILES_BY_D1: Record<string, MarginProfile> = {
  '패션의류': {
    min: 25, recommended: 35, good: 45,
    reason: '반품률 10~15% 고려, 시즌 재고 손실 방어',
  },
  '패션잡화': {
    min: 25, recommended: 35, good: 45,
    reason: '가방/신발 반품 多, 35% 이상 확보 권장',
  },
  '화장품/미용': {
    min: 20, recommended: 30, good: 40,
    reason: '재구매율 높음, 경쟁 치열 — 단가 대비 적정 마진',
  },
  '뷰티': {
    min: 20, recommended: 30, good: 40,
    reason: '재구매율 높음, 경쟁 치열 — 단가 대비 적정 마진',
  },
  '디지털/가전': {
    min: 10, recommended: 15, good: 20,
    reason: '단가 높아 절대 이익 확보 가능, AS 비용 주의',
  },
  '식품': {
    min: 15, recommended: 22, good: 30,
    reason: '유통기한·냉장배송 리스크, 배송비 부담 큼',
  },
  '가구/인테리어': {
    min: 20, recommended: 30, good: 40,
    reason: '배송비 높음(대형), 설치 AS 고려 시 30% 필요',
  },
  '스포츠/레저': {
    min: 20, recommended: 28, good: 38,
    reason: '시즌 상품 多, 재고 리스크 방어용 마진 필요',
  },
  '출산/육아': {
    min: 20, recommended: 28, good: 38,
    reason: '안전 검증 비용·반품 고려, 재구매 높은 편',
  },
  '완구/취미': {
    min: 20, recommended: 28, good: 38,
    reason: '시즌·트렌드 민감, 재고 손실 대비 마진 확보',
  },
  '도서': {
    min: 10, recommended: 15, good: 20,
    reason: '정가제 적용, 할인 폭 제한 — 마진 구조 낮음',
  },
  '생활/건강': {
    min: 18, recommended: 25, good: 35,
    reason: '생필품 경쟁 치열, 박리다매 구조 — 최소 20% 방어',
  },
  '여가/생활편의': {
    min: 20, recommended: 28, good: 38,
    reason: '서비스 상품 포함, 업종별 편차 큼',
  },
  '반려동물': {
    min: 20, recommended: 28, good: 38,
    reason: '재구매율 높음, 사료·간식은 단가 낮아 수량 확보 필요',
  },
  '자동차용품': {
    min: 20, recommended: 28, good: 38,
    reason: '전문성 어필 가능, 브랜드 없으면 가격 경쟁 심함',
  },
  '문구/오피스': {
    min: 18, recommended: 25, good: 35,
    reason: '단가 낮음, 수량 판매 구조 — 배송비 비중 주의',
  },
  '주방용품/식기': {
    min: 20, recommended: 28, good: 38,
    reason: '생필품 경쟁, 프리미엄 포지셔닝 시 40%+ 가능',
  },
};

// Default profile for unrecognized categories
export const DEFAULT_MARGIN_PROFILE: MarginProfile = {
  min: 18, recommended: 25, good: 35,
  reason: '카테고리 미설정 — 일반 상품 평균 기준',
};

// ──────────────────────────────────────────────────────────────────────────────
// Helper functions
// ──────────────────────────────────────────────────────────────────────────────

let _codeToD1Cache: Map<string, string> | null = null;

function buildCodeToD1Cache(): Map<string, string> {
  if (_codeToD1Cache) return _codeToD1Cache;
  _codeToD1Cache = new Map();
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NAVER_CATEGORIES_FULL } = require('@/lib/naver/naver-categories-full');
    for (const entry of NAVER_CATEGORIES_FULL) {
      if (entry.code && entry.d1) _codeToD1Cache.set(entry.code, entry.d1);
    }
  } catch { /* client-side or test */ }
  return _codeToD1Cache;
}

/** Get Naver fee rate by category code (2026)
 *  @param channel 'normal' (default) | 'marketing' — marketing link reduces sales fee 2.73% → 0.91%
 */
export function getNaverFeeRate(categoryCode?: string, channel: SalesChannel = 'normal'): number {
  const baseRate = (() => {
    if (!categoryCode) return NAVER_DEFAULT_FEE_RATE;
    const cache = buildCodeToD1Cache();
    const d1 = cache.get(categoryCode);
    if (d1 && NAVER_FEE_RATES_BY_D1[d1] !== undefined) return NAVER_FEE_RATES_BY_D1[d1];
    return NAVER_DEFAULT_FEE_RATE;
  })();
  return applyChannelToRate(baseRate, categoryCode, channel);
}

/** Get fee rate by d1 name directly
 *  @param channel 'normal' (default) | 'marketing'
 */
export function getNaverFeeRateByD1(d1Name?: string, channel: SalesChannel = 'normal'): number {
  const baseRate = d1Name && NAVER_FEE_RATES_BY_D1[d1Name] !== undefined
    ? NAVER_FEE_RATES_BY_D1[d1Name]
    : NAVER_DEFAULT_FEE_RATE;
  return applyChannelByD1(baseRate, d1Name, channel);
}

/** Internal: apply channel reduction to a base rate (categoryCode-aware) */
function applyChannelToRate(baseRate: number, categoryCode: string | undefined, channel: SalesChannel): number {
  if (channel === 'normal') return baseRate;
  // Marketing channel — only standard categories receive the 0.91% sales fee reduction
  // Exception categories (digital/home appliances, books) keep their conservative rates
  if (!categoryCode) {
    return NAVER_ORDER_MGMT_RATE_DEFAULT + NAVER_SALES_FEE_MARKETING;
  }
  const cache = buildCodeToD1Cache();
  const d1 = cache.get(categoryCode);
  return applyChannelByD1(baseRate, d1, channel);
}

/** Internal: apply channel reduction with d1 awareness */
function applyChannelByD1(baseRate: number, d1Name: string | undefined, channel: SalesChannel): number {
  if (channel === 'normal') return baseRate;
  // Exception categories — marketing link reduction not applied (Naver policy)
  if (d1Name === '디지털/가전' || d1Name === '도서') return baseRate;
  // Standard categories — swap normal sales fee (2.73%) with marketing (0.91%)
  return baseRate - NAVER_SALES_FEE_NORMAL + NAVER_SALES_FEE_MARKETING;
}

/** Get fee rate as formatted string e.g. "5.7%" */
export function getNaverFeeRateFormatted(categoryCode?: string, channel: SalesChannel = 'normal'): string {
  return `${(getNaverFeeRate(categoryCode, channel) * 100).toFixed(1)}%`;
}

/** Get recommended margin profile by d1 name */
export function getMarginProfile(d1Name?: string): MarginProfile {
  if (!d1Name) return DEFAULT_MARGIN_PROFILE;
  return MARGIN_PROFILES_BY_D1[d1Name] ?? DEFAULT_MARGIN_PROFILE;
}

/** Get recommended margin profile by category code */
export function getMarginProfileByCode(categoryCode?: string): MarginProfile {
  if (!categoryCode) return DEFAULT_MARGIN_PROFILE;
  const cache = buildCodeToD1Cache();
  const d1 = cache.get(categoryCode);
  return getMarginProfile(d1);
}

/** Detailed breakdown for display — includes channel info & marketing savings */
export interface NaverFeeBreakdown {
  orderManagementRate: number;
  salesFeeRate: number;
  totalRate: number;
  channel: SalesChannel;
  channelLabel: string;
  /** Marketing channel savings vs normal (positive when channel='marketing' on standard categories) */
  marketingSavedRate: number;
  gradeLabel: string;
  note: string;
  effectiveDate: string;
  /** True when this category is exempt from marketing link reduction */
  isExceptionCategory: boolean;
}

export function getNaverFeeBreakdown(categoryCode?: string, channel: SalesChannel = 'normal'): NaverFeeBreakdown {
  const cache = buildCodeToD1Cache();
  const d1 = categoryCode ? cache.get(categoryCode) : undefined;
  const isExceptionCategory = d1 === '디지털/가전' || d1 === '도서';

  const total = getNaverFeeRate(categoryCode, channel);
  // Order management rate is fixed at 3.003% for the default 중소3 grade
  // For exception categories the order-mgmt component cannot be precisely split,
  // so we compute salesFeeRate as the residual (>= 0)
  const orderManagementRate = NAVER_ORDER_MGMT_RATE_DEFAULT;
  const salesFeeRate = Math.max(0, total - orderManagementRate);

  // Compute marketing savings (positive only when channel='marketing' on standard categories)
  const normalTotal = getNaverFeeRate(categoryCode, 'normal');
  const marketingTotal = getNaverFeeRate(categoryCode, 'marketing');
  const marketingSavedRate = Math.max(0, normalTotal - marketingTotal);

  const channelLabel = channel === 'marketing' ? '자체마케팅 링크' : '일반 노출';
  const noteParts: string[] = [
    `주문관리 ${(orderManagementRate * 100).toFixed(2)}%`,
    `판매수수료 ${(salesFeeRate * 100).toFixed(2)}%(${channelLabel})`,
  ];
  if (isExceptionCategory) {
    noteParts.push('예외 카테고리 — 마케팅 링크 인하 미적용');
  }

  return {
    orderManagementRate,
    salesFeeRate,
    totalRate: total,
    channel,
    channelLabel,
    marketingSavedRate,
    gradeLabel: '중소3 (신규 기본)',
    note: noteParts.join(' + ') + ' (2025.06.02 개편 기준)',
    effectiveDate: FEE_REFORM_DATE,
    isExceptionCategory,
  };
}
