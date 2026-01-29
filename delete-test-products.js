const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 테스트 상품 2개 삭제
    const deleted = await prisma.product.deleteMany({
      where: {
        OR: [
          { name: '테스트화분' },
          { name: '공기정화 화분' },
          { sku: 'TEST-FLOWER-001' },
          { sku: 'PLANT-2026-001' }
        ]
      }
    });

    console.log('✅ 테스트 상품 삭제 완료:', deleted.count + '개');
    console.log('🔄 Prisma Studio에서 F5 새로고침하면 깨끗해집니다!');

  } catch (error) {
    console.error('❌ 에러:', error.message);
  }
}

main().finally(() => prisma.$disconnect());
