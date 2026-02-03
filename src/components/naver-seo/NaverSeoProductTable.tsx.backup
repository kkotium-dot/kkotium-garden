// ~/Downloads/NaverSeoProductTable_final.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';

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

interface Props {
  products: Product[];
  onProductClick?: (productId: string) => void;
}

export default function NaverSeoProductTable({ products, onProductClick }: Props) {
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'date'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');  // ✅ 기본 내림차순

  // 정렬
  const sortedProducts = [...products].sort((a, b) => {
    let comparison = 0;

    if (sortBy === 'score') {
      comparison = a.seoScore - b.seoScore;
    } else if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // 점수에 따른 색상
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-purple-600 bg-purple-50';
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-blue-600 bg-blue-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-orange-600 bg-orange-50';
  };

  // 점수에 따른 뱃지
  const getScoreBadge = (score: number) => {
    if (score >= 90) return { text: 'S급', color: 'bg-purple-600' };
    if (score >= 80) return { text: 'A급', color: 'bg-green-600' };
    if (score >= 70) return { text: 'B급', color: 'bg-blue-600' };
    if (score >= 60) return { text: 'C급', color: 'bg-yellow-600' };
    return { text: 'D급', color: 'bg-orange-600' };
  };

  const handleSort = (column: 'score' | 'name' | 'date') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');  // ✅ 새 컬럼 선택 시 내림차순
    }
  };

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-gray-400 text-5xl mb-4">📦</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">상품이 없습니다</h3>
        <p className="text-gray-600 text-sm">
          필터 조건을 변경하거나 새로운 상품을 등록해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 테이블 헤더 */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상품 정보
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                onClick={() => handleSort('score')}
              >
                <div className="flex items-center gap-2">
                  SEO 점수
                  {sortBy === 'score' && (
                    <span className="text-purple-600">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                최적화 현황
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                개선 필요 항목
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedProducts.map((product) => {
              const badge = getScoreBadge(product.seoScore);

              return (
                <tr key={product.id} className="hover:bg-gray-50 transition">
                  {/* 상품 정보 */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                        {product.mainImage ? (
                          <Image
                            src={product.mainImage}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            🌸
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate mb-1">
                          {product.name}
                        </h4>
                        {product.naver_title && (
                          <p className="text-xs text-gray-500 truncate">
                            네이버: {product.naver_title}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {product.salePrice.toLocaleString()}원
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* SEO 점수 */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl font-bold ${getScoreColor(product.seoScore)} px-4 py-2 rounded-lg`}>
                        {product.seoScore}점
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${badge.color}`}>
                        {badge.text}
                      </span>
                    </div>
                  </td>

                  {/* 최적화 현황 */}
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={product.naver_title && product.naver_title.length >= 10 ? 'text-green-600' : 'text-gray-400'}>
                          {product.naver_title && product.naver_title.length >= 10 ? '✓' : '○'} 제목
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={product.keywordCount >= 3 ? 'text-green-600' : 'text-gray-400'}>
                          {product.keywordCount >= 3 ? '✓' : '○'} 키워드 ({product.keywordCount})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={product.naver_description && product.naver_description.length >= 50 ? 'text-green-600' : 'text-gray-400'}>
                          {product.naver_description && product.naver_description.length >= 50 ? '✓' : '○'} 설명
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={product.naver_brand ? 'text-green-600' : 'text-gray-400'}>
                          {product.naver_brand ? '✓' : '○'} 브랜드
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* 개선 필요 항목 */}
                  <td className="px-6 py-4">
                    {product.suggestions.length > 0 ? (
                      <ul className="space-y-1">
                        {product.suggestions.slice(0, 3).map((suggestion, idx) => (
                          <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                            <span className="text-yellow-500 flex-shrink-0">⚠</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                        {product.suggestions.length > 3 && (
                          <li className="text-xs text-gray-400">
                            +{product.suggestions.length - 3}개 더보기
                          </li>
                        )}
                      </ul>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-green-600 text-lg">✓</span>
                        <span className="text-xs text-green-600 font-medium">모두 완료</span>
                      </div>
                    )}
                  </td>

                  {/* 작업 */}
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onProductClick?.(product.id)}
                      className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
                    >
                      최적화
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 푸터 */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          총 <span className="font-medium text-gray-900">{products.length}</span>개 상품
        </p>
      </div>
    </div>
  );
}
