'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Package, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
import { calculateNaverSeoScore, getSeoGrade } from '@/lib/seo';

interface Product {
  id: string;
  name: string;
  sku: string;
  salePrice: number;
  supplierPrice: number;
  margin: number;
  category?: string;
  status: string;
  images?: string[];
  mainImage?: string;
  naver_title?: string;
  naver_keywords?: string;
  naver_description?: string;
  supplierName?: string;
  platformName?: string;
}

interface ProductTableProps {
  products: Product[];
  loading?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export default function ProductTable({
  products,
  loading = false,
  onRefresh,
  selectedIds: externalSelectedIds,
  onSelectionChange,
}: ProductTableProps & { onRefresh?: () => void }) {
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);

  // 외부 제어(selectedIds prop)가 있으면 그것을 쓰고, 없으면 내부 상태 사용
  const selectedIds = externalSelectedIds ?? internalSelectedIds;

  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = selectedIds.includes(id)
      ? selectedIds.filter((s) => s !== id)
      : [...selectedIds, id];
    if (onSelectionChange) {
      onSelectionChange(next);
    } else {
      setInternalSelectedIds(next);
    }
  }, [selectedIds, onSelectionChange]);

  const toggleAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked ? products.map((p) => p.id) : [];
    if (onSelectionChange) {
      onSelectionChange(next);
    } else {
      setInternalSelectedIds(next);
    }
  }, [products, onSelectionChange]);

  const isAllSelected = products.length > 0 && selectedIds.length === products.length;

  const handleAiSeo = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setAiLoadingId(product.id);
    try {
      // 1. AI 생성
      const res = await fetch('/api/products/temp/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'all',
          name: product.name,
          category: product.category,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'AI 생성 실패');

      // 2. DB 저장
      const saveRes = await fetch(`/api/products?id=${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naver_title: data.titles?.[0] ?? product.naver_title ?? '',
          naver_keywords: Array.isArray(data.keywords) ? data.keywords.join(', ') : '',
          naver_description: typeof data.description === 'string' ? data.description.slice(0, 300) : '',
        }),
      });
      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error(saveData.error || '저장 실패');

      alert(`✨ [${product.name}] AI SEO 저장 완료!`);
      onRefresh?.();
    } catch (err: any) {
      alert(err?.message || 'AI SEO 실패');
    } finally {
      setAiLoadingId(null);
    }
  };
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <Package className="w-16 h-16 text-gray-300 mb-4 animate-pulse" />
          <p className="text-gray-500">상품 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <Package className="w-16 h-16 text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2">등록된 상품이 없습니다</p>
          <p className="text-sm text-gray-400">첫 번째 상품을 등록해보세요</p>
        </div>
      </div>
    );
  }

  // 마진율 색상
  const getMarginColor = (margin: number) => {
    if (margin >= 60) return 'text-green-600 bg-green-50';
    if (margin >= 40) return 'text-green-500 bg-green-50';
    if (margin >= 20) return 'text-orange-500 bg-orange-50';
    return 'text-red-500 bg-red-50';
  };

  // 상태 색상
  const getStatusColor = (status: string) => {
    if (status === 'ACTIVE') return 'bg-green-100 text-green-700';
    if (status === 'DRAFT') return 'bg-gray-100 text-gray-700';
    if (status === 'OUT_OF_STOCK') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'ACTIVE') return '판매중';
    if (status === 'DRAFT') return '준비중';
    if (status === 'OUT_OF_STOCK') return '품절';
    return status;
  };

  // ✅ SEO 등급 색상 (getSeoGrade의 color 속성 활용)
  const getSeoGradeColor = (grade: string) => {
    if (grade === 'S') return 'bg-purple-100 text-purple-700';
    if (grade === 'A') return 'bg-green-100 text-green-700';
    if (grade === 'B') return 'bg-blue-100 text-blue-700';
    if (grade === 'C') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-pink-50 to-purple-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-4 w-10">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-gray-300 text-pink-500 cursor-pointer"
                  title="전체 선택"
                />
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                이미지
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                상품명
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                도매가
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                판매가
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                마진율
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                SEO 점수
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                액션
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                AI SEO
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product) => {
              const seoScore = calculateNaverSeoScore(product);
              const seoGrade = getSeoGrade(seoScore);

              return (
                <tr
                  key={product.id}
                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                    selectedIds.includes(product.id) ? 'bg-pink-50' : ''
                  }`}
                  onClick={() => window.location.href = `/products/${product.id}`}
                >
                  <td className="px-4 py-4" onClick={(e) => toggleSelect(product.id, e)}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={() => {}}
                      onClick={(e) => toggleSelect(product.id, e)}
                      className="w-4 h-4 rounded border-gray-300 text-pink-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                      {product.mainImage || product.images?.[0] ? (
                        <img
                          src={product.mainImage || product.images?.[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {product.name}
                    </div>
                    {(product.supplierName || product.platformName) && (
                      <div className="flex items-center gap-1 mt-1">
                        {product.platformName && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-mono">
                            {product.platformName}
                          </span>
                        )}
                        {product.supplierName && (
                          <span className="text-xs text-gray-500">
                            {product.supplierName}
                          </span>
                        )}
                      </div>
                    )}
                    {product.category && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {product.category}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 font-mono">
                      {product.sku}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">
                      {product.supplierPrice?.toLocaleString() || 0}원
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">
                      {product.salePrice?.toLocaleString() || 0}원
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getMarginColor(product.margin || 0)}`}>
                      {(product.margin || 0).toFixed(1)}%
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        {seoScore}점
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getSeoGradeColor(seoGrade.grade)}`}>
                        {seoGrade.grade} {seoGrade.label}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                      {getStatusLabel(product.status)}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <Link
                      href={`/products/${product.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-sm text-pink-600 hover:text-pink-700 font-medium transition"
                    >
                      <span>상세보기</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>

                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    {seoScore < 60 ? (
                      <button
                        onClick={(e) => handleAiSeo(e, product)}
                        disabled={aiLoadingId === product.id}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition ${
                          aiLoadingId === product.id
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-md'
                        }`}
                      >
                        {aiLoadingId === product.id ? (
                          <><Loader2 className="w-3 h-3 animate-spin" />생성중</>
                        ) : (
                          <><Sparkles className="w-3 h-3" />AI SEO</>
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">✓ 최적화됨</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 테이블 하단 요약 */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          총 <span className="font-semibold text-gray-900">{products.length}</span>개 상품
          {selectedIds.length > 0 && (
            <span className="ml-2 text-pink-600 font-semibold">
              ({selectedIds.length}개 선택됨)
            </span>
          )}
        </p>
        {selectedIds.length > 0 && (
          <button
            onClick={() => {
              if (onSelectionChange) onSelectionChange([]);
              else setInternalSelectedIds([]);
            }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            선택 해제
          </button>
        )}
      </div>
    </div>
  );
}
