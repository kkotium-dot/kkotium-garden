// src/components/CategorySearch.tsx
// P0-1: Category search with 2-tab system (Input Search + Drill-down)
// Client-side: 4,993 Naver categories (NO API dependency)
// 4-level: depth1 > depth2 > depth3 > depth4

'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, ChevronRight, X, ChevronDown } from 'lucide-react';
import {
  NAVER_CATEGORIES_FULL,
  NAVER_DEPTH1_LIST,
  type NaverCategoryEntry,
} from '@/lib/naver/naver-categories-full';

interface CategorySearchProps {
  value?: {
    id: string;
    code: string;
    fullPath: string;
  } | null;
  onChange: (category: {
    id: string;
    code: string;
    fullPath: string;
  } | null) => void;
  placeholder?: string;
}

type TabType = 'search' | 'select';

export default function CategorySearch({
  value,
  onChange,
  placeholder,
}: CategorySearchProps) {
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Drill-down state (4 levels)
  const [selD1, setSelD1] = useState('');
  const [selD2, setSelD2] = useState('');
  const [selD3, setSelD3] = useState('');

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // --- Search filter ---
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return NAVER_CATEGORIES_FULL
      .filter(cat => cat.fullPath.toLowerCase().includes(q))
      .slice(0, 50);
  }, [searchQuery]);

  // --- Drill-down computed options ---
  const depth2Options = useMemo(() => {
    if (!selD1) return [];
    const set = new Set<string>();
    NAVER_CATEGORIES_FULL.forEach(c => {
      if (c.d1 === selD1 && c.d2) set.add(c.d2);
    });
    return Array.from(set).sort();
  }, [selD1]);

  const depth3Options = useMemo(() => {
    if (!selD1 || !selD2) return [];
    const set = new Set<string>();
    NAVER_CATEGORIES_FULL.forEach(c => {
      if (c.d1 === selD1 && c.d2 === selD2 && c.d3) set.add(c.d3);
    });
    return Array.from(set).sort();
  }, [selD1, selD2]);

  const depth4Options = useMemo(() => {
    if (!selD1 || !selD2 || !selD3) return [];
    return NAVER_CATEGORIES_FULL.filter(c =>
      c.d1 === selD1 && c.d2 === selD2 && c.d3 === selD3
    ).sort((a, b) => (a.d4 || '').localeCompare(b.d4 || ''));
  }, [selD1, selD2, selD3]);

  // Items at depth3 level that have NO depth4 (leaf at depth3)
  const depth3Leaves = useMemo(() => {
    if (!selD1 || !selD2 || !selD3) return [];
    return NAVER_CATEGORIES_FULL.filter(c =>
      c.d1 === selD1 && c.d2 === selD2 && c.d3 === selD3 && !c.d4
    );
  }, [selD1, selD2, selD3]);

  const handleSearchSelect = useCallback((cat: NaverCategoryEntry) => {
    onChange({ id: cat.code, code: cat.code, fullPath: cat.fullPath });
    setShowDropdown(false);
    setSearchQuery('');
  }, [onChange]);

  const handleDrillDownSelect = useCallback((cat: NaverCategoryEntry) => {
    onChange({ id: cat.code, code: cat.code, fullPath: cat.fullPath });
    setSelD1('');
    setSelD2('');
    setSelD3('');
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange(null);
    setSearchQuery('');
    setSelD1('');
    setSelD2('');
    setSelD3('');
  }, [onChange]);

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 font-medium">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* Tab Switcher */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'search'
              ? 'border-b-2 border-pink-500 text-pink-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Search className="w-3.5 h-3.5 inline mr-1" />
          {'카테고리 검색'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('select')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'select'
              ? 'border-b-2 border-pink-500 text-pink-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ChevronDown className="w-3.5 h-3.5 inline mr-1" />
          {'단계별 선택'}
        </button>
        <span className="ml-auto text-xs text-gray-400 self-center pr-2">
          {NAVER_CATEGORIES_FULL.length.toLocaleString()}{'개'}
        </span>
      </div>

      {/* Selected Value Display */}
      {value && (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">{'선택된 카테고리'}</p>
            <p className="text-sm font-medium text-gray-900 truncate">{value.fullPath}</p>
            <p className="text-xs text-gray-400">{'코드'}: {value.code}</p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab: Search */}
      {activeTab === 'search' && (
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder={placeholder || `4,993${'개 카테고리 검색'}...`}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          {showDropdown && searchQuery && (
            <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
              {filteredCategories.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {'검색 결과가 없습니다'}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredCategories.map((cat) => (
                    <button
                      key={cat.code}
                      type="button"
                      onClick={() => handleSearchSelect(cat)}
                      className="w-full px-4 py-3 text-left hover:bg-pink-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {highlightMatch(cat.fullPath, searchQuery)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{cat.code}</p>
                    </button>
                  ))}
                  {filteredCategories.length >= 50 && (
                    <div className="px-4 py-2 text-xs text-gray-400 text-center">
                      {'상위 50건 표시 — 검색어를 더 구체적으로 입력해 보세요'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Drill-down (4 levels) */}
      {activeTab === 'select' && (
        <div className="space-y-3">
          {/* Depth 1 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{'대분류'}</label>
            <select
              value={selD1}
              onChange={(e) => { setSelD1(e.target.value); setSelD2(''); setSelD3(''); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
            >
              <option value="">{'대분류 선택'}</option>
              {NAVER_DEPTH1_LIST.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Depth 2 */}
          {selD1 && depth2Options.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{'중분류'}</label>
              <select
                value={selD2}
                onChange={(e) => { setSelD2(e.target.value); setSelD3(''); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
              >
                <option value="">{'중분류 선택'}</option>
                {depth2Options.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}

          {/* Depth 3 */}
          {selD2 && depth3Options.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{'소분류'}</label>
              <select
                value={selD3}
                onChange={(e) => setSelD3(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
              >
                <option value="">{'소분류 선택'}</option>
                {depth3Options.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}

          {/* Depth 4 (final selection) OR depth3 leaf */}
          {selD3 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{'세분류'}</label>
              {depth4Options.filter(c => c.d4).length > 0 ? (
                <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                  {depth4Options.map(cat => (
                    <button
                      key={cat.code}
                      type="button"
                      onClick={() => handleDrillDownSelect(cat)}
                      className="w-full px-4 py-2.5 text-left hover:bg-pink-50 transition-colors border-b border-gray-100 last:border-b-0 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900">{cat.d4 || cat.d3}</p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">{cat.fullPath}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : depth3Leaves.length > 0 ? (
                <div className="border border-gray-200 rounded-lg">
                  {depth3Leaves.map(cat => (
                    <button
                      key={cat.code}
                      type="button"
                      onClick={() => handleDrillDownSelect(cat)}
                      className="w-full px-4 py-2.5 text-left hover:bg-pink-50 transition-colors text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{cat.d3}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{cat.fullPath}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 py-2">{'세분류가 없습니다'}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
