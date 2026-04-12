'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProductCard from '@/components/products/ProductCard';
import BulkActionsBar from '@/components/products/BulkActionsBar';
import ProductFilters from '@/components/products/ProductFilters';
import ProductSort from '@/components/products/ProductSort';
import ExportExcel from '@/components/products/ExportExcel';
import ProductStats from '@/components/products/ProductStats';

interface FilterState {
  category: string;
  status: string;
  priceMin: string;
  priceMax: string;
  marginMin: string;
}

export default function SourcedProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('date_desc');
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    status: '',
    priceMin: '',
    priceMax: '',
    marginMin: '',
  });

  // 상품 목록 불러오기
  useEffect(() => {
    fetchProducts();
  }, []);

  // 필터링 및 정렬 적용
  useEffect(() => {
    applyFiltersAndSort();
  }, [products, filters, sortBy]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?page=1&limit=1000');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('상품 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...products];

    // 필터 적용
    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    if (filters.priceMin) {
      filtered = filtered.filter(p => (p.salePrice || 0) >= parseInt(filters.priceMin));
    }
    if (filters.priceMax) {
      filtered = filtered.filter(p => (p.salePrice || 0) <= parseInt(filters.priceMax));
    }
    if (filters.marginMin) {
      filtered = filtered.filter(p => (p.margin || 0) >= parseFloat(filters.marginMin));
    }

    // 정렬 적용
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'date_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'price_asc':
          return (a.salePrice || 0) - (b.salePrice || 0);
        case 'price_desc':
          return (b.salePrice || 0) - (a.salePrice || 0);
        case 'margin_desc':
          return (b.margin || 0) - (a.margin || 0);
        case 'margin_asc':
          return (a.margin || 0) - (b.margin || 0);
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
  };

  const handleSelectToggle = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const handleBulkDelete = async () => {
    try {
      const res = await fetch('/api/products/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`${selectedIds.length}개 상품이 삭제되었습니다.`);
        setSelectedIds([]);
        fetchProducts();
      } else {
        alert('삭제 실패: ' + data.error);
      }
    } catch (error) {
      console.error('일괄 삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    try {
      const res = await fetch('/api/products/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`${selectedIds.length}개 상품의 상태가 변경되었습니다.`);
        setSelectedIds([]);
        fetchProducts();
      } else {
        alert('상태 변경 실패: ' + data.error);
      }
    } catch (error) {
      console.error('일괄 상태 변경 실패:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 카테고리 목록 추출
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">소싱 상품 관리</h1>
        <div className="flex gap-2">
          <ExportExcel products={filteredProducts} selectedIds={selectedIds} />
          <button
            onClick={() => router.push('/products/sourced/create')}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600"
          >
            + 상품 추가
          </button>
        </div>
      </div>

      {/* 통계 위젯 */}
      <ProductStats products={products} />

      {/* 필터 */}
      <ProductFilters onFilterChange={setFilters} categories={categories} />

      {/* 정렬 & 전체 선택 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
              onChange={handleSelectAll}
              className="w-5 h-5 rounded border-gray-300"
            />
            <span className="text-sm font-medium">전체 선택</span>
          </label>
          <span className="text-sm text-gray-600">
            {filteredProducts.length}개 상품
          </span>
        </div>
        <ProductSort currentSort={sortBy} onSortChange={setSortBy} />
      </div>

      {/* 상품 카드 그리드 */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-500 mb-4">조건에 맞는 상품이 없습니다.</p>
          {Object.values(filters).some(v => v !== '') && (
            <button
              onClick={() => setFilters({ category: '', status: '', priceMin: '', priceMax: '', marginMin: '' })}
              className="text-purple-600 hover:underline"
            >
              필터 초기화
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="relative">
              {/* 체크박스 */}
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(product.id)}
                  onChange={() => handleSelectToggle(product.id)}
                  className="w-5 h-5 rounded border-gray-300 bg-white shadow-md"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}

      {/* 일괄 작업 바 */}
      <BulkActionsBar
        selectedIds={selectedIds}
        totalCount={filteredProducts.length}
        onBulkDelete={handleBulkDelete}
        onBulkStatusChange={handleBulkStatusChange}
        onClearSelection={() => setSelectedIds([])}
      />
    </div>
  );
}
