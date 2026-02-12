// src/app/api/kkotti-naver/evaluate/route.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 꼬띠 + 네이버 통합 평가 API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { evaluateKkottiNaver } from '@/lib/kkotti-naver/evaluate';
import type { EvaluateRequest, EvaluateResponse } from '@/types/naver';

const prisma = new PrismaClient();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/kkotti-naver/evaluate
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function POST(request: NextRequest) {
  try {
    const body: EvaluateRequest = await request.json();

    // 1. 상품 데이터 가져오기
    let productData;

    if (body.productId) {
      // 기존 상품 평가
      const product = await prisma.product.findUnique({
        where: { id: body.productId },
      });

      if (!product) {
        return NextResponse.json<EvaluateResponse>(
          { success: false, error: '상품을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      productData = {
        name: product.name,
        description: product.description || undefined,
        salePrice: product.salePrice,
        supplierPrice: product.supplierPrice,
        mainImage: product.mainImage || undefined,
        images: product.images || [],
        brand: product.brand || undefined,
        category: product.category || undefined,
        keywords: product.keywords ? (product.keywords as string[]) : undefined,
        stock: 0, // TODO: stock 필드 추가 필요
        hasOptions: product.hasOptions,
        shippingFee: product.shippingFee,
      };
    } else if (body.product) {
      // 신규 상품 평가
      productData = body.product;
    } else {
      return NextResponse.json<EvaluateResponse>(
        { success: false, error: 'productId 또는 product 데이터가 필요합니다.' },
        { status: 400 }
      );
    }

    // 2. 통합 평가 실행
    const evaluation = evaluateKkottiNaver(productData);

    // 3. DB 저장 (productId가 있는 경우)
    if (body.productId) {
      await prisma.product.update({
        where: { id: body.productId },
        data: {
          kkottiNaverScore: evaluation as any, // JSONB
          aiScore: evaluation.kkotti.totalScore,
        },
      });
    }

    // 4. 응답
    return NextResponse.json<EvaluateResponse>({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    console.error('❌ 평가 API 오류:', error);
    return NextResponse.json<EvaluateResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/kkotti-naver/evaluate?productId=xxx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json<EvaluateResponse>(
        { success: false, error: 'productId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 1. 상품 조회
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        kkottiNaverScore: true,
        aiScore: true,
        updatedAt: true,
      },
    });

    if (!product) {
      return NextResponse.json<EvaluateResponse>(
        { success: false, error: '상품을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 2. 기존 평가 결과 반환
    if (product.kkottiNaverScore) {
      return NextResponse.json<EvaluateResponse>({
        success: true,
        data: product.kkottiNaverScore as any,
      });
    }

    // 3. 평가 결과가 없으면 자동 평가 실행
    return POST(request);
  } catch (error) {
    console.error('❌ 평가 조회 오류:', error);
    return NextResponse.json<EvaluateResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    );
  }
}
