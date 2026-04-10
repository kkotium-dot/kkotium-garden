const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 데이터베이스 상태 확인');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const userCount = await prisma.user.count();
  const supplierCount = await prisma.supplier.count();
  const productCount = await prisma.product.count();

  console.log(`👤 User: ${userCount}개`);
  console.log(`🏭 Supplier: ${supplierCount}개`);
  console.log(`📦 Product: ${productCount}개\n`);

  if (productCount > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 최근 등록 상품 (최대 3개)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const products = await prisma.product.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        sku: true,
        salePrice: true,
        images: true,
        createdAt: true,
      },
    });

    products.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.name}`);
      console.log(`   SKU: ${p.sku}`);
      console.log(`   가격: ${p.salePrice.toLocaleString()}원`);
      console.log(`   이미지: ${p.images?.length || 0}개`);
      console.log(`   등록일: ${p.createdAt.toLocaleString('ko-KR')}\n`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
