// src/lib/kkotti-naver/evaluate.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 꼬띠 AI + 네이버 통합 평가 로직
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type {
  KkottiEvaluation,
  NaverValidation,
  KkottiNaverScore,
  KkottiMood,
} from '@/types/naver';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. 꼬띠 AI 평가 (10개 항목)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ProductData {
  name: string;
  description?: string;
  salePrice: number;
  supplierPrice: number;
  mainImage?: string;
  images?: string[];
  brand?: string;
  category?: string;
  keywords?: string[];
  stock?: number;
  hasOptions?: boolean;
  shippingFee?: number;
}

export function evaluateKkotti(product: ProductData): KkottiEvaluation {
  const breakdown = {
    margin: evaluateMargin(product.salePrice, product.supplierPrice),
    keywords: evaluateKeywords(product.keywords || []),
    description: evaluateDescription(product.description || ''),
    images: evaluateImages(product.images || []),
    competitiveness: evaluateCompetitiveness(product),
    inventory: evaluateInventory(product.stock || 0),
    shipping: evaluateShipping(product.shippingFee || 3000),
    reviews: 0, // 신규 상품은 0점
    options: evaluateOptions(product.hasOptions || false),
    brand: evaluateBrand(product.brand || ''),
  };

  const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
  const mood = getMood(totalScore);
  const message = getMessage(totalScore, breakdown);
  const suggestions = getSuggestions(product, breakdown);

  return {
    totalScore,
    breakdown,
    mood,
    message,
    suggestions,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 평가 세부 함수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function evaluateMargin(salePrice: number, supplierPrice: number): number {
  const marginRate = ((salePrice - supplierPrice) / salePrice) * 100;
  if (marginRate >= 30) return 20;
  if (marginRate >= 20) return 15;
  if (marginRate >= 10) return 10;
  return 0;
}

function evaluateKeywords(keywords: string[]): number {
  const count = keywords.length;
  if (count >= 5) return 20;
  if (count >= 3) return 15;
  if (count >= 1) return 10;
  return 0;
}

function evaluateDescription(description: string): number {
  const length = description.length;
  if (length >= 500) return 15;
  if (length >= 200) return 12;
  if (length >= 50) return 8;
  return 0;
}

function evaluateImages(images: string[]): number {
  const count = images.length;
  if (count >= 5) return 10;
  if (count >= 3) return 8;
  if (count >= 1) return 5;
  return 0;
}

function evaluateCompetitiveness(product: ProductData): number {
  // 간단한 경쟁력 평가 (실제로는 AI 분석 필요)
  let score = 0;
  if (product.brand && product.brand !== '꽃틔움') score += 5;
  if (product.category) score += 3;
  if ((product.keywords?.length || 0) >= 3) score += 2;
  return Math.min(score, 10);
}

function evaluateInventory(stock: number): number {
  if (stock >= 100) return 10;
  if (stock >= 50) return 8;
  if (stock >= 10) return 6;
  if (stock >= 1) return 3;
  return 0;
}

function evaluateShipping(shippingFee: number): number {
  if (shippingFee === 0) return 5;
  if (shippingFee <= 3000) return 3;
  return 1;
}

function evaluateOptions(hasOptions: boolean): number {
  return hasOptions ? 3 : 0;
}

function evaluateBrand(brand: string): number {
  if (brand && brand !== '꽃틔움' && brand !== '도매매 공급사') return 2;
  return 0;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 분위기 및 메시지 생성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getMood(score: number): KkottiMood {
  if (score === 100) return 'celebrate';
  if (score >= 80) return 'happy';
  if (score >= 60) return 'excited';
  if (score >= 40) return 'thinking';
  return 'worried';
}

function getMessage(score: number, breakdown: any): string {
  if (score >= 80) {
    return '우수한 상품입니다! 바로 등록하시면 좋을 것 같아요! 😊';
  } else if (score >= 60) {
    const weak = Object.entries(breakdown)
      .filter(([_, value]) => (value as number) < 5)
      .map(([key]) => key);
    return `괜찮은 상품이에요! ${weak[0]}을(를) 개선하면 더 좋을 것 같아요.`;
  } else if (score >= 40) {
    return '아직 개선할 부분이 많아요. 아래 제안을 확인해주세요!';
  } else {
    return '상품 정보가 부족해요. 필수 항목을 먼저 채워주세요!';
  }
}

function getSuggestions(product: ProductData, breakdown: any): string[] {
  const suggestions: string[] = [];

  if (breakdown.margin < 15) {
    const targetMargin = 30;
    const targetPrice = Math.ceil(product.supplierPrice / (1 - targetMargin / 100));
    suggestions.push(`판매가를 ${targetPrice.toLocaleString()}원으로 올려보세요 (마진 ${targetMargin}%)`);
  }

  if (breakdown.keywords < 15) {
    suggestions.push(`키워드를 ${5 - (product.keywords?.length || 0)}개 더 추가하세요`);
  }

  if (breakdown.description < 12) {
    suggestions.push('상세설명을 최소 200자 이상 작성하세요');
  }

  if (breakdown.images < 8) {
    suggestions.push(`이미지를 ${3 - (product.images?.length || 0)}장 더 추가하세요`);
  }

  if (breakdown.inventory < 6) {
    suggestions.push('재고를 최소 10개 이상 확보하세요');
  }

  return suggestions.slice(0, 5); // 최대 5개
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. 네이버 검증
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function evaluateNaver(product: ProductData): NaverValidation {
  // 필수 20개 항목 체크
  const requiredFields = {
    name: product.name,
    price: product.salePrice,
    image: product.mainImage,
    brand: product.brand,
    category: product.category,
  };

  const requiredMissing = Object.entries(requiredFields)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  const requiredComplete = requiredMissing.length === 0;

  // 네이버 SEO 점수 계산
  const seoScore = calculateNaverSeo(product);

  // 자동 채움 (AI 분석)
  const autoFilled = {
    category: {
      code: '50003307',
      name: '가구/인테리어 > DIY자재/용품 > 가구부속품 > 가구다리',
      confidence: 0.85,
    },
    origin: {
      code: '0',
      name: '국산',
      source: 'manual' as const,
    },
    brand: product.brand || null,
  };

  // 최적화 제안
  const optimized = {
    title27: optimizeTitle(product.name),
    keywords: extractKeywords(product.name, product.description || ''),
    keywordDensity: 0.08,
    competitivePrice: {
      avg: Math.round(product.salePrice * 1.1),
      min: Math.round(product.salePrice * 0.8),
      max: Math.round(product.salePrice * 1.3),
      myPosition: 'mid' as const,
    },
  };

  return {
    requiredComplete,
    requiredMissing,
    seoScore,
    autoFilled,
    optimized,
  };
}

function calculateNaverSeo(product: ProductData): number {
  let score = 0;

  // 상품명 길이 (27자 최적)
  const titleLength = product.name.length;
  if (titleLength >= 20 && titleLength <= 30) {
    score += 30;
  } else if (titleLength >= 15) {
    score += 20;
  } else {
    score += 10;
  }

  // 키워드 개수
  const keywordCount = product.keywords?.length || 0;
  if (keywordCount >= 5) {
    score += 30;
  } else if (keywordCount >= 3) {
    score += 20;
  } else {
    score += 10;
  }

  // 이미지 개수
  const imageCount = (product.images?.length || 0) + (product.mainImage ? 1 : 0);
  if (imageCount >= 5) {
    score += 20;
  } else if (imageCount >= 3) {
    score += 15;
  } else {
    score += 5;
  }

  // 상세설명
  const descLength = product.description?.length || 0;
  if (descLength >= 200) {
    score += 20;
  } else if (descLength >= 100) {
    score += 10;
  } else {
    score += 5;
  }

  return Math.min(score, 100);
}

function optimizeTitle(title: string): string {
  // 27자로 최적화
  if (title.length <= 27) return title;
  return title.substring(0, 24) + '...';
}

function extractKeywords(name: string, description: string): string[] {
  // 간단한 키워드 추출 (실제로는 NLP 필요)
  const text = `${name} ${description}`.toLowerCase();
  const words = text.split(/\s+/).filter(w => w.length >= 2);
  return [...new Set(words)].slice(0, 7);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. 통합 평가
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function evaluateKkottiNaver(product: ProductData): KkottiNaverScore {
  const kkotti = evaluateKkotti(product);
  const naver = evaluateNaver(product);

  const combinedScore = Math.round((kkotti.totalScore + naver.seoScore) / 2);
  const excelReady = naver.requiredComplete && combinedScore >= 60;

  return {
    kkotti,
    naver,
    combinedScore,
    excelReady,
    lastEvaluated: new Date().toISOString(),
  };
}
