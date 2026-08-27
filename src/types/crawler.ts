// src/types/crawler.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 크롤러 타입 정의
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. 크롤링 결과
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// CrawlResult — domemae route 반환타입 (다양한 크롤러 결과를 포함하므로 data는 any)
export type CrawlResult = {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
};

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
