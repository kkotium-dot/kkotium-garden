'use client';

import Link from 'next/link';
import { Edit, Trash2, ExternalLink } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  salePrice: number;
  stock?: number;
  status: string;
  images: string[];
  createdAt: string;
  naver_title?: string;
  naver_keywords?: string;
  naver_description?: string;
}

interface Props {
  products: Product[];
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  onDelete: (id: string) => void;
}

export default function ProductTable({ products, selectedIds, setSelectedIds, onDelete }: Props) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(products.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    }
  };

  const calculateSeoScore = (product: Product) => {
    let score = 0;
    if (product.naver_title && product.naver_title.length >= 10) score += 40;
    if (product.naver_keywords && product.naver_keywords.split(',').length >= 3) score += 30;
    if (product.naver_description && product.naver_description.length >= 50) score += 30;
    return score;
  };

  const getSeoColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      DRAFT: 'bg-gray-100 text-gray-700',
      ACTIVE: 'bg-green-100 text-green-700',
      SOLD_OUT: 'bg-red-100 text-red-700',
      HIDDEN: 'bg-gray-100 text-gray-500',
    };
    const labels: any = {
      DRAFT: '초안',
      ACTIVE: '판매중',
      SOLD_OUT: '품절',
      HIDDEN: '숨김',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status] || badges.DRAFT}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedIds.length === products.length && products.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이미지</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상품명</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">카테고리</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">판매가</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">상태</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">SEO</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">액션</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {products.map((product) => {
            const seoScore = calculateSeoScore(product);
            return (
              <tr key={product.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(product.id)}
                    onChange={(e) => handleSelect(product.id, e.target.checked)}
                    className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                  />
                </td>
                <td className="px-4 py-3">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
                      🌸
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/products/${product.id}`}
                    className="font-medium text-gray-900 hover:text-pink-600 transition"
                  >
                    {product.name}
                  </Link>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(product.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                  {product.sku}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {product.category || '-'}
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                  {product.salePrice.toLocaleString()}원
                </td>
                <td className="px-4 py-3 text-center">
                  {getStatusBadge(product.status)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${getSeoColor(seoScore)}`}>
                    {seoScore}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <Link
                      href={`/products/${product.id}/edit`}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="수정"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => onDelete(product.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
