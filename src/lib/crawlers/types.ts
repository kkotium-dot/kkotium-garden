// 크롤링된 상품 타입
export interface CrawledProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  url: string;
  supplier?: string;
  category?: string;
  stock?: number;
  description?: string;
  source: 'domemae' | 'domegook';
  metadata?: {
    originalId?: string;
    sellerId?: string;
    rating?: number;
    reviewCount?: number;
    deliveryFee?: number;
    minOrderQty?: number;
    isSample?: boolean;
    error?: string;
  };
}

// 크롤러 결과
export interface CrawlerResult {
  success: boolean;
  products: CrawledProduct[];
  message: string;
  source: string;
  timestamp: string;
  metadata?: {
    totalCount?: number;
    hasNextPage?: boolean;
    currentPage?: number;
  };
}

// 검색 옵션
export interface SearchOptions {
  page?: number;
  limit?: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price' | 'popular' | 'recent';
  sortOrder?: 'asc' | 'desc';
  source?: 'domemae' | 'domegook' | 'all';
}
