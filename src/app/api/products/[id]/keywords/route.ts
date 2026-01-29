// src/app/api/products/[id]/keywords/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const prompt = `
다음 상품의 네이버 스마트스토어 키워드를 추출해주세요:
상품명: ${product.name}
카테고리: ${product.category || '미분류'}
가격: ${product.salePrice}원
설명: ${product.description || ''}

20개의 연관 키워드를 추출해주세요.
`;

    // AI API 호출 (추후 구현)
    const keywords = [
      product.name,
      product.category || '꽃',
      '선물',
      '화환',
      '꽃다발'
    ];

    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: { keywords },
    });

    return NextResponse.json({
      success: true,
      keywords,
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Keyword extraction error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to extract keywords' },
      { status: 500 }
    );
  }
}
