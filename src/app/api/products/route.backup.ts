import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 상품 등록 요청 수신');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`상품명: ${body.name}`);
    console.log(`SKU: ${body.sku || 'AUTO'}`);
    console.log(`판매가: ${body.salePrice}`);
    console.log(`이미지: ${body.images?.length || 0} 개`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1단계: 기본 Supplier 확인/생성
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let defaultSupplier = await prisma.supplier.findUnique({
      where: { code: 'DEFAULT' },
    });

    if (!defaultSupplier) {
      console.log('🔧 기본 공급사 생성 중...');
      defaultSupplier = await prisma.supplier.create({
        data: {
          name: '기본 공급사',
          code: 'DEFAULT',
          contact: '02-0000-0000',
          description: '시스템 기본 공급사',
        },
      });
      console.log('✅ 기본 공급사 생성 완료:', defaultSupplier.id);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2단계: 기본 User 확인/생성
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let defaultUser = await prisma.user.findUnique({
      where: { email: 'admin@kkotium.com' },
    });

    if (!defaultUser) {
      console.log('🔧 기본 사용자 생성 중...');
      defaultUser = await prisma.user.create({
        data: {
          email: 'admin@kkotium.com',
          name: '꽃틔움 관리자',
          level: 1,
          exp: 0,
        },
      });
      console.log('✅ 기본 사용자 생성 완료:', defaultUser.id);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3단계: SKU 생성 및 중복 체크
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const sku = body.sku || 'PROD-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const existingProduct = await prisma.product.findUnique({
      where: { sku },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: 'SKU가 이미 존재합니다.' },
        { status: 400 }
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4단계: 가격 계산
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const salePrice = parseFloat(body.salePrice);
    const supplierPrice = parseFloat(body.supplierPrice || '0');
    const margin = supplierPrice > 0
      ? ((salePrice - supplierPrice) / salePrice * 100)
      : 0;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 5단계: 상품 데이터 생성 (스키마 필드만 사용)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const productData = {
      // ✅ 필수 외래키
      supplierId: body.supplierId || defaultSupplier.id,
      userId: body.userId || defaultUser.id,

      // ✅ 필수 기본 정보
      name: body.name,
      sku,
      salePrice: Math.round(salePrice),
      supplierPrice: Math.round(supplierPrice),
      margin: parseFloat(margin.toFixed(2)),

      // ✅ 선택 필드 (스키마에 존재하는 것만)
      category: body.category || undefined,
      brand: body.brand || undefined,
      manufacturer: body.manufacturer || undefined,
      description: body.description || body.detailDescription || undefined,
      originCode: body.origin || body.originCode || undefined,

      // ✅ 배송 정보
      shippingFee: body.shippingFee ? parseInt(body.shippingFee) : undefined,

      // ✅ 이미지
      images: body.images || [],
      imageAltTexts: body.imageAltTexts || body.images?.map((_: any, idx: number) => `${body.name} ${idx + 1}`) || [],
      mainImage: body.mainImage || body.images?.[0] || undefined,
      imageCount: body.images?.length || 0,

      // ✅ SEO 필드
      seo_title: body.title || body.seo_title || undefined,
      seo_description: body.seo_description || undefined,
      seo_keywords: body.keywords || body.seo_keywords || undefined,

      // ✅ 네이버 필드
      naver_title: body.naver_title || undefined,
      naver_description: body.naver_description || undefined,
      naver_brand: body.naver_brand || body.brand || undefined,
      naver_manufacturer: body.naver_manufacturer || body.manufacturer || undefined,
      naver_origin: body.naver_origin || body.origin || undefined,
      naver_keywords: body.naver_keywords || body.keywords || undefined,

      // ✅ 상태
      status: 'DRAFT',
      productStatus: body.productStatus || '신상품',
    };

    // undefined 값 제거 (Prisma가 기본값 사용하도록)
    const cleanData = Object.fromEntries(
      Object.entries(productData).filter(([_, v]) => v !== undefined)
    );

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 6단계: DB 저장
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const product = await prisma.product.create({
      data: cleanData as any,
    });

    console.log('✅ 상품 등록 성공:', product.id);
    console.log(`   - SKU: ${product.sku}`);
    console.log(`   - 이미지: ${product.images?.length || 0}개`);
    console.log(`   - 마진: ${product.margin}%`);

    return NextResponse.json({
      success: true,
      product,
    });

  } catch (error: any) {
    console.error('❌ 상품 등록 실패:', error.message);
    console.error(error);
    return NextResponse.json(
      { error: error.message || '상품 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 필터 조건 구성
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');

    const where: any = {};

    // ✅ 빈 문자열이 아닐 때만 필터 적용
    if (category && category.trim() !== '') {
      where.category = category;
    }
    if (status && status.trim() !== '') {
      where.status = status;
    }
    if (minPrice) {
      where.salePrice = { ...where.salePrice, gte: parseInt(minPrice) };
    }
    if (maxPrice) {
      where.salePrice = { ...where.salePrice, lte: parseInt(maxPrice) };
    }

    console.log('🔍 상품 목록 조회 필터:', where);
    console.log('📄 페이지:', page, '| 개수:', limit);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: {
            select: {
              name: true,
              code: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    console.log(`✅ 상품 ${products.length}개 조회 (전체: ${total}개)`);

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('상품 목록 조회 실패:', error);
    return NextResponse.json(
      { error: '상품 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
