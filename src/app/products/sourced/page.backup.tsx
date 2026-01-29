'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, ExternalLink, CheckCircle, Clock, Package, Download, FileSpreadsheet, Plus, Edit3 } from 'lucide-react';

type Product = {
  id: string;
  name: string;
  sku: string;
  supplierPrice: number;
  salePrice: number;
  margin: number;
  mainImage: string | null;
  status: string;
  category: string;
  hasOptions: boolean;
  createdAt: string;
  naverProductId?: string | null;
  description?: string;
  naver_title?: string | null;
  naver_keywords?: string | null;
};

type FilterType = 'ALL' | 'DRAFT' | 'REGISTERED';

export default function SourcedProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/products?page=1&limit=50');
      const data = await response.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('상품 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // ... (기존 함수들 동일 - downloadNaverExcel, toggleSelection 등)

  const isDraft = (status: string) => status === 'todo' || status === 'DRAFT';
  const isRegistered = (status: string) => status === 'registered' || status === 'NAVER_REGISTERED';
  const hasSeo = (product: Product) => product.naver_title || product.naver_keywords;

  const filteredProducts = products
    .filter(p => {
      if (filter === 'DRAFT') return isDraft(p.status);
      if (filter === 'REGISTERED') return isRegistered(p.status);
      return true;
    })
    .filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const stats = {
    total: products.length,
    draft: products.filter(p => isDraft(p.status)).length,
    registered: products.filter(p => isRegistered(p.status)).length,
  };

  // ... (기존 모달 및 로딩 JSX 동일)

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 p-6">
      {/* 헤더 및 통계 (기존 동일) */}

      {/* 상품 목록 - 수정된 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden relative"
          >
            {/* 체크박스 */}
            <div className="p-4 pb-0 absolute top-4 left-4 z-10">
              <input
                type="checkbox"
                checked={selectedIds.includes(product.id)}
                onChange={() => toggleSelection(product.id)}
                className="w-4 h-4 text-pink-500 rounded focus:ring-pink-500"
              />
            </div>

            {/* 이미지 */}
            <Link href={`/products/sourced/${product.id}`}>
              <div className="relative h-48 bg-gray-100">
                {product.mainImage ? (
                  <Image
                    src={product.mainImage}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="w-12 h-12 text-gray-300" />
                  </div>
                )}
              </div>
            </Link>

            <div className="p-6">
              {/* 상품명 */}
              <Link href={`/products/sourced/${product.id}`}>
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-pink-500">
                  {product.name}
                </h3>
              </Link>

              {/* SKU */}
              <p className="text-sm text-gray-500 mb-4 font-mono bg-gray-50 px-3 py-1 rounded-lg">
                {product.sku}
              </p>

              {/* 가격 정보 */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>공급가</span>
                  <span>{product.supplierPrice.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>판매가</span>
                  <span className="text-pink-500">{product.salePrice.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">마진</span>
                  <span className="font-bold text-green-600 text-lg">{product.margin}%</span>
                </div>
              </div>

              {/* 상태 태그 */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {isDraft(product.status) ? (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
                    ⏳ 등록 대기
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                    ✅ 등록 완료
                  </span>
                )}

                {hasSeo(product) && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">
                    SEO ✓
                  </span>
                )}

                {product.hasOptions && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                    옵션
                  </span>
                )}
              </div>

              {/* 🔥 버튼 영역 - 편집 버튼 추가 */}
              <div className="flex gap-2">
                {/* 편집 버튼 👈 핵심 추가! */}
                <Link
                  href={`/products/${product.id}/edit`}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Edit3 className="w-4 h-4" />
                  편집
                </Link>

                {/* 기존 다운로드/보기 버튼 */}
                {isDraft(product.status) ? (
                  <button
                    className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 text-sm w-20"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                ) : (
                  <Link
                    href="https://sell.smartstore.naver.com"
                    target="_blank"
                    className="px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 text-sm w-20"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                )}

                {/* 삭제 버튼 */}
                <button
                  className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all w-16 flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}