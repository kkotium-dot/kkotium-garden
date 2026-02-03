// src/app/api/naver-seo/bulk-edit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productIds, updates } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'productIds는 필수이며 배열이어야 합니다.' },
        { status: 400 }
      );
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: '수정할 항목이 없습니다.' },
        { status: 400 }
      );
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚡ 일괄 수정 API 호출');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('상품 개수:', productIds.length);
    console.log('상품 IDs:', productIds);
    console.log('업데이트 항목:', updates);

    // 업데이트할 데이터 준비
    const updateData: any = {};

    if (updates.naver_brand) {
      updateData.naver_brand = updates.naver_brand;
    }
    if (updates.naver_origin) {
      updateData.naver_origin = updates.naver_origin;
    }
    if (updates.naver_material) {
      updateData.naver_material = updates.naver_material;
    }
    if (updates.naver_care_instructions) {
      updateData.naver_care_instructions = updates.naver_care_instructions;
    }

    // Prisma updateMany 실행
    const result = await prisma.product.updateMany({
      where: {
        id: {
          in: productIds,
        },
      },
      data: updateData,
    });

    console.log('✅ 업데이트 완료:', result.count, '개 상품');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      message: `${result.count}개 상품이 성공적으로 수정되었습니다.`,
    });

  } catch (error) {
    console.error('❌ 일괄 수정 API 에러:', error);

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 에러가 발생했습니다.',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
