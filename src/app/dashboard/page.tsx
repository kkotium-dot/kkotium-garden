// src/app/dashboard/page.tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 통합 관리 대시보드 메인 페이지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

'use client';

import { useEffect, useState } from 'react';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { ProductsTable } from '@/components/dashboard/ProductsTable';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { ExcelExportButton } from '@/components/naver/ExcelExportButton';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<any>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [period, setPeriod] = useState('7d');

  useEffect(() => {
    loadData();
  }, [filters, period]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 통계 로드
      const statsRes = await fetch(`/api/dashboard/stats?period=${period}`);
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.data.summary);
      }

      // 상품 목록 로드
      const query = new URLSearchParams(filters).toString();
      const productsRes = await fetch(`/api/dashboard/products?${query}`);
      const productsData = await productsRes.json();
      if (productsData.success) {
        setProducts(productsData.data.products);
      }
    } catch (error) {
      console.error('❌ 데이터 로드 오류:', error);
      alert('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              🌸 통합 관리 대시보드
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              네이버 스마트스토어 상품 관리 센터
            </p>
          </div>

          {/* 기간 선택 */}
          <div className="flex gap-2">
            {['7d', '30d', '90d', 'all'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  period === p
                    ? 'bg-pink-500 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {p === '7d' && '최근 7일'}
                {p === '30d' && '최근 30일'}
                {p === '90d' && '최근 90일'}
                {p === 'all' && '전체'}
              </button>
            ))}
          </div>
        </div>

        {/* KPI 카드 */}
        <KpiCards stats={stats} loading={!stats} />

        {/* 빠른 액션 */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">⚡ 빠른 작업</h2>
              <p className="text-pink-100">
                등록 대기 상품 {stats?.readyProducts || 0}개를 네이버에 한 번에 등록하세요!
              </p>
            </div>
            <div className="flex gap-3">
              <ExcelExportButton
                mode="filter"
                filters={{ status: 'READY', minScore: 60 }}
                buttonText="📥 등록 대기 상품 전체 다운로드"
                buttonClassName="px-6 py-3 bg-white text-pink-600 rounded-lg hover:bg-gray-100 font-bold shadow-lg"
              />
              <button
                onClick={() => window.location.href = '/products/new'}
                className="px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 font-bold shadow-lg"
              >
                ➕ 새 상품 등록
              </button>
            </div>
          </div>
        </div>

        {/* 필터 */}
        <DashboardFilters onFilterChange={(f) => setFilters({ ...filters, ...f })} />

        {/* 선택된 상품 정보 */}
        {selectedIds.length > 0 && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-blue-800 font-bold text-lg">
                ✓ {selectedIds.length}개 상품 선택됨
              </span>
              <span className="text-blue-600 text-sm">
                일괄 작업을 수행할 수 있습니다
              </span>
            </div>
            <div className="flex gap-2">
              <ExcelExportButton
                mode="batch"
                productIds={selectedIds}
                buttonText={`📥 ${selectedIds.length}개 엑셀 다운로드`}
                buttonClassName="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
              />
              <button
                onClick={() => {
                  if (confirm(`선택된 ${selectedIds.length}개 상품을 삭제하시겠습니까?`)) {
                    alert('일괄 삭제 기능은 추후 구현 예정입니다.');
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
              >
                🗑️ 일괄 삭제
              </button>
            </div>
          </div>
        )}

        {/* 상품 테이블 */}
        <ProductsTable
          products={products}
          loading={loading}
          onSelectionChange={setSelectedIds}
        />

        {/* 푸터 통계 */}
        {!loading && products.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>총 {products.length}개 상품 표시 중</span>
              <span>
                평균 AI 점수:{' '}
                <span className="font-bold text-pink-600">
                  {Math.round(
                    products.reduce((sum, p) => sum + p.aiScore, 0) / products.length
                  )}
                  점
                </span>
              </span>
              <span>
                총 예상 마진:{' '}
                <span className="font-bold text-green-600">
                  {Math.round(
                    products.reduce((sum, p) => sum + (p.salePrice - p.supplierPrice), 0) / 10000
                  )}
                  만원
                </span>
              </span>
            </div>
          </div>
        )}

        {/* 로딩 오버레이 */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 shadow-2xl">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-600 mx-auto mb-4"></div>
              <p className="text-gray-700 text-lg font-semibold">데이터 로딩 중...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
