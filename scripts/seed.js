const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.product.deleteMany({});

  await prisma.product.create({
    data: {
      name: '플라워 화병 세트',
      price: 15000,
      originalPrice: 25000,
      category: '홈데코',
      vendorName: '도매꾹',
      status: 'todo'
    }
  });

  await prisma.product.create({
    data: {
      name: '주방 수납 바구니',
      price: 8900,
      originalPrice: 15000,
      category: '주방용품',
      vendorName: '도매꾹',
      status: 'todo'
    }
  });

  await prisma.product.create({
    data: {
      name: '아로마 디퓨저',
      price: 12000,
      originalPrice: 20000,
      category: '홈데코',
      vendorName: '도매꾹',
      status: 'todo'
    }
  });

  console.log('🎉 3개 상품 추가 완료!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
