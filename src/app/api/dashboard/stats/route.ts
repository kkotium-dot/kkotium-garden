export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화 (Service Role Key 사용!)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다!');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
}

// Service Role Key로 Supabase 클라이언트 생성 (모든 권한!)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('✅ Supabase 클라이언트 초기화 완료 (Dashboard Stats API)');

// GET: 대시보드 통계
export async function GET(request: NextRequest) {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📊 대시보드 통계 API 호출됨 (캐시 없음!)');
    console.log('시간:', new Date().toISOString());
    console.log('='.repeat(80));

    // 환경 변수 체크
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase 환경 변수가 없습니다!');
      return NextResponse.json({
        totalProducts: 0,
        totalRevenue: 0,
        totalProfit: 0,
        averageMargin: 0,
        sourcedProducts: { total: 0, pending: 0, approved: 0, listed: 0 },
        recentActivity: [],
        topMarginProducts: [],
        error: 'Supabase 환경 변수가 설정되지 않았습니다.'
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    // ========================================
    // 1. Product 테이블 조회 (기존 로직)
    // ========================================
    console.log('\n💾 Product 테이블 조회 시작...');
    const { data: products, error, count } = await supabase
      .from('Product')
      .select('*', { count: 'exact' });

    if (error) {
      console.error('\n❌ Supabase 조회 에러:');
      console.error('에러 코드:', error.code);
      console.error('에러 메시지:', error.message);
      console.error('에러 상세:', error.details);

      return NextResponse.json({
        totalProducts: 0,
        totalRevenue: 0,
        totalProfit: 0,
        averageMargin: 0,
        sourcedProducts: { total: 0, pending: 0, approved: 0, listed: 0 },
        recentActivity: [],
        topMarginProducts: [],
        error: error.message
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    console.log('\n✅ Product 조회 성공!');
    console.log('총 상품 수:', products?.length || 0);
    console.log('Count:', count);

    // 통계 계산 (기존 로직)
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalMargin = 0;

    if (products && products.length > 0) {
      console.log('\n📈 Product 통계 계산 시작...');
      products.forEach(product => {
        const supplierPrice = product.supplierPrice || 0;
        const salePrice = product.salePrice || 0;
        const shippingCost = product.shippingFee || 0;

        const cost = supplierPrice + shippingCost;
        const fee = salePrice * 0.058; // 네이버 수수료 5.8%
        const profit = salePrice - cost - fee;
        const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;

        totalRevenue += salePrice;
        totalProfit += profit;
        totalMargin += margin;

        console.log(`  📦 ${product.name || product.sku}`);
        console.log(`     판매가: ${salePrice.toLocaleString()}원, 마진: ${margin.toFixed(1)}%`);
      });
    }

    const averageMargin = products && products.length > 0 ? totalMargin / products.length : 0;

    // ========================================
    // 2. sourced_products 통계 (신규)
    // ========================================
    console.log('\n💾 sourced_products 테이블 조회 시작...');
    const { data: sourcedData, error: sourcedError } = await supabase
      .from('sourced_products')
      .select('*');

    let sourcedProducts = { total: 0, pending: 0, approved: 0, listed: 0 };
    let recentActivity: any[] = [];
    let topMarginProducts: any[] = [];

    if (sourcedError) {
      console.error('⚠️  sourced_products 조회 에러:', sourcedError.message);
    } else {
      console.log('✅ sourced_products 조회 성공!');
      console.log('총 수집 상품 수:', sourcedData?.length || 0);

      sourcedProducts = {
        total: sourcedData?.length || 0,
        pending: sourcedData?.filter(p => p.status === 'pending').length || 0,
        approved: sourcedData?.filter(p => p.status === 'approved').length || 0,
        listed: sourcedData?.filter(p => p.status === 'listed').length || 0
      };

      console.log('  - 대기중:', sourcedProducts.pending);
      console.log('  - 승인됨:', sourcedProducts.approved);
      console.log('  - 등록완료:', sourcedProducts.listed);

      // 3. 최근 활동 (신규)
      const { data: recentData } = await supabase
        .from('sourced_products')
        .select('id, name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      recentActivity = recentData || [];
      console.log('\n📌 최근 활동:', recentActivity.length, '개');

      // 4. 마진율 Top 5 (신규)
      if (sourcedData && sourcedData.length > 0) {
        topMarginProducts = sourcedData
          .map(p => ({
            id: p.id,
            name: p.name,
            wholesale_price: p.wholesale_price,
            retail_price: p.retail_price,
            margin: Math.round(((p.retail_price - p.wholesale_price) / p.wholesale_price) * 100)
          }))
          .filter(p => p.margin > 0 && isFinite(p.margin))
          .sort((a, b) => b.margin - a.margin)
          .slice(0, 5);

        console.log('\n🏆 마진율 Top 5:');
        topMarginProducts.forEach((p, idx) => {
          console.log(`  ${idx + 1}. ${p.name} - ${p.margin}%`);
        });
      }
    }

    // ========================================
    // 5. 최종 결과 반환
    // ========================================
    const result = {
      // 기존 데이터
      totalProducts: products?.length || 0,
      totalRevenue: Math.round(totalRevenue),
      totalProfit: Math.round(totalProfit),
      averageMargin: parseFloat(averageMargin.toFixed(2)),
      // 신규 데이터
      sourcedProducts,
      recentActivity,
      topMarginProducts
    };

    console.log('\n📊 최종 통계:');
    console.log('  [Product 테이블]');
    console.log('  - 전체 상품:', result.totalProducts, '개');
    console.log('  - 총 매출:', result.totalRevenue.toLocaleString(), '원');
    console.log('  - 순이익:', result.totalProfit.toLocaleString(), '원');
    console.log('  - 평균 마진율:', result.averageMargin, '%');
    console.log('\n  [sourced_products 테이블]');
    console.log('  - 전체 수집:', result.sourcedProducts.total, '개');
    console.log('  - 최근 활동:', result.recentActivity.length, '개');
    console.log('  - 마진 Top 5:', result.topMarginProducts.length, '개');
    console.log('='.repeat(80) + '\n');

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (error: any) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ 대시보드 통계 조회 중 예외 발생');
    console.error('='.repeat(80));
    console.error('에러 이름:', error.name);
    console.error('에러 메시지:', error.message);
    console.error('스택:', error.stack);
    console.error('='.repeat(80) + '\n');

    return NextResponse.json({
      totalProducts: 0,
      totalRevenue: 0,
      totalProfit: 0,
      averageMargin: 0,
      sourcedProducts: { total: 0, pending: 0, approved: 0, listed: 0 },
      recentActivity: [],
      topMarginProducts: [],
      error: error.message || '통계 조회 중 오류가 발생했습니다.'
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  }
}
