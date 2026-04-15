// src/lib/return-care-fees.ts
// Naver Return Care (반품안심케어) fee constants
// Based on 2025.08.01 revision — latest as of 2026-04
//
// Return Care benefits:
// - Buyer gets free return/exchange (builds trust, increases conversion)
// - Seller pays per-order fee (deducted from settlement)
// - Naver pays fee for N-Delivery enrolled products
// - Compensation cap: 8,000 won per claim
//
// Fee structure: per-transaction (charged on order, not return)

export interface ReturnCareFee {
  /** D1 category name */
  d1: string;
  /** Per-order fee in KRW */
  feePerOrder: number;
  /** Brief description for UI */
  label: string;
}

// 2025.08.01 revised fee schedule
// Source: Naver SmartStore Center > Return Care > fee table
export const RETURN_CARE_FEES: ReturnCareFee[] = [
  { d1: '식품',         feePerOrder: 50,  label: '식품 50원' },
  { d1: '출산/유아동',  feePerOrder: 90,  label: '출산/유아동 90원' },
  { d1: '생활/건강',    feePerOrder: 90,  label: '생활/건강 90원' },
  { d1: '화장품/미용',  feePerOrder: 90,  label: '화장품/미용 90원' },
  { d1: '패션잡화',     feePerOrder: 450, label: '패션잡화 450원' },
  { d1: '여성패션',     feePerOrder: 650, label: '여성패션 650원' },
  { d1: '남성패션',     feePerOrder: 650, label: '남성패션 650원' },
  { d1: '패션의류',     feePerOrder: 650, label: '패션의류 650원' },
  { d1: '스포츠/레저',  feePerOrder: 300, label: '스포츠/레저 300원' },
  { d1: '가구/인테리어', feePerOrder: 160, label: '가구/인테리어 160원' },
  { d1: '디지털/가전',  feePerOrder: 120, label: '디지털/가전 120원' },
  { d1: '컴퓨터/주변기기', feePerOrder: 120, label: '컴퓨터/주변기기 120원' },
  { d1: '도서',         feePerOrder: 50,  label: '도서 50원' },
  { d1: '문구/오피스',  feePerOrder: 90,  label: '문구/오피스 90원' },
  { d1: '반려동물',     feePerOrder: 90,  label: '반려동물 90원' },
  { d1: '자동차용품',   feePerOrder: 120, label: '자동차용품 120원' },
];

// Default fee for categories not listed above
const DEFAULT_FEE = 90;

/**
 * Get return care fee per order for a given D1 category.
 * Returns the fee object with feePerOrder and label.
 */
export function getReturnCareFee(d1Name: string): ReturnCareFee {
  if (!d1Name) {
    return { d1: '', feePerOrder: DEFAULT_FEE, label: `기본 ${DEFAULT_FEE}원` };
  }
  const found = RETURN_CARE_FEES.find(f => d1Name.includes(f.d1) || f.d1.includes(d1Name));
  if (found) return found;
  return { d1: d1Name, feePerOrder: DEFAULT_FEE, label: `${d1Name} ${DEFAULT_FEE}원 (기본)` };
}

/**
 * Calculate monthly return care cost estimate
 * @param feePerOrder - per-order fee in KRW
 * @param monthlyOrders - estimated monthly orders
 */
export function estimateMonthlyReturnCareCost(
  feePerOrder: number,
  monthlyOrders: number
): number {
  return feePerOrder * monthlyOrders;
}

// Compensation cap per claim (2025.08.01 revision)
export const RETURN_CARE_COMPENSATION_CAP = 8000;

// Key stats for UI display
export const RETURN_CARE_STATS = {
  /** Average revenue increase with Return Care enabled (Hanyang Univ. study) */
  avgRevenueIncrease: 13.6,
  /** Fashion accessories category increase */
  fashionAccessoriesIncrease: 58.3,
  /** Furniture/interior category increase */
  furnitureIncrease: 46.7,
  /** Digital/electronics category increase */
  digitalIncrease: 26.2,
  /** N-Delivery enrolled = Naver pays the fee */
  nDeliveryFreeNote: 'N배송 연계 시 반품안심케어 수수료 네이버 지원',
};
