'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw, Filter, Search } from 'lucide-react';
import ProductTable from '@/components/ProductTable';
import ProductFilters from '@/components/products/ProductFilters';
import { calculateNaverSeoScore, getSeoGrade } from '@/lib/seo';

interface FilterState {
  category: string;
  status: string;
  priceMin: string;
  priceMax: string;
  marginMin: string;
  seoScore: string;
  search: string;
}

// 🎯 카테고리 매핑 (영문 → 한글)
const CATEGORY_MAP: Record<string, string> = {
  'flower': '꽃',
  'plant': '식물',
  'gift': '선물세트',
  'supplies': '원예용품',
};

export default function ProductsPage() {
  const [rawProducts, setRawProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    status: '',
    priceMin: '',
    priceMax: '',
    marginMin: '',
    seoScore: '',
    search: '',
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 🎯 동적 카테고리 추출 (한글 표시명 포함)
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    rawProducts.forEach((p: any) => {
      if (p.category && p.category.trim() !== '') {
        uniqueCategories.add(p.category);
      }
    });

    return Array.from(uniqueCategories).map(cat => ({
      value: cat,
      label: CATEGORY_MAP[cat as keyof typeof CATEGORY_MAP] || cat,
    }));
  }, [rawProducts]);

  // 🎯 필터링된 상품
  const filteredProducts = useMemo(() => {
    return rawProducts.filter((product: any) => {
      const seoScore = calculateNaverSeoScore(product);

      // 검색
      if (filters.search && !product.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // 카테고리
      if (filters.category && product.category !== filters.category) {
        return false;
      }

      // 상태
      if (filters.status && product.status !== filters.status) {
        return false;
      }

      // 가격 범위
      const salePrice = product.salePrice || 0;
      if (filters.priceMin && salePrice < parseInt(filters.priceMin)) return false;
      if (filters.priceMax && salePrice > parseInt(filters.priceMax)) return false;

      // 마진 범위
      if (filters.marginMin && product.margin < parseFloat(filters.marginMin)) {
        return false;
      }

      // SEO 점수 필터
      if (filters.seoScore) {
        if (filters.seoScore === '100+' && seoScore < 100) return false;
        if (filters.seoScore === '80-99' && (seoScore < 80 || seoScore >= 100)) return false;
        if (filters.seoScore === '70-79' && (seoScore < 70 || seoScore >= 80)) return false;
      }

      return true;
    }).sort((a: any, b: any) => {
      const scoreA = calculateNaverSeoScore(a);
      const scoreB = calculateNaverSeoScore(b);
      return scoreB - scoreA; // SEO 점수 내림차순
    });
  }, [rawProducts, filters]);

  // 상품 목록 로드
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category: filters.category,
        status: filters.status,
        ...(filters.priceMin && { minPrice: filters.priceMin }),
        ...(filters.priceMax && { maxPrice: filters.priceMax }),
        ...(filters.seoScore && { seoScore: filters.seoScore }),
      });

      const response = await fetch(`/api/products?${params}`);
      const data = await response.json();

      if (data.success) {
        setRawProducts(data.products);
      }
    } catch (error) {
      console.error('상품 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleBulkAction = (action: 'delete' | 'publish') => {
    console.log('벌크 액션:', action, selectedIds);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold text-gray-900">
            상품 목록 ({filteredProducts.length}/{rawProducts.length})
          </h1>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>S등급: {filteredProducts.filter((p: any) => calculateNaverSeoScore(p) >= 100).length}</span>
            <span>A등급: {filteredProducts.filter((p: any) => calculateNaverSeoScore(p) >= 90).length}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchProducts}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </button>
          <Link
            href="/products/new"
            className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            새 상품 등록
          </Link>
        </div>
      </div>

      {/* 필터 & 검색 */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          <div className="flex-1 min-w-0">
            <ProductFilters
              filters={filters}
              categories={categories}
              onFilterChange={handleFilterChange}
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">
              선택 {selectedIds.length}개
            </span>
            <button
              onClick={() => handleBulkAction('delete')}
              className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200"
              disabled={selectedIds.length === 0}
            >
              삭제
            </button>
            <button
              onClick={() => handleBulkAction('publish')}
              className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200"
              disabled={selectedIds.length === 0}
            >
              출시
            </button>
          </div>
        </div>
      </div>

      {/* 상품 테이블 */}
      <ProductTable
        products={filteredProducts}
        onEdit={(product: any) => {
          console.log('편집:', product);
          // /products/[id]/edit 로 이동
        }}
        onDelete={(id: string) => {
          console.log('삭제:', id);
        }}
      />
    </div>
  );
}
