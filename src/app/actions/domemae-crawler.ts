'use server';

import { supabaseAdmin } from '@/lib/supabase';
import type { SourcedProduct } from '@/lib/supabase';

const DOMEMAE_API_KEY = process.env.DOMEMAE_API_KEY;
const DOMEMAE_API_BASE = 'https://openapi.domeggook.com';

interface DomemaeProduct {
  goodsNo: string;
  goodsNm: string;
  price: number;
  retailPrice?: number;
  imagePath: string;
  cateNm: string;
  brandNm?: string;
  goodsUrl?: string;
}

/**
 * 🌸 도매매 상품 크롤링
 */
export async function crawlDomemaeProducts(options: {
  url?: string;
  keyword?: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  try {
    console.log('🚀 크롤링 시작:', options);

    if (!DOMEMAE_API_KEY) {
      throw new Error('도매매 API 키가 설정되지 않았습니다.');
    }

    let products: DomemaeProduct[] = [];

    if (options.url) {
      const product = await crawlByUrl(options.url);
      if (product) products = [product];
    } else if (options.keyword) {
      products = await searchByKeyword(
        options.keyword,
        options.page || 1,
        options.limit || 20
      );
    } else if (options.category) {
      products = await searchByCategory(
        options.category,
        options.page || 1,
        options.limit || 20
      );
    }

    console.log(`📦 수집된 상품: ${products.length}개`);

    if (products.length === 0) {
      return {
        success: false,
        message: '❌ 수집된 상품이 없습니다.',
        count: 0
      };
    }

    // sourced_products 테이블에 저장
    const saved = await saveToSourcedProducts(products);

    console.log(`✅ 저장 완료: ${saved.length}개`);

    return {
      success: true,
      message: `✅ ${saved.length}개 상품이 성공적으로 저장되었습니다!`,
      count: saved.length,
      products: saved
    };

  } catch (error) {
    console.error('❌ 크롤링 오류:', error);
    return {
      success: false,
      message: `❌ 오류: ${error instanceof Error ? error.message : String(error)}`,
      count: 0
    };
  }
}

/**
 * URL에서 상품 가져오기
 */
async function crawlByUrl(url: string): Promise<DomemaeProduct | null> {
  try {
    const goodsNoMatch = url.match(/goodsNo[=\/](\d+)/i);
    if (!goodsNoMatch) {
      throw new Error('올바른 도매매 상품 URL이 아닙니다.');
    }

    const goodsNo = goodsNoMatch[1];
    const apiUrl = `${DOMEMAE_API_BASE}/goods/detail?key=${DOMEMAE_API_KEY}&goodsNo=${goodsNo}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.result !== 'success') {
      throw new Error(data.msg || '상품 정보를 가져올 수 없습니다.');
    }

    return data.data;
  } catch (error) {
    console.error('URL 크롤링 오류:', error);
    throw error;
  }
}

/**
 * 키워드 검색
 */
async function searchByKeyword(
  keyword: string,
  page: number,
  limit: number
): Promise<DomemaeProduct[]> {
  try {
    const apiUrl = `${DOMEMAE_API_BASE}/goods/search?key=${DOMEMAE_API_KEY}&keyword=${encodeURIComponent(keyword)}&page=${page}&limit=${limit}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.result !== 'success') {
      throw new Error(data.msg || '검색 실패');
    }

    return data.data?.list || [];
  } catch (error) {
    console.error('키워드 검색 오류:', error);
    throw error;
  }
}

/**
 * 카테고리 검색
 */
async function searchByCategory(
  category: string,
  page: number,
  limit: number
): Promise<DomemaeProduct[]> {
  try {
    const apiUrl = `${DOMEMAE_API_BASE}/goods/category?key=${DOMEMAE_API_KEY}&cateNo=${category}&page=${page}&limit=${limit}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.result !== 'success') {
      throw new Error(data.msg || '카테고리 검색 실패');
    }

    return data.data?.list || [];
  } catch (error) {
    console.error('카테고리 검색 오류:', error);
    throw error;
  }
}

/**
 * sourced_products 테이블에 저장
 */
async function saveToSourcedProducts(products: DomemaeProduct[]) {
  try {
    const productsToSave = products.map(p => {
      const imageUrl = p.imagePath?.startsWith('http')
        ? p.imagePath
        : p.imagePath
        ? `https://domemedb.domeggook.com${p.imagePath}`
        : null;

      return {
        external_id: `domemae_${p.goodsNo}`,
        name: p.goodsNm || '상품명 없음',
        category: p.cateNm || '미분류',
        wholesale_price: p.price || 0,
        retail_price: p.retailPrice || Math.round((p.price || 0) * 1.5),
        image_url: imageUrl,
        brand: p.brandNm || null,
        source_url: p.goodsUrl || `https://domemedb.domeggook.com/goods/view?goodsNo=${p.goodsNo}`,
        source: 'domemae' as const,
        status: 'pending' as const,
        created_at: new Date().toISOString()
      };
    });

    // Admin 클라이언트로 저장
    const { data, error } = await supabaseAdmin
      .from('sourced_products')
      .upsert(productsToSave, {
        onConflict: 'external_id',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('DB 저장 오류:', error);
      throw new Error(`DB 저장 실패: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('저장 오류:', error);
    throw error;
  }
}

/**
 * API 테스트
 */
export async function testDomemaeAPI() {
  try {
    console.log('🧪 도매매 API 테스트');
    
    if (!DOMEMAE_API_KEY) {
      return {
        success: false,
        message: '❌ API 키가 설정되지 않았습니다.'
      };
    }

    const testUrl = `${DOMEMAE_API_BASE}/goods/search?key=${DOMEMAE_API_KEY}&keyword=테스트&limit=1`;
    const response = await fetch(testUrl);
    const data = await response.json();

    const isSuccess = data.result === 'success';

    return {
      success: isSuccess,
      message: isSuccess 
        ? '✅ API 연결 성공!' 
        : `❌ 연결 실패: ${data.msg}`,
      data
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ 테스트 실패: ${error}`
    };
  }
}
