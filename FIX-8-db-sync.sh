#!/bin/bash
echo "========================================="
echo "🗄️  데이터베이스 테이블 생성"
echo "========================================="
echo ""

echo "1️⃣  Prisma DB Push 실행..."
npx prisma db push --accept-data-loss

echo ""
echo "2️⃣  Prisma Generate..."
npx prisma generate

echo ""
echo "========================================="
echo "✅ 데이터베이스 동기화 완료!"
echo "========================================="
echo ""
echo "다음 명령어로 확인:"
echo "  npx prisma studio"
echo "  npm run dev"
echo ""
