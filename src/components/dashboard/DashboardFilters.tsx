// src/components/dashboard/DashboardFilters.tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 대시보드 필터 (완전 수정 - 대소문자 통일 + 카테고리 제거)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

'use client';

import { useState } from 'react';

interface Props {
  onFilterChange: (filters: any) => void;
}

const STATUS_LABELS: Record<string, string> = {
  'DRAFT': '임시저장',
  'READY': '등록대기',
  'PUBLISHED': '판매중',
};

const SCORE_LABELS: Record<string, string> = {
  '90-100': 'S급 (90-100점)',
  '80-89': 'A급 (80-89점)',
  '70-79': 'B급 (70-79점)',
  '60-69': 'C급 (60-69점)',
  '0-59': 'D급 (0-59점)',
};

export function DashboardFilters({ onFilterChange }: Props) {
  const [filters, setFilters] = useState<any>({
    status: '',
    minScore: '',
    maxScore: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    search: '',
    scoreRange: '',
  });

  const handleChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleScoreRange = (range: string) => {
    if (!range) {
      const newFilters = { ...filters, minScore: '', maxScore: '', scoreRange: '' };
      setFilters(newFilters);
      onFilterChange(newFilters);
    } else {
      const [min, max] = range.split('-');
      const newFilters = { ...filters, minScore: min, maxScore: max, scoreRange: range };
      setFilters(newFilters);
      onFilterChange(newFilters);
    }
  };

  const handleReset = () => {
    const resetFilters = {
      status: '',
      minScore: '',
      maxScore: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      search: '',
      scoreRange: '',
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const activeFilterCount = [
    filters.status,
    filters.minScore,
    filters.search,
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          🔍 필터 & 검색
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 bg-pink-100 text-pink-600 text-xs rounded-full font-bold">
              {activeFilterCount}개 활성
            </span>
          )}
        </h3>
        <button
          onClick={handleReset}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          초기화
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📋 상태
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            <option value="">전체</option>
            <option value="DRAFT">임시저장</option>
            <option value="READY">등록대기</option>
            <option value="PUBLISHED">판매중</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🌸 AI 점수
          </label>
          <select
            value={filters.scoreRange || ''}
            onChange={(e) => handleScoreRange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            <option value="">전체</option>
            <option value="90-100">S급 (90-100점)</option>
            <option value="80-89">A급 (80-89점)</option>
            <option value="70-79">B급 (70-79점)</option>
            <option value="60-69">C급 (60-69점)</option>
            <option value="0-59">D급 (0-59점)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🔢 정렬
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => handleChange('sortBy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            <option value="createdAt">등록일순</option>
            <option value="aiScore">AI 점수순</option>
            <option value="salePrice">가격순</option>
            <option value="name">이름순</option>
            <option value="updatedAt">수정일순</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ⬆️ 순서
          </label>
          <select
            value={filters.sortOrder}
            onChange={(e) => handleChange('sortOrder', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            <option value="desc">내림차순 (높은 값)</option>
            <option value="asc">오름차순 (낮은 값)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🔎 검색
          </label>
          <input
            type="text"
            value={filters.search}
            placeholder="상품명 검색..."
            onChange={(e) => handleChange('search', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.status && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium flex items-center gap-1">
              상태: {STATUS_LABELS[filters.status] || filters.status}
              <button
                onClick={() => handleChange('status', '')}
                className="ml-1 hover:text-blue-900"
              >
                ✕
              </button>
            </span>
          )}
          {filters.scoreRange && (
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium flex items-center gap-1">
              점수: {SCORE_LABELS[filters.scoreRange] || filters.scoreRange}
              <button
                onClick={() => handleScoreRange('')}
                className="ml-1 hover:text-purple-900"
              >
                ✕
              </button>
            </span>
          )}
          {filters.search && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium flex items-center gap-1">
              검색: {filters.search}
              <button
                onClick={() => handleChange('search', '')}
                className="ml-1 hover:text-green-900"
              >
                ✕
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
