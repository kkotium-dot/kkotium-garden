// ~/Downloads/ProductFilters_final.tsx
'use client';

import { useState } from 'react';

interface FilterState {
  category: string;
  status: string;
  priceMin: string;
  priceMax: string;
  marginMin: string;
  seoScore: string;  // ✅ SEO 필터 추가!
}

interface ProductFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  categories: string[];
}

export default function ProductFilters({ onFilterChange, categories }: ProductFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    status: '',
    priceMin: '',
    priceMax: '',
    marginMin: '',
    seoScore: '',      // ✅ 기본값 추가
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (field: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      category: '',
      status: '',
      priceMin: '',
      priceMax: '',
      marginMin: '',
      seoScore: '',      // ✅ 초기화 추가
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold">🔍 필터</h3>
          {activeFilterCount > 0 && (
            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-sm font-medium">
              {activeFilterCount}개 적용 중
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={handleReset}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
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
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">  {/* ✅ 5→6 컬럼 */}
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
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* 상태 */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">상태</label>
            <select
              value={filters.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">전체</option>
              <option value="todo">준비중</option>
              <option value="draft">초안</option>
              <option value="published">판매중</option>
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

          {/* ✅ SEO 점수 필터 추가 */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">SEO 점수</label>
            <select
              value={filters.seoScore}
              onChange={(e) => handleChange('seoScore', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 bg-gradient-to-r from-purple-50 to-pink-50"
            >
              <option value="">전체</option>
              <option value="100">100점만</option>
              <option value="80-99">80-99점</option>
              <option value="70-79">70-79점</option>
              <option value="below70">70점 미만</option>
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
            <option value="todo">준비중</option>
            <option value="draft">초안</option>
            <option value="published">판매중</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">전체 카테고리</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* ✅ 간단 SEO 필터 추가 */}
          <select
            value={filters.seoScore}
            onChange={(e) => handleChange('seoScore', e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-gradient-to-r from-purple-50 to-pink-50"
          >
            <option value="">전체 SEO</option>
            <option value="100">100점만</option>
            <option value="80-99">80-99점</option>
            <option value="below70">70점 미만</option>
          </select>
        </div>
      )}
    </div>
  );
}
