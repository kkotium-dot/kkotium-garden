import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 더미 User 생성 시작...');

  // 기존 User 확인
  const existingUser = await prisma.user.findUnique({
    where: { email: 'test@kkotium.com' }
  });

  if (existingUser) {
    console.log('✅ 더미 User 이미 존재:', existingUser.id);
    console.log(`   - Email: ${existingUser.email}`);
    console.log(`   - Name: ${existingUser.name}`);
    return;
  }

  // 더미 User 생성
  const user = await prisma.user.create({
    data: {
      email: 'test@kkotium.com',
      name: '테스트 관리자',
      level: 1,
      exp: 0
    }
  });

  console.log('✨ 더미 User 생성 완료:', user.id);
  console.log(`   - Email: ${user.email}`);
  console.log(`   - Name: ${user.name}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ 실행 실패:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
