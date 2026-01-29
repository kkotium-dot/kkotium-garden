import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return NextResponse.json({ success: false, error: '상품 없음' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    const body = await request.json();

    // 허용된 필드만 업데이트
    const updateData: Prisma.ProductUpdateInput = {};

    const allowedFields = [
      'name', 'sku', 'category', 'supplierPrice', 'salePrice', 'margin', 'status',
      'mainImage', 'description', 'keywords', 'hasOptions', 'optionName', 'optionValues',
      // Naver SEO 필드들
      'naver_title', 'naver_keywords', 'seo_description', 'naverCategoryCode',
      'originCode', 'taxType', 'minorPurchaseAge', 'certifications', 'imageUrls',
      'detailAttributes', 'naverOptions', 'shippingTemplate', 'bundleAvailable',
      'installMonths', 'plusProductType', 'purchaseReview', 'naverSearchKeywords'
    ];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field as keyof Prisma.ProductUpdateInput] = body[field];
      }
    });

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Naver SEO 포함 수정 완료',
      product: updatedProduct 
    });

  } catch (error: any) {
    console.error('수정 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;

    await prisma.product.delete({
      where: { id: productId }
    });

    return NextResponse.json({ success: true, message: '삭제 완료' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}