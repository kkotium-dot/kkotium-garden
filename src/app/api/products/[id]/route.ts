import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 개별 상품 조회
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const productId = parseInt(params.id);
    
    if (isNaN(productId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 상품 ID입니다' },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: '상품을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json(
      { success: false, error: '상품 조회 실패', details: String(error) },
      { status: 500 }
    );
  }
}

// 상품 수정
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const productId = parseInt(params.id);
    
    if (isNaN(productId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 상품 ID입니다' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
        data:{
        name: body.name,
        price: parseFloat(body.price),
        originalPrice: parseFloat(body.originalPrice),
        category: body.category,
        supplier: body.supplier,
        stockStatus: body.stockStatus,
      },
    });

    return NextResponse.json({
      success: true,
      product: updatedProduct,
    });
  } catch (error) {
    console.error('PATCH Error:', error);
    return NextResponse.json(
      { success: false, error: '상품 수정 실패', details: String(error) },
      { status: 500 }
    );
  }
}

// 상품 삭제
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const productId = parseInt(params.id);
    
    if (isNaN(productId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 상품 ID입니다' },
        { status: 400 }
      );
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({
      success: true,
      message: '상품이 삭제되었습니다',
    });
  } catch (error) {
    console.error('DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: '상품 삭제 실패', details: String(error) },
      { status: 500 }
    );
  }
}
