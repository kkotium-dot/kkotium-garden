import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 검색 및 필터 파라미터
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';

    // 필터 조건 구성
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (minPrice) {
      where.salePrice = { ...where.salePrice, gte: parseInt(minPrice) };
    }

    if (maxPrice) {
      where.salePrice = { ...where.salePrice, lte: parseInt(maxPrice) };
    }

    // 상품 조회
    const products = await prisma.product.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      products,
      count: products.length,
    });
  } catch (error: any) {
    console.error('Products GET error:', error);
    return NextResponse.json(
      { success: false, error: '상품 목록 조회 실패: ' + error.message },
      { status: 500 }
    );
  }
}
