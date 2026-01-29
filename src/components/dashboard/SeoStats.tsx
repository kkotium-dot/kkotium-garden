'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

interface SeoStats {
  totalProducts: number;
  averageScore: number;
  distribution: {
    perfect: number;
    good: number;
    fair: number;
    poor: number;
  };
  percentages: {
    perfect: number;
    good: number;
    fair: number;
    poor: number;
  };
  needsImprovement: Array<{
    id: string;
    name: string;
    seoScore: number;
    descriptionLength: number;
    missingFields: string[];
  }>;
}

export default function SeoStats() {
  const [stats, setStats] = useState<SeoStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeoStats();
  }, []);

  const fetchSeoStats = async () => {
    try {
      const response = await fetch('/api/products/seo-stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('SEO Stats fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            🔍 네이버 SEO 최적화 현황
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            전체 {stats.totalProducts}개 상품 분석 결과
          </p>
        </div>
        <Link
          href="/products"
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
        >
          상품 관리
        </Link>
      </div>

      {/* 평균 점수 카드 */}
      <div className="mb-6">
        <div className={`rounded-lg p-6 ${
          stats.averageScore >= 90 ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
          stats.averageScore >= 80 ? 'bg-gradient-to-br from-green-500 to-green-600' :
          stats.averageScore >= 70 ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
          'bg-gradient-to-br from-yellow-500 to-yellow-600'
        } text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm mb-1">평균 SEO 점수</p>
              <h3 className="text-4xl font-bold">{stats.averageScore}점</h3>
            </div>
            <div className="w-24 h-24">
              <svg className="transform -rotate-90 w-24 h-24">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="white"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(stats.averageScore / 100) * 251.2} 251.2`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 점수 분포 */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">점수 분포</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
            <div className="text-2xl font-bold text-purple-600">
              {stats.distribution.perfect}
            </div>
            <div className="text-xs text-gray-600 mt-1">100점</div>
            <div className="text-xs text-purple-600 font-semibold">
              {stats.percentages.perfect}%
            </div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <div className="text-2xl font-bold text-green-600">
              {stats.distribution.good}
            </div>
            <div className="text-xs text-gray-600 mt-1">80-99점</div>
            <div className="text-xs text-green-600 font-semibold">
              {stats.percentages.good}%
            </div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <div className="text-2xl font-bold text-blue-600">
              {stats.distribution.fair}
            </div>
            <div className="text-xs text-gray-600 mt-1">70-79점</div>
            <div className="text-xs text-blue-600 font-semibold">
              {stats.percentages.fair}%
            </div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.distribution.poor}
            </div>
            <div className="text-xs text-gray-600 mt-1">70점 미만</div>
            <div className="text-xs text-yellow-600 font-semibold">
              {stats.percentages.poor}%
            </div>
          </div>
        </div>
      </div>

      {/* 개선 필요 상품 */}
      {stats.needsImprovement.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            개선 필요 상품 (설명 50자 미만)
          </h3>
          <div className="space-y-2">
            {stats.needsImprovement.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}/edit`}
                className="block p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {product.name}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                        product.seoScore >= 80 ? 'bg-green-100 text-green-700' :
                        product.seoScore >= 70 ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {product.seoScore}점
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-600">
                        설명: {product.descriptionLength}/50자
                      </span>
                      {product.missingFields.length > 0 && (
                        <span className="text-xs text-yellow-700">
                          미입력: {product.missingFields.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-purple-600 hover:text-purple-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 100점 달성 메시지 */}
      {stats.distribution.perfect === stats.totalProducts && stats.totalProducts > 0 && (
        <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h4 className="font-bold text-green-900">🎉 완벽합니다!</h4>
              <p className="text-sm text-green-700">
                모든 상품이 SEO 100점을 달성했습니다!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
