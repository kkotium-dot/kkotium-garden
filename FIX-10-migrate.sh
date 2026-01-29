#!/bin/bash
echo "========================================="
echo "🔧 Prisma Migrate로 DB 동기화"
echo "========================================="
echo ""

echo "1️⃣  기존 migration 폴더 정리..."
rm -rf prisma/migrations

echo ""
echo "2️⃣  초기 migration 생성..."
npx prisma migrate dev --name init

echo ""
echo "3️⃣  Prisma Client 재생성..."
npx prisma generate

echo ""
echo "4️⃣  타입 체크..."
npx tsc --noEmit

echo ""
echo "========================================="
echo "✅ DB 동기화 완료!"
echo "========================================="
echo ""
echo "테스트:"
echo "  npx prisma studio"
echo "  npm run build"
echo "  npm run dev"
echo ""
echo "상품 관리: http://localhost:3000/products"
