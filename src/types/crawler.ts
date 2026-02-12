// src/types/crawler.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 크롤러 & 자동 매핑 타입 정의
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. 크롤링 결과
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CrawledData {
  url: string;
  title: string;
  price: number;
  originalPrice?: number;
  description: string;
  images: string[];
  brand?: string;
  manufacturer?: string;
  specs?: Record<string, string>;           // 상세 스펙
  options?: {
    name: string;
    values: string[];
  }[];
  meta: {
    crawledAt: string;
    source: 'domeme' | 'sabangnet' | 'other';
    success: boolean;
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. AI 자동 매핑 결과
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface AutoMappingResult {
  category: {
    code: string;
    fullPath: string;
    level1: string;
    level2?: string;
    level3?: string;
    level4?: string;
    confidence: number;                     // 0-1 (신뢰도)
    reasoning: string;                      // 매칭 근거
  };
  origin: {
    code: string;
    region: string;
    confidence: number;
    source: 'product_name' | 'description' | 'specs' | 'default';
  };
  keywords: {
    primary: string[];                      // 5-7개 주요 키워드
    secondary: string[];                    // 추가 키워드
    seoOptimized: string[];                 // SEO 최적화 키워드
  };
  naverExcelData: Record<string, any>;      // 네이버 엑셀 88개 필드 자동 채움
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. 네이버 자동 채움 API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface NaverAutoFillRequest {
  url: string;                              // 도매 사이트 URL
  supplierPrice?: number;                   // 공급가 (없으면 크롤링 가격)
  targetMargin?: number;                    // 목표 마진율 (기본 30%)
  options?: {
    crawlImages?: boolean;                  // 이미지 다운로드 여부
    generateDescription?: boolean;          // 설명 AI 생성 여부
    autoEvaluate?: boolean;                 // 꼬띠 평가 자동 실행
  };
}

export interface NaverAutoFillResponse {
  success: boolean;
  data?: {
    crawled: CrawledData;
    mapped: AutoMappingResult;
    product: {
      name: string;                         // 네이버 최적화 상품명 (27자)
      salePrice: number;
      supplierPrice: number;
      margin: number;
      description: string;
      mainImage: string;
      images: string[];
      brand: string;
      category: string;
      naverCategoryCode: string;
      originCode: string;
      keywords: string[];
      naverExcelData: Record<string, any>;
    };
    evaluation?: any;                       // 꼬띠 평가 결과
    readyToCreate: boolean;                 // DB 저장 가능 여부
  };
  error?: string;
  warnings?: string[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. 배치 처리 (여러 URL 동시 크롤링)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface BatchAutoFillRequest {
  urls: string[];
  supplierPrices?: Record<string, number>;  // URL별 공급가
  targetMargin?: number;
  options?: NaverAutoFillRequest['options'];
}

export interface BatchAutoFillResponse {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: {
    url: string;
    success: boolean;
    data?: NaverAutoFillResponse['data'];
    error?: string;
  }[];
}
