// src/app/api/crawler/naver-auto-fill/route.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 네이버 자동 채움 API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { NextRequest, NextResponse } from 'next/server';
import { scrapeProduct } from '@/lib/crawler/scraper';
import { autoMapProduct, optimizeProductName } from '@/lib/crawler/auto-mapper';
import { evaluateKkottiNaver } from '@/lib/kkotti-naver/evaluate';
import type { NaverAutoFillRequest, NaverAutoFillResponse } from '@/types/crawler';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/crawler/naver-auto-fill
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function POST(request: NextRequest) {
  const warnings: string[] = [];

  try {
    const body: NaverAutoFillRequest = await request.json();

    // 1. URL 유효성 검사
    if (!body.url || !isValidURL(body.url)) {
      return NextResponse.json<NaverAutoFillResponse>(
        { success: false, error: '올바른 URL을 입력하세요.' },
        { status: 400 }
      );
    }

    console.log('🌸 크롤링 시작:', body.url);

    // 2. 도매 사이트 크롤링
    const crawled = await scrapeProduct(body.url);

    if (crawled.images.length === 0) {
      warnings.push('이미지를 찾을 수 없습니다. 수동으로 추가해주세요.');
    }

    if (!crawled.description || crawled.description.length < 50) {
      warnings.push('상세설명이 부족합니다. 추가 작성을 권장합니다.');
    }

    console.log('✅ 크롤링 완료:', crawled.title);

    // 3. AI 자동 매핑
    const mapped = await autoMapProduct(crawled);

    console.log('✅ 자동 매핑 완료:', {
      category: mapped.category.fullPath,
      origin: mapped.origin.region,
      keywords: mapped.keywords.primary.length,
    });

    // 4. 가격 계산
    const supplierPrice = body.supplierPrice || crawled.price;
    const targetMargin = body.targetMargin || 30;
    const salePrice = Math.ceil(supplierPrice / (1 - targetMargin / 100));
    const actualMargin = ((salePrice - supplierPrice) / salePrice) * 100;

    // 5. 상품 데이터 생성
    const productData = {
      name: optimizeProductName(crawled.title),
      salePrice,
      supplierPrice,
      margin: actualMargin,
      description: crawled.description || '',
      mainImage: crawled.images[0] || '',
      images: crawled.images.slice(0, 5),
      brand: crawled.brand || '꽃틔움',
      category: mapped.category.fullPath,
      naverCategoryCode: mapped.category.code,
      originCode: mapped.origin.code,
      keywords: mapped.keywords.primary,
      naverExcelData: mapped.naverExcelData,
    };

    // 6. 꼬띠 평가 (옵션)
    let evaluation = undefined;
    if (body.options?.autoEvaluate !== false) {
      evaluation = evaluateKkottiNaver({
        name: productData.name,
        salePrice: productData.salePrice,
        supplierPrice: productData.supplierPrice,
        mainImage: productData.mainImage,
        images: productData.images,
        brand: productData.brand,
        keywords: productData.keywords,
        description: productData.description,
      });

      console.log('✅ 평가 완료:', evaluation.combinedScore, '점');
    }

    // 7. 응답
    const response: NaverAutoFillResponse = {
      success: true,
      data: {
        crawled,
        mapped,
        product: productData,
        evaluation,
        readyToCreate: evaluation ? evaluation.combinedScore >= 60 : true,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ 자동 채움 오류:', error);

    return NextResponse.json<NaverAutoFillResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        warnings,
      },
      { status: 500 }
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 유틸리티
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
}
