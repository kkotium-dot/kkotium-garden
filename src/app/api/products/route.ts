import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 상품 목록 조회 (GET)
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      products,
      count: products.length,
    });
  } catch (error: any) {
    console.error('❌ GET Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '상품 조회 실패',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// 상품 등록 (POST)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, price, originalPrice, category, vendorName } = body;

    // 유효성 검사
    if (!name || !price || !originalPrice) {
      return NextResponse.json(
        { 
          success: false, 
          error: '필수 항목을 입력해주세요' 
        },
        { status: 400 }
      );
    }

    // 상품 생성
    const product = await prisma.product.create({
      data: {
        name,
        price: parseInt(price),
        originalPrice: parseInt(originalPrice),
        category: category || null,
        vendorName: vendorName || null,
        status: 'todo',
      },
    });

    return NextResponse.json({
      success: true,
      product,
      message: '상품이 등록되었습니다',
    });
  } catch (error: any) {
    console.error('❌ POST Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '상품 등록 실패',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// 상품 수정 (PUT)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '상품 ID가 필요합니다' },
        { status: 400 }
      );
    }

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data,
    });

    return NextResponse.json({
      success: true,
      product,
      message: '상품이 수정되었습니다',
    });
  } catch (error: any) {
    console.error('❌ PUT Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '상품 수정 실패',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// 상품 삭제 (DELETE)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '상품 ID가 필요합니다' },
        { status: 400 }
      );
    }

    await prisma.product.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({
      success: true,
      message: '상품이 삭제되었습니다',
    });
  } catch (error: any) {
    console.error('❌ DELETE Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '상품 삭제 실패',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
