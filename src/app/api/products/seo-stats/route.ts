import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateNaverSeoScore } from '@/lib/seo';

export async function GET(request: NextRequest) {
  try {
    // 전체 상품 조회 (네이버 SEO 필드 포함)
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        naver_title: true,
        naver_keywords: true,
        naver_description: true,
        naver_brand: true,
        naver_origin: true,
        naver_material: true,
        naver_care_instructions: true,
      },
    });

    // 각 상품의 SEO 점수 계산
    const productsWithScores = products.map(product => ({
      ...product,
      seoScore: calculateNaverSeoScore(product),
    }));

    // 통계 계산
    const totalProducts = productsWithScores.length;
    const averageScore = totalProducts > 0
      ? Math.round(productsWithScores.reduce((sum, p) => sum + p.seoScore, 0) / totalProducts)
      : 0;

    // 점수별 분포
    const perfect = productsWithScores.filter(p => p.seoScore === 100).length;
    const good = productsWithScores.filter(p => p.seoScore >= 80 && p.seoScore < 100).length;
    const fair = productsWithScores.filter(p => p.seoScore >= 70 && p.seoScore < 80).length;
    const poor = productsWithScores.filter(p => p.seoScore < 70).length;

    // 개선 필요 상품 (설명 50자 미만)
    const needsImprovement = productsWithScores
      .filter(p => !p.naver_description || p.naver_description.length < 50)
      .sort((a, b) => a.seoScore - b.seoScore)
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        seoScore: p.seoScore,
        descriptionLength: p.naver_description?.length || 0,
        missingFields: [
          !p.naver_title || p.naver_title.length < 10 ? '제목' : null,
          !p.naver_keywords || p.naver_keywords.split(',').filter(k => k.trim()).length < 3 ? '키워드' : null,
          !p.naver_description || p.naver_description.length < 50 ? '설명' : null,
          !p.naver_brand ? '브랜드' : null,
        ].filter(Boolean),
      }));

    const stats = {
      totalProducts,
      averageScore,
      distribution: {
        perfect,
        good,
        fair,
        poor,
      },
      percentages: {
        perfect: totalProducts > 0 ? Math.round((perfect / totalProducts) * 100) : 0,
        good: totalProducts > 0 ? Math.round((good / totalProducts) * 100) : 0,
        fair: totalProducts > 0 ? Math.round((fair / totalProducts) * 100) : 0,
        poor: totalProducts > 0 ? Math.round((poor / totalProducts) * 100) : 0,
      },
      needsImprovement,
    };

    console.log('✅ SEO 통계 조회 성공:', {
      total: totalProducts,
      average: averageScore,
    });

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('❌ SEO Stats error:', error);
    return NextResponse.json(
      { success: false, error: 'SEO 통계 조회 실패: ' + error.message },
      { status: 500 }
    );
  }
}
