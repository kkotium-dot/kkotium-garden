// src/lib/good-service.ts
// Good Service Score Calculator
// Estimates Naver SmartStore's 3-axis quality score from internal order data
// Axes: Order Fulfillment + Delivery Quality + Customer Satisfaction
//
// 2025-04 update: Talktalk reply standard hardened from 24h to 12h
// 2025-12 update: Seller grade evaluation window changed 3 months → 1 month
// Source: Naver SmartStore Center > Seller Grade Policy

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GoodServiceInput {
  // Order fulfillment metrics (14-day window)
  totalOrders: number;
  confirmedWithin24h: number;
  confirmedWithin48h: number;
  lateConfirmations: number;
  cancelledBySeller: number;

  // Delivery quality metrics
  deliveredOnTime: number;
  deliveredLate: number;
  deliveryIssues: number;

  // Customer satisfaction metrics
  totalReviews: number;
  avgRating: number;
  inquiriesTotal: number;
  // Talktalk reply within 12h (2025-04 hardened standard)
  inquiriesAnswered12h: number;
  returnsBySeller: number;
  returnsTotal: number;
}

export interface GoodServiceScore {
  orderFulfillment: number;
  deliveryQuality: number;
  customerSatisfaction: number;
  overall: number;
  grade: 'EXCELLENT' | 'GOOD' | 'NORMAL' | 'WARNING' | 'DANGER';
  gradeLabel: string;
  gradeColor: string;
  tips: string[];
}

const GRADE_CONFIG = {
  EXCELLENT: { min: 90, label: '우수', color: '#16a34a' },
  GOOD:      { min: 75, label: '양호', color: '#2563eb' },
  NORMAL:    { min: 60, label: '보통', color: '#eab308' },
  WARNING:   { min: 40, label: '개선 필요', color: '#f97316' },
  DANGER:    { min: 0,  label: '위험', color: '#e62310' },
} as const;

function calcOrderFulfillment(input: GoodServiceInput): { score: number; tips: string[] } {
  const tips: string[] = [];
  if (input.totalOrders === 0) {
    return { score: 100, tips: ['주문 발생 전입니다. 관리가 필요 없습니다.'] };
  }
  const confirmRate24h = input.confirmedWithin24h / input.totalOrders;
  const cancelRate = input.cancelledBySeller / input.totalOrders;
  let score = 100;
  if (confirmRate24h < 0.95) {
    const penalty = Math.round((0.95 - confirmRate24h) * 80);
    score -= penalty;
    tips.push(`24시간 내 발주확인율 ${(confirmRate24h * 100).toFixed(1)}% - 95% 이상 필요`);
  }
  if (cancelRate > 0.02) {
    const penalty = Math.round((cancelRate - 0.02) * 200);
    score -= penalty;
    tips.push(`판매자 귀책 취소 ${input.cancelledBySeller}건 (${(cancelRate * 100).toFixed(1)}%) - 2% 미만 필요`);
  }
  if (input.lateConfirmations > 0) {
    score -= input.lateConfirmations * 5;
    tips.push(`48시간 초과 발주확인 ${input.lateConfirmations}건 - 빠른 처리가 등급에 직결`);
  }
  return { score: Math.max(0, Math.min(100, score)), tips };
}

function calcDeliveryQuality(input: GoodServiceInput): { score: number; tips: string[] } {
  const tips: string[] = [];
  const totalDelivered = input.deliveredOnTime + input.deliveredLate;
  if (totalDelivered === 0) {
    return { score: 100, tips: ['배송 데이터가 없습니다.'] };
  }
  const onTimeRate = input.deliveredOnTime / totalDelivered;
  const issueRate = input.deliveryIssues / totalDelivered;
  let score = 100;
  if (onTimeRate < 0.90) {
    const penalty = Math.round((0.90 - onTimeRate) * 120);
    score -= penalty;
    tips.push(`배송 정시 도착률 ${(onTimeRate * 100).toFixed(1)}% - 90% 이상 필요`);
  }
  if (issueRate > 0.01) {
    const penalty = Math.round((issueRate - 0.01) * 300);
    score -= penalty;
    tips.push(`배송 문제(파손/분실/오배송) ${input.deliveryIssues}건 - 품질 관리 필요`);
  }
  return { score: Math.max(0, Math.min(100, score)), tips };
}

function calcCustomerSatisfaction(input: GoodServiceInput): { score: number; tips: string[] } {
  const tips: string[] = [];
  let score = 100;
  if (input.totalReviews > 0 && input.avgRating < 4.5) {
    const penalty = Math.round((4.5 - input.avgRating) * 30);
    score -= penalty;
    if (input.avgRating < 4.0) {
      tips.push(`리뷰 평점 ${input.avgRating.toFixed(1)}점 - 4.5점 이상이 등급 상승에 유리`);
    }
  }
  if (input.inquiriesTotal > 0) {
    // 2025-04 hardened standard: 12h reply window
    const responseRate = input.inquiriesAnswered12h / input.inquiriesTotal;
    if (responseRate < 0.90) {
      const penalty = Math.round((0.90 - responseRate) * 60);
      score -= penalty;
      tips.push(`톡톡 12시간 내 응답률 ${(responseRate * 100).toFixed(1)}% - 90% 이상 필요 (2025.4 기준 강화)`);
    }
  }
  if (input.returnsTotal > 0 && input.totalOrders > 0) {
    const sellerReturnRate = input.returnsBySeller / input.totalOrders;
    if (sellerReturnRate > 0.03) {
      const penalty = Math.round((sellerReturnRate - 0.03) * 200);
      score -= penalty;
      tips.push(`판매자 귀책 반품/교환 ${input.returnsBySeller}건 - 상품 상태 관리 필요`);
    }
  }
  return { score: Math.max(0, Math.min(100, score)), tips };
}

// ── Main Calculator ───────────────────────────────────────────────────────────

export function calcGoodServiceScore(input: GoodServiceInput): GoodServiceScore {
  const fulfillment = calcOrderFulfillment(input);
  const delivery = calcDeliveryQuality(input);
  const satisfaction = calcCustomerSatisfaction(input);

  // Weighted: fulfillment 40% + delivery 30% + satisfaction 30%
  const overall = Math.round(
    fulfillment.score * 0.40 +
    delivery.score * 0.30 +
    satisfaction.score * 0.30
  );

  const allTips = [...fulfillment.tips, ...delivery.tips, ...satisfaction.tips];
  if (allTips.length === 0) {
    allTips.push('모든 지표가 양호합니다. 현재 수준을 유지하세요!');
  }

  let grade: GoodServiceScore['grade'] = 'DANGER';
  if (overall >= GRADE_CONFIG.EXCELLENT.min) grade = 'EXCELLENT';
  else if (overall >= GRADE_CONFIG.GOOD.min) grade = 'GOOD';
  else if (overall >= GRADE_CONFIG.NORMAL.min) grade = 'NORMAL';
  else if (overall >= GRADE_CONFIG.WARNING.min) grade = 'WARNING';

  return {
    orderFulfillment: fulfillment.score,
    deliveryQuality: delivery.score,
    customerSatisfaction: satisfaction.score,
    overall,
    grade,
    gradeLabel: GRADE_CONFIG[grade].label,
    gradeColor: GRADE_CONFIG[grade].color,
    tips: allTips.slice(0, 5),
  };
}

// ── Grade Simulator ───────────────────────────────────────────────────────────
// 2025-12 reform: evaluation window changed 3 months → 1 month
// Lowered thresholds for BIG_POWER / POWER / SAESAK levels
//
// Naver Seller Grade Tiers (2025-12 reform):
//   - Platinum: 1억+ / 월, count 2,000+ (high tier unchanged)
//   - Premium:  6,000만+ / 월, count 500+
//   - BigPower: 1,000만+ / 월, count 200+ (was 4,000만+)
//   - Power:    300만+ / 월, count 80+ (was 800만+)
//   - Saesak:   80만+ / 월, count 20+ (was 200만+)
//   - Seed:     0+

export interface GradeTarget {
  grade: string;
  minSalesAmount: number;
  minSalesCount: number;
  minGoodServiceScore: number;
}

export const NAVER_GRADE_TARGETS: GradeTarget[] = [
  { grade: '플래티넘', minSalesAmount: 100_000_000, minSalesCount: 2000, minGoodServiceScore: 90 },
  { grade: '프리미엄', minSalesAmount: 60_000_000,  minSalesCount: 500,  minGoodServiceScore: 80 },
  { grade: '빅파워',   minSalesAmount: 10_000_000,  minSalesCount: 200,  minGoodServiceScore: 70 },
  { grade: '파워',     minSalesAmount: 3_000_000,   minSalesCount: 80,   minGoodServiceScore: 60 },
  { grade: '새싹',     minSalesAmount: 800_000,     minSalesCount: 20,   minGoodServiceScore: 50 },
  { grade: '씨앗',     minSalesAmount: 0,           minSalesCount: 0,    minGoodServiceScore: 0  },
];

export function simulateGrade(
  monthlySalesAmount: number,
  monthlySalesCount: number,
  goodServiceScore: number,
): { currentGrade: string; nextGrade: string | null; gap: { salesAmount: number; salesCount: number; score: number } | null } {
  let currentGrade = '씨앗';
  let nextGradeIdx = -1;

  for (let i = 0; i < NAVER_GRADE_TARGETS.length; i++) {
    const t = NAVER_GRADE_TARGETS[i];
    if (
      monthlySalesAmount >= t.minSalesAmount &&
      monthlySalesCount >= t.minSalesCount &&
      goodServiceScore >= t.minGoodServiceScore
    ) {
      currentGrade = t.grade;
      nextGradeIdx = i - 1;
      break;
    }
  }

  if (nextGradeIdx < 0) {
    return { currentGrade, nextGrade: null, gap: null };
  }

  const nextTarget = NAVER_GRADE_TARGETS[nextGradeIdx];
  return {
    currentGrade,
    nextGrade: nextTarget.grade,
    gap: {
      salesAmount: Math.max(0, nextTarget.minSalesAmount - monthlySalesAmount),
      salesCount: Math.max(0, nextTarget.minSalesCount - monthlySalesCount),
      score: Math.max(0, nextTarget.minGoodServiceScore - goodServiceScore),
    },
  };
}
