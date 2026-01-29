import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      // 기존 필드
      name,
      category,
      supplierId, // id 또는 code 둘 다 가능!
      supplierPrice,
      salePrice,
      shippingCost,
      keywords,
      description,
      images,
      options,

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

    // 필수 항목 검증
    if (!name || !supplierId || !supplierPrice || !salePrice) {
      return NextResponse.json(
        { success: false, error: '필수 항목을 입력해주세요' },
        { status: 400 }
      );
    }

    // 🔥 1. Supplier 찾기 (id 또는 code 둘 다 지원)
    let supplier = null;

    // 먼저 id로 검색 시도
    supplier = await prisma.supplier.findUnique({
      where: { id: supplierId }
    }).catch(() => null);

    // id로 못 찾으면 code로 검색
    if (!supplier) {
      supplier = await prisma.supplier.findUnique({
        where: { code: supplierId }
      }).catch(() => null);
    }

    if (!supplier) {
      return NextResponse.json(
        { 
          success: false, 
          error: `공급처 "${supplierId}"를 찾을 수 없습니다. (ID 또는 코드를 확인하세요)` 
        },
        { status: 404 }
      );
    }

    // 첫 번째 사용자 조회
    const firstUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    if (!firstUser) {
      return NextResponse.json(
        { success: false, error: '시스템에 등록된 사용자가 없습니다.' },
        { status: 404 }
      );
    }

    // SKU 자동 생성
    const timestamp = Date.now().toString().slice(-8);
    const sku = `KG-${timestamp}`;

    // 마진 계산
    const shippingFee = parseInt(shippingCost || '3000');
    const platformFee = Math.round(salePrice * 0.058);
    const totalCost = parseInt(supplierPrice) + shippingFee;
    const profit = parseInt(salePrice) - totalCost - platformFee;
    const margin = Math.round((profit / parseInt(salePrice)) * 100);

    // 🔥 2. 상품 등록 (실제 Supplier ID 사용)
    const product = await prisma.product.create({
      data: {
        // 기존 필드
        name,
        sku,
        category: category || '',
        supplierId: supplier.id, // 🔥 실제 Supplier ID 사용!
        supplierPrice: parseInt(supplierPrice),
        salePrice: parseInt(salePrice),
        shippingFee,
        margin,
        keywords: keywords || [],
        description: description || '',
        images: images || [],
        status: 'DRAFT',
        userId: firstUser.id,

        // 네이버 SEO 필드 (27개)
        naver_title: naver_title || name,
        naver_keywords: naver_keywords || '',
        naver_description: naver_description || description || '',
        naver_brand: naver_brand || '',
        naver_manufacturer: naver_manufacturer || '',
        naver_origin: naver_origin || '국내',
        naver_material: naver_material || '',
        naver_color: naver_color || '',
        naver_size: naver_size || '',
        naver_weight: naver_weight || '',
        naver_care_instructions: naver_care_instructions || '',
        naver_warranty: naver_warranty || '',
        naver_certification: naver_certification || '',
        naver_tax_type: naver_tax_type || '과세',
        naver_gift_wrapping: naver_gift_wrapping || false,
        naver_as_info: naver_as_info || '',
        naver_delivery_info: naver_delivery_info || '',
        naver_exchange_info: naver_exchange_info || '',
        naver_refund_info: naver_refund_info || '',
        naver_min_order: naver_min_order || '1',
        naver_max_order: naver_max_order || '999',
        naver_adult_only: naver_adult_only || false,
        naver_parallel_import: naver_parallel_import || false,
        naver_custom_option_1: naver_custom_option_1 || '',
        naver_custom_option_2: naver_custom_option_2 || '',
        naver_custom_option_3: naver_custom_option_3 || '',
        naver_meta_tags: naver_meta_tags || '',
      },
      include: {
        supplier: true,
        user: true,
      },
    });

    return NextResponse.json({
      success: true,
      product,
      message: '✅ 상품이 등록되었습니다! (네이버 SEO 27개 필드 포함)',
    });
  } catch (error: any) {
    console.error('❌ Product creation error:', error);
    return NextResponse.json(
      { success: false, error: '상품 등록 실패: ' + error.message },
      { status: 500 }
    );
  }
}
