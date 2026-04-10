// src/components/dashboard/ProductsTable.tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 스마트 상품 테이블 (이미지 없는 상품 디자인 개선)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

'use client';

import { useState } from 'react';
import { ExcelExportButton } from '@/components/naver/ExcelExportButton';

interface Product {
  id: string;
  name: string;
  mainImage: string | null;
  salePrice: number;
  supplierPrice: number;
  aiScore: number;
  status: string;
  category: string | null;
  margin: number;
  imageCount: number;
  keywordCount: number;
  isReady: boolean;
  createdAt: string;
}

interface Props {
  products: Product[];
  loading?: boolean;
  onSelectionChange?: (ids: string[]) => void;
}

export function ProductsTable({ products, loading, onSelectionChange }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelectAll = (checked: boolean) => {
    const ids = checked ? products.map(p => p.id) : [];
    setSelectedIds(ids);
    onSelectionChange?.(ids);
  };

  const handleSelect = (id: string, checked: boolean) => {
    const ids = checked 
      ? [...selectedIds, id]
      : selectedIds.filter(i => i !== id);
    setSelectedIds(ids);
    onSelectionChange?.(ids);
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { text: 'S급', color: 'bg-purple-500' };
    if (score >= 80) return { text: 'A급', color: 'bg-green-500' };
    if (score >= 70) return { text: 'B급', color: 'bg-blue-500' };
    if (score >= 60) return { text: 'C급', color: 'bg-yellow-500' };
    return { text: 'D급', color: 'bg-red-500' };
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; color: string }> = {
      DRAFT: { text: '임시저장', color: 'bg-gray-400' },
      READY: { text: '등록대기', color: 'bg-green-500' },
      PUBLISHED: { text: '판매중', color: 'bg-blue-500' },
    };
    return badges[status] || badges.DRAFT;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">상품 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* 상단 툴바 */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="checkbox"
            checked={selectedIds.length === products.length && products.length > 0}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="w-5 h-5 text-pink-600"
          />
          <span className="text-sm text-gray-600">
            {selectedIds.length > 0 ? `${selectedIds.length}개 선택됨` : '전체 선택'}
          </span>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex gap-2">
            <ExcelExportButton
              mode="batch"
              productIds={selectedIds}
              buttonText={`📥 선택 ${selectedIds.length}개 엑셀 다운로드`}
              buttonClassName="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600"
            />
            <button
              onClick={() => {
                setSelectedIds([]);
                onSelectionChange?.([]);
              }}
              className="px-4 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600"
            >
              선택 해제
            </button>
          </div>
        )}
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-4 py-3"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상품 정보
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                AI 점수
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                가격 / 마진
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                최적화
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => {
              const scoreBadge = getScoreBadge(product.aiScore);
              const statusBadge = getStatusBadge(product.status);

              return (
                <tr key={product.id} className="hover:bg-gray-50 transition">
                  {/* 체크박스 */}
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={(e) => handleSelect(product.id, e.target.checked)}
                      className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
                    />
                  </td>

                  {/* 상품 정보 - 이미지 개선 */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.mainImage ? (
                        <img
                          src={product.mainImage}
                          alt={product.name}
                          className="w-14 h-14 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
                          onError={(e) => {
                            // 이미지 로드 실패 시 폴백
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      {/* 이미지 없을 때 아이콘 (디자인 개선) */}
                      <div 
                        className={`w-14 h-14 rounded-lg flex items-center justify-center ${
                          product.mainImage ? 'hidden' : ''
                        } bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-dashed border-gray-300`}
                      >
                        <svg 
                          className="w-8 h-8 text-gray-400" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={1.5} 
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate" title={product.name}>
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {product.category || '미분류'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* AI 점수 */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl font-bold text-gray-900">{product.aiScore}</span>
                      <span className={`${scoreBadge.color} text-white text-xs px-2 py-1 rounded-full font-semibold`}>
                        {scoreBadge.text}
                      </span>
                    </div>
                  </td>

                  {/* 상태 */}
                  <td className="px-4 py-3 text-center">
                    <span className={`${statusBadge.color} text-white text-xs px-3 py-1 rounded-full font-semibold`}>
                      {statusBadge.text}
                    </span>
                    {product.isReady && (
                      <div className="text-xs text-green-600 mt-1 font-medium">✓ 등록 가능</div>
                    )}
                  </td>

                  {/* 가격 / 마진 */}
                  <td className="px-4 py-3 text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {product.salePrice.toLocaleString()}원
                    </p>
                    <p className="text-xs text-gray-500">
                      공급: {product.supplierPrice.toLocaleString()}원
                    </p>
                    <p className={`text-xs font-semibold mt-1 ${product.margin >= 30 ? 'text-green-600' : 'text-yellow-600'}`}>
                      마진 {product.margin}%
                    </p>
                  </td>

                  {/* 최적화 현황 */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={product.keywordCount >= 3 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                          {product.keywordCount >= 3 ? '✓' : '✗'}
                        </span>
                        <span>키워드 {product.keywordCount}개</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={product.imageCount >= 3 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                          {product.imageCount >= 3 ? '✓' : '✗'}
                        </span>
                        <span>이미지 {product.imageCount}장</span>
                      </div>
                    </div>
                  </td>

                  {/* 액션 */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          // 안전한 리디렉션
                          try {
                            window.location.href = `/products/${product.id}/edit`;
                          } catch (error) {
                            console.error('편집 페이지 이동 오류:', error);
                            alert('편집 페이지로 이동할 수 없습니다. 개발자 도구를 확인하세요.');
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        📝 편집
                      </button>
                      <ExcelExportButton
                        mode="single"
                        productId={product.id}
                        buttonText="📥 엑셀"
                        buttonClassName="text-xs text-green-600 hover:text-green-700 font-medium"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 빈 상태 */}
      {products.length === 0 && (
        <div className="p-12 text-center">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-gray-500 text-lg font-medium">상품이 없습니다</p>
          <p className="text-gray-400 text-sm mt-2">새 상품을 등록하거나 필터를 변경해보세요</p>
          <button
            onClick={() => window.location.href = '/products/new'}
            className="mt-6 px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
          >
            ➕ 새 상품 등록
          </button>
        </div>
      )}
    </div>
  );
}
