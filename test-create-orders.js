// test-create-orders.js - 테스트 주문 생성 스크립트
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestOrders() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 테스트 주문 생성 시작...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 1. User 확인
  let user = await prisma.user.findFirst();
  if (!user) {
    console.log('❌ User가 없습니다. 먼저 User를 생성하세요.');
    return;
  }
  console.log(`✅ User 확인: ${user.email} (${user.id})`);

  // 2. 테스트 상품 확인
  const products = await prisma.product.findMany({
    take: 2,
  });

  if (products.length === 0) {
    console.log('❌ 상품이 없습니다. 먼저 상품을 생성하세요.');
    return;
  }
  console.log(`✅ 상품 확인: ${products.length}개`);
  console.log('');

  // 3. 테스트 주문 데이터
  const testOrders = [
    {
      orderNumber: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-TEST01`,
      customerName: '김철수',
      customerPhone: '010-1234-5678',
      customerEmail: 'kimcs@example.com',
      shippingAddress: '서울특별시 강남구 테헤란로 123 ABC빌딩 5층',
      shippingZipcode: '06234',
      shippingRequest: '부재 시 경비실에 맡겨주세요',
      paymentMethod: '신용카드',
      totalPrice: products[0].salePrice + 3000,
      shippingFee: 3000,
      discount: 0,
      status: 'paid',
      paidAt: new Date(),
      userId: user.id,
      items: {
        create: [
          {
            productId: products[0].id,
            productName: products[0].name,
            productSku: products[0].sku,
            quantity: 1,
            price: products[0].salePrice,
            options: '',
          },
        ],
      },
    },
    {
      orderNumber: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-TEST02`,
      customerName: '이영희',
      customerPhone: '010-9876-5432',
      customerEmail: 'leeyh@example.com',
      shippingAddress: '경기도 성남시 분당구 판교역로 231',
      shippingZipcode: '13487',
      shippingRequest: '배송 전 연락 부탁드립니다',
      paymentMethod: '계좌이체',
      totalPrice: products.length > 1 ? products[1].salePrice + 3000 : 30000,
      shippingFee: 3000,
      discount: 0,
      status: 'preparing',
      paidAt: new Date(),
      userId: user.id,
      items: {
        create: [
          {
            productId: products.length > 1 ? products[1].id : products[0].id,
            productName: products.length > 1 ? products[1].name : products[0].name,
            productSku: products.length > 1 ? products[1].sku : products[0].sku,
            quantity: 1,
            price: products.length > 1 ? products[1].salePrice : products[0].salePrice,
            options: '색상: 빨강',
          },
        ],
      },
    },
    {
      orderNumber: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-TEST03`,
      customerName: '박지민',
      customerPhone: '010-5555-6666',
      customerEmail: 'parkjm@example.com',
      shippingAddress: '부산광역시 해운대구 센텀중앙로 97',
      shippingZipcode: '48058',
      shippingRequest: '',
      paymentMethod: '카카오페이',
      totalPrice: products[0].salePrice * 2 + 3000,
      shippingFee: 3000,
      discount: 1000,
      status: 'shipping',
      paidAt: new Date(Date.now() - 86400000), // 1일 전
      shippedAt: new Date(),
      trackingNumber: '1234567890123',
      courierCompany: 'CJ대한통운',
      userId: user.id,
      items: {
        create: [
          {
            productId: products[0].id,
            productName: products[0].name,
            productSku: products[0].sku,
            quantity: 2,
            price: products[0].salePrice,
            options: '',
          },
        ],
      },
    },
  ];

  // 4. 주문 생성
  let success = 0;
  for (const orderData of testOrders) {
    try {
      const order = await prisma.order.create({
        data: orderData,
        include: {
          items: true,
        },
      });
      console.log(`✅ 주문 생성: ${order.orderNumber}`);
      console.log(`   고객: ${order.customerName}`);
      console.log(`   상태: ${order.status}`);
      console.log(`   금액: ${order.totalPrice.toLocaleString()}원`);
      console.log('');
      success++;
    } catch (e) {
      console.error(`❌ 주문 생성 실패: ${orderData.customerName}`);
      console.error('   에러:', e.message);
      console.log('');
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🎉 완료: ${success}/3개 주문 생성`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📋 다음 단계:');
  console.log('1. http://localhost:3000/orders 접속');
  console.log('2. 생성된 주문 3개 확인');
  console.log('3. 주문 상세 페이지에서 상태 변경 테스트');

  await prisma.$disconnect();
}

createTestOrders().catch(console.error);
