import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const { productIds } = await request.json();

    if (!productIds || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '상품 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('📊 네이버 엑셀 생성 시작:', productIds.length, '개 상품');

    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('Product')
      .select('*')
      .in('id', productIds);

    if (error || !data) {
      console.error('❌ 상품 조회 실패:', error);
      return NextResponse.json(
        { success: false, error: '상품 조회 실패: ' + (error?.message || '알 수 없는 오류') },
        { status: 500 }
      );
    }

    const products = data;
    console.log('✅ 상품 조회 성공:', products.length, '개');

    // ✅ 네이버 스마트스토어 엑셀 포맷 (88개 필드 완벽 대응)
    const excelData = products.map((product: any, index: number) => ({
      // ========== 상품 기본정보 ==========
      '판매자 상품코드': product.sellerCode || product.sku,
      '카테고리코드': product.naverCategoryCode || '50003307',
      '상품명': product.seoTitle || product.aiGeneratedTitle || product.name,
      '상품상태': product.productStatus || '신상품',
      '판매가': product.salePrice,
      '부가세': product.taxType || '과세상품',
      '재고수량': 999,
      
      // ========== 옵션 정보 ==========
      '옵션형태': '',
      '옵션명': '',
      '옵션값': '',
      '옵션가': '',
      '옵션 재고수량': '',
      '직접입력 옵션': '',
      
      // ========== 추가상품 ==========
      '추가상품명': '',
      '추가상품값': '',
      '추가상품가': '',
      '추가상품 재고수량': '',
      
      // ========== 이미지 ==========
      '대표이미지': product.mainImage || '',
      '추가이미지': product.additionalImages ? JSON.parse(product.additionalImages).join('\n') : '',
      '상세설명': product.aiGeneratedDesc || product.description || product.name,
      
      // ========== 상품 주요정보 ==========
      '브랜드': product.brand || '꽃틔움',
      '제조사': product.manufacturer || '도매매 공급사',
      '제조일자': '',
      '유효일자': '',
      '원산지코드': product.originCode || '0001',
      '수입사': '',
      '복수원산지여부': 'N',
      '원산지 직접입력': '',
      '미성년자 구매': product.minorPurchase || 'Y',
      
      // ========== 배송정보 ==========
      '배송비 템플릿코드': '',
      '배송방법': product.shippingMethod || '택배, 소포, 등기',
      '택배사코드': product.courierCode || 'CJGLS',
      '배송비유형': product.shippingType || '조건부 무료',
      '기본배송비': product.shippingFee || 3000,
      '배송비 결제방식': product.shippingPayType || '선결제',
      '조건부무료-상품판매가 합계': product.freeShippingMinPrice || 30000,
      '수량별부과-수량': '',
      '구간별-2구간수량': '',
      '구간별-3구간수량': '',
      '구간별-3구간배송비': '',
      '구간별-추가배송비': '',
      '반품배송비': product.returnShippingFee || 3000,
      '교환배송비': product.exchangeShippingFee || 6000,
      '지역별 차등 배송비': '',
      '별도설치비': 'N',
      
      // ========== 상품정보제공고시 ==========
      '상품정보제공고시 템플릿코드': '',
      '상품정보제공고시 품명': product.productInfoName || product.name,
      '상품정보제공고시 모델명': product.productInfoModel || product.sku,
      '상품정보제공고시 인증허가사항': '',
      '상품정보제공고시 제조자': product.productInfoManufacturer || product.manufacturer || '꽃틔움',
      
      // ========== A/S, 특이사항 ==========
      'A/S 템플릿코드': '',
      'A/S 전화번호': product.asPhone || '고객센터 문의',
      'A/S 안내': product.asInfo || '평일 10:00~18:00',
      '판매자특이사항': '',
      
      // ========== 할인/혜택정보 ==========
      '즉시할인 값(기본할인)': '',
      '즉시할인 단위(기본할인)': '',
      '모바일 즉시할인 값': '',
      '모바일 즉시할인 단위': '',
      '복수구매할인 조건 값': '',
      '복수구매할인 조건 단위': '',
      '복수구매할인 값': '',
      '복수구매할인 단위': '',
      '상품구매시 포인트 지급 값': '',
      '상품구매시 포인트 지급 단위': '',
      '텍스트리뷰 작성시 지급 포인트': 100,
      '포토/동영상 리뷰 작성시 지급 포인트': 500,
      '한달사용 텍스트리뷰 작성시 지급 포인트': 100,
      '한달사용 포토/동영상리뷰 작성시 지급 포인트': 500,
      '알림받기동의 고객 리뷰 작성 시 지급 포인트': 100,
      '무이자 할부 개월': '',
      '사은품': '',
      
      // ========== 기타 정보 ==========
      '판매자바코드': product.barcode || '',
      '구매평 노출여부': 'Y',
      '구매평 비노출사유': '',
      '알림받기 동의 고객 전용 여부': 'N',
      'ISBN': '',
      'ISSN': '',
      '독립출판': '',
      '출간일': '',
      '출판사': '',
      '글작가': '',
      '그림작가': '',
      '번역자명': '',
      '문화비 소득공제': '',
      '사이즈 상품군': '',
      '사이즈 사이즈명': '',
      '사이즈 상세 사이즈': '',
      '사이즈 모델명': '',
    }));

    console.log('✅ 엑셀 데이터 생성 완료:', excelData.length, '행');

    // ✅ 엑셀 파일 생성
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // 컬럼 너비 자동 조정
    const colWidths = [
      { wch: 15 }, // 판매자 상품코드
      { wch: 10 }, // 카테고리코드
      { wch: 50 }, // 상품명
      { wch: 10 }, // 상품상태
      { wch: 10 }, // 판매가
      { wch: 10 }, // 부가세
      { wch: 10 }, // 재고수량
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, '일괄등록');

    // ✅ 버퍼로 변환
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    console.log('✅ 네이버 엑셀 생성 완료:', products.length, '개 상품');

    // ✅ 엑셀 파일 다운로드
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="naver_products_${Date.now()}.xlsx"`,
      },
    });

  } catch (error: any) {
    console.error('❌ 엑셀 생성 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message || '엑셀 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
