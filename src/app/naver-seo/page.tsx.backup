// ~/Downloads/page_final.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NaverSeoProductTable from '@/components/naver-seo/NaverSeoProductTable';

interface Product {
  id: string;
  name: string;
  mainImage: string | null;
  salePrice: number;                    // ✅ price → salePrice
  naver_title: string | null;
  naver_keywords: string | null;
  naver_description: string | null;
  naver_brand: string | null;
  naver_origin: string | null;
  naver_material: string | null;
  naver_care_instructions: string | null;
  seoScore: number;
  suggestions: string[];
  needsImprovement: boolean;
  keywordCount: number;                 // ✅ 추가
  imageCount: number;                   // ✅ 추가
}

export default function NaverSeoPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'perfect' | 'good' | 'fair' | 'poor'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [filter, searchQuery]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('filter', filter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/naver-seo/products?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (productId: string) => {
    router.push(`/products/${productId}/edit`);
  };

  const stats = {
    total: products.length,
    perfect: products.filter((p) => p.seoScore === 100).length,
    good: products.filter((p) => p.seoScore >= 80 && p.seoScore < 100).length,
    fair: products.filter((p) => p.seoScore >= 70 && p.seoScore < 80).length,
    poor: products.filter((p) => p.seoScore < 70).length,
    avgScore: products.length > 0
      ? Math.round(products.reduce((sum, p) => sum + p.seoScore, 0) / products.length)
      : 0,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">네이버 SEO 데이터 로딩중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🔍</span>
            <h1 className="text-3xl font-bold text-gray-900">네이버 SEO 최적화</h1>
          </div>
          <p className="text-gray-600">상품별 SEO 점수를 확인하고 최적화하세요</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:col-span-2">
            <p className="text-sm text-gray-600 mb-1">평균 SEO 점수</p>
            <h3 className="text-3xl font-bold text-purple-600">{stats.avgScore}점</h3>
          </div>
          <div
            className={`bg-white rounded-lg shadow-sm border-2 p-6 cursor-pointer transition ${
              filter === 'perfect' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
            }`}
            onClick={() => setFilter(filter === 'perfect' ? 'all' : 'perfect')}
          >
            <p className="text-xs text-gray-600 mb-1">100점</p>
            <h3 className="text-2xl font-bold text-purple-600">{stats.perfect}</h3>
            <p className="text-xs text-gray-500 mt-1">완벽</p>
          </div>
          <div
            className={`bg-white rounded-lg shadow-sm border-2 p-6 cursor-pointer transition ${
              filter === 'good' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
            }`}
            onClick={() => setFilter(filter === 'good' ? 'all' : 'good')}
          >
            <p className="text-xs text-gray-600 mb-1">80-99점</p>
            <h3 className="text-2xl font-bold text-green-600">{stats.good}</h3>
            <p className="text-xs text-gray-500 mt-1">양호</p>
          </div>
          <div
            className={`bg-white rounded-lg shadow-sm border-2 p-6 cursor-pointer transition ${
              filter === 'fair' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
            }`}
            onClick={() => setFilter(filter === 'fair' ? 'all' : 'fair')}
          >
            <p className="text-xs text-gray-600 mb-1">70-79점</p>
            <h3 className="text-2xl font-bold text-blue-600">{stats.fair}</h3>
            <p className="text-xs text-gray-500 mt-1">보통</p>
          </div>
          <div
            className={`bg-white rounded-lg shadow-sm border-2 p-6 cursor-pointer transition ${
              filter === 'poor' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300'
            }`}
            onClick={() => setFilter(filter === 'poor' ? 'all' : 'poor')}
          >
            <p className="text-xs text-gray-600 mb-1">70점 미만</p>
            <h3 className="text-2xl font-bold text-yellow-600">{stats.poor}</h3>
            <p className="text-xs text-gray-500 mt-1">개선필요</p>
          </div>
        </div>

        {/* 완벽 메시지 */}
        {stats.perfect === stats.total && stats.total > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✅</span>
              <div>
                <h3 className="font-bold text-green-900 mb-1">🎉 완벽합니다!</h3>
                <p className="text-green-700 text-sm">모든 상품이 SEO 100점을 달성했습니다!</p>
              </div>
            </div>
          </div>
        )}

        {/* 필터 & 검색 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 검색 */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="상품명 또는 네이버 제목 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* 필터 초기화 */}
            {(filter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setFilter('all');
                  setSearchQuery('');
                }}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                필터 초기화
              </button>
            )}
          </div>

          {/* 활성 필터 표시 */}
          {filter !== 'all' && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">활성 필터:</span>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                {filter === 'perfect' && '100점'}
                {filter === 'good' && '80-99점'}
                {filter === 'fair' && '70-79점'}
                {filter === 'poor' && '70점 미만'}
              </span>
            </div>
          )}
        </div>

        {/* 상품 테이블 */}
        <NaverSeoProductTable products={products} onProductClick={handleProductClick} />

        {/* 가이드 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
            <span>💡</span>
            SEO 점수 기준
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-medium mb-2">점수 구성:</p>
              <ul className="space-y-1 text-blue-700">
                <li>• 네이버 제목: 20점 (10자 이상 권장)</li>
                <li>• 네이버 키워드: 20점 (3개 이상 권장)</li>
                <li>• 네이버 설명: 20점 (50자 이상 권장)</li>
                <li>• 브랜드: 10점</li>
                <li>• 원산지: 10점</li>
                <li>• 재질/소재: 10점</li>
                <li>• 관리 방법: 10점</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-2">점수 등급:</p>
              <ul className="space-y-1 text-blue-700">
                <li>• 90점 이상: S급 (완벽)</li>
                <li>• 80-89점: A급 (양호)</li>
                <li>• 70-79점: B급 (보통)</li>
                <li>• 60-69점: C급 (개선 필요)</li>
                <li>• 60점 미만: D급 (즉시 개선)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
