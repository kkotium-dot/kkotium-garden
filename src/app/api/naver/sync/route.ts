import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // 모든 판매중 상품 조회
    const products = await prisma.product.findMany({
      where: {
        status: 'published',
        // naverProductId: { not: null }, // TODO: 네이버 등록된 상품만
      },
    });

    let synced = 0;
    let failed = 0;

    // 각 상품의 재고/가격 동기화
    for (const product of products) {
      try {
        // TODO: 실제 네이버 쇼핑 API 호출
        // 지금은 Mock (API 키 설정 후 실제 구현)

        const syncData = {
          // naverProductId: product.naverProductId,
          salePrice: product.salePrice,
          stockQuantity: 100, // TODO: 재고 관리 시스템 연동
        };

        console.log(\`🔄 동기화: \${product.name}\`, syncData);

        synced++;
      } catch (error) {
        console.error(\`❌ 동기화 실패: \${product.name}\`, error);
        failed++;
      }
    }

    // 동기화 로그 저장
    // TODO: SyncLog 테이블 생성 및 기록

    return NextResponse.json({
      success: true,
      synced,
      failed,
      total: products.length,
      message: \`동기화 완료: 성공 \${synced}개, 실패 \${failed}개\`,
    });

  } catch (error: any) {
    console.error('동기화 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 동기화 상태 조회
    const totalProducts = await prisma.product.count({
      where: { status: 'published' },
    });

    // TODO: 실제로는 naverProductId가 있는 상품 카운트
    const syncedProducts = 0;

    return NextResponse.json({
      success: true,
      status: {
        lastSync: new Date().toISOString(),
        totalProducts,
        syncedProducts,
        failedProducts: 0,
        syncing: false,
      },
    });

  } catch (error: any) {
    console.error('상태 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
