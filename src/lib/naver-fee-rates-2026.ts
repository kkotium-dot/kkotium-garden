// lib/naver-fee-rates-2026.ts
// Naver Smartstore Commission Rates — 2026 확정 기준
//
// [2025-06-02 개편 핵심]
// - 유입수수료 2% 폐지 → 매출연동 판매수수료로 통합
// - 네이버플러스스토어 일반노출:    2.73% (기본 노출/검색 유입)
// - 판매자 마케팅링크 경유:         0.91% (셀러 자체 마케팅: SNS/광고/외부 유입)
//
// [2026 수수료 구조]
// ┌─────────────────────────────────────────────────────────────────────┐
// │ 총 수수료 = 주문관리수수료(네이버페이) + 판매수수료                      │
// │                                                                       │
// │ 주문관리수수료 (판매자 등급별, VAT 포함):                               │
// │   영세:  1.947%   중소1: 2.563%   중소2: 2.728%                       │
// │   중소3: 3.003%   일반:  3.630%                                        │
// │                                                                       │
// │ 판매수수료 (채널별, 2025-06-02 개편):                                  │
// │   normal   = 일반노출:        2.73% (네이버 검색/플러스스토어 유입)     │
// │   marketing = 자체마케팅 링크: 0.91% (셀러 SNS/외부광고/직접 유입)      │
// │                                                                       │
// │ 스마트스토어 실질 마진 계산 기본값 (중소3 + 일반노출):                   │
// │   3.003% + 2.73% = 5.733% ≈ 5.8% (VAT 별도 고려 시 실질 적용치)       │
// │   3.003% + 0.91% = 3.913% (자체마케팅 유입 시 단가별 약 1.82% 절감)    │
// │                                                                       │
// │ 카테고리별 수수료 편차 없음 (2026 기준) — 등급 기준만 적용              │
// │ 예외: 디지털/가전·도서는 별도 정책 (마케팅 인하 미적용 보수 추정)       │
// │ Source: 네이버 스마트스토어센터 수수료 안내 2026.01 기준                 │
// └─────────────────────────────────────────────────────────────────────┘

// ──────────────────────────────────────────────────────────────────────────────
// 2026 실질 적용 수수료율
// 참고: 네이버는 카테고리별 수수료 차등 없음 (2025-06-02 개편 이후)
// 단, 디지털/가전 일부 대형가전 품목은 별도 정책 존재
// ──────────────────────────────────────────────────────────────────────────────
const NAVER_FEE_BY_GRADE = {
  영세:  0.01947 + 0.0273, // 4.677%
  중소1: 0.02563 + 0.0273, // 5.293%
  중소2: 0.02728 + 0.0273, // 5.458%
  중소3: 0.03003 + 0.0273, // 5.733% ← 신규 셀러 기본 적용
  일반:  0.03630 + 0.0273, // 6.360%
} as const;

// 마진 계산 기본값: 중소3 (신규 셀러 적용 등급)
export const NAVER_DEFAULT_FEE_RATE = NAVER_FEE_BY_GRADE['중소3']; // 0.05733

// ──────────────────────────────────────────────────────────────────────────────
// Channel-based sales fee (2025-06-02 reform)
// All non-exception categories share the same channel-level reduction (1.82pp).
// Exception categories (digital/electronics, books) bypass the marketing reduction
// because their effective rates already include category-specific policy adjustments.
// ──────────────────────────────────────────────────────────────────────────────
export type FeeChannel = 'normal' | 'marketing';
// Semantic alias for callers that read better as "sales channel"
export type SalesChannel = FeeChannel;

export const NAVER_SALES_FEE_NORMAL = 0.0273;     // 2.73% standard exposure (search/Plus Store)
export const NAVER_SALES_FEE_MARKETING = 0.0091;  // 0.91% seller marketing link (SNS/ads/direct)
export const NAVER_MARKETING_FEE_REDUCTION =
  NAVER_SALES_FEE_NORMAL - NAVER_SALES_FEE_MARKETING; // 0.0182 (1.82pp)
export const NAVER_FEE_REFORM_DATE = '2025-06-02';
export const NAVER_FEE_REFORM_NOTE =
  '2025.6.2 개편: 유입수수료 2% 폐지 → 매출연동 판매수수료 통합 (일반 2.73% / 자체마케팅 0.91%)';

// Exception D1 categories — marketing-link reduction does NOT apply
const EXCEPTION_D1S: ReadonlySet<string> = new Set(['디지털/가전', '도서']);

function isExceptionD1(d1?: string): boolean {
  return d1 ? EXCEPTION_D1S.has(d1) : false;
}

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

/** Resolve d1 from category code (helper) */
function resolveD1FromCode(categoryCode?: string): string | undefined {
  if (!categoryCode) return undefined;
  return buildCodeToD1Cache().get(categoryCode);
}

/** Get Naver fee rate by category code (2026)
 *  @param channel 'normal' (default) standard exposure 2.73% / 'marketing' seller link 0.91%
 *  Marketing reduction does NOT apply to exception categories (digital/electronics, books).
 */
export function getNaverFeeRate(categoryCode?: string, channel: FeeChannel = 'normal'): number {
  const d1 = resolveD1FromCode(categoryCode);
  const base = d1 && NAVER_FEE_RATES_BY_D1[d1] !== undefined
    ? NAVER_FEE_RATES_BY_D1[d1]
    : NAVER_DEFAULT_FEE_RATE;
  if (channel === 'marketing' && !isExceptionD1(d1)) {
    return base - NAVER_MARKETING_FEE_REDUCTION;
  }
  return base;
}

/** Get fee rate by d1 name directly
 *  @param channel 'normal' (default) standard exposure 2.73% / 'marketing' seller link 0.91%
 *  Marketing reduction does NOT apply to exception categories (digital/electronics, books).
 */
export function getNaverFeeRateByD1(d1Name?: string, channel: FeeChannel = 'normal'): number {
  const base = !d1Name
    ? NAVER_DEFAULT_FEE_RATE
    : (NAVER_FEE_RATES_BY_D1[d1Name] ?? NAVER_DEFAULT_FEE_RATE);
  if (channel === 'marketing' && !isExceptionD1(d1Name)) {
    return base - NAVER_MARKETING_FEE_REDUCTION;
  }
  return base;
}

/** Get fee rate as formatted string e.g. "5.7%" */
export function getNaverFeeRateFormatted(categoryCode?: string, channel: FeeChannel = 'normal'): string {
  return `${(getNaverFeeRate(categoryCode, channel) * 100).toFixed(1)}%`;
}

/** Convenience: marketing-link savings per item at the given price (KRW) */
export function getMarketingFeeSavings(salePrice: number): number {
  return Math.round(Math.max(0, salePrice) * NAVER_MARKETING_FEE_REDUCTION);
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

/** Detailed breakdown for display */
export interface NaverFeeBreakdown {
  orderManagementRate: number;
  salesFeeRate: number;
  totalRate: number;
  gradeLabel: string;
  channel: FeeChannel;
  channelLabel: string;
  isExceptionCategory: boolean;
  note: string;
}

/** Detailed fee breakdown
 *  @param channel 'normal' (default) or 'marketing' — affects salesFeeRate, totalRate, and orderManagementRate
 *  Exception categories (digital/electronics, books) skip the marketing reduction.
 */
export function getNaverFeeBreakdown(
  categoryCode?: string,
  channel: FeeChannel = 'normal',
): NaverFeeBreakdown {
  const d1 = resolveD1FromCode(categoryCode);
  const isException = isExceptionD1(d1);
  // Effective channel: marketing reduction skipped for exception categories
  const effectiveChannel: FeeChannel = isException ? 'normal' : channel;
  const total = getNaverFeeRate(categoryCode, effectiveChannel);
  const salesFee = effectiveChannel === 'marketing'
    ? NAVER_SALES_FEE_MARKETING
    : NAVER_SALES_FEE_NORMAL;
  const orderMgmt = Math.max(0, total - salesFee);
  const channelLabel = effectiveChannel === 'marketing' ? '자체마케팅' : '일반';
  const note = isException
    ? `주문관리 ${(orderMgmt * 100).toFixed(2)}% + 판매수수료 ${(salesFee * 100).toFixed(2)}% — 예외 카테고리 (마케팅 인하 미적용)`
    : effectiveChannel === 'marketing'
      ? `주문관리 ${(orderMgmt * 100).toFixed(2)}% + 자체마케팅 판매수수료 ${(salesFee * 100).toFixed(2)}% (2025.6.2 개편)`
      : `주문관리 ${(orderMgmt * 100).toFixed(2)}% + 일반노출 판매수수료 ${(salesFee * 100).toFixed(2)}% (2025.6.2 개편)`;
  return {
    orderManagementRate: orderMgmt,
    salesFeeRate: salesFee,
    totalRate: total,
    gradeLabel: '중소3 (신규 기본)',
    channel: effectiveChannel,
    channelLabel,
    isExceptionCategory: isException,
    note,
  };
}
