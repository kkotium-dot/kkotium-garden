// ~/Downloads/naver_seo_products_perfect.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateNaverSeoScore, getSeoSuggestions } from '@/lib/seo';

export async function GET(request: Request) {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 네이버 SEO Products API 호출됨');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search') || '';

    console.log('🔍 검색 조건:');
    console.log('   - Filter:', filter);
    console.log('   - Search:', search || '(없음)');

    // ✅ schema.prisma에 실제 존재하는 필드만 선택
    console.log('\n💾 Product 테이블 조회 시작...');

    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        mainImage: true,           // ✅ 존재
        salePrice: true,           // ✅ 존재
        naver_title: true,
        naver_keywords: true,
        naver_description: true,
        naver_brand: true,
        naver_origin: true,
        naver_material: true,
        naver_care_instructions: true,
        images: true,              // ✅ images 배열
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('✅ 상품 조회 완료!');
    console.log('   - 총 상품 수:', products.length);

    // SEO 점수 계산 및 개선사항 추가 (기존 함수 사용!)
    console.log('\n📊 SEO 점수 계산 중...');

    const productsWithSeo = products.map((product) => {
      const seoScore = calculateNaverSeoScore(product);
      const suggestions = getSeoSuggestions(product);

      // 키워드 개수 계산
      const keywordCount = product.naver_keywords
        ? product.naver_keywords.split(',').filter(k => k.trim()).length
        : 0;

      // 이미지 개수 계산 (images는 String[] 타입)
      const imageCount = Array.isArray(product.images) ? product.images.length : 0;

      console.log(`   - ${product.name}: ${seoScore}점 (키워드: ${keywordCount}, 이미지: ${imageCount})`);

      return {
        id: product.id,
        name: product.name,
        mainImage: product.mainImage,
        salePrice: product.salePrice,
        naver_title: product.naver_title,
        naver_keywords: product.naver_keywords,
        naver_description: product.naver_description,
        naver_brand: product.naver_brand,
        naver_origin: product.naver_origin,
        naver_material: product.naver_material,
        naver_care_instructions: product.naver_care_instructions,
        seoScore,
        suggestions,
        needsImprovement: seoScore < 100,
        imageCount,  // 테이블에서 표시용
        keywordCount,  // 테이블에서 표시용
      };
    });

    // 필터링
    let filtered = productsWithSeo;

    if (filter === 'perfect') {
      filtered = filtered.filter((p) => p.seoScore === 100);
    } else if (filter === 'good') {
      filtered = filtered.filter((p) => p.seoScore >= 80 && p.seoScore < 100);
    } else if (filter === 'fair') {
      filtered = filtered.filter((p) => p.seoScore >= 70 && p.seoScore < 80);
    } else if (filter === 'poor') {
      filtered = filtered.filter((p) => p.seoScore < 70);
    }

    // 검색
    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.naver_title && p.naver_title.toLowerCase().includes(search.toLowerCase()))
      );
    }

    console.log('\n✅ 필터링 완료!');
    console.log('   - 필터 후 상품 수:', filtered.length);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return NextResponse.json({
      success: true,
      products: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error('\n❌ SEO Products API Error:');
    console.error(error);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
