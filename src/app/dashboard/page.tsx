'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatKRW, formatPercent, formatNumber } from '@/lib/utils/format';

interface Stats {
  totalProducts: number;
  totalRevenue: number;
  totalProfit: number;
  averageMargin: number;
  sourcedProducts: {
    total: number;
    pending: number;
    approved: number;
    listed: number;
  };
  recentActivity: Array<{
    id: number;
    name: string;
    status: string;
    created_at: string;
  }>;
  topMarginProducts: Array<{
    id: number;
    name: string;
    wholesale_price: number;
    retail_price: number;
    margin: number;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalRevenue: 0,
    totalProfit: 0,
    averageMargin: 0,
    sourcedProducts: { total: 0, pending: 0, approved: 0, listed: 0 },
    recentActivity: [],
    topMarginProducts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) throw new Error('통계를 불러올 수 없습니다');
      const data = await response.json();
      setStats({
        totalProducts: data.totalProducts || 0,
        totalRevenue: data.totalRevenue || 0,
        totalProfit: data.totalProfit || 0,
        averageMargin: data.averageMargin || 0,
        sourcedProducts: data.sourcedProducts || { total: 0, pending: 0, approved: 0, listed: 0 },
        recentActivity: data.recentActivity || [],
        topMarginProducts: data.topMarginProducts || []
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 주요 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">전체 상품</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatNumber(stats.totalProducts)}
            <span className="text-lg font-normal text-gray-500 ml-1">개</span>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">총 매출</p>
          <p className="text-3xl font-bold text-green-600">
            {formatKRW(stats.totalRevenue)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💎</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">순이익</p>
          <p className="text-3xl font-bold text-pink-600">
            {formatKRW(stats.totalProfit)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">평균 마진율</p>
          <p className="text-3xl font-bold text-purple-600">
            {formatPercent(stats.averageMargin)}
          </p>
        </div>
      </div>

      {/* 수집 상품 현황 */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            🌸 수집 상품 현황
          </h3>
          <Link 
            href="/sourced" 
            className="text-sm text-pink-600 hover:underline font-semibold"
          >
            전체 보기 →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.sourcedProducts.total}</p>
            <p className="text-sm text-gray-600">전체</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.sourcedProducts.pending}</p>
            <p className="text-sm text-gray-600">⏳ 대기중</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.sourcedProducts.approved}</p>
            <p className="text-sm text-gray-600">✅ 승인됨</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.sourcedProducts.listed}</p>
            <p className="text-sm text-gray-600">🎉 등록완료</p>
          </div>
        </div>
      </div>

      {/* 2열 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 활동 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">📌 최근 활동</h3>
            <Link href="/sourced" className="text-sm text-pink-600 hover:underline font-semibold">
              전체 보기 →
            </Link>
          </div>
          {stats.recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-3">최근 활동이 없습니다</p>
              <Link
                href="/crawl"
                className="inline-block px-4 py-2 bg-pink-500 text-white text-sm rounded-lg hover:bg-pink-600"
              >
                상품 수집 시작하기
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {activity.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.created_at).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <span className={`ml-3 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                    activity.status === 'listed' 
                      ? 'bg-green-100 text-green-800'
                      : activity.status === 'approved'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {activity.status === 'listed' ? '등록완료' :
                     activity.status === 'approved' ? '승인됨' :
                     '대기중'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 마진율 Top 5 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">🏆 마진율 Top 5</h3>
            <Link href="/sourced" className="text-sm text-pink-600 hover:underline font-semibold">
              전체 보기 →
            </Link>
          </div>
          {stats.topMarginProducts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-3">수집된 상품이 없습니다</p>
              <Link
                href="/crawl"
                className="inline-block px-4 py-2 bg-pink-500 text-white text-sm rounded-lg hover:bg-pink-600"
              >
                상품 수집하기
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.topMarginProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg hover:from-pink-100 hover:to-purple-100 transition"
                >
                  <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate text-sm">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      도매가: {formatKRW(product.wholesale_price)} → 판매가: {formatKRW(product.retail_price)}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-bold ${
                    product.margin >= 100 ? 'bg-green-100 text-green-800' :
                    product.margin >= 60 ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {product.margin}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 빠른 액션 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/products/new"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-2xl">➕</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">상품 등록</h3>
              <p className="text-sm text-gray-600">새 상품 추가하기</p>
            </div>
          </div>
        </Link>

        <Link
          href="/products"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">상품 관리</h3>
              <p className="text-sm text-gray-600">상품 목록 보기</p>
            </div>
          </div>
        </Link>

        <Link
          href="/crawl"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔗</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">도매매 크롤러</h3>
              <p className="text-sm text-gray-600">상품 불러오기</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
