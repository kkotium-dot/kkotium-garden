// src/app/api/products/export/naver/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const products = await prisma.product.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    // CSV 헤더
    const headers = [
      '상품명',
      '판매가',
      'SKU',
      '재고',
      '카테고리',
      '브랜드',
      '도매가',
      '마진율',
      '키워드',
    ];

    // CSV 데이터 생성
    const rows = products.map(p => [
      `"${p.name}"`,
      p.salePrice,
      p.sku,
      100, // 기본 재고
      `"${p.category || '꽃'}"`,
      '"꽃티움"',
      p.supplierPrice,
      `${p.margin.toFixed(2)}%`,
      `"${Array.isArray(p.keywords) ? (p.keywords as string[]).join(',') : ''}"`,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="naver_products_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export products' },
      { status: 500 }
    );
  }
}
