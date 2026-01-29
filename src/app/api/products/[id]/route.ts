// app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** 
 * GET: 상품 상세 조회 
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        supplier: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: '상품을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    console.log('✅ 상품 조회 성공:', product.name);

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error: any) {
    console.error('Product GET error:', error);
    return NextResponse.json(
      { success: false, error: '상품 조회 실패: ' + error.message },
      { status: 500 }
    );
  }
}

/** 
 * DELETE: 상품 삭제 
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 상품 존재 확인
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: '상품을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 상품 삭제
    await prisma.product.delete({
      where: { id },
    });

    console.log('✅ 상품 삭제 완료:', product.name);

    return NextResponse.json({
      success: true,
      message: '상품이 삭제되었습니다',
    });
  } catch (error: any) {
    console.error('Product DELETE error:', error);
    return NextResponse.json(
      { success: false, error: '상품 삭제 실패: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT: 상품 수정
 * ✅ 네이버 SEO 27개 필드 전체 지원
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const {
      // 기본 정보
      name,
      category,
      supplierPrice,
      salePrice,
      shippingFee,
      keywords,
      description,
      images,
      mainImage,
      options,
      hasOptions,
      status,

      // 네이버 SEO 필드 (27개)
      naver_title,
      naver_keywords,
      naver_description,
      naver_brand,
      naver_manufacturer,
      naver_origin,
      naver_material,
      naver_color,
      naver_size,
      naver_weight,
      naver_care_instructions,
      naver_warranty,
      naver_certification,
      naver_tax_type,
      naver_gift_wrapping,
      naver_as_info,
      naver_delivery_info,
      naver_exchange_info,
      naver_refund_info,
      naver_min_order,
      naver_max_order,
      naver_adult_only,
      naver_parallel_import,
      naver_custom_option_1,
      naver_custom_option_2,
      naver_custom_option_3,
      naver_meta_tags,
    } = body;

    // 마진 재계산
    let margin = 0;
    if (supplierPrice && salePrice) {
      const platformFee = Math.round(parseInt(salePrice) * 0.058);
      const totalCost = parseInt(supplierPrice) + parseInt(shippingFee || 0);
      const profit = parseInt(salePrice) - totalCost - platformFee;
      margin = Math.round((profit / parseInt(salePrice)) * 100);
    }

    // 상품 수정
    const product = await prisma.product.update({
      where: { id },
      data: {
        // 기본 정보
        name,
        category: category || undefined,
        supplierPrice: supplierPrice ? parseInt(supplierPrice) : undefined,
        salePrice: salePrice ? parseInt(salePrice) : undefined,
        shippingFee: shippingFee ? parseInt(shippingFee) : undefined,
        margin,
        keywords: keywords || undefined,
        description: description || undefined,

        // 이미지
        mainImage: mainImage || undefined,
        images: images || [],

        // 옵션
        hasOptions: hasOptions || false,
        options: options || undefined,
        status: status || undefined,

        // 네이버 SEO 필드 (27개)
        naver_title: naver_title !== undefined ? naver_title : undefined,
        naver_keywords: naver_keywords !== undefined ? naver_keywords : undefined,
        naver_description: naver_description !== undefined ? naver_description : undefined,
        naver_brand: naver_brand !== undefined ? naver_brand : undefined,
        naver_manufacturer: naver_manufacturer !== undefined ? naver_manufacturer : undefined,
        naver_origin: naver_origin !== undefined ? naver_origin : undefined,
        naver_material: naver_material !== undefined ? naver_material : undefined,
        naver_color: naver_color !== undefined ? naver_color : undefined,
        naver_size: naver_size !== undefined ? naver_size : undefined,
        naver_weight: naver_weight !== undefined ? naver_weight : undefined,
        naver_care_instructions: naver_care_instructions !== undefined ? naver_care_instructions : undefined,
        naver_warranty: naver_warranty !== undefined ? naver_warranty : undefined,
        naver_certification: naver_certification !== undefined ? naver_certification : undefined,
        naver_tax_type: naver_tax_type !== undefined ? naver_tax_type : undefined,
        naver_gift_wrapping: naver_gift_wrapping !== undefined ? naver_gift_wrapping : undefined,
        naver_as_info: naver_as_info !== undefined ? naver_as_info : undefined,
        naver_delivery_info: naver_delivery_info !== undefined ? naver_delivery_info : undefined,
        naver_exchange_info: naver_exchange_info !== undefined ? naver_exchange_info : undefined,
        naver_refund_info: naver_refund_info !== undefined ? naver_refund_info : undefined,
        naver_min_order: naver_min_order !== undefined ? naver_min_order : undefined,
        naver_max_order: naver_max_order !== undefined ? naver_max_order : undefined,
        naver_adult_only: naver_adult_only !== undefined ? naver_adult_only : undefined,
        naver_parallel_import: naver_parallel_import !== undefined ? naver_parallel_import : undefined,
        naver_custom_option_1: naver_custom_option_1 !== undefined ? naver_custom_option_1 : undefined,
        naver_custom_option_2: naver_custom_option_2 !== undefined ? naver_custom_option_2 : undefined,
        naver_custom_option_3: naver_custom_option_3 !== undefined ? naver_custom_option_3 : undefined,
        naver_meta_tags: naver_meta_tags !== undefined ? naver_meta_tags : undefined,
      },
      include: {
        supplier: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log('✅ 상품 수정 완료:', product.name);

    return NextResponse.json({
      success: true,
      product,
      message: '상품이 수정되었습니다',
    });
  } catch (error: any) {
    console.error('Product PUT error:', error);
    return NextResponse.json(
      { success: false, error: '상품 수정 실패: ' + error.message },
      { status: 500 }
    );
  }
}
