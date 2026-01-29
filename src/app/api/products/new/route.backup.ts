import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      category,
      supplierId,
      supplierPrice,
      salePrice,
      shippingCost,
      keywords,
      description,
      images,
      options,
    } = body;

    // 필수 항목 검증
    if (!name || !supplierId || !supplierPrice || !salePrice) {
      return NextResponse.json(
        { success: false, error: '필수 항목을 입력해주세요' },
        { status: 400 }
      );
    }

    // SKU 자동 생성
    const timestamp = Date.now().toString().slice(-8);
    const sku = `KG-${timestamp}`;

    // 마진 계산
    const platformFee = Math.round(salePrice * 0.058);
    const totalCost = supplierPrice + (shippingCost || 3000);
    const profit = salePrice - totalCost - platformFee;
    const margin = Math.round((profit / salePrice) * 100);

    // 상품 등록
    const product = await prisma.product.create({
      data: {
        name,
        sku,
        category: category || '',
        supplierId,
        supplierPrice: parseInt(supplierPrice),
        salePrice: parseInt(salePrice),
        shippingCost: parseInt(shippingCost || 3000),
        margin,
        keywords: keywords || [],
        description: description || '',
        images: images || [],
        options: options || [],
        status: 'DRAFT',
      },
      include: {
        supplier: true,
      },
    });

    return NextResponse.json({
      success: true,
      product,
      message: '상품이 등록되었습니다',
    });
  } catch (error: any) {
    console.error('Product creation error:', error);
    return NextResponse.json(
      { success: false, error: '상품 등록 실패: ' + error.message },
      { status: 500 }
    );
  }
}
