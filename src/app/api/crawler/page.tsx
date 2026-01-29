'use client';

export default function CrawlPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center">
        <div className="text-6xl mb-4">🌸</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">꽃틔움 크롤러</h1>
        <p className="text-gray-600 mb-8">
          도매매에서 상품을 자동으로 크롤링합니다
        </p>
        <button className="px-8 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium text-lg">
          크롤링 시작
        </button>
      </div>
    </div>
  );
}
