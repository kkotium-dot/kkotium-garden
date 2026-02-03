import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';  // ✅ named import로 수정
import { calculateNaverSeoScore } from '@/lib/seo';

// GET /api/products - 상품 목록 조회 (쿼리 파라미터 지원)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // 🎯 쿼리 파라미터 추출
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const seoScore = searchParams.get('seoScore');

    // Prisma where 조건 동적 생성
    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (minPrice || maxPrice) {
      where.selling_price = {};
      if (minPrice) {
        where.selling_price.gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        where.selling_price.lte = parseFloat(maxPrice);
      }
    }

    // DB 쿼리 실행
    const products = await prisma.product.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        mainImage: true,
        selling_price: true,
        supply_price: true,
        shipping_cost: true,
        category: true,
        status: true,
        sku: true,
        created_at: true,
        updated_at: true,
        // 네이버 SEO 필드
        naver_title: true,
        naver_keywords: true,
        naver_description: true,
        naver_brand: true,
        naver_manufacturer: true,
        naver_origin: true,
        naver_material: true,
        naver_color: true,
        naver_size: true,
        naver_care_instructions: true,
        naver_as_info: true,
        naver_warranty: true,
        naver_features: true,
        naver_tags: true,
      },
    });

    // 🎯 SEO 점수 필터 (클라이언트 측 - DB 계산 불가)
    let filteredProducts = products;

    if (seoScore) {
      filteredProducts = products.filter((p) => {
        const score = calculateNaverSeoScore(p);

        if (seoScore === '100') {
          return score === 100;
        } else if (seoScore === '80-99') {
          return score >= 80 && score < 100;
        } else if (seoScore === '70-79') {
          return score >= 70 && score < 80;
        } else if (seoScore === '0-69') {
          return score >= 0 && score < 70;
        }
        return true;
      });
    }

    return NextResponse.json({
      success: true,
      products: filteredProducts,
      count: filteredProducts.length,
      filters: {
        category,
        status,
        minPrice,
        maxPrice,
        seoScore,
      },
    });
  } catch (error) {
    console.error('❌ 상품 목록 조회 실패:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '상품 목록을 불러오는데 실패했습니다',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/products - 상품 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const product = await prisma.product.create({
      data: body,
    });

    return NextResponse.json({
      success: true,
      product,
      message: '상품이 등록되었습니다',
    });
  } catch (error) {
    console.error('❌ 상품 등록 실패:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '상품 등록에 실패했습니다',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
