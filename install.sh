#!/bin/bash
echo "🌸 꽃틔움 - /crawl 페이지 추가"
echo "=========================================="

# 1. 서버 중지
pkill -f "next dev" 2>/dev/null || true
sleep 2

# 2. 캐시 삭제
rm -rf .next

# 3. /crawl 페이지 생성
mkdir -p src/app/crawl
cat > src/app/crawl/page.tsx << 'CRAWL'
'use client';

export default function CrawlPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🌸</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
            꽃틔움 도매매 크롤러
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            도매매에서 최신 상품을 자동으로 크롤링하여 스마트스토어에 등록합니다
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-pink-100">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🚀 빠른 시작</h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  도매매 상품 자동 검색
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  마진율 자동 계산
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  스마트스토어 자동 등록
                </li>
              </ul>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-8 rounded-2xl text-white">
                <div className="text-5xl mb-4">⚡</div>
                <h3 className="text-2xl font-bold mb-2">AI 자동화</h3>
                <p className="opacity-90">한 번 클릭으로 완전 자동</p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <button className="px-12 py-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xl font-bold rounded-2xl hover:from-pink-600 hover:to-purple-700 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1">
              🚀 크롤링 시작
            </button>
            <p className="mt-4 text-gray-500 text-sm">
              도매매 상품을 자동으로 불러옵니다 (5초 소요)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
CRAWL

echo "✅ /crawl 페이지 생성 완료!"
echo "=========================================="
echo "🚀 서버 재시작..."
npm run dev
echo "✅ http://localhost:3000/crawl 접속 확인!"
