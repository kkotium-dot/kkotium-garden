// src/components/OriginSearch.tsx
// P0-4: Origin search with 518 codes (client-side, no API call needed)
// Uses ORIGIN_CODES_FULL from origin-codes-full.ts

'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, AlertCircle, ChevronDown, Globe, MapPin } from 'lucide-react';
import {
  ORIGIN_CODES_FULL,
  ORIGIN_CODE_MAP,
  requiresImporter,
  type OriginCodeEntry,
} from '@/lib/naver/origin-codes-full';

// Region display config
const REGION_CONFIG: Record<string, { label: string; color: string }> = {
  SPECIAL: { label: 'Quick Select', color: 'bg-gray-100 text-gray-700' },
  DOMESTIC_PROVINCE: { label: 'Domestic - Province', color: 'bg-green-100 text-green-700' },
  DOMESTIC_CITY: { label: 'Domestic - City/District', color: 'bg-emerald-100 text-emerald-700' },
  ASIA: { label: 'Asia', color: 'bg-blue-100 text-blue-700' },
  EUROPE: { label: 'Europe', color: 'bg-indigo-100 text-indigo-700' },
  AFRICA: { label: 'Africa', color: 'bg-amber-100 text-amber-700' },
  OCEANIA: { label: 'Oceania', color: 'bg-cyan-100 text-cyan-700' },
  NORTH_AMERICA: { label: 'North America', color: 'bg-red-100 text-red-700' },
  SOUTH_AMERICA: { label: 'South America', color: 'bg-orange-100 text-orange-700' },
};

type TabKey = 'all' | 'domestic' | 'import';

interface OriginSearchProps {
  value?: {
    code: string;
    name: string;
  } | null;
  importerName?: string;
  onChange: (origin: { code: string; name: string } | null) => void;
  onImporterChange?: (importer: string) => void;
  error?: string;
}

export default function OriginSearch({
  value,
  importerName = '',
  onChange,
  onImporterChange,
  error,
}: OriginSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine if selected origin is import
  const isImport = useMemo(() => {
    if (!value) return false;
    return requiresImporter(value.code);
  }, [value]);

  // Filtered + grouped results
  const filteredResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    let pool = ORIGIN_CODES_FULL;

    // Tab filter
    if (activeTab === 'domestic') {
      pool = pool.filter(
        (o) => o.region === 'SPECIAL' || o.region.startsWith('DOMESTIC')
      );
    } else if (activeTab === 'import') {
      pool = pool.filter(
        (o) =>
          o.region !== 'SPECIAL' && !o.region.startsWith('DOMESTIC')
      );
    }

    // Search filter
    if (query) {
      pool = pool.filter(
        (o) =>
          o.label.toLowerCase().includes(query) ||
          o.code.includes(query)
      );
    }

    // Limit to 50 for performance
    return pool.slice(0, 50);
  }, [searchQuery, activeTab]);

  // Group by region
  const groupedResults = useMemo(() => {
    const groups: Record<string, OriginCodeEntry[]> = {};
    for (const entry of filteredResults) {
      if (!groups[entry.region]) groups[entry.region] = [];
      groups[entry.region].push(entry);
    }
    return groups;
  }, [filteredResults]);

  const handleSelect = (entry: OriginCodeEntry) => {
    onChange({ code: entry.code, name: entry.label });
    setShowDropdown(false);
    setSearchQuery('');

    // Clear importer if domestic
    if (!entry.importer && onImporterChange) {
      onImporterChange('');
    }
  };

  const handleClear = () => {
    onChange(null);
    if (onImporterChange) onImporterChange('');
    setSearchQuery('');
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 font-medium">
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'domestic', label: 'Domestic' },
    { key: 'import', label: 'Import' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Origin Search */}
        <div ref={dropdownRef}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Origin
          </label>
          <div className="relative">
            {value ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isImport ? (
                    <Globe className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  ) : (
                    <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {value.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Code: {value.code}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search origin (518 codes)..."
                  className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                    error ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            )}

            {/* Dropdown */}
            {showDropdown && !value && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                        activeTab === tab.key
                          ? 'text-pink-600 border-b-2 border-pink-500 bg-pink-50'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Results */}
                <div className="max-h-60 overflow-y-auto">
                  {filteredResults.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No origin codes found
                    </div>
                  ) : (
                    Object.entries(groupedResults).map(
                      ([region, entries]) => (
                        <div key={region}>
                          {/* Region Header */}
                          <div className="sticky top-0 px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                            <span
                              className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                                REGION_CONFIG[region]?.color ||
                                'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {REGION_CONFIG[region]?.label || region}
                            </span>
                          </div>
                          {/* Items */}
                          {entries.map((entry) => (
                            <button
                              key={entry.code}
                              type="button"
                              onClick={() => handleSelect(entry)}
                              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {entry.importer ? (
                                  <Globe className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                ) : (
                                  <MapPin className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                                )}
                                <span className="text-sm text-gray-900 truncate">
                                  {highlightMatch(
                                    entry.label,
                                    searchQuery
                                  )}
                                </span>
                              </div>
                              <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                {entry.code}
                              </span>
                            </button>
                          ))}
                        </div>
                      )
                    )
                  )}
                </div>

                {/* Footer */}
                {filteredResults.length >= 50 && (
                  <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                    <p className="text-xs text-gray-400 text-center">
                      Showing 50 of {ORIGIN_CODES_FULL.length} results. Type
                      to narrow down.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Importer Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Importer
            {isImport && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="text"
            value={importerName}
            onChange={(e) => onImporterChange?.(e.target.value)}
            placeholder={
              isImport ? 'Required for import origin' : 'Optional'
            }
            disabled={!isImport}
            className={`w-full px-3 py-2 border rounded-lg transition-colors ${
              isImport
                ? error
                  ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-transparent'
                  : 'border-pink-300 bg-pink-50 focus:ring-2 focus:ring-pink-500 focus:border-transparent'
                : 'border-gray-200 bg-gray-50 cursor-not-allowed'
            }`}
          />
        </div>
      </div>

      {/* Import Origin Warning */}
      {isImport && !importerName && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-900">
              Import Origin Selected
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Importer name is required. The product cannot be registered
              on Naver without this information.
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
