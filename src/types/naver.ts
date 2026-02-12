// src/types/naver.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 네이버 통합 설계 타입 정의
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. 꼬띠 AI 평가 (기존 10개 항목)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface KkottiScoreBreakdown {
  margin: number;           // 20점: 마진율 (30% 이상: 20점)
  keywords: number;         // 20점: 키워드 품질
  description: number;      // 15점: 상세설명 (50자 이상: 15점)
  images: number;           // 10점: 이미지 개수 (3장 이상: 10점)
  competitiveness: number;  // 10점: 경쟁력
  inventory: number;        // 10점: 재고 관리
  shipping: number;         // 5점: 배송 정책
  reviews: number;          // 5점: 리뷰 (신규 상품은 0점)
  options: number;          // 3점: 옵션 설정
  brand: number;            // 2점: 브랜드 정보
}

export type KkottiMood = 'happy' | 'excited' | 'thinking' | 'worried' | 'celebrate';

export interface KkottiEvaluation {
  totalScore: number;               // 0-100
  breakdown: KkottiScoreBreakdown;
  mood: KkottiMood;
  message: string;
  suggestions: string[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. 네이버 검증 (신규)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface NaverValidation {
  requiredComplete: boolean;        // 필수 20개 항목 완성 여부
  requiredMissing: string[];        // 누락된 필수 항목
  seoScore: number;                 // 네이버 SEO 점수 (0-100)
  autoFilled: {
    category: {
      code: string;
      name: string;
      confidence: number;           // AI 매칭 신뢰도 (0-1)
    };
    origin: {
      code: string;
      name: string;
      source: 'product_name' | 'description' | 'manual';
    };
    brand: string | null;
  };
  optimized: {
    title27: string;                // 27자 최적 상품명
    keywords: string[];             // 5-7개 추천 키워드
    keywordDensity: number;         // 키워드 밀도 (0-1)
    competitivePrice: {
      avg: number;
      min: number;
      max: number;
      myPosition: 'premium' | 'mid' | 'low';
    };
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. 통합 평가 (꼬띠 + 네이버)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface KkottiNaverScore {
  kkotti: KkottiEvaluation;
  naver: NaverValidation;
  combinedScore: number;            // (kkotti + naver.seo) / 2
  excelReady: boolean;              // 네이버 엑셀 생성 가능 여부
  lastEvaluated: string;            // ISO 8601 타임스탬프
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. API 요청/응답
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface EvaluateRequest {
  productId?: string;               // 기존 상품 ID
  product?: {                       // 또는 신규 상품 데이터
    name: string;
    description?: string;
    salePrice: number;
    supplierPrice: number;
    mainImage?: string;
    images?: string[];
    brand?: string;
    category?: string;
    keywords?: string[];
  };
}

export interface EvaluateResponse {
  success: boolean;
  data?: KkottiNaverScore;
  error?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. 마스터 데이터 타입
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface DeliveryCompany {
  id: number;
  code: string;
  name: string;
  active: boolean;
}

export interface NaverCategory {
  id: number;
  code: string;
  level1: string | null;
  level2: string | null;
  level3: string | null;
  level4: string | null;
  fullPath: string | null;
  active: boolean;
}

export interface OriginCode {
  id: number;
  code: string;
  region: string;
  active: boolean;
}
