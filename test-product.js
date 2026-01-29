// test-product.js - 문법 오류 수정 + 최소 필드
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestProducts() {
  console.log('🚀 테스트 상품 생성 시작...');

  // User 확인
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'test@kkotium.com',
        name: '테스트관리자',
        level: 1,
        exp: 0,
      }
    });
    console.log('✅ User 생성:', user.email);
  } else {
    console.log('✅ User 확인:', user.email);
  }

  // 최소 필드만 사용 (스키마 기준)
  const products = [
    {
      sku: 'TEST-001',
      name: '테스트 장미 꽃다발',
      category: '꽃다발',
      description: '테스트용 장미 꽃다발입니다.',
      salePrice: 50000,
      supplierPrice: 30000,
      margin: 20000,
      userId: user.id,
      mainImage: 'https://via.placeholder.com/400x400/ff69b4/ffffff?text=ROSE',
      images: ['https://via.placeholder.com/400x400/ff69b4/ffffff?text=ROSE'],
      naver_title: '테스트 장미 꽃다발',
      naver_keywords: '장미,꽃다발,테스트',
      naver_description: '테스트용 네이버 설명입니다.',
      keywords: JSON.stringify(['장미', '꽃다발']),
      status: 'active'
    },
    {
      sku: 'TEST-002',
      name: '테스트 다육식물 화분',
      category: '화분',
      description: '테스트용 다육식물 화분입니다.',
      salePrice: 25000,
      supplierPrice: 15000,
      margin: 10000,
      userId: user.id,
      mainImage: 'https://via.placeholder.com/400x400/32cd32/ffffff?text=PLANT',
      images: ['https://via.placeholder.com/400x400/32cd32/ffffff?text=PLANT'],
      naver_title: '테스트 다육식물 화분',
      naver_keywords: '다육식물,화분,테스트',
      naver_description: '테스트용 네이버 설명입니다.',
      keywords: JSON.stringify(['다육식물', '화분']),
      status: 'active'
    }
  ];

  let success = 0;
  for (const data of products) {
    try {
      const product = await prisma.product.create({ data });
      console.log(`✅ 생성: ${product.name} (ID: ${product.id})`);
      success++;
    } catch (e) {
      console.error(`❌ 실패: ${data.name}`);
      console.error('에러:', e.message);
    }
  }

  console.log(`\n🎉 완료: ${success}/2개 성공`);
  console.log('테스트: http://localhost:3000/products');

  await prisma.$disconnect();
}

createTestProducts().catch(console.error);
