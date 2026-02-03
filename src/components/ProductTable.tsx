// src/components/ProductTable.tsx
'use client';

import Link from 'next/link';
import { Product } from '@/types/product';
import { calculateSeoScore, getSeoGrade } from '@/lib/seo';

interface ProductTableProps {
  products: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
}

export default function ProductTable({ 
  products, 
  onEdit, 
  onDelete 
}: ProductTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-md">
        <thead>
          <tr className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">
              이미지
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">
              상품명
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">
              SKU
            </th>
            <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">
              도매가
            </th>
            <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">
              판매가
            </th>
            <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">
              마진
            </th>
            <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">
              SEO 점수
            </th>
            <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">
              등록일
            </th>
            <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">
              액션
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {products.map((product) => {
            const seoScore = calculateSeoScore(product as any);
            const seoGrade = getSeoGrade(seoScore);

            return (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                      {product.mainImage ? (
                        <img
                          src={product.mainImage}
                          alt="상품 썸네일"
                          className="w-12 h-12 object-cover"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">이미지없음</span>
                      )}
                    </div>
                    <span className="ml-2 text-xs text-gray-500 font-medium">
                      {product.imageCount || 0}/10
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap max-w-xs">
                  <div>
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {product.category || '미분류'}
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.sku}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  ₩{(product.supplierPrice || 0).toLocaleString()}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                  ₩{(product.salePrice || 0).toLocaleString()}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    (product.margin || 0) >= 30 ? 'bg-green-100 text-green-800' :
                    (product.margin || 0) >= 20 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {(product.margin || 0).toFixed(1)}%
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <div className={`text-sm font-bold px-3 py-1 rounded-full shadow-sm ${
                      seoGrade.color === 'purple' ? 'bg-purple-100 text-purple-800 ring-1 ring-purple-200' :
                      seoGrade.color === 'green' ? 'bg-green-100 text-green-800 ring-1 ring-green-200' :
                      seoGrade.color === 'blue' ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-200' :
                      seoGrade.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200' :
                      'bg-red-100 text-red-800 ring-1 ring-red-200'
                    }`}>
                      {seoScore}
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-wide">
                      {seoGrade.grade}
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(product.createdAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => onEdit?.(product)}
                    className="text-indigo-600 hover:text-indigo-900 hover:underline font-medium"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => onDelete?.(product.id)}
                    className="text-red-600 hover:text-red-900 hover:underline font-medium"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {products.length === 0 && (
        <div className="text-center py-20 px-6">
          <div className="mx-auto w-24 h-24 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">📦</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            등록된 상품이 없습니다
          </h3>
          <p className="text-gray-500 mb-6">
            첫 번째 상품을 등록해보세요
          </p>
          <Link
            href="/products/new"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
          >
            새 상품 등록
          </Link>
        </div>
      )}
    </div>
  );
}
