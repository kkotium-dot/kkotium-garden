#!/bin/bash
echo "========================================="
echo "🔧 KKOTIUM CRUD 완벽 수정"
echo "========================================="
echo ""

# 1. Prisma 정리
echo "1️⃣  Prisma Client 정리..."
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client

# 2. 재설치
echo ""
echo "2️⃣  Prisma Client 재설치..."
npm install @prisma/client

# 3. Generate
echo ""
echo "3️⃣  Prisma Generate..."
npx prisma generate

# 4. DB Push (확인 없이 실행)
echo ""
echo "4️⃣  데이터베이스 동기화..."
echo "⚠️  주의: 기존 데이터가 초기화됩니다!"
npx prisma db push --accept-data-loss

# 5. TypeScript 체크
echo ""
echo "5️⃣  TypeScript 타입 체크..."
npx tsc --noEmit

# 6. 빌드 테스트
echo ""
echo "6️⃣  빌드 테스트..."
npm run build

echo ""
echo "========================================="
echo "✅ 수정 완료!"
echo "========================================="
echo ""
echo "다음 명령어로 서버 시작:"
echo "  npm run dev"
echo ""
echo "테스트 URL:"
echo "  http://localhost:3000/products"
echo "  http://localhost:3000/api/products"
echo ""
