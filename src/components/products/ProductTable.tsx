'use client';

import Link from 'next/link';
import { Edit, Trash2 } from 'lucide-react';
import { formatKRW, formatPercent, formatDateTime } from '@/lib/utils/format';
import { calculateNaverSeoScore } from '@/lib/seo';

interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string;
  supply_price?: number;
  supplierPrice?: number;
  selling_price?: number;
  salePrice?: number;
  shipping_cost?: number;
  shippingCost?: number;
  stock?: number;
  status: string;
  images?: string[];
  mainImage?: string;
  created_at?: string;
  createdAt?: string;
  naver_title?: string;
  naver_keywords?: string;
  naver_description?: string;
  naver_brand?: string;
  naver_origin?: string;
  naver_material?: string;
  naver_care_instructions?: string;
}

interface ProductTableProps {
  products: Product[];
  selectedIds?: string[];
  setSelectedIds?: (ids: string[]) => void;
  onDelete?: (id: string) => void;
}

export default function ProductTable({ 
  products, 
  selectedIds = [],
  setSelectedIds,
  onDelete 
}: ProductTableProps) {

  // 마진 계산 (기존 로직 유지)
  const calculateMargin = (product: Product) => {
    const supplyPrice = product.supply_price || product.supplierPrice || 0;
    const sellingPrice = product.selling_price || product.salePrice || 0;
    const shippingCost = product.shipping_cost || product.shippingCost || 0;

    const cost = supplyPrice + shippingCost;
    const fee = sellingPrice * 0.058;
    const profit = sellingPrice - cost - fee;
    return sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
  };

  // SEO 점수 색상
  const getSeoColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // 상태 뱃지
  const getStatusBadge = (status: string) => {
    const badges: any = {
      DRAFT: 'bg-gray-100 text-gray-700',
      draft: 'bg-gray-100 text-gray-700',
      ACTIVE: 'bg-green-100 text-green-700',
      published: 'bg-green-100 text-green-700',
      SOLD_OUT: 'bg-red-100 text-red-700',
      HIDDEN: 'bg-gray-100 text-gray-500',
      todo: 'bg-yellow-100 text-yellow-700',
    };
    const labels: any = {
      DRAFT: '초안',
      draft: '초안',
      ACTIVE: '판매중',
      published: '판매중',
      SOLD_OUT: '품절',
      HIDDEN: '숨김',
      todo: '준비중',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status] || badges.DRAFT}`}>
        {labels[status] || status}
      </span>
    );
  };

  // 전체 선택
  const handleSelectAll = (checked: boolean) => {
    if (setSelectedIds) {
      if (checked) {
        setSelectedIds(products.map(p => p.id));
      } else {
        setSelectedIds([]);
      }
    }
  };

  // 개별 선택
  const handleSelect = (id: string, checked: boolean) => {
    if (setSelectedIds) {
      if (checked) {
        setSelectedIds([...selectedIds, id]);
      } else {
        setSelectedIds(selectedIds.filter(sid => sid !== id));
      }
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {setSelectedIds && (
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.length === products.length && products.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                />
              </th>
            )}

            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              이미지
            </th>

            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              상품명
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              SKU
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              도매가
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              판매가
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              마진율
            </th>

            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              상태
            </th>

            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              SEO
            </th>

            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              등록일
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              액션
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map((product) => {
            const margin = calculateMargin(product);
            const seoScore = calculateNaverSeoScore(product);
            const createdAt = product.created_at || product.createdAt;
            const sellingPrice = product.selling_price || product.salePrice || 0;
            const supplyPrice = product.supply_price || product.supplierPrice || 0;

            return (
              <tr key={product.id} className="hover:bg-gray-50 transition">
                {setSelectedIds && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={(e) => handleSelect(product.id, e.target.checked)}
                      className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                    />
                  </td>
                )}

                <td className="px-4 py-3">
                  {(product.images && product.images.length > 0) || product.mainImage ? (
                    <img
                      src={product.mainImage || product.images![0]}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
                      🌸
                    </div>
                  )}
                </td>

                <td className="px-6 py-4">
                  <Link 
                    href={`/products/${product.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-pink-600"
                  >
                    {product.name}
                  </Link>
                  {product.category && (
                    <p className="text-xs text-gray-500 mt-1">{product.category}</p>
                  )}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600 font-mono">{product.sku}</span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm text-gray-900">{formatKRW(supplyPrice)}</span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-semibold text-pink-600">
                    {formatKRW(sellingPrice)}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className={`text-sm font-bold ${
                    margin >= 30 ? 'text-green-600' :
                    margin >= 20 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {formatPercent(margin)}
                  </span>
                </td>

                <td className="px-4 py-3 text-center">
                  {getStatusBadge(product.status)}
                </td>

                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${getSeoColor(seoScore)}`}>
                    {seoScore}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600">
                    {createdAt ? formatDateTime(createdAt) : '-'}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/products/${product.id}/edit`}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="수정"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(product.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
