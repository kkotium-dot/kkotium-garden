import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';


export const dynamic = 'force-dynamic';
const categoryMap: Record<string, string> = {
  '': '50000006',
  '의류': '50000006',
  '여성의류': '50000007',
  '남성의류': '50000008',
  '원피스': '50000165',
  '블라우스': '50000167',
  '바지': '50000170',
};

export async function POST(request: NextRequest) {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 네이버 상품 등록 API 호출');
    console.log('='.repeat(80));

    const { productId } = await request.json();

    if (!productId) {
      console.error('❌ 상품 ID 누락');
      return NextResponse.json(
        { success: false, error: '상품 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('🔍 상품 조회:', productId);

    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from('Product')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError || !data) {
      console.error('❌ 상품 조회 실패:', fetchError?.message || '상품 없음');
      console.error('   Product ID:', productId);
      return NextResponse.json(
        { success: false, error: '상품을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const product = data;

    console.log('✅ 상품 조회 성공:', product.name);
    console.log('   현재 상태:', product.status);

    const naverCategoryId = categoryMap[product.category || ''] || categoryMap[''];

    const naverProduct = {
      originProduct: {
        statusType: 'SALE',
        saleType: 'NEW',
        name: product.name,
        detailContent: product.description || product.name,
        images: product.mainImage ? [{ url: product.mainImage }] : [],
        salePrice: product.salePrice,
        stockQuantity: 999,
        deliveryInfo: {
          deliveryType: 'DELIVERY',
          deliveryAttributeType: 'NORMAL',
          deliveryCompany: 'CJ대한통운',
          deliveryBundleGroupUsable: true,
          deliveryFee: {
            deliveryFeeType: product.shippingFee > 0 ? 'CHARGE' : 'FREE',
            baseFee: product.shippingFee || 0,
            freeConditionalAmount: 50000,
          },
          claimDeliveryInfo: {
            returnDeliveryCompanyPriorityType: 'PRIMARY',
            returnDeliveryFee: 3000,
            exchangeDeliveryFee: 6000,
          },
        },
        detailAttribute: {
          afterServiceInfo: '상품 수령 후 7일 이내 반품 가능',
          originAreaInfo: '국내',
          sellerCodeInfo: product.sku,
        },
        categoryId: naverCategoryId,
        saleStartDate: new Date().toISOString(),
        saleEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }
    };

    const naverApiUrl = 'https://api.commerce.naver.com/external/v1/products/origin-products';
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    // 1) 시뮬레이션 모드 (API 키 없음)
    if (!clientId || !clientSecret) {
      console.warn('⚠️ 네이버 API 키 없음 - 시뮬레이션 모드');

      const mockNaverProductId = `MOCK_${Date.now()}`;

      const { error: updateError } = await supabase
        .from('Product')
        .update({
          status: 'registered',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', productId);

      if (updateError) {
        console.error('❌ 상태 업데이트 실패:', updateError.message);
        return NextResponse.json(
          { success: false, error: '상태 업데이트 실패: ' + updateError.message },
          { status: 500 }
        );
      }

      console.log('✅ 시뮬레이션 등록 완료');
      console.log('   상품 ID:', productId);
      console.log('   Mock 네이버 ID:', mockNaverProductId);
      console.log('   상태 변경:', product.status, '→ registered');
      console.log('='.repeat(80) + '\n');

      return NextResponse.json({
        success: true,
        naverProductId: mockNaverProductId,
        message: '시뮬레이션 모드: 네이버 API 키를 설정하세요.',
      });
    }

    // 2) 실제 네이버 API 호출
    console.log('🌐 네이버 API 호출 시작...');
    console.log('📤 요청 URL:', naverApiUrl);
    console.log('📤 요청 데이터:', JSON.stringify(naverProduct, null, 2));

    try {
      const naverResponse = await fetch(naverApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
        body: JSON.stringify(naverProduct),
      });

      const naverData = await naverResponse.json();

      if (!naverResponse.ok) {
        console.error('❌ 네이버 API 실패:', naverData);
        console.error('   HTTP 상태:', naverResponse.status);
        console.error('   응답 본문:', JSON.stringify(naverData, null, 2));
        
        // ⚠️ API 실패해도 상태는 'registered'로 변경 (임시)
        const mockNaverProductId = `PENDING_${Date.now()}`;
        
        await supabase
          .from('Product')
          .update({
            status: 'registered',
            updatedAt: new Date().toISOString(),
          })
          .eq('id', productId);

        return NextResponse.json({
          success: false,
          error: `네이버 API 오류: ${naverData.message || '알 수 없는 오류'}`,
          naverProductId: mockNaverProductId,
          message: '네이버 API 오류가 발생했지만 상태는 저장되었습니다. 네이버 센터에서 수동 등록이 필요합니다.',
        });
      }

      const naverProductId = naverData.originProduct?.id;

      console.log('✅ 네이버 등록 성공:', naverProductId);

      await supabase
        .from('Product')
        .update({
          status: 'registered',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', productId);

      console.log('='.repeat(80) + '\n');

      return NextResponse.json({
        success: true,
        naverProductId,
        message: '네이버 스마트스토어에 등록되었습니다.',
      });

    } catch (apiError: any) {
      console.error('❌ 네이버 API 호출 예외:', apiError.message);
      
      // ⚠️ API 실패해도 상태는 'registered'로 변경 (임시)
      const mockNaverProductId = `ERROR_${Date.now()}`;
      
      await supabase
        .from('Product')
        .update({
          status: 'registered',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', productId);

      return NextResponse.json({
        success: false,
        error: apiError.message,
        naverProductId: mockNaverProductId,
        message: 'API 연결 실패. 네이버 센터에서 수동 등록이 필요합니다.',
      });
    }

  } catch (error: any) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ 네이버 등록 예외 발생');
    console.error('='.repeat(80));
    console.error('에러 메시지:', error.message);
    console.error('에러 스택:', error.stack);
    console.error('='.repeat(80) + '\n');

    return NextResponse.json(
      {
        success: false,
        error: error.message || '네이버 등록 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
