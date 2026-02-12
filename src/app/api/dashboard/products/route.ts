// src/app/api/dashboard/products/route.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 대시보드 상품 목록 API (완전 수정 - 카테고리 필터 추가)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 안전한 배열 변환
function ensureArray(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return value.split(',').map(v => v.trim()).filter(Boolean);
    }
  }
  return [];
}

// 안전한 문자열 변환
function ensureString(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 페이지네이션
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // 필터
    const status = searchParams.get('status');
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // 정렬
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    console.log('📊 필터 파라미터:', {
      status,
      minScore,
      maxScore,
      category,
      search,
      sortBy,
      sortOrder,
    });

    // WHERE 절 구성
    const where: any = {};

    if (status) {
      where.status = status;
      console.log('✅ 상태 필터:', status);
    }

    if (category) {
      where.category = {
        contains: category,
        mode: 'insensitive',
      };
      console.log('✅ 카테고리 필터:', category);
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      console.log('✅ 검색 필터:', search);
    }

    if (minScore || maxScore) {
      where.aiScore = {};
      if (minScore) where.aiScore.gte = parseInt(minScore);
      if (maxScore) where.aiScore.lte = parseInt(maxScore);
      console.log('✅ 점수 필터:', where.aiScore);
    }

    console.log('🔍 최종 WHERE 절:', JSON.stringify(where, null, 2));

    // 데이터 조회
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          mainImage: true,
          salePrice: true,
          supplierPrice: true,
          aiScore: true,
          status: true,
          category: true,
          naverCategoryCode: true,
          originCode: true,
          naver_keywords: true,
          additionalImages: true,
          aiGeneratedTags: true,
          kkottiNaverScore: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.product.count({ where }),
    ]);

    console.log(`✅ 조회 결과: ${products.length}개 / 총 ${total}개`);

    // 안전한 데이터 변환
    const productsWithMargin = products.map(p => {
      // DB 스키마 기준: additionalImages는 Json, naver_keywords는 String
      const images = ensureArray(p.additionalImages);
      const keywords = p.naver_keywords 
        ? p.naver_keywords.split(',').map(k => k.trim()).filter(Boolean)
        : [];
      const tags = ensureArray(p.aiGeneratedTags);

      return {
        ...p,
        margin: p.salePrice > 0 
          ? Math.round(((p.salePrice - p.supplierPrice) / p.salePrice) * 100)
          : 0,
        imageCount: images.length + (p.mainImage ? 1 : 0),
        keywordCount: keywords.length,
        tagsCount: tags.length,
        isReady: (p.aiScore || 0) >= 60 && p.status === 'READY',
        keywords: keywords,
        images: images,
        tags: tags,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        products: productsWithMargin,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + limit < total,
        },
      },
    });
  } catch (error) {
    console.error('❌ 상품 목록 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    );
  }
}
