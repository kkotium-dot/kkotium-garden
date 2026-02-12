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
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        category: filters.category,
        status: filters.status,
        ...(filters.priceMin && { minPrice: filters.priceMin }),
        ...(filters.priceMax && { maxPrice: filters.priceMax }),
        ...(filters.seoScore && { seoScore: filters.seoScore }),
        limit: '50', // ✅ limit 증가
      });

      console.log('🔄 상품 목록 요청 시작...');

      // ✅ 타임아웃 설정 (10초)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(\`/api/products?\${params}\`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }

      const data = await response.json();

      if (data.success) {
        setRawProducts(data.products);
        console.log(\`✅ 상품 \${data.products.length}개 로드 완료\`);
      } else {
        throw new Error(data.error || '상품 로드 실패');
      }
    } catch (error: any) {
      console.error('❌ 상품 로드 실패:', error);

      if (error.name === 'AbortError') {
        setError('요청 시간 초과 (10초). 서버 상태를 확인해주세요.');
      } else {
        setError(error.message || '상품 로드 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">상품 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            총 {rawProducts.length}개 상품 (필터링: {filteredProducts.length}개)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProducts}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 \${loading ? 'animate-spin' : ''}\`} />
            새로고침
          </button>

          <Link
            href="/products/new"
            className="flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 transition"
          >
            <Plus className="w-4 h-4 mr-2" />
            새 상품 등록
          </Link>
        </div>
      </div>

      {/* 필터 */}
      <div className="mb-6">
        <ProductFilters
          filters={filters}
          categories={categories}
          onChange={handleFilterChange}
        />
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">❌ {error}</p>
          <button
            onClick={fetchProducts}
            className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 상품 테이블 */}
      <ProductTable products={filteredProducts} loading={loading} />
    </div>
  );
}
