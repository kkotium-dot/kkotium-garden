'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw } from 'lucide-react';
import ProductTable from '@/components/products/ProductTable';
import ProductFilters from '@/components/products/ProductFilters';
import { calculateNaverSeoScore } from '@/lib/seo';

interface FilterState {
  category: string;
  status: string;
  priceMin: string;
  priceMax: string;
  marginMin: string;
  seoScore: string;
}

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
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 🎯 동적 카테고리 추출
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    rawProducts.forEach((p: any) => {
      if (p.category && p.category.trim() !== '') {
        uniqueCategories.add(p.category);
      }
    });
    return Array.from(uniqueCategories).sort();
  }, [rawProducts]);

  // 초기 데이터 로드
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();

      if (data.success) {
        console.log('✅ API 상품 데이터:', data.products);
        setRawProducts(data.products || []);
      }
    } catch (error) {
      console.error('❌ 상품 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // useMemo로 필터링 (성능 최적화 + 명확한 로직)
  const filteredProducts = useMemo(() => {
    console.log('🔍 필터 적용:', filters);
    let result = [...rawProducts];

    // 1. 카테고리 필터 (✅ 빈 문자열 체크 추가)
    if (filters.category && filters.category.trim() !== '') {
      result = result.filter((p: any) => {
        const productCategory = p.category || '';
        console.log('카테고리 비교:', productCategory, '===', filters.category);
        return productCategory === filters.category;
      });
    }

    // 2. 상태 필터 (✅ 빈 문자열 체크 추가)
    if (filters.status && filters.status.trim() !== '') {
      result = result.filter((p: any) => p.status === filters.status);
    }

    // 3. 가격 필터
    if (filters.priceMin) {
      const minPrice = parseFloat(filters.priceMin);
      result = result.filter((p: any) => {
        const price = p.selling_price || p.salePrice || 0;
        return price >= minPrice;
      });
    }

    if (filters.priceMax) {
      const maxPrice = parseFloat(filters.priceMax);
      result = result.filter((p: any) => {
        const price = p.selling_price || p.salePrice || 0;
        return price <= maxPrice;
      });
    }

    // 4. 마진 필터
    if (filters.marginMin) {
      const minMargin = parseFloat(filters.marginMin);
      result = result.filter((p: any) => {
        const supplyPrice = p.supply_price || p.supplierPrice || 0;
        const sellingPrice = p.selling_price || p.salePrice || 0;
        const shippingCost = p.shipping_cost || p.shippingCost || 0;
        const cost = supplyPrice + shippingCost;
        const fee = sellingPrice * 0.058;
        const profit = sellingPrice - cost - fee;
        const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
        return margin >= minMargin;
      });
    }

    // 5. SEO 점수 필터 (✅ 빈 문자열 체크 + 정확한 매칭)
    if (filters.seoScore && filters.seoScore.trim() !== '') {
      console.log('🎯 SEO 필터 적용:', filters.seoScore);
      result = result.filter((p: any) => {
        const score = calculateNaverSeoScore(p);
        console.log('상품:', p.name, '/ SEO 점수:', score);

        if (filters.seoScore === '100') {
          return score === 100;
        } else if (filters.seoScore === '80-99') {
          return score >= 80 && score < 100;
        } else if (filters.seoScore === '70-79') {
          return score >= 70 && score < 80;
        } else if (filters.seoScore === 'below70') {
          return score < 70;
        }
        return true;
      });
    }

    console.log('✅ 필터링 결과:', result.length, '개');
    return result;
  }, [rawProducts, filters]);

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const res = await fetch('/api/products/' + id, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        alert('상품이 삭제되었습니다');
        fetchProducts();
      } else {
        alert(data.error || '삭제 실패');
      }
    } catch (error) {
      alert('서버 오류가 발생했습니다');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      alert('삭제할 상품을 선택해주세요');
      return;
    }

    if (!confirm(selectedIds.length + '개 상품을 삭제하시겠습니까?')) return;

    try {
      const res = await fetch('/api/products/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const data = await res.json();

      if (data.success) {
        alert('상품이 삭제되었습니다');
        setSelectedIds([]);
        fetchProducts();
      } else {
        alert(data.error || '삭제 실패');
      }
    } catch (error) {
      alert('서버 오류가 발생했습니다');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            총 {filteredProducts.length}개 상품
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchProducts}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
          <Link
            href="/products/new"
            className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            상품 등록
          </Link>
        </div>
      </div>

      <ProductFilters 
        onFilterChange={setFilters}
        categories={categories}
      />

      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-blue-900 font-medium">
            {selectedIds.length}개 상품 선택됨
          </span>
          <button
            onClick={handleBulkDelete}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
          >
            선택 삭제
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">로딩 중...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">등록된 상품이 없습니다</p>
            <Link
              href="/products/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
            >
              <Plus className="w-4 h-4" />
              첫 상품 등록하기
            </Link>
          </div>
        ) : (
          <ProductTable
            products={filteredProducts}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
