// src/lib/good-service.ts
// Good Service Score Calculator
// Estimates Naver SmartStore's 3-axis quality score from internal order data
// Axes: Order Fulfillment + Delivery Quality + Customer Satisfaction

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
  inquiriesAnswered24h: number;
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
  EXCELLENT: { min: 90, label: '\uC6B0\uC218', color: '#16a34a' },
  GOOD:      { min: 75, label: '\uC591\uD638', color: '#2563eb' },
  NORMAL:    { min: 60, label: '\uBCF4\uD1B5', color: '#eab308' },
  WARNING:   { min: 40, label: '\uAC1C\uC120 \uD544\uC694', color: '#f97316' },
  DANGER:    { min: 0,  label: '\uC704\uD5D8', color: '#e62310' },
} as const;

function calcOrderFulfillment(input: GoodServiceInput): { score: number; tips: string[] } {
  const tips: string[] = [];
  if (input.totalOrders === 0) {
    return { score: 100, tips: ['\uC8FC\uBB38 \uBC1C\uC0DD \uC804\uC785\uB2C8\uB2E4. \uAD00\uB9AC\uAC00 \uD544\uC694 \uC5C6\uC2B5\uB2C8\uB2E4.'] };
  }
  const confirmRate24h = input.confirmedWithin24h / input.totalOrders;
  const cancelRate = input.cancelledBySeller / input.totalOrders;
  let score = 100;
  if (confirmRate24h < 0.95) {
    const penalty = Math.round((0.95 - confirmRate24h) * 80);
    score -= penalty;
    tips.push(`24\uC2DC\uAC04 \uB0B4 \uBC1C\uC8FC\uD655\uC778\uC728 ${(confirmRate24h * 100).toFixed(1)}% - 95% \uC774\uC0C1 \uD544\uC694`);
  }
  if (cancelRate > 0.02) {
    const penalty = Math.round((cancelRate - 0.02) * 200);
    score -= penalty;
    tips.push(`\uD310\uB9E4\uC790 \uADC0\uCC45 \uCDE8\uC18C ${input.cancelledBySeller}\uAC74 (${(cancelRate * 100).toFixed(1)}%) - 2% \uBBF8\uB9CC \uD544\uC694`);
  }
  if (input.lateConfirmations > 0) {
    score -= input.lateConfirmations * 5;
    tips.push(`48\uC2DC\uAC04 \uCD08\uACFC \uBC1C\uC8FC\uD655\uC778 ${input.lateConfirmations}\uAC74 - \uBE60\uB978 \uCC98\uB9AC\uAC00 \uB4F1\uAE09\uC5D0 \uC9C1\uACB0`);
  }
  return { score: Math.max(0, Math.min(100, score)), tips };
}

function calcDeliveryQuality(input: GoodServiceInput): { score: number; tips: string[] } {
  const tips: string[] = [];
  const totalDelivered = input.deliveredOnTime + input.deliveredLate;
  if (totalDelivered === 0) {
    return { score: 100, tips: ['\uBC30\uC1A1 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.'] };
  }
  const onTimeRate = input.deliveredOnTime / totalDelivered;
  const issueRate = input.deliveryIssues / totalDelivered;
  let score = 100;
  if (onTimeRate < 0.90) {
    const penalty = Math.round((0.90 - onTimeRate) * 120);
    score -= penalty;
    tips.push(`\uBC30\uC1A1 \uC815\uC2DC \uB3C4\uCC29\uC728 ${(onTimeRate * 100).toFixed(1)}% - 90% \uC774\uC0C1 \uD544\uC694`);
  }
  if (issueRate > 0.01) {
    const penalty = Math.round((issueRate - 0.01) * 300);
    score -= penalty;
    tips.push(`\uBC30\uC1A1 \uBB38\uC81C(\uD30C\uC190/\uBD84\uC2E4/\uC624\uBC30\uC1A1) ${input.deliveryIssues}\uAC74 - \uD488\uC9C8 \uAD00\uB9AC \uD544\uC694`);
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
      tips.push(`\uB9AC\uBDF0 \uD3C9\uC810 ${input.avgRating.toFixed(1)}\uC810 - 4.5\uC810 \uC774\uC0C1\uC774 \uB4F1\uAE09 \uC0C1\uC2B9\uC5D0 \uC720\uB9AC`);
    }
  }
  if (input.inquiriesTotal > 0) {
    const responseRate = input.inquiriesAnswered24h / input.inquiriesTotal;
    if (responseRate < 0.90) {
      const penalty = Math.round((0.90 - responseRate) * 60);
      score -= penalty;
      tips.push(`\uBB38\uC758 24\uC2DC\uAC04 \uB0B4 \uC751\uB2F5\uC728 ${(responseRate * 100).toFixed(1)}% - 90% \uC774\uC0C1 \uD544\uC694`);
    }
  }
  if (input.returnsTotal > 0 && input.totalOrders > 0) {
    const sellerReturnRate = input.returnsBySeller / input.totalOrders;
    if (sellerReturnRate > 0.03) {
      const penalty = Math.round((sellerReturnRate - 0.03) * 200);
      score -= penalty;
      tips.push(`\uD310\uB9E4\uC790 \uADC0\uCC45 \uBC18\uD488/\uAD50\uD658 ${input.returnsBySeller}\uAC74 - \uC0C1\uD488 \uC0C1\uD0DC \uAD00\uB9AC \uD544\uC694`);
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
    allTips.push('\uBAA8\uB4E0 \uC9C0\uD45C\uAC00 \uC591\uD638\uD569\uB2C8\uB2E4. \uD604\uC7AC \uC218\uC900\uC744 \uC720\uC9C0\uD558\uC138\uC694!');
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

export interface GradeTarget {
  grade: string;
  minSalesAmount: number;
  minSalesCount: number;
  minGoodServiceScore: number;
}

export const NAVER_GRADE_TARGETS: GradeTarget[] = [
  { grade: '\uD50C\uB798\uD2F0\uB118', minSalesAmount: 50_000_000, minSalesCount: 2000, minGoodServiceScore: 90 },
  { grade: '\uD504\uB9AC\uBBF8\uC5C4', minSalesAmount: 20_000_000, minSalesCount: 500, minGoodServiceScore: 80 },
  { grade: '\uBE45\uD30C\uC6CC', minSalesAmount: 10_000_000, minSalesCount: 200, minGoodServiceScore: 70 },
  { grade: '\uD30C\uC6CC',     minSalesAmount: 3_000_000,  minSalesCount: 80,  minGoodServiceScore: 60 },
  { grade: '\uC0C8\uC2F9',     minSalesAmount: 800_000,    minSalesCount: 20,  minGoodServiceScore: 50 },
  { grade: '\uC528\uC557',     minSalesAmount: 0,          minSalesCount: 0,   minGoodServiceScore: 0  },
];

export function simulateGrade(
  monthlySalesAmount: number,
  monthlySalesCount: number,
  goodServiceScore: number,
): { currentGrade: string; nextGrade: string | null; gap: { salesAmount: number; salesCount: number; score: number } | null } {
  let currentGrade = '\uC528\uC557';
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
