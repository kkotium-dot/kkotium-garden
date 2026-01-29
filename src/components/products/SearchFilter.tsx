'use client';

import { useState } from 'react';

interface SearchFilterProps {
  onSearch: (query: string) => void;
  onFilter: (filters: FilterOptions) => void;
}

interface FilterOptions {
  category?: string;
  minMargin?: number;
  maxMargin?: number;
  stockStatus?: string;
}

export default function SearchFilter({ onSearch, onFilter }: SearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  return (
    <div className="space-y-4">
      {/* 검색바 */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="상품명, SKU 검색..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
        <button
          type="submit"
          className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
        >
          검색
        </button>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {showFilters ? '필터 닫기' : '필터'}
        </button>
      </form>

      {/* 필터 옵션 */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                카테고리
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              >
                <option value="">전체</option>
                <option value="의류">의류</option>
                <option value="원피스">원피스</option>
                <option value="잡화">잡화</option>
                <option value="액세서리">액세서리</option>
              </select>
            </div>

            {/* 마진율 범위 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                최소 마진율 (%)
              </label>
              <input
                type="number"
                value={filters.minMargin || ''}
                onChange={(e) => handleFilterChange('minMargin', parseFloat(e.target.value))}
                placeholder="예: 20"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              />
            </div>

            {/* 재고 상태 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                재고 상태
              </label>
              <select
                value={filters.stockStatus || ''}
                onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              >
                <option value="">전체</option>
                <option value="in_stock">재고있음</option>
                <option value="low_stock">재고부족</option>
                <option value="out_of_stock">품절</option>
              </select>
            </div>
          </div>

          {/* 필터 초기화 */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setFilters({});
                onFilter({});
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              필터 초기화
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
