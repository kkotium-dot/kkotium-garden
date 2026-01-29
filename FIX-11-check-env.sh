#!/bin/bash
echo "========================================="
echo "🔍 환경 변수 및 연결 확인"
echo "========================================="
echo ""

echo "1️⃣  DATABASE_URL 확인..."
if [ -f .env ]; then
  echo "✅ .env 파일 존재"
  DATABASE_URL=$(grep "DATABASE_URL" .env | head -1 | cut -d'=' -f2-)
  echo "URL: $DATABASE_URL"
  echo ""
else
  echo "❌ .env 파일 없음!"
  exit 1
fi

echo "2️⃣  Prisma 연결 테스트..."
npx prisma db execute --stdin <<EOF
SELECT version() as postgresql_version;
EOF

echo ""
echo "3️⃣  현재 테이블 목록..."
npx prisma db execute --stdin <<EOF
SELECT tablename, schemaname 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
EOF

echo ""
echo "4️⃣  Product 테이블 존재 여부..."
npx prisma db execute --stdin <<EOF
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'Product'
) as "Product_table_exists";
EOF

echo ""
echo "========================================="
echo "✅ 진단 완료!"
echo "========================================="
if [ -f .env ]; then
  echo "다음 단계: ./FIX-10-migrate.sh"
fi
