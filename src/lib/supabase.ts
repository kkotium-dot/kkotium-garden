import { createClient } from '@supabase/supabase-js';

// ============================================
// 환경 변수 확인 및 로깅
// ============================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Supabase 환경 변수 체크:');
console.log('  - URL:', supabaseUrl ? '✅ 설정됨' : '❌ 없음');
console.log('  - Anon Key:', supabaseAnonKey ? '✅ 설정됨' : '❌ 없음');
console.log('  - Service Role Key:', supabaseServiceKey ? '✅ 설정됨' : '⚠️ 없음');

// 필수 환경 변수 검증
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다!');
  console.error('   .env.local 파일을 확인하세요:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
}

// ============================================
// Supabase 클라이언트 초기화
// ============================================

// 클라이언트용 (브라우저)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('✅ Supabase 클라이언트 초기화 완료');

// 서버용 (관리자 권한 - RLS 무시)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;

if (supabaseServiceKey) {
  console.log('✅ Supabase Admin 클라이언트 초기화 완료');
} else {
  console.warn('⚠️ Service Role Key가 없습니다. 크롤러 권한이 제한될 수 있습니다.');
}

// ============================================
// 타입 정의 (기존 시스템)
// ============================================
export interface Product {
  id: string;
  userId: string;
  name: string;
  sku: string;
  vendorCode?: string;
  category?: string;
  supplierId?: string;
  supplierPrice: number;
  salePrice: number;
  margin: number;
  shippingStrategy: string;
  freeShippingThreshold?: number;
  shippingFee: number;
  supplierShippingFee: number;
  supplierReturnFee: number;
  hasOptions: boolean;
  optionName?: string;
  optionValues?: any;
  mainImage?: string;
  additionalImages?: any;
  description?: string;
  keywords?: any;
  sourceUrl?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// 타입 정의 (크롤링 시스템)
// ============================================
export interface SourcedProduct {
  id?: number;
  external_id: string;
  name: string;
  category?: string;
  wholesale_price: number;
  retail_price: number;
  image_url?: string;
  brand?: string;
  source_url?: string;
  source: 'domemae' | 'manual';
  status: 'pending' | 'approved' | 'listed';
  naver_product_id?: string;
  naver_status?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * Supabase 연결 테스트
 */
export async function testSupabaseConnection() {
  try {
    const { error } = await supabase
      .from('products')
      .select('id')
      .limit(1);

    if (error) throw error;

    console.log('✅ Supabase 연결 테스트 성공');
    return { success: true, message: '✅ 연결 성공' };
  } catch (error) {
    console.error('❌ 연결 실패:', error);
    return {
      success: false,
      message: `❌ 연결 실패: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
