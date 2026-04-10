
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 시드 데이터 생성 시작...')

  // 1. User 생성
  const user = await prisma.user.upsert({
    where: { email: 'test@kkotium.com' },
    update: {},
    create: {
      email: 'test@kkotium.com',
      name: '테스트 관리자',
      level: 1,
      exp: 0,
    },
  })
  console.log('✅ User 생성 완료:', user.email)

  // 2. Supplier 생성
  const supplier = await prisma.supplier.upsert({
    where: { code: 'SUP001' },
    update: {},
    create: {
      name: '꽃틔움 본사',
      code: 'SUP001',
      contact: '02-1234-5678',
      address: '서울시 강남구 테헤란로 123',
      description: '프리미엄 꽃 공급 업체',
    },
  })
  console.log('✅ Supplier 생성 완료:', supplier.name)

  console.log('🎉 시드 데이터 생성 완료!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ 시드 에러:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
