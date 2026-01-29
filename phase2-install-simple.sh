#!/bin/bash
echo "🌸 꽃틔움 Phase 2 설치"
cd ~/Desktop/kkotium-garden

# 1. 서버 중지
pkill -f "next dev" 2>/dev/null || true

# 2. 패키지 설치
npm install cheerio xlsx @types/cheerio

# 3. 폴더 생성
mkdir -p src/app/api/crawl
mkdir -p src/app/api/products/bulk
mkdir -p "src/app/api/products/[id]"
mkdir -p src/app/api/upload/excel
mkdir -p "src/app/products/[id]/edit"
mkdir -p src/app/upload

# 4. 파일 복사
cp ~/Downloads/crawl-route.ts src/app/api/crawl/route.ts
cp ~/Downloads/bulk-route.ts src/app/api/products/bulk/route.ts
cp ~/Downloads/product-id-route.ts "src/app/api/products/[id]/route.ts"
cp ~/Downloads/excel-route.ts src/app/api/upload/excel/route.ts
cp ~/Downloads/crawl-page-full.tsx src/app/crawl/page.tsx
cp ~/Downloads/edit-page.tsx "src/app/products/[id]/edit/page.tsx"
cp ~/Downloads/upload-page.tsx src/app/upload/page.tsx

# 5. 캐시 삭제
rm -rf .next

# 6. 서버 시작
npm run dev
