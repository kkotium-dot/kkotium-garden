import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 일괄 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '삭제할 상품 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    await prisma.product.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `${ids.length}개 상품이 삭제되었습니다.`,
    });
  } catch (error: any) {
    console.error('일괄 삭제 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 일괄 상태 변경
export async function PATCH(request: NextRequest) {
  try {
    const { ids, status } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '변경할 상품 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!status || !['todo', 'draft', 'published'].includes(status)) {
      return NextResponse.json(
        { success: false, error: '올바른 상태 값이 필요합니다.' },
        { status: 400 }
      );
    }

    await prisma.product.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `${ids.length}개 상품의 상태가 변경되었습니다.`,
    });
  } catch (error: any) {
    console.error('일괄 상태 변경 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
