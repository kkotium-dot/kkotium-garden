import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Supplier 시드 데이터 생성 시작...');

  // 기존 Supplier 확인
  const existingSuppliers = await prisma.supplier.findMany();
  console.log(`📦 기존 Supplier: ${existingSuppliers.length}개`);

  // 기본 Supplier 생성
  const suppliers = [
    {
      id: 'kkotium-default',
      name: '꽃틔움(협력사)',
      code: 'KKOTIUM',
      abbr: 'KK',
      platformCode: 'OWN',
      contact: '02-1234-5678',
      address: '서울시 강남구 테헤란로 123',
      description: '꽃틔움 기본 공급사 - 모든 꽃 상품'
    },
    {
      id: 'florist-partner',
      name: '플로리스트 파트너',
      code: 'FLORIST',
      abbr: 'FL',
      platformCode: 'ETC',
      contact: '02-9876-5432',
      address: '서울시 서초구 서초대로 456',
      description: '플로리스트 협력사 - 프리미엄 꽃 전문'
    }
  ];

  for (const supplier of suppliers) {
    const existing = await prisma.supplier.findUnique({
      where: { id: supplier.id }
    });

    if (existing) {
      console.log(`✅ Supplier 이미 존재: ${supplier.name}`);
    } else {
      await prisma.supplier.create({
        data: supplier
      });
      console.log(`✨ Supplier 생성: ${supplier.name}`);
    }
  }

  // 최종 확인
  const allSuppliers = await prisma.supplier.findMany();
  console.log(`\n✅ 총 ${allSuppliers.length}개 Supplier 생성 완료!`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  allSuppliers.forEach(s => {
    console.log(`  - ${s.name} (${s.code})`);
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ 시드 실행 실패:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
