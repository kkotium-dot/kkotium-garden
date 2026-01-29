import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '삭제할 상품을 선택해주세요' },
        { status: 400 }
      );
    }

    // 다중 삭제
    const result = await prisma.product.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    console.log(`✅ ${result.count}개 상품 삭제 완료`);

    return NextResponse.json({
      success: true,
      message: `${result.count}개 상품이 삭제되었습니다`,
      deletedCount: result.count,
    });
  } catch (error: any) {
    console.error('❌ 다중 삭제 실패:', error);
    return NextResponse.json(
      { success: false, error: '다중 삭제 실패: ' + error.message },
      { status: 500 }
    );
  }
}
