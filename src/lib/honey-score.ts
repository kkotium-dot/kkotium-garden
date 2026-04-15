// src/lib/honey-score.ts
// Kkotium "꿀통지수" — composite product quality score (0~100)
// Kkotti character system integrated — grade drives emoji + dialogue
// Based on: margin tier + Naver 2026 SEO compliance + competition + bonus
// A-6: keyword search volume based competition weight

export interface HoneyScoreInput {
  salePrice: number;
  supplierPrice: number;
  shippingFee?: number;
  naverFeeRate?: number;
  productName?: string;
  categoryId?: string;
  keywords?: string[];
  tags?: string[];
  hasMainImage?: boolean;
  hasDescription?: boolean;
  hasDiscountSet?: boolean;
  competitionLevel?: 'low' | 'medium' | 'high';
  reviewCount?: number;
  // Sourcing-specific fields (from Domeggook OpenAPI)
  inventory?: number;
  optionCount?: number;
  sellerRank?: number;
  canMerge?: boolean;
  shipFee?: number;
  // A-6: keyword monthly search volume for competition auto-detection
  keywordMonthlyVolume?: number; // total monthly searches for primary keyword
  // E-4: Return Care enabled
  returnCareEnabled?: boolean;
  // E-2C: Review reward configured optimally
  reviewRewardOptimal?: boolean;
}

export interface HoneyScoreResult {
  total: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  gradeColor: string;
  gradeBg: string;
  marginScore: number;
  seoScore: number;
  competitionScore: number;
  bonusScore: number;
  marginRate: number;
  netMarginRate: number;
  marginTier: 'S' | 'A' | 'B' | 'C' | 'D';
  marginTierLabel: string;
  strengths: string[];
  warnings: string[];
  recommendation: string;
  sourcingBadges: Array<{ label: string; type: 'good' | 'warn' | 'danger' }>;
  kkottiMood: 'celebrate' | 'happy' | 'thinking' | 'worried' | 'stressed';
  kkottiDialogue: string;
  kkottiTip: string;
  // A-6: resolved competition level (from keyword volume or explicit input)
  resolvedCompetitionLevel: 'low' | 'medium' | 'high';
}

const MARGIN_TIERS = [
  { min: 50, grade: 'S' as const, label: '초우수 (순마진 50%+)',   color: 'text-purple-700', bg: 'bg-purple-50' },
  { min: 40, grade: 'A' as const, label: '우수 (순마진 40~50%)',   color: 'text-green-700',  bg: 'bg-green-50'  },
  { min: 30, grade: 'B' as const, label: '양호 (순마진 30~40%)',   color: 'text-blue-700',   bg: 'bg-blue-50'   },
  { min: 20, grade: 'C' as const, label: '보통 (순마진 20~30%)',   color: 'text-yellow-700', bg: 'bg-yellow-50' },
  { min:  0, grade: 'D' as const, label: '위험 (순마진 20% 미만)', color: 'text-red-700',    bg: 'bg-red-50'    },
];

function getMarginTier(netMargin: number) {
  return MARGIN_TIERS.find(t => netMargin >= t.min) ?? MARGIN_TIERS[MARGIN_TIERS.length - 1];
}

function clamp(v: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, v));
}

// ── A-6: Resolve competition level from keyword search volume ─────────────────
// If keywordMonthlyVolume is provided, auto-detect competition level
// Thresholds: 10k+ = high, 3k-10k = medium, <3k = low
function resolveCompetitionLevel(
  explicitLevel: HoneyScoreInput['competitionLevel'],
  monthlyVolume?: number
): 'low' | 'medium' | 'high' {
  // Explicit level takes priority if provided
  if (explicitLevel) return explicitLevel;
  // Auto-detect from keyword search volume
  if (monthlyVolume !== undefined) {
    if (monthlyVolume >= 10000) return 'high';
    if (monthlyVolume >= 3000)  return 'medium';
    return 'low';
  }
  return 'medium'; // default fallback
}

// ── Margin score (40%) ────────────────────────────────────────────────────────
function calcMarginScore(input: HoneyScoreInput) {
  const { salePrice, supplierPrice, shippingFee = 3000, naverFeeRate = 0.05733 } = input;
  if (!salePrice || !supplierPrice || salePrice <= 0 || supplierPrice <= 0) {
    return { score: 0, marginRate: 0, netMarginRate: 0 };
  }
  const grossMargin = (salePrice - supplierPrice) / salePrice * 100;
  const naverFee = salePrice * naverFeeRate;
  const netProfit = salePrice - supplierPrice - naverFee - shippingFee;
  const netMarginRate = (netProfit / salePrice) * 100;
  let score: number;
  if (netMarginRate >= 50)      score = 100;
  else if (netMarginRate >= 40) score = 80 + (netMarginRate - 40) * 2;
  else if (netMarginRate >= 30) score = 55 + (netMarginRate - 30) * 2.5;
  else if (netMarginRate >= 20) score = 30 + (netMarginRate - 20) * 2.5;
  else if (netMarginRate >= 0)  score = (netMarginRate / 20) * 30;
  else score = 0;
  return { score: clamp(score), marginRate: grossMargin, netMarginRate };
}

// ── SEO score (35%) — 2026 Naver standards ────────────────────────────────────
function calcSeoScore(input: HoneyScoreInput): number {
  const {
    productName = '', categoryId = '', keywords = [], tags = [],
    hasMainImage = false, hasDescription = false,
    additionalImageCount = 0,
  } = input as HoneyScoreInput & { additionalImageCount?: number };
  const hasDiscountForSeo = !!(input.hasDiscountSet);
  let score = 0;

  if (categoryId) score += 25;

  const nameLen = productName.trim().length;
  if (nameLen >= 20 && nameLen <= 50)      score += 18;
  else if (nameLen >= 15 && nameLen < 20)  score += 10;
  else if (nameLen > 50 && nameLen <= 100) score += 8;

  const nameFront = productName.trim().slice(0, 15);
  if (keywords.some(kw => kw && nameFront.includes(kw))) score += 7;
  else if (keywords.some(kw => kw && productName.includes(kw))) score += 3;

  if (keywords.length >= 7)      score += 17;
  else if (keywords.length >= 5) score += 12;
  else if (keywords.length >= 3) score += 7;
  else if (keywords.length >= 1) score += 2;

  if (tags.length === 10)        score += 18;
  else if (tags.length >= 7)     score += 12;
  else if (tags.length >= 5)     score += 7;
  else if (tags.length >= 1)     score += 2;

  if (hasMainImage) score += 5;

  if (additionalImageCount >= 3) score += 5;
  else if (additionalImageCount >= 1) score += 2;

  if (hasDescription) score += 3;

  if (hasDiscountForSeo) score += 8;

  const abusingPattern = /무료배송|최저가|특가|할인|쿠폰|오늘만|한정|당일/;
  if (abusingPattern.test(productName)) score -= 15;
  const words = productName.split(/\s+/);
  const wc: Record<string, number> = {};
  words.forEach(w => { wc[w] = (wc[w] || 0) + 1; });
  if (Object.values(wc).some(c => c >= 3)) score -= 10;

  return clamp(score);
}

// ── A-6: Competition score (15%) — now uses keyword volume ────────────────────
// Low competition (small niche) = high score (easier to rank)
// High competition (mass market) = low score (harder to rank)
function calcCompetitionScore(level: 'low' | 'medium' | 'high'): number {
  switch (level) {
    case 'low':    return 90;
    case 'medium': return 60;
    case 'high':   return 25;
    default:       return 50;
  }
}

// ── Bonus score (10%) ─────────────────────────────────────────────────────────
function calcBonusScore(input: HoneyScoreInput): number {
  let score = 0;
  if (input.hasDiscountSet) score += 30;
  const reviews = input.reviewCount ?? 0;
  if (reviews >= 100)     score += 40;
  else if (reviews >= 50) score += 30;
  else if (reviews >= 20) score += 20;
  else if (reviews >= 5)  score += 10;
  // E-4: Return Care bonus (+15 from 100)
  if (input.returnCareEnabled) score += 15;
  // E-2C: Review reward bonus (+10 from 100)
  if (input.reviewRewardOptimal) score += 10;
  return clamp(score);
}

// ── Kkotti character system ───────────────────────────────────────────────────
type KkottiMood = HoneyScoreResult['kkottiMood'];

const KKOTTI_BY_GRADE: Record<HoneyScoreResult['grade'], {
  mood: KkottiMood;
  dialogues: string[];
  tips: string[];
}> = {
  S: {
    mood: 'celebrate',
    dialogues: [
      '빵야~! 완벽한 꿀통 상품! 지금 바로 올려요! 까꿍~',
      '우와~! 수익성도 SEO도 최고야! 꽃밭에 심을 준비 완료!',
      '이 상품 놓치면 후회해요! 꿀통 TOP 등극 예약!',
    ],
    tips: [
      '지금이 최적의 타이밍! 경쟁 상품 올라오기 전에 선점하세요.',
      '태그 10개 + 황금키워드 조합으로 노출 극대화 완료!',
    ],
  },
  A: {
    mood: 'happy',
    dialogues: [
      '좋아요! 등록해도 충분해요! 경쟁 키워드만 한 번 더 체크!',
      '우수 상품이에요! SEO 한 단계만 더 올리면 꿀통 등극!',
      '빵야~! 이 정도면 충분해요! 등록 고고!',
    ],
    tips: [
      '황금키워드를 상품명 앞쪽에 배치하면 노출 순위가 올라가요.',
      '태그 10개를 꽉 채우면 SEO 점수가 한 단계 더 올라가요.',
    ],
  },
  B: {
    mood: 'thinking',
    dialogues: [
      '음... 아직 아쉬워요. 마진이나 SEO 중 하나만 더 보완해봐요!',
      '괜찮은 상품인데 아직 꿀통은 아니에요. 조금만 더 다듬어요!',
      '까꿍? 거의 다 왔어요! 키워드 보완하면 바로 올라가요!',
    ],
    tips: [
      '공급가 재협상으로 마진 5%만 올리면 등급이 바뀌어요.',
      'AI SEO 워크플로우로 황금키워드를 5개 이상 확보해보세요.',
    ],
  },
  C: {
    mood: 'worried',
    dialogues: [
      '흠... 이 상품은 좀 고민이 필요해요. 마진이 위험해요!',
      '공급가가 너무 높아요. 재협상하거나 판매가를 올려보세요.',
      '지금 올리면 손해볼 수 있어요. 조건을 바꿔보고 다시 검토해요!',
    ],
    tips: [
      '판매가 대비 공급가 비율을 먼저 조정하고 재분석해보세요.',
      '카테고리와 키워드를 재설정하면 SEO 점수가 올라갈 수 있어요.',
    ],
  },
  D: {
    mood: 'stressed',
    dialogues: [
      '이 상품은 지금 올리면 절대 안 돼요! 손해 확정이에요!',
      '위험해요! 공급가 재협상이 필수예요. 지금은 보류!',
      '까꿍... 슬퍼요. 이 상품은 조건 바꾸지 않으면 안 팔려요.',
    ],
    tips: [
      '순마진이 20% 미만이에요. 공급가를 낮추거나 판매가를 높여야 해요.',
      '비슷한 상품을 대체 공급사에서 찾아보는 것도 방법이에요.',
    ],
  },
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Sourcing adjustment ───────────────────────────────────────────────────────
function calcSourcingAdjustment(input: HoneyScoreInput): {
  adjustment: number;
  badges: Array<{ label: string; type: 'good' | 'warn' | 'danger' }>;
} {
  let adj = 0;
  const badges: Array<{ label: string; type: 'good' | 'warn' | 'danger' }> = [];

  const inv = input.inventory;
  if (inv !== undefined) {
    if (inv === 0)        { adj -= 20; badges.push({ label: '재고 없음', type: 'danger' }); }
    else if (inv < 10)   { adj -= 12; badges.push({ label: `재고 ${inv}개`, type: 'warn' }); }
    else if (inv < 30)   { adj -= 5;  badges.push({ label: `재고 ${inv}개`, type: 'warn' }); }
    else if (inv >= 100) { adj += 5;  badges.push({ label: `재고 ${inv}+`, type: 'good' }); }
  }

  if (input.canMerge === true)  { adj += 6; badges.push({ label: '합배송 가능', type: 'good' }); }
  else if (input.canMerge === false) { adj -= 4; badges.push({ label: '합배송 불가', type: 'warn' }); }

  const rank = input.sellerRank;
  if (rank !== undefined) {
    if (rank === 1)     { adj += 8; badges.push({ label: '파워셀러', type: 'good' }); }
    else if (rank <= 3) { adj += 4; }
    else if (rank >= 7) { adj -= 5; badges.push({ label: '신규셀러', type: 'warn' }); }
  }

  if (input.shipFee === 0) {
    adj += 8; badges.push({ label: '무료공급', type: 'good' });
  } else if (input.shipFee !== undefined && input.shipFee > 5000) {
    adj -= 5; badges.push({ label: `공급배송 ${input.shipFee.toLocaleString()}원`, type: 'warn' });
  }

  return { adjustment: Math.max(-25, Math.min(15, adj)), badges };
}

// ── Main export ───────────────────────────────────────────────────────────────
export function calcHoneyScore(input: HoneyScoreInput): HoneyScoreResult {
  const { score: rawMarginScore, marginRate, netMarginRate } = calcMarginScore(input);
  const rawSeoScore = calcSeoScore(input);

  // A-6: resolve competition level from keyword volume or explicit input
  const resolvedCompetitionLevel = resolveCompetitionLevel(
    input.competitionLevel,
    input.keywordMonthlyVolume
  );
  const rawCompetitionScore = calcCompetitionScore(resolvedCompetitionLevel);
  const rawBonusScore       = calcBonusScore(input);

  const { adjustment: sourcingAdj, badges: sourcingBadges } = calcSourcingAdjustment(input);

  const total = clamp(
    rawMarginScore      * 0.40 +
    rawSeoScore         * 0.35 +
    rawCompetitionScore * 0.15 +
    rawBonusScore       * 0.10
    + sourcingAdj
  );

  const grade: HoneyScoreResult['grade'] =
    total >= 85 ? 'S' :
    total >= 70 ? 'A' :
    total >= 50 ? 'B' :
    total >= 30 ? 'C' : 'D';

  const GRADE_META: Record<HoneyScoreResult['grade'], { color: string; bg: string }> = {
    S: { color: 'text-purple-700', bg: 'bg-purple-50' },
    A: { color: 'text-green-700',  bg: 'bg-green-50'  },
    B: { color: 'text-blue-700',   bg: 'bg-blue-50'   },
    C: { color: 'text-yellow-700', bg: 'bg-yellow-50' },
    D: { color: 'text-red-700',    bg: 'bg-red-50'    },
  };

  const marginTierObj = getMarginTier(netMarginRate);
  const kkottiData = KKOTTI_BY_GRADE[grade];

  const strengths: string[] = [];
  const warnings: string[] = [];

  if (netMarginRate >= 40)      strengths.push(`순마진 ${netMarginRate.toFixed(1)}% — 우수한 수익성`);
  else if (netMarginRate >= 30) strengths.push(`순마진 ${netMarginRate.toFixed(1)}% — 양호한 수익성`);
  else if (netMarginRate < 20)  warnings.push(`순마진 ${netMarginRate.toFixed(1)}% — 수익성 위험 (공급가 재협상 필요)`);
  else                          warnings.push(`순마진 ${netMarginRate.toFixed(1)}% — 수익성 개선 필요`);

  if (rawSeoScore >= 80)       strengths.push('2026 네이버 SEO 기준 최적화 완료');
  else if (rawSeoScore >= 60)  strengths.push('SEO 기본 충족');
  else if (rawSeoScore < 40)   warnings.push('SEO 점수 낮음 — 카테고리/키워드/태그 보완 필요');

  if (!input.categoryId)                         warnings.push('카테고리 미설정 — 네이버 노출 불가');
  if ((input.keywords?.length ?? 0) < 5)         warnings.push('황금키워드 5개 미만 — AI SEO 워크플로우 실행 권장');

  const pName = input.productName?.trim() ?? '';
  const kws   = (input.keywords ?? []).filter(Boolean);
  if (kws.length > 0 && pName.length > 0) {
    const front15 = pName.slice(0, 15);
    const hasFront = kws.some(kw => front15.includes(kw));
    if (hasFront) {
      strengths.push('상품명 앞 15자에 핵심 키워드 포함 — 네이버 2026 검색 알고리즘 최적화');
    } else {
      warnings.push('상품명 앞 15자에 키워드 없음 — 핵심 키워드를 상품명 앞쪽에 배치하세요');
    }
  }
  if ((input.tags?.length ?? 0) < 10)            warnings.push(`태그 ${input.tags?.length ?? 0}/10개 — 10개 꽉 채우기 권장`);
  if (!input.hasMainImage)                        warnings.push('대표이미지 미등록 — 클릭률에 직접 영향');
  if (input.hasDiscountSet)                       strengths.push('즉시할인 설정 — 네이버 가격비교 특가 필터 노출 + 전환율 향상');
  if (input.returnCareEnabled)                    strengths.push('반품안심케어 가입 — 매출 평균 +13.6% 효과 (한양대 연구)');
  if (input.reviewRewardOptimal)                  strengths.push('리뷰 적립금 최적 설정 — 리뷰 작성률 20~25% 목표');

  // A-6: add competition level context to strengths/warnings
  if (resolvedCompetitionLevel === 'low') {
    strengths.push(
      input.keywordMonthlyVolume
        ? `월 검색량 ${input.keywordMonthlyVolume.toLocaleString()}회 — 틈새시장, 경쟁 낮음`
        : '경쟁 낮음 — 틈새 키워드로 노출 유리'
    );
  } else if (resolvedCompetitionLevel === 'high') {
    warnings.push(
      input.keywordMonthlyVolume
        ? `월 검색량 ${input.keywordMonthlyVolume.toLocaleString()}회 — 경쟁 높음, 차별화 전략 필요`
        : '경쟁 높음 — 롱테일 키워드 병행 권장'
    );
  }

  const recommendation =
    grade === 'S' ? '즉시 등록 추천 — 수익성, SEO 모두 최상위' :
    grade === 'A' ? '등록 적합 — 경쟁 키워드 확인 후 진행' :
    grade === 'B' ? '개선 후 등록 — 마진 또는 SEO 중 취약점 보완' :
    grade === 'C' ? '보류 권장 — 공급가 재협상 또는 SEO 재작업 필요' :
                    '등록 비추천 — 손익분기점 미달, 리스크 높음';

  return {
    total:            Math.round(total),
    grade,
    gradeColor:       GRADE_META[grade].color,
    gradeBg:          GRADE_META[grade].bg,
    marginScore:      Math.round(rawMarginScore),
    seoScore:         Math.round(rawSeoScore),
    competitionScore: Math.round(rawCompetitionScore),
    bonusScore:       Math.round(rawBonusScore),
    marginRate:       Math.round(marginRate * 10) / 10,
    netMarginRate:    Math.round(netMarginRate * 10) / 10,
    marginTier:       marginTierObj.grade,
    marginTierLabel:  marginTierObj.label,
    strengths,
    warnings,
    recommendation,
    sourcingBadges,
    kkottiMood:               kkottiData.mood,
    kkottiDialogue:           pickRandom(kkottiData.dialogues),
    kkottiTip:                pickRandom(kkottiData.tips),
    resolvedCompetitionLevel,
  };
}

// ── Grade display metadata ────────────────────────────────────────────────────
export function getHoneyGradeDisplay(grade: HoneyScoreResult['grade']) {
  const MAP = {
    S: { label: 'S등급', desc: '꿀통 상품',  color: 'text-purple-700', bg: 'bg-purple-100', border: 'border-purple-300', ring: 'ring-purple-400' },
    A: { label: 'A등급', desc: '우수 상품',  color: 'text-green-700',  bg: 'bg-green-100',  border: 'border-green-300',  ring: 'ring-green-400'  },
    B: { label: 'B등급', desc: '양호 상품',  color: 'text-blue-700',   bg: 'bg-blue-100',   border: 'border-blue-300',   ring: 'ring-blue-400'   },
    C: { label: 'C등급', desc: '보통 상품',  color: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-300', ring: 'ring-yellow-400' },
    D: { label: 'D등급', desc: '주의 상품',  color: 'text-red-700',    bg: 'bg-red-100',    border: 'border-red-300',    ring: 'ring-red-400'    },
  };
  return MAP[grade];
}

// ── Kkotti mood display metadata ──────────────────────────────────────────────
export function getKkottiMoodMeta(mood: HoneyScoreResult['kkottiMood']) {
  const MAP: Record<HoneyScoreResult['kkottiMood'], { faceClass: string; bg: string; label: string }> = {
    celebrate: { faceClass: 'text-purple-500', bg: 'bg-purple-50',  label: '꿀통 달성!' },
    happy:     { faceClass: 'text-green-500',  bg: 'bg-green-50',   label: '우수 상품' },
    thinking:  { faceClass: 'text-blue-500',   bg: 'bg-blue-50',    label: '개선 중' },
    worried:   { faceClass: 'text-yellow-500', bg: 'bg-yellow-50',  label: '주의 필요' },
    stressed:  { faceClass: 'text-red-500',    bg: 'bg-red-50',     label: '위험!' },
  };
  return MAP[mood];
}

// ── Sourcing-only score ────────────────────────────────────────────────────────
export interface SourcingScoreResult {
  total: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  marginScore: number;
  sourcingScore: number;
  competitivenessScore: number;
  netMarginRate: number;
  badges: Array<{ label: string; type: 'good' | 'warn' | 'danger' }>;
  warnings: string[];
  recommendation: string;
  kkottiMood: HoneyScoreResult['kkottiMood'];
  kkottiDialogue: string;
  kkottiTip: string;
}

export function calcSourcingScore(input: HoneyScoreInput): SourcingScoreResult {
  const { salePrice, supplierPrice, shippingFee = 3000, naverFeeRate = 0.05733 } = input;
  const badges: Array<{ label: string; type: 'good' | 'warn' | 'danger' }> = [];
  const warnings: string[] = [];

  let marginScore = 0;
  let netMarginRate = 0;
  if (salePrice > 0 && supplierPrice > 0) {
    const naverFee = salePrice * naverFeeRate;
    const netProfit = salePrice - supplierPrice - naverFee - shippingFee;
    netMarginRate = (netProfit / salePrice) * 100;
    if (netMarginRate >= 50) marginScore = 100;
    else if (netMarginRate >= 40) marginScore = 80 + (netMarginRate - 40) * 2;
    else if (netMarginRate >= 30) marginScore = 55 + (netMarginRate - 30) * 2.5;
    else if (netMarginRate >= 20) marginScore = 30 + (netMarginRate - 20) * 2.5;
    else if (netMarginRate >= 0) marginScore = (netMarginRate / 20) * 30;
    else marginScore = 0;
    marginScore = clamp(marginScore);

    if (netMarginRate >= 40) badges.push({ label: `순마진 ${netMarginRate.toFixed(0)}%`, type: 'good' });
    else if (netMarginRate < 10) { badges.push({ label: `마진 ${netMarginRate.toFixed(0)}%`, type: 'danger' }); warnings.push(`순마진 ${netMarginRate.toFixed(1)}% — 수익성 위험`); }
    else if (netMarginRate < 20) { badges.push({ label: `마진 ${netMarginRate.toFixed(0)}%`, type: 'warn' }); warnings.push(`순마진 ${netMarginRate.toFixed(1)}% — 개선 필요`); }
  } else {
    warnings.push('가격 정보 없음');
  }

  let sourcingScore = 0;
  const inv = input.inventory;
  if (inv !== undefined) {
    if (inv === 0) { sourcingScore += 0; badges.push({ label: '재고 없음', type: 'danger' }); warnings.push('재고 0개 — 판매 불가'); }
    else if (inv < 10) { sourcingScore += 5; badges.push({ label: `재고 ${inv}개`, type: 'danger' }); warnings.push(`재고 ${inv}개 — 품절 위험`); }
    else if (inv < 30) { sourcingScore += 15; badges.push({ label: `재고 ${inv}개`, type: 'warn' }); }
    else if (inv < 100) { sourcingScore += 25; }
    else { sourcingScore += 35; badges.push({ label: `재고 ${inv}+`, type: 'good' }); }
  } else { sourcingScore += 15; }

  const opts = input.optionCount ?? (input as HoneyScoreInput & { options?: string[] }).options?.length ?? 0;
  if (opts >= 4) { sourcingScore += 25; badges.push({ label: `옵션 ${opts}개`, type: 'good' }); }
  else if (opts >= 2) { sourcingScore += 18; }
  else if (opts === 1) { sourcingScore += 10; }
  else { sourcingScore += 5; badges.push({ label: '옵션 없음', type: 'warn' }); }

  if (input.canMerge === true) { sourcingScore += 20; badges.push({ label: '합배송 가능', type: 'good' }); }
  else if (input.canMerge === false) { sourcingScore += 5; badges.push({ label: '합배송 불가', type: 'warn' }); warnings.push('합배송 불가 — 배송비 분리 관리 필요'); }
  else { sourcingScore += 10; }

  if (input.shipFee === 0) { sourcingScore += 20; badges.push({ label: '무료공급', type: 'good' }); }
  else if (input.shipFee !== undefined && input.shipFee <= 3000) { sourcingScore += 15; }
  else if (input.shipFee !== undefined && input.shipFee <= 5000) { sourcingScore += 8; }
  else if (input.shipFee !== undefined) { sourcingScore += 0; badges.push({ label: `공급배송 ${input.shipFee.toLocaleString()}원`, type: 'warn' }); }
  else { sourcingScore += 10; }
  sourcingScore = clamp(sourcingScore);

  let competitivenessScore = 0;
  const rank = input.sellerRank;
  if (rank !== undefined) {
    if (rank === 1) { competitivenessScore += 50; badges.push({ label: '파워셀러', type: 'good' }); }
    else if (rank <= 3) { competitivenessScore += 40; }
    else if (rank <= 5) { competitivenessScore += 25; }
    else if (rank <= 7) { competitivenessScore += 10; }
    else { competitivenessScore += 0; badges.push({ label: '신규셀러', type: 'warn' }); warnings.push('공급사 등급 낮음 — 신뢰도 확인 필요'); }
  } else { competitivenessScore += 25; }

  if (netMarginRate >= 40) competitivenessScore += 50;
  else if (netMarginRate >= 30) competitivenessScore += 40;
  else if (netMarginRate >= 20) competitivenessScore += 25;
  else if (netMarginRate >= 10) competitivenessScore += 10;
  else competitivenessScore += 0;
  competitivenessScore = clamp(competitivenessScore);

  const total = clamp(
    marginScore * 0.50 +
    sourcingScore * 0.30 +
    competitivenessScore * 0.20
  );

  const grade: SourcingScoreResult['grade'] =
    total >= 80 ? 'S' :
    total >= 65 ? 'A' :
    total >= 45 ? 'B' :
    total >= 25 ? 'C' : 'D';

  const kkottiData = KKOTTI_BY_GRADE[grade];

  const recommendation =
    grade === 'S' ? '즉시 소싱 추천 — 수익성, 소싱품질 모두 최상위' :
    grade === 'A' ? '소싱 적합 — 경쟁 확인 후 등록 진행' :
    grade === 'B' ? '조건부 소싱 — 마진 또는 공급조건 개선 후 등록' :
    grade === 'C' ? '보류 권장 — 공급가 재협상 또는 대체 상품 검토' :
                    '소싱 비추천 — 손익분기 미달 또는 소싱 조건 부적합';

  return {
    total: Math.round(total),
    grade,
    marginScore: Math.round(marginScore),
    sourcingScore: Math.round(sourcingScore),
    competitivenessScore: Math.round(competitivenessScore),
    netMarginRate: Math.round(netMarginRate * 10) / 10,
    badges,
    warnings,
    recommendation,
    kkottiMood: kkottiData.mood,
    kkottiDialogue: pickRandom(kkottiData.dialogues),
    kkottiTip: pickRandom(kkottiData.tips),
  };
}

export const HONEY_SCORE_BANDS = [
  { min: 85, label: '꿀통 (S)', color: 'bg-purple-500' },
  { min: 70, label: '우수 (A)', color: 'bg-green-500'  },
  { min: 50, label: '양호 (B)', color: 'bg-blue-400'   },
  { min: 30, label: '보통 (C)', color: 'bg-yellow-400' },
  { min:  0, label: '위험 (D)', color: 'bg-red-400'    },
];
