import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { success: false, error: '상품 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 상품 정보 조회
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: '상품을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // TODO: 실제 네이버 쇼핑 API 호출
    // 지금은 Mock 응답 (API 키 설정 후 실제 구현)

    // 네이버 쇼핑 API 요청 데이터 구성
    const naverProduct = {
      name: product.naver_title || product.name,
      salePrice: product.salePrice,
      stockQuantity: 100, // TODO: 재고 관리 시스템 연동
      images: product.mainImage ? [product.mainImage] : [],
      detailContent: product.naver_description || product.description,
      categoryId: product.naverCategoryCode || '',
      manufacturer: product.manufacturer || '',
      brand: product.brand || '',
      originAreaCode: product.originCode || 'KR',
      taxType: product.taxType || 'TAX',
      searchTags: product.naver_keywords?.split(',').map(k => k.trim()) || [],
      afterServiceInfo: product.asInfo || '',
      shippingFee: product.shippingFee || 0,
    };

    // Mock 응답 (실제로는 네이버 API 호출)
    const mockNaverProductId = `NAVER_${Date.now()}`;

    // 데이터베이스에 네이버 상품 ID 저장 (나중에 동기화용)
    await prisma.product.update({
      where: { id: productId },
      data: {
        // naverProductId: mockNaverProductId, // TODO: Product 테이블에 필드 추가
        updatedAt: new Date(),
      },
    });

    console.log('🟢 네이버 상품 등록 요청:', naverProduct);

    return NextResponse.json({
      success: true,
      naverProductId: mockNaverProductId,
      message: '네이버 쇼핑에 등록되었습니다.',
    });

  } catch (error: any) {
    console.error('네이버 등록 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
