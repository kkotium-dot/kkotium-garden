import type { CrawlerResult, CrawledProduct, SearchOptions } from './types';

export class WholesaleCrawler {
  private apiUrl: string;
  private apiKey: string;
  private userId: string;
  private password: string;
  private timeout: number;
  private maxProducts: number;
  private authToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.apiUrl = process.env.WHOLESALE_API_URL || 'https://domemedb.domeggook.com/api';
    this.apiKey = process.env.WHOLESALE_API_KEY || '';
    this.userId = process.env.WHOLESALE_USER_ID || '';
    this.password = process.env.WHOLESALE_PASSWORD || '';
    this.timeout = parseInt(process.env.CRAWLER_TIMEOUT || '15000');
    this.maxProducts = parseInt(process.env.CRAWLER_MAX_PRODUCTS || '50');

    console.log('✅ WholesaleCrawler 초기화');
  }

  private async authenticate(): Promise<string> {
    if (this.authToken && Date.now() < this.tokenExpiry) {
      return this.authToken;
    }

    try {
      console.log('🔐 로그인 시도...');

      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          userId: this.userId,
          password: this.password
        })
      });

      if (!response.ok) {
        throw new Error(`로그인 실패: ${response.status}`);
      }

      const data = await response.json();
      this.authToken = data.token || data.accessToken || '';
      this.tokenExpiry = Date.now() + 3600000;

      console.log('✅ 로그인 성공');
      return this.authToken;

    } catch (error) {
      console.error('❌ 로그인 실패:', error);
      return '';
    }
  }

  async searchDomemae(keyword: string, options?: SearchOptions): Promise<CrawlerResult> {
    return this.search(keyword, 'domemae', options);
  }

  async searchDomegook(keyword: string, options?: SearchOptions): Promise<CrawlerResult> {
    return this.search(keyword, 'domegook', options);
  }

  private async search(
    keyword: string,
    source: 'domemae' | 'domegook',
    options?: SearchOptions
  ): Promise<CrawlerResult> {
    const startTime = Date.now();
    const sourceName = source === 'domemae' ? '도매매' : '도매꾹';

    try {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🔍 [${sourceName}] 검색: "${keyword}"`);
      console.log(`${'='.repeat(80)}`);

      const token = await this.authenticate();

      const params = new URLSearchParams({
        keyword,
        site: source,
        page: String(options?.page || 1),
        limit: String(options?.limit || this.maxProducts)
      });

      const searchUrl = `${this.apiUrl}/products/search?${params}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(searchUrl, {
        signal: controller.signal,
        method: 'GET',
        headers
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }

      const data = await response.json();
      const rawProducts = data.products || data.items || data.data || [];

      const products: CrawledProduct[] = rawProducts.map((item: any, index: number) => {
        const price = this.toNumber(item.price || item.wholesalePrice || 0);
        const stock = this.toNumber(item.stock || item.stockCount || 100);

        return {
          id: `${source.toUpperCase()}_${item.id || Date.now()}_${index}`,
          name: item.name || item.productName || item.title || '',
          price: price,
          image: this.toImageUrl(item.image || item.imageUrl || item.thumbnail || ''),
          url: this.toProductUrl(item.url || item.link || '', item.id, source),
          supplier: item.supplier || item.sellerName || sourceName,
          category: item.category || item.categoryName || '기타',
          stock: stock,
          description: item.description || '',
          source,
          metadata: {
            originalId: item.id || '',
            sellerId: item.sellerId || '',
            rating: this.toNumber(item.rating || 0),
            reviewCount: this.toNumber(item.reviewCount || 0),
            deliveryFee: this.toNumber(item.deliveryFee || 0),
            minOrderQty: this.toNumber(item.minOrderQty || 1)
          }
        };
      });

      const elapsed = Date.now() - startTime;
      console.log(`✅ 완료: ${products.length}개 (${elapsed}ms)`);
      console.log(`${'='.repeat(80)}\n`);

      return {
        success: true,
        products,
        message: `${products.length}개 상품`,
        source,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ [${sourceName}] 오류:`, error);
      return this.makeSampleData(keyword, source, error);
    }
  }

  private toNumber(value: any): number {
    if (typeof value === 'number') return Math.floor(value);
    if (typeof value === 'string') {
      const num = parseInt(value.replace(/[^\d]/g, ''));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  private toImageUrl(url: string): string {
    if (!url) return 'https://via.placeholder.com/400x300?text=No+Image';
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return `https://domemedb.domeggook.com${url}`;
  }

  private toProductUrl(url: string, id: any, source: 'domemae' | 'domegook'): string {
    if (url && url.startsWith('http')) return url;
    const base = source === 'domemae' ? 'https://www.domemae.co.kr' : 'https://domemedb.domeggook.com';
    return id ? `${base}/product/${id}` : base;
  }

  private makeSampleData(keyword: string, source: 'domemae' | 'domegook', error: any): CrawlerResult {
    const sourceName = source === 'domemae' ? '도매매' : '도매꾹';
    console.log(`📦 [${sourceName}] 샘플 데이터 생성`);

    const products: CrawledProduct[] = Array.from({ length: 10 }, (_, i) => ({
      id: `${source.toUpperCase()}_SAMPLE_${Date.now()}_${i}`,
      name: `${keyword} ${sourceName} 샘플 ${i + 1}`,
      price: 15000 + (i * 1000),
      image: `https://via.placeholder.com/400x300?text=${sourceName}+${i + 1}`,
      url: `https://${source === 'domemae' ? 'domemae.co.kr' : 'domeggook.com'}/product/sample${i}`,
      supplier: sourceName,
      category: '의류',
      stock: 100,
      description: `${keyword} 샘플 상품`,
      source,
      metadata: {
        isSample: true,
        error: error instanceof Error ? error.message : String(error),
        deliveryFee: 3000,
        minOrderQty: 1
      }
    }));

    return {
      success: true,
      products,
      message: `샘플 ${products.length}개`,
      source,
      timestamp: new Date().toISOString()
    };
  }

  async searchAll(keyword: string, options?: SearchOptions): Promise<CrawlerResult> {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 [통합검색] "${keyword}"`);
    console.log(`${'='.repeat(80)}\n`);

    try {
      const results = await Promise.allSettled([
        this.searchDomemae(keyword, options),
        this.searchDomegook(keyword, options)
      ]);

      const allProducts: CrawledProduct[] = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          allProducts.push(...result.value.products);
        }
      }

      console.log(`✅ 통합: ${allProducts.length}개`);

      return {
        success: true,
        products: allProducts,
        message: `전체 ${allProducts.length}개`,
        source: 'all',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ 통합검색 오류:', error);
      throw error;
    }
  }
}

export const wholesaleCrawler = new WholesaleCrawler();
