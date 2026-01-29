const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    let user;
    try {
      user = await prisma.user.create({
        data: {
          id: 'cm4usertest123456789',
          email: 'admin@kkotium.com',
          name: '꽃틔움 관리자',
          level: 1,
          exp: 0
        }
      });
      console.log('✅ 사용자 생성:', user.name);
    } catch (e) {
      if (e.code === 'P2002') {
        user = await prisma.user.findUnique({
          where: { id: 'cm4usertest123456789' }
        });
        console.log('ℹ️  기존 사용자 사용:', user.name);
      } else {
        throw e;
      }
    }

    const product = await prisma.product.create({
      data: {
        userId: user.id,
        name: '공기정화 화분',
        sku: 'PLANT-2026-001',
        supplierPrice: 20000,
        salePrice: 15000,
        margin: 0.25,
        status: 'todo',
        category: '화훼',
        brand: '꽃틔움',
        manufacturer: '도매꾹',
        naver_title: '실내 공기정화 화분 1위',
        naver_keywords: '화분,실내식물,공기정화,인테리어',
        seo_description: 'NASA 추천 공기정화 식물! 집에서 키우기 쉬운 화분',
        naverCategoryCode: '50003307',
        originCode: '0001'
      }
    });

    console.log('\n🎉🎉🎉 상품 생성 성공! 🎉🎉🎉');
    console.log('📦 상품명:', product.name);
    console.log('💰 판매가:', product.salePrice + '원');
    console.log('🔍 Naver 제목:', product.naver_title);
    console.log('🏷️  키워드:', product.naver_keywords);
    console.log('\n🌐 http://localhost:3000/products/sourced\n');
  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }
}

main().finally(() => prisma.$disconnect());
