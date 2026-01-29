// 크롤러 관련 타입 정의
export interface CrawlResult {
  success: boolean;
  data?: ProductCrawlData;
  error?: string;
  duration?: number;
}

export interface ProductCrawlData {
  name: string;
  supplierPrice: number;
  salePrice: number;
  images: string[];
  options: ProductOption[];
  description: string;
  category: string;
  supplier: string;
  sourceUrl: string;
}

export interface ProductOption {
  name: string;
  price: number;
}

export interface CrawlerLog {
  id: string;
  url: string;
  status: 'SUCCESS' | 'FAILED';
  result?: string;
  errorMessage?: string;
  duration: number;
  createdAt: string;
}
