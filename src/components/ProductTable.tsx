'use client';

import Link from 'next/link';
import { Package, ExternalLink } from 'lucide-react';
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
}

interface ProductTableProps {
  products: Product[];
  loading?: boolean;
}

export default function ProductTable({ products, loading = false }: ProductTableProps) {
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product) => {
              const seoScore = calculateNaverSeoScore(product);
              const seoGrade = getSeoGrade(seoScore);

              return (
                <tr
                  key={product.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/products/${product.id}`}
                >
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
                    {product.category && (
                      <div className="text-xs text-gray-500 mt-1">
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 테이블 하단 요약 */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          총 <span className="font-semibold text-gray-900">{products.length}</span>개 상품
        </p>
      </div>
    </div>
  );
}
