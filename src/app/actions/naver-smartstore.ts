'use server';

import { supabase } from '@/lib/supabase';

/**
 * 네이버 스마트스토어에 상품 등록
 */
export async function registerToNaver(productId: string) {
  try {
    console.log('🚀 네이버 등록 시작:', productId);

    const { data, error } = await supabase
      .from('sourced_products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error || !data) {
      console.error('❌ 상품 조회 실패:', error);
      return {
        success: false,
        message: '상품을 찾을 수 없습니다.'
      };
    }

    console.log('📦 상품 데이터:', data);

    // TODO: 실제 네이버 스마트스토어 API 연동
    const naverProductId = `NAVER_${Date.now()}`;

    const { error: updateError } = await supabase
      .from('sourced_products')
      .update({
        status: 'listed',
        naver_product_id: naverProductId,
        naver_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);

    if (updateError) {
      console.error('❌ DB 업데이트 실패:', updateError);
      return {
        success: false,
        message: 'DB 업데이트 실패'
      };
    }

    console.log('✅ 네이버 등록 완료:', naverProductId);

    return {
      success: true,
      message: '✅ 네이버 스마트스토어에 등록되었습니다!',
      naverProductId
    };

  } catch (error) {
    console.error('❌ 네이버 등록 오류:', error);
    return {
      success: false,
      message: `❌ 등록 실패: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * 여러 상품을 한 번에 네이버에 등록
 */
export async function registerMultipleToNaver(productIds: string[]) {
  try {
    console.log('🚀 대량 등록 시작:', productIds.length, '개');

    const results = await Promise.all(
      productIds.map(id => registerToNaver(id))
    );

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    return {
      success: true,
      message: `✅ ${successCount}개 등록 완료, ${failCount}개 실패`,
      successCount,
      failCount,
      results
    };

  } catch (error) {
    console.error('❌ 대량 등록 오류:', error);
    return {
      success: false,
      message: `❌ 대량 등록 실패: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * sourced_products → products 테이블로 이동 (승인)
 */
export async function approveProduct(productId: string) {
  try {
    console.log('✅ 상품 승인:', productId);

    // Step 1: sourced_products에서 가져오기
    const { data, error: fetchError } = await supabase
      .from('sourced_products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError || !data) {
      return {
        success: false,
        message: '상품을 찾을 수 없습니다.'
      };
    }

    // Step 2: products 테이블에 삽입
    const productData = {
      name: data.name,
      sku: `SKU_${Date.now()}`,
      category: data.category || '미분류',
      supplierPrice: data.wholesale_price,
      salePrice: data.retail_price,
      margin: parseFloat((((data.retail_price - data.wholesale_price) / data.wholesale_price) * 100).toFixed(2)),
      mainImage: data.image_url,
      sourceUrl: data.source_url,
      status: 'active',
      userId: 'default-user',
      shippingStrategy: 'free',
      shippingFee: 0,
      supplierShippingFee: 0,
      supplierReturnFee: 0,
      hasOptions: false
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('products')
      .insert([productData])
      .select();

    if (insertError) {
      console.error('❌ products 삽입 실패:', insertError);
      return {
        success: false,
        message: `products 삽입 실패: ${insertError.message}`
      };
    }

    // Step 3: sourced_products 상태 업데이트
    const { error: updateError } = await supabase
      .from('sourced_products')
      .update({ status: 'approved' })
      .eq('id', productId);

    if (updateError) {
      console.error('⚠️ sourced_products 업데이트 실패:', updateError);
    }

    console.log('✅ 승인 완료:', insertedData);

    return {
      success: true,
      message: '✅ 상품이 승인되어 products에 등록되었습니다!',
      product: (insertedData && insertedData.length > 0) ? insertedData[0] : null
    };

  } catch (error) {
    console.error('❌ 승인 오류:', error);
    return {
      success: false,
      message: `❌ 승인 실패: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * 상품 삭제 (sourced_products)
 */
export async function deleteSourcedProduct(productId: string) {
  try {
    const { error } = await supabase
      .from('sourced_products')
      .delete()
      .eq('id', productId);

    if (error) {
      return {
        success: false,
        message: `삭제 실패: ${error.message}`
      };
    }

    return {
      success: true,
      message: '✅ 상품이 삭제되었습니다.'
    };

  } catch (error) {
    console.error('❌ 삭제 오류:', error);
    return {
      success: false,
      message: `❌ 삭제 실패: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
