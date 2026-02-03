// src/app/api/products/new/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      // 기존 필드
      name,
      category,
      supplierId,
      supplierPrice,
      salePrice,
      shippingCost,
      keywords,
      description,
      images,
      options,

      // 이미지 필드
      mainImage,
      imageAltTexts,
      imageCount,

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

    console.log('📦 상품 등록 요청:', {
      name,
      supplierId: supplierId || '없음 (자동 할당)',
      imageCount,
      mainImage: mainImage ? '있음' : '없음',
      imagesLength: images?.length || 0,
    });

    // 필수 항목 검증
    if (!name || !salePrice) {
      return NextResponse.json(
        { success: false, error: '상품명과 판매가는 필수입니다.' },
        { status: 400 }
      );
    }

    // 🔥 Supplier 찾기 또는 자동 생성
    let supplier = null;

    if (supplierId) {
      // supplierId가 제공된 경우 찾기
      supplier = await prisma.supplier.findUnique({
        where: { id: supplierId }
      }).catch(() => null);

      if (!supplier) {
        supplier = await prisma.supplier.findUnique({
          where: { code: supplierId }
        }).catch(() => null);
      }

      if (!supplier) {
        return NextResponse.json(
          { 
            success: false, 
            error: `공급처 "${supplierId}"를 찾을 수 없습니다.` 
          },
          { status: 404 }
        );
      }
    } else {
      // supplierId가 없으면 첫 번째 공급처 찾기
      supplier = await prisma.supplier.findFirst({
        orderBy: { createdAt: 'asc' }
      });

      // 🆕 공급처가 하나도 없으면 자동 생성!
      if (!supplier) {
        console.log('⚠️ 공급처가 없음 → 기본 공급처 자동 생성');

        supplier = await prisma.supplier.create({
          data: {
            code: 'DEFAULT',
            name: '기본 공급처',
            contact: '010-0000-0000',
            // ✅ Supplier 스키마에 맞춤 (email 제거)
          }
        });

        console.log('✅ 기본 공급처 생성 완료:', supplier.id, supplier.name);
      } else {
        console.log('📌 기본 공급처 자동 할당:', supplier.name, supplier.id);
      }
    }

    // 첫 번째 사용자 조회 또는 생성
    let firstUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    // 🆕 사용자도 없으면 자동 생성!
    if (!firstUser) {
      console.log('⚠️ 사용자가 없음 → 기본 사용자 자동 생성');

      firstUser = await prisma.user.create({
        data: {
          email: 'admin@kkotium.com',
          name: '관리자',
          // User 모델의 필수 필드에 맞춰 조정
        }
      });

      console.log('✅ 기본 사용자 생성 완료:', firstUser.id);
    }

    // SKU 자동 생성
    const timestamp = Date.now().toString().slice(-8);
    const sku = `KG-${timestamp}`;

    // 마진 계산
    const parsedSalePrice = parseInt(salePrice) || 0;
    const parsedSupplierPrice = parseInt(supplierPrice) || 0;
    const shippingFee = parseInt(shippingCost || '3000');
    const platformFee = Math.round(parsedSalePrice * 0.058);
    const totalCost = parsedSupplierPrice + shippingFee;
    const profit = parsedSalePrice - totalCost - platformFee;
    const margin = parsedSalePrice > 0 
      ? Math.round((profit / parsedSalePrice) * 100) 
      : 0;

    // 이미지 처리
    const processedMainImage = mainImage || (images && images[0]) || '';
    const processedImages = images || [];
    const processedImageAltTexts = imageAltTexts || [];
    const processedImageCount = imageCount || processedImages.length || 0;

    console.log('📸 이미지 처리 결과:', {
      mainImage: processedMainImage ? '설정됨' : '없음',
      imagesCount: processedImages.length,
      imageCount: processedImageCount,
      altTextsCount: processedImageAltTexts.length,
    });

    // 상품 등록
    const product = await prisma.product.create({
      data: {
        name,
        sku,
        category: category || '',
        supplierId: supplier.id,
        supplierPrice: parsedSupplierPrice,
        salePrice: parsedSalePrice,
        shippingFee,
        margin,
        keywords: keywords || [],
        description: description || '',
        status: 'DRAFT',
        userId: firstUser.id,

        // 이미지 필드
        mainImage: processedMainImage,
        images: processedImages,
        imageAltTexts: processedImageAltTexts,
        imageCount: processedImageCount,

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

    console.log('✅ 상품 등록 성공:', {
      id: product.id,
      name: product.name,
      sku: product.sku,
      imageCount: product.imageCount,
      supplier: product.supplier.name,
    });

    return NextResponse.json({
      success: true,
      product,
      message: `✅ 상품이 등록되었습니다! (이미지 ${product.imageCount}개, 공급처: ${product.supplier.name})`,
    });
  } catch (error: any) {
    console.error('❌ Product creation error:', error);
    return NextResponse.json(
      { success: false, error: '상품 등록 실패: ' + error.message },
      { status: 500 }
    );
  }
}
