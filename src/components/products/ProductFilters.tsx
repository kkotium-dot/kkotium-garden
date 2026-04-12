'use client';

import { useState } from 'react';

interface FilterState {
  category: string;
  status: string;
  priceMin: string;
  priceMax: string;
  marginMin: string;
  seoScore: string;
}

interface ProductFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  categories: { value: string; label: string }[];
}

export default function ProductFilters({ onFilterChange, categories }: ProductFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    status: '',
    priceMin: '',
    priceMax: '',
    marginMin: '',
    seoScore: '',
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (field: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
    console.log('filter changed:', field, '=', value);
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      category: '',
      status: '',
      priceMin: '',
      priceMax: '',
      marginMin: '',
      seoScore: '',
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">필터</h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
              {activeFilterCount}개 적용 중
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={handleReset}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              초기화
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-600 hover:text-gray-800"
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* 확장 필터 */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* 카테고리 */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">카테고리</label>
            <select
              value={filters.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">전체</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* 상태 (✅ 실제 DB 값과 일치) */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">상태</label>
            <select
              value={filters.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">전체</option>
              <option value="DRAFT">초안</option>
              <option value="ACTIVE">활성</option>
              <option value="INACTIVE">비활성</option>
            </select>
          </div>

          {/* 최소 가격 */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">최소 가격</label>
            <input
              type="number"
              value={filters.priceMin}
              onChange={(e) => handleChange('priceMin', e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 최대 가격 */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">최대 가격</label>
            <input
              type="number"
              value={filters.priceMax}
              onChange={(e) => handleChange('priceMax', e.target.value)}
              placeholder="무제한"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 최소 마진 */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">최소 마진 (%)</label>
            <input
              type="number"
              value={filters.marginMin}
              onChange={(e) => handleChange('marginMin', e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* SEO 점수 필터 (✅ page.tsx와 일치) */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">SEO 점수</label>
            <select
              value={filters.seoScore}
              onChange={(e) => handleChange('seoScore', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 bg-gradient-to-r from-purple-50 to-pink-50"
            >
              <option value="">전체</option>
              <option value="100">100점 (S급)</option>
              <option value="80-99">⭐ 80-99점 (A급)</option>
              <option value="70-79">70-79점 (B급)</option>
              <option value="0-69">0-69점 (개선필요)</option>
            </select>
          </div>
        </div>
      )}

      {/* 간단 필터 (접힌 상태) */}
      {!isExpanded && (
        <div className="flex flex-wrap gap-2">
          <select
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">전체 상태</option>
            <option value="DRAFT">초안</option>
            <option value="ACTIVE">활성</option>
            <option value="INACTIVE">비활성</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">전체 카테고리</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          <select
            value={filters.seoScore}
            onChange={(e) => handleChange('seoScore', e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-gradient-to-r from-purple-50 to-pink-50"
          >
            <option value="">전체 SEO</option>
            <option value="100">100점</option>
            <option value="80-99">⭐ 80-99점</option>
            <option value="0-69">0-69점 이하</option>
          </select>
        </div>
      )}
    </div>
  );
}
