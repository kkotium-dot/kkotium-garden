// src/app/api/products/[id]/keywords/route.ts
// Gemini AI 기반 키워드 + 제목 + 설명 자동 생성
// mode: 'keywords' | 'titles' | 'description' | 'all'
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  generateNaverKeywords,
  generateProductTitle,
  generateProductDescription,
} from '@/lib/gemini';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const mode: string = body.mode ?? 'all';
    const isTempProduct = params.id === 'temp';

    let productName: string;
    let productCategory: string | null = null;
    let productDescription: string | null = null;

    if (isTempProduct) {
      productName = body.name || '상품';
      productCategory = body.category || null;
      productDescription = body.description || null;
    } else {
      const product = await prisma.product.findUnique({
        where: { id: params.id },
      });
      if (!product) {
        return NextResponse.json(
          { success: false, error: '상품을 찾을 수 없어요' },
          { status: 404 }
        );
      }
      productName = product.name;
      productCategory = product.category ?? null;
      productDescription = (product as any).description ?? null;
    }

    const result: Record<string, any> = {};

    if (mode === 'keywords' || mode === 'all') {
      result.keywords = await generateNaverKeywords(
        productName,
        productCategory ?? undefined
      );
    }
    if (mode === 'titles' || mode === 'all') {
      const kw = result.keywords ?? [productName];
      result.titles = await generateProductTitle(productName, kw);
    }
    if (mode === 'description' || mode === 'all') {
      const kw = result.keywords ?? [productName];
      result.description = await generateProductDescription(
        productName,
        kw,
        productDescription ? [productDescription] : undefined
      );
    }

    // DB 저장 (실제 상품만)
    if (!isTempProduct && result.keywords) {
      await prisma.product.update({
        where: { id: params.id },
        data: { keywords: result.keywords },
      });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[keywords API] 에러:', error);
    return NextResponse.json(
      { success: false, error: error?.message ?? '생성 실패' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
