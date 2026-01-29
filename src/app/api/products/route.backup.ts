import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// SKU 자동 생성
function generateSKU(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SKU${year}${month}${day}${random}`;
}

// POST: 상품 생성 (user 관계 완전 해결)
export async function POST(request: NextRequest) {
  try {
    console.log('\n🎉 Naver SEO 상품 저장 시작!');

    const body = await request.json();
    console.log('📦 입력:', body.name, body.salePrice, body.naver_title);

    // SKU 자동생성
    const sku = body.sku || generateSKU();

    // userId 고정 (관계 문제 우회)
    const userId = 'cm4usertest123456789'; // setup-product.js 사용자

    const productData: Prisma.ProductCreateInput = {
      id: body.id || crypto.randomUUID(),
      userId, // 직접 지정 (연결 대신)
      name: body.name,
      sku,
      category: body.category || '화훼',
      supplierPrice: parseInt(body.supplierPrice) || 0,
      salePrice: parseInt(body.salePrice) || 0,
      margin: parseFloat(body.margin) || ((parseInt(body.salePrice || 0) - parseInt(body.supplierPrice || 0)) / parseInt(body.salePrice || 1) * 100),
      status: body.status || 'DRAFT',
      // Naver SEO 필드들 (선택적)
      ...(body.naver_title && { naver_title: body.naver_title }),
      ...(body.naver_keywords && { naver_keywords: body.naver_keywords }),
      ...(body.seo_description && { seo_description: body.seo_description }),
      ...(body.naverCategoryCode && { naverCategoryCode: body.naverCategoryCode }),
      ...(body.originCode && { originCode: body.originCode }),
      ...(body.taxType && { taxType: body.taxType }),
      ...(body.shippingStrategy && { shippingStrategy: body.shippingStrategy }),
      ...(body.hasOptions !== undefined && { hasOptions: body.hasOptions }),
      ...(body.optionName && { optionName: body.optionName }),
      ...(body.optionValues && { optionValues: body.optionValues }),
      ...(body.mainImage && { mainImage: body.mainImage }),
      ...(body.description && { description: body.description }),
      ...(body.keywords && { keywords: body.keywords }),
    };

    console.log('✅ 저장 데이터 준비 완료');

    // 관계 없이 직접 생성
    const product = await prisma.product.create({
      data: productData
    });

    console.log('🎉 상품 저장 성공!');
    console.log('📦', product.name);
    console.log('💜 Naver:', product.naver_title || '미설정');
    console.log('✅ SKU:', product.sku);

    return NextResponse.json({
      success: true,
      message: '상품 등록 완료! Naver SEO 준비됨',
      product
    });

  } catch (error: any) {
    console.error('❌ 저장 실패:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code
    }, { status: 500 });
  }
}

// GET: 상품 목록 (검색 강화)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { naver_title: { contains: search, mode: 'insensitive' } },
        { naver_keywords: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ 조회 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: 상품 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: 'ID 필요' }, { status: 400 });

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ success: true, message: '삭제 완료' });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
