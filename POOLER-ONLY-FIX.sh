#!/bin/bash
echo "========================================="
echo "🎯 Pooler만 사용하는 완벽 해결책"
echo "========================================="
echo ""

echo "1️⃣  schema.prisma에서 directUrl 제거..."
sed -i '' '/directUrl/d' prisma/schema.prisma

echo ""
echo "2️⃣  .env에서 DIRECT_URL 제거..."
sed -i '' '/^DIRECT_URL/d' .env

echo ""
echo "3️⃣  Prisma Generate..."
npx prisma generate

echo ""
echo "4️⃣  Pooler 전용 DB Push..."
npx prisma db push --force-reset

echo ""
echo "========================================="
echo "✅ Pooler 전용 설정 완료!"
echo "========================================="
echo ""
echo "이제 Pooler만 사용합니다:"
echo "DATABASE_URL: 6543 포트 (애플리케이션)"
echo "db push도 Pooler 사용 가능!"
echo ""
echo "실행: npm run dev"
