import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 마스터 데이터: 택배사 (212개 대표 샘플)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DELIVERY_COMPANIES = [
  { code: 'CJGLS', name: 'CJ대한통운' },
  { code: 'HYUNDAI', name: '롯데택배' },
  { code: 'HANJIN', name: '한진택배' },
  { code: 'KGB', name: '로젠택배' },
  { code: 'EPOST', name: '우체국택배' },
  { code: 'LOGEN', name: '로젠택배' },
  { code: 'KDEXP', name: '경동택배' },
  { code: 'CVSNET', name: 'GS Postbox 택배' },
  { code: 'DAESIN', name: '대신택배' },
  { code: 'ILYANG', name: '일양로지스' },
  { code: 'CHUNIL', name: '천일택배' },
  { code: 'POST', name: '우체국택배' },
  { code: 'HDEXP', name: '합동택배' },
  { code: 'HANJINLOGIS', name: '한진택배' },
  { code: 'DHL', name: 'DHL' },
  { code: 'FEDEX', name: 'FedEx' },
  { code: 'UPS', name: 'UPS' },
  { code: 'TNT', name: 'TNT Express' },
  { code: 'EMS', name: 'EMS (국제우편)' },
  { code: 'GSMNTON', name: 'GS Postbox' },
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 마스터 데이터: 네이버 카테고리 (4,993개 대표 샘플)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const NAVER_CATEGORIES = [
  { code: '50000000', level1: '가구/인테리어', level2: null, level3: null, level4: null },
  { code: '50001000', level1: '가구/인테리어', level2: '거실가구', level3: null, level4: null },
  { code: '50001001', level1: '가구/인테리어', level2: '거실가구', level3: '소파', level4: null },
  { code: '50001002', level1: '가구/인테리어', level2: '거실가구', level3: '거실장', level4: null },
  { code: '50001003', level1: '가구/인테리어', level2: '거실가구', level3: 'TV/AV 거치대', level4: null },
  { code: '50002000', level1: '가구/인테리어', level2: '침실가구', level3: null, level4: null },
  { code: '50002001', level1: '가구/인테리어', level2: '침실가구', level3: '침대', level4: null },
  { code: '50002002', level1: '가구/인테리어', level2: '침실가구', level3: '매트리스', level4: null },
  { code: '50003000', level1: '가구/인테리어', level2: 'DIY자재/용품', level3: null, level4: null },
  { code: '50003307', level1: '가구/인테리어', level2: 'DIY자재/용품', level3: '가구부속품', level4: '가구다리' },
  { code: '50004000', level1: '가구/인테리어', level2: '수납/정리', level3: null, level4: null },
  { code: '50005000', level1: '가구/인테리어', level2: '조명/스탠드', level3: null, level4: null },
  { code: '50006000', level1: '가구/인테리어', level2: '인테리어소품', level3: null, level4: null },
  { code: '50007000', level1: '가구/인테리어', level2: '커튼/블라인드', level3: null, level4: null },
  { code: '50008000', level1: '가구/인테리어', level2: '벽지/시트지', level3: null, level4: null },
  { code: '30000000', level1: '생활/건강', level2: null, level3: null, level4: null },
  { code: '40000000', level1: '패션의류', level2: null, level3: null, level4: null },
  { code: '10000000', level1: '디지털/가전', level2: null, level3: null, level4: null },
  { code: '20000000', level1: '식품', level2: null, level3: null, level4: null },
  { code: '60000000', level1: '도서', level2: null, level3: null, level4: null },
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 마스터 데이터: 원산지 (518개 대표 샘플)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ORIGIN_CODES = [
  { code: '0', region: '국산' },
  { code: '0001', region: '서울특별시' },
  { code: '0002', region: '부산광역시' },
  { code: '0003', region: '대구광역시' },
  { code: '0004', region: '인천광역시' },
  { code: '0005', region: '광주광역시' },
  { code: '0006', region: '대전광역시' },
  { code: '0007', region: '울산광역시' },
  { code: '0008', region: '세종특별자치시' },
  { code: '0009', region: '경기도' },
  { code: '0010', region: '강원도' },
  { code: '0011', region: '충청북도' },
  { code: '0012', region: '충청남도' },
  { code: '0013', region: '전라북도' },
  { code: '0014', region: '전라남도' },
  { code: '0015', region: '경상북도' },
  { code: '0016', region: '경상남도' },
  { code: '0017', region: '제주특별자치도' },
  { code: '0200037', region: '중국' },
  { code: '0201038', region: '일본' },
  { code: '0200034', region: '베트남' },
  { code: '0200027', region: '태국' },
  { code: '0200039', region: '대만' },
  { code: '0200031', region: '말레이시아' },
  { code: '0200036', region: '인도네시아' },
  { code: '0200035', region: '인도' },
  { code: '0201110', region: '미국' },
  { code: '0200074', region: '캐나다' },
  { code: '0200086', region: '독일' },
  { code: '0200082', region: '프랑스' },
  { code: '0200094', region: '이탈리아' },
  { code: '0200080', region: '영국' },
  { code: '0200087', region: '스페인' },
  { code: '0200040', region: '호주' },
  { code: '0200041', region: '뉴질랜드' },
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. 택배사 Seed
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function seedDeliveryCompanies() {
  console.log('\n📦 택배사 코드 Seed 시작...')

  let successCount = 0

  for (const company of DELIVERY_COMPANIES) {
    await prisma.deliveryCompany.upsert({
      where: { code: company.code },
      update: {},
      create: {
        code: company.code,
        name: company.name,
        active: true,
      },
    })
    successCount++
  }

  console.log(`✅ 택배사 Seed 완료: ${successCount}개`)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. 카테고리 Seed
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function seedNaverCategories() {
  console.log('\n📂 네이버 카테고리 Seed 시작...')

  let successCount = 0

  for (const cat of NAVER_CATEGORIES) {
    const fullPath = [cat.level1, cat.level2, cat.level3, cat.level4]
      .filter(Boolean)
      .join(' > ')

    await prisma.naverCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: {
        code: cat.code,
        level1: cat.level1,
        level2: cat.level2,
        level3: cat.level3,
        level4: cat.level4,
        fullPath: fullPath || null,
        active: true,
      },
    })
    successCount++
  }

  console.log(`✅ 카테고리 Seed 완료: ${successCount}개`)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. 원산지 Seed
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function seedOriginCodes() {
  console.log('\n🌍 원산지 코드 Seed 시작...')

  let successCount = 0

  for (const origin of ORIGIN_CODES) {
    await prisma.originCode.upsert({
      where: { code: origin.code },
      update: {},
      create: {
        code: origin.code,
        region: origin.region,
        active: true,
      },
    })
    successCount++
  }

  console.log(`✅ 원산지 Seed 완료: ${successCount}개`)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. 기존 User/Supplier Seed
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function seedBasicData() {
  console.log('\n👤 기본 데이터 (User, Supplier) Seed 시작...')

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
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 함수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🌱 꽃틔움 가든 - 네이버 통합 설계 Seed 시작')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    // 1. 기본 데이터
    await seedBasicData()

    // 2. 네이버 마스터 데이터
    await seedDeliveryCompanies()
    await seedNaverCategories()
    await seedOriginCodes()

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 모든 Seed 데이터 생성 완료!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // 통계 출력
    const deliveryCount = await prisma.deliveryCompany.count()
    const categoryCount = await prisma.naverCategory.count()
    const originCount = await prisma.originCode.count()

    console.log('\n📊 데이터베이스 통계:')
    console.log(`   택배사: ${deliveryCount}개`)
    console.log(`   카테고리: ${categoryCount}개`)
    console.log(`   원산지: ${originCount}개`)
    console.log(`   총합: ${deliveryCount + categoryCount + originCount}개`)

    console.log('\n💡 참고: Space Files의 전체 엑셀 데이터를 사용하려면')
    console.log('   prisma/data/ 폴더에 엑셀 파일을 복사하고')
    console.log('   seed.ts를 확장 버전으로 교체하세요!')
  } catch (error) {
    console.error('\n❌ Seed 실행 중 오류 발생:', error)
    throw error
  }
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
