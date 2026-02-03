'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, ArrowRight } from 'lucide-react';

interface SeoStats {
  averageScore: number;
  perfectCount: number;
  goodCount: number;
  averageCount: number;
  poorCount: number;
  total: number;
  perfectRate: number;
}

export default function SeoWidget() {
  const [stats, setStats] = useState<SeoStats>({
    averageScore: 0,
    perfectCount: 0,
    goodCount: 0,
    averageCount: 0,
    poorCount: 0,
    total: 0,
    perfectRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeoStats();
  }, []);

  const fetchSeoStats = async () => {
    try {
      // ✅ 수정: /api/products/seo-stats API 사용 (SEO 점수가 이미 계산되어 있음)
      const response = await fetch('/api/products/seo-stats');
      const data = await response.json();

      if (data.success && data.stats) {
        const { distribution, averageScore, totalProducts, percentages } = data.stats;

        setStats({
          averageScore: averageScore,
          perfectCount: distribution.perfect,
          goodCount: distribution.good,
          averageCount: distribution.fair,
          poorCount: distribution.poor,
          total: totalProducts,
          perfectRate: percentages.perfect,
        });
      }
    } catch (err) {
      console.error('Failed to fetch SEO stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-sm border border-purple-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (stats.total === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-sm border border-purple-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            🔍 네이버 SEO 현황
          </h3>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-3">등록된 상품이 없습니다</p>
          <Link
            href="/products/new"
            className="inline-block px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm rounded-lg hover:shadow-lg transition"
          >
            상품 등록하기
          </Link>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-purple-600';
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    return 'text-yellow-600';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '💎';
    if (score >= 80) return '🟢';
    if (score >= 70) return '🔵';
    return '🟡';
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-sm border border-purple-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          🔍 네이버 SEO 현황
        </h3>
        <Link
          href="/naver-seo"
          className="text-sm text-purple-600 hover:underline font-semibold flex items-center gap-1"
        >
          상세보기 <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 주요 지표 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl">{getScoreEmoji(stats.averageScore)}</span>
          </div>
          <p className={`text-3xl font-bold ${getScoreColor(stats.averageScore)}`}>
            {stats.averageScore}점
          </p>
          <p className="text-sm text-gray-600 mt-1">평균 점수</p>
        </div>

        <div className="bg-white rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-600">
            {stats.perfectRate}%
          </p>
          <p className="text-sm text-gray-600 mt-1">100점 달성률</p>
        </div>
      </div>

      {/* 점수별 분포 */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 w-20">💎 100점</span>
          <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-purple-600 h-full flex items-center justify-end pr-2 transition-all duration-500"
              style={{ width: `${stats.total > 0 ? (stats.perfectCount / stats.total) * 100 : 0}%` }}
            >
              {stats.perfectCount > 0 && (
                <span className="text-xs font-bold text-white">
                  {stats.perfectCount}개
                </span>
              )}
            </div>
          </div>
          <span className="text-sm font-bold text-purple-600 w-12 text-right">
            {stats.total > 0 ? Math.round((stats.perfectCount / stats.total) * 100) : 0}%
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 w-20">🟢 80-99</span>
          <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-500 to-green-600 h-full flex items-center justify-end pr-2 transition-all duration-500"
              style={{ width: `${stats.total > 0 ? (stats.goodCount / stats.total) * 100 : 0}%` }}
            >
              {stats.goodCount > 0 && (
                <span className="text-xs font-bold text-white">
                  {stats.goodCount}개
                </span>
              )}
            </div>
          </div>
          <span className="text-sm font-bold text-green-600 w-12 text-right">
            {stats.total > 0 ? Math.round((stats.goodCount / stats.total) * 100) : 0}%
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 w-20">🔵 70-79</span>
          <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full flex items-center justify-end pr-2 transition-all duration-500"
              style={{ width: `${stats.total > 0 ? (stats.averageCount / stats.total) * 100 : 0}%` }}
            >
              {stats.averageCount > 0 && (
                <span className="text-xs font-bold text-white">
                  {stats.averageCount}개
                </span>
              )}
            </div>
          </div>
          <span className="text-sm font-bold text-blue-600 w-12 text-right">
            {stats.total > 0 ? Math.round((stats.averageCount / stats.total) * 100) : 0}%
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 w-20">🟡 70점↓</span>
          <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
            <div
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-full flex items-center justify-end pr-2 transition-all duration-500"
              style={{ width: `${stats.total > 0 ? (stats.poorCount / stats.total) * 100 : 0}%` }}
            >
              {stats.poorCount > 0 && (
                <span className="text-xs font-bold text-white">
                  {stats.poorCount}개
                </span>
              )}
            </div>
          </div>
          <span className="text-sm font-bold text-yellow-600 w-12 text-right">
            {stats.total > 0 ? Math.round((stats.poorCount / stats.total) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* CTA */}
      <Link
        href="/naver-seo"
        className="block w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center font-semibold rounded-lg hover:shadow-lg transition-all hover:scale-[1.02]"
      >
        SEO 대시보드 보기 →
      </Link>
    </div>
  );
}
