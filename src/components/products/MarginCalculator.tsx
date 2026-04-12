// src/components/products/MarginCalculator.tsx
// Margin calculator: 2026 Naver fee rates by d1 category
// - Category fee: real-time from d1 name via getNaverFeeRateByD1
// - Packaging default: 0 won
// - Fee breakdown: shows order management + sales fee components

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search, TrendingUp, TrendingDown, Target, Calculator,
  ChevronDown, ChevronUp, RotateCcw, RefreshCw,
} from 'lucide-react';
import { getNaverFeeRate, getNaverFeeRateByD1, getNaverFeeBreakdown, getMarginProfile } from '@/lib/naver-fee-rates-2026';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
interface MarginCalculatorProps {
  supplierPrice: number;
  salePrice: number;
  instantDiscount?: number;
  discountUnit?: '%' | 'won';
  shippingFee?: number;
  categoryPath?: string;
  categoryCode?: string;
  onSupplierPriceChange: (price: number) => void;
  onSalePriceChange: (price: number) => void;
  onInstantDiscountChange?: (discount: number) => void;
  onCategoryChange?: (cat: { code: string; fullPath: string }) => void;
}

interface LocalState {
  supplierPrice: number;
  salePrice: number;
  instantDiscount: number;
  shippingFee: number;
  packagingCost: number;
  returnRiskRate: number;
  adCostRate: number;     // ad cost as % of sale price (CPC estimate)
  targetMargin: number;
  feeRateOverride: number | null;
}

interface CostBreakdown {
  effectivePrice: number;
  naverFee: number;
  naverFeeRate: number;
  orderMgmtFee: number;
  salesFee: number;
  shippingCost: number;
  packagingCost: number;
  returnRisk: number;
  adCost: number;         // estimated ad cost (CPC)
  totalCost: number;
  profit: number;
  marginRate: number;
  roi: number;
}

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------
const DEFAULTS: LocalState = {
  supplierPrice: 0,
  salePrice: 0,
  instantDiscount: 0,
  shippingFee: 0,
  packagingCost: 0,       // packaging default: 0 won
  returnRiskRate: 1,
  adCostRate: 0,           // ad cost default: 0% (opt-in)
  targetMargin: 35,
  feeRateOverride: null,
};

const MARGIN_LEVELS = [
  { min: 50, labelKr: '우수', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  { min: 30, labelKr: '양호', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { min: 15, labelKr: '보통', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { min: -Infinity, labelKr: '낮음', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
] as const;

// ----------------------------------------------------------------
// Inline category search
// ----------------------------------------------------------------
interface CatEntry { code: string; d1: string; d2: string; d3: string; d4: string; fullPath: string; }

let _catCache: CatEntry[] | null = null;

function MarginCategorySearch({
  value,
  onChange,
}: {
  value?: string;
  onChange: (cat: { code: string; fullPath: string; d1: string } | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatEntry[]>([]);
  const [allCats, setAllCats] = useState<CatEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (_catCache) { setAllCats(_catCache); return; }
      setLoading(true);
      try {
        const mod = await import('@/lib/naver/naver-categories-full');
        if (!cancelled && mod.NAVER_CATEGORIES_FULL) {
          const mapped = mod.NAVER_CATEGORIES_FULL.map((c: any) => ({
            code: c.code, d1: c.d1, d2: c.d2, d3: c.d3, d4: c.d4, fullPath: c.fullPath,
          }));
          _catCache = mapped;
          setAllCats(mapped);
        }
      } catch {
        try {
          const res = await fetch('/api/naver/categories');
          if (res.ok) {
            const data = await res.json();
            const mapped = (data.categories || []).map((c: any) => ({
              code: c.categoryCode || c.code,
              d1: c.depth1 || c.d1 || '',
              d2: c.depth2 || c.d2 || '',
              d3: c.depth3 || c.d3 || '',
              d4: c.depth4 || c.d4 || '',
              fullPath: c.fullPath || c.full_path || '',
            }));
            _catCache = mapped;
            if (!cancelled) setAllCats(mapped);
          }
        } catch { /* silent */ }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    setResults(allCats.filter(c => c.fullPath.toLowerCase().includes(q)).slice(0, 30));
  }, [query, allCats]);

  const handleSelect = (cat: CatEntry) => {
    onChange({ code: cat.code, fullPath: cat.fullPath, d1: cat.d1 });
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        카테고리 (수수료 자동 적용)
      </label>
      {value ? (
        <div className="flex items-start gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="flex-1 text-xs text-blue-800 break-words leading-relaxed">{value}</p>
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 text-blue-400 hover:text-blue-600 text-xs mt-0.5"
          >
            x
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            placeholder={loading ? '로딩 중...' : `${allCats.length.toLocaleString()}개 카테고리 검색`}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
          {isOpen && results.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {results.map((cat) => (
                <button
                  key={cat.code}
                  type="button"
                  onClick={() => handleSelect(cat)}
                  className="w-full px-3 py-2 text-left hover:bg-pink-50 text-sm border-b border-gray-50 last:border-b-0"
                >
                  <span className="text-gray-900">{cat.fullPath}</span>
                  <span className="ml-2 text-xs text-gray-400">{cat.code}</span>
                </button>
              ))}
            </div>
          )}
          {isOpen && query && results.length === 0 && !loading && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500 text-center">
              검색 결과가 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// NumField helper
// ----------------------------------------------------------------
function NumField({
  label, value, onChange, suffix = '원', min, step, small, disabled,
}: {
  label: string; value: number; onChange: (v: number) => void;
  suffix?: string; min?: number; step?: number; small?: boolean; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-0.5">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min ?? 0}
          step={step}
          disabled={disabled}
          className={`w-full pr-8 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400
            ${small ? 'px-2 py-1' : 'px-3 py-2'}`}
          placeholder="0"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">{suffix}</span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------
export function MarginCalculator({
  supplierPrice: extSupplier,
  salePrice: extSale,
  instantDiscount: extDiscount = 0,
  shippingFee: extShipping = 0,
  categoryPath: extCatPath,
  categoryCode: extCatCode,
  onSupplierPriceChange,
  onSalePriceChange,
  onInstantDiscountChange,
  onCategoryChange,
}: MarginCalculatorProps) {
  const [local, setLocal] = useState<LocalState>({
    ...DEFAULTS,
    supplierPrice: extSupplier,
    salePrice: extSale,
    instantDiscount: extDiscount,
    shippingFee: extShipping,
  });
  const [selectedCategory, setSelectedCategory] = useState(extCatPath || '');
  const [selectedCategoryCode, setSelectedCategoryCode] = useState(extCatCode || '');
  const [selectedD1, setSelectedD1] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [isIndependent, setIsIndependent] = useState(false);

  const prevExtRef = useRef({ extSupplier, extSale, extDiscount, extShipping, extCatPath, extCatCode });

  // Auto-sync from ProductForm
  useEffect(() => {
    if (isIndependent) return;
    const prev = prevExtRef.current;
    const changed =
      prev.extSupplier !== extSupplier ||
      prev.extSale !== extSale ||
      prev.extDiscount !== extDiscount ||
      prev.extShipping !== extShipping;
    if (changed) {
      setLocal(s => ({
        ...s,
        supplierPrice: extSupplier,
        salePrice: extSale,
        instantDiscount: extDiscount,
        shippingFee: extShipping,
      }));
    }
    if (extCatPath && prev.extCatPath !== extCatPath) setSelectedCategory(extCatPath);
    if (extCatCode && prev.extCatCode !== extCatCode) setSelectedCategoryCode(extCatCode);
    prevExtRef.current = { extSupplier, extSale, extDiscount, extShipping, extCatPath, extCatCode };
  }, [extSupplier, extSale, extDiscount, extShipping, extCatPath, extCatCode, isIndependent]);

  // When category code changes from ProductForm, resolve d1 and apply recommended margin
  useEffect(() => {
    if (!extCatCode) return;
    import('@/lib/naver/naver-categories-full').then(mod => {
      const found = mod.NAVER_CATEGORIES_FULL.find((c: any) => c.code === extCatCode);
      if (found?.d1) {
        setSelectedD1(found.d1);
        // Auto-apply recommended margin from category profile
        const profile = getMarginProfile(found.d1);
        setLocal(s => ({ ...s, targetMargin: profile.recommended }));
      }
    }).catch(() => {});
  }, [extCatCode]);

  const updateLocal = useCallback((patch: Partial<LocalState>) => {
    setLocal(s => ({ ...s, ...patch }));
  }, []);

  // Effective fee rate: override > d1-based > code-based > default
  const effectiveFeeRate = useMemo(() => {
    if (local.feeRateOverride !== null) return local.feeRateOverride / 100;
    if (selectedD1) return getNaverFeeRateByD1(selectedD1);
    if (selectedCategoryCode) return getNaverFeeRate(selectedCategoryCode);
    return getNaverFeeRate(undefined); // default 5.5%
  }, [local.feeRateOverride, selectedD1, selectedCategoryCode]);

  // Fee breakdown for display
  const feeBreakdown = useMemo(() => {
    return getNaverFeeBreakdown(selectedCategoryCode || undefined);
  }, [selectedCategoryCode]);

  // Core calculation
  const breakdown = useMemo<CostBreakdown>(() => {
    const effectivePrice = local.salePrice - local.instantDiscount;
    if (effectivePrice <= 0 || local.supplierPrice <= 0) {
      return {
        effectivePrice: Math.max(0, effectivePrice),
        naverFee: 0, naverFeeRate: effectiveFeeRate,
        orderMgmtFee: 0, salesFee: 0,
        shippingCost: 0, packagingCost: 0,
        returnRisk: 0, adCost: 0, totalCost: 0, profit: 0, marginRate: 0, roi: 0,
      };
    }

    const naverFee = Math.round(effectivePrice * effectiveFeeRate);
    const orderMgmtFee = Math.round(effectivePrice * feeBreakdown.orderManagementRate);
    const salesFeeAmt = Math.round(effectivePrice * feeBreakdown.salesFeeRate);
    const returnRisk = Math.round(effectivePrice * (local.returnRiskRate / 100));
    const adCost = Math.round(effectivePrice * (local.adCostRate / 100));
    const totalCost = local.supplierPrice + naverFee + local.shippingFee + local.packagingCost + returnRisk + adCost;
    const profit = effectivePrice - totalCost;
    const marginRate = effectivePrice > 0 ? (profit / effectivePrice) * 100 : 0;
    const roi = (local.supplierPrice + local.shippingFee) > 0
      ? (profit / (local.supplierPrice + local.shippingFee)) * 100 : 0;

    return {
      effectivePrice,
      naverFee,
      naverFeeRate: effectiveFeeRate,
      orderMgmtFee,
      salesFee: salesFeeAmt,
      shippingCost: local.shippingFee,
      packagingCost: local.packagingCost,
      returnRisk,
      adCost,
      totalCost,
      profit,
      marginRate: Math.round(marginRate * 10) / 10,
      roi: Math.round(roi * 10) / 10,
    };
  }, [local, effectiveFeeRate, feeBreakdown]);

  // Recommended price
  const recommendedPrice = useMemo(() => {
    if (local.supplierPrice <= 0) return 0;
    const riskRate = local.returnRiskRate / 100;
    const denom = 1 - effectiveFeeRate - riskRate - (local.targetMargin / 100);
    if (denom <= 0) return 0;
    const raw = (local.supplierPrice + local.shippingFee + local.packagingCost) / denom;
    return Math.ceil(raw / 100) * 100;
  }, [local, effectiveFeeRate]);

  const marginLevel = useMemo(
    () => MARGIN_LEVELS.find(l => breakdown.marginRate >= l.min) || MARGIN_LEVELS[MARGIN_LEVELS.length - 1],
    [breakdown.marginRate]
  );

  const handleReset = useCallback(() => {
    setLocal({ ...DEFAULTS });
    setSelectedCategory('');
    setSelectedCategoryCode('');
    setSelectedD1('');
    setIsIndependent(true);
  }, []);

  const handleRefresh = useCallback(() => {
    setLocal(s => ({
      ...s,
      supplierPrice: extSupplier,
      salePrice: extSale,
      instantDiscount: extDiscount,
      shippingFee: extShipping,
    }));
    if (extCatPath) setSelectedCategory(extCatPath);
    setIsIndependent(false);
  }, [extSupplier, extSale, extDiscount, extShipping, extCatPath]);

  const applyRecommendedPrice = useCallback(() => {
    if (recommendedPrice > 0) {
      updateLocal({ salePrice: recommendedPrice });
      if (!isIndependent) onSalePriceChange(recommendedPrice);
    }
  }, [recommendedPrice, isIndependent, onSalePriceChange, updateLocal]);

  const pushToForm = useCallback((field: string, value: number) => {
    if (isIndependent) return;
    switch (field) {
      case 'supplierPrice': onSupplierPriceChange(value); break;
      case 'salePrice': onSalePriceChange(value); break;
      case 'instantDiscount': onInstantDiscountChange?.(value); break;
    }
  }, [isIndependent, onSupplierPriceChange, onSalePriceChange, onInstantDiscountChange]);

  const handleCategorySelect = useCallback((cat: { code: string; fullPath: string; d1: string } | null) => {
    if (cat) {
      setSelectedCategory(cat.fullPath);
      setSelectedCategoryCode(cat.code);
      setSelectedD1(cat.d1);
      // Auto-apply recommended margin for this category
      const profile = getMarginProfile(cat.d1);
      updateLocal({ targetMargin: profile.recommended });
      if (!isIndependent) onCategoryChange?.({ code: cat.code, fullPath: cat.fullPath });
    } else {
      setSelectedCategory('');
      setSelectedCategoryCode('');
      setSelectedD1('');
      if (!isIndependent) onCategoryChange?.({ code: '', fullPath: '' });
    }
  }, [isIndependent, onCategoryChange, updateLocal]);

  const displayFeeRate = local.feeRateOverride !== null
    ? local.feeRateOverride
    : Math.round(effectiveFeeRate * 1000) / 10;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Calculator className="w-4 h-4 text-pink-500" />
          <h3 className="text-sm font-bold text-gray-800">실전 마진 계산기</h3>
          {isIndependent && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
              독립 모드
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleRefresh}
            title="상품정보 동기화"
            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            title="초기화"
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Category Search */}
      <MarginCategorySearch
        value={selectedCategory || undefined}
        onChange={handleCategorySelect}
      />

      {/* Fee rate badge — shows current applied rate */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
        <span className="text-xs text-gray-500">네이버 수수료 (2026):</span>
        <span className="text-xs font-bold text-pink-600">
          {(effectiveFeeRate * 100).toFixed(1)}%
        </span>
        {selectedD1 && (
          <span className="text-xs text-gray-400">({selectedD1})</span>
        )}
        <span className="ml-auto text-[10px] text-gray-400">
          {local.feeRateOverride !== null ? '수동' : '자동'}
        </span>
      </div>

      {/* Fee breakdown tooltip */}
      {!local.feeRateOverride && (
        <div className="text-[10px] text-gray-400 px-1 leading-relaxed">
          주문관리 {(feeBreakdown.orderManagementRate * 100).toFixed(2)}% + 판매수수료 {(feeBreakdown.salesFeeRate * 100).toFixed(2)}% = {(effectiveFeeRate * 100).toFixed(1)}%
          <span className="ml-1 text-gray-300">| 중소3 등급 기준</span>
        </div>
      )}

      {/* Price Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <NumField
          label="도매가 (공급가)"
          value={local.supplierPrice}
          onChange={(v) => { updateLocal({ supplierPrice: v }); pushToForm('supplierPrice', v); }}
        />
        <NumField
          label="판매가"
          value={local.salePrice}
          onChange={(v) => { updateLocal({ salePrice: v }); pushToForm('salePrice', v); }}
        />
      </div>

      {/* Instant Discount */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-0.5">즉시할인</label>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <input
              type="number"
              value={local.instantDiscount || ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value) || 0;
                updateLocal({ instantDiscount: v });
                pushToForm('instantDiscount', v);
              }}
              className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="0"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <span className="text-gray-400">→</span>
            <span className="font-medium">{breakdown.effectivePrice.toLocaleString()}원</span>
            {local.salePrice > 0 && local.instantDiscount > 0 && (
              <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">
                {Math.round((local.instantDiscount / local.salePrice) * 100)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Margin Display */}
      {local.supplierPrice > 0 && local.salePrice > 0 && (
        <div className={`rounded-lg p-3 border ${marginLevel.bg} ${marginLevel.border}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {breakdown.marginRate >= 0
                ? <TrendingUp className={`w-5 h-5 ${marginLevel.color}`} />
                : <TrendingDown className={`w-5 h-5 ${marginLevel.color}`} />
              }
              <div>
                <span className={`text-2xl font-bold ${marginLevel.color}`}>
                  {breakdown.marginRate.toFixed(1)}%
                </span>
                <span className={`ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded-full bg-white/60 ${marginLevel.color}`}>
                  {marginLevel.labelKr}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${marginLevel.color}`}>
                {breakdown.profit.toLocaleString()}원
              </p>
              <p className="text-xs text-gray-500">ROI {breakdown.roi.toFixed(1)}%</p>
            </div>
          </div>

          {/* Quick summary */}
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-2 flex-wrap">
            <span>수수료 {(breakdown.naverFeeRate * 100).toFixed(1)}%</span>
            <span className="text-gray-300">|</span>
            <span>{breakdown.naverFee.toLocaleString()}원</span>
            <span className="text-gray-300">|</span>
            <span>총비용 {breakdown.totalCost.toLocaleString()}원</span>
          </div>

          {/* Detail toggle */}
          <button
            type="button"
            onClick={() => setShowDetail(!showDetail)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showDetail ? '접기' : '비용 상세 (항목별 수정 가능)'}
          </button>

          {showDetail && (
            <div className="mt-2 pt-2 border-t border-current/10 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <NumField
                  label="공급가"
                  value={local.supplierPrice}
                  onChange={(v) => { updateLocal({ supplierPrice: v }); pushToForm('supplierPrice', v); }}
                  small
                />
                <NumField
                  label="배송비"
                  value={local.shippingFee}
                  onChange={(v) => updateLocal({ shippingFee: v })}
                  small
                />
                <NumField
                  label="포장비"
                  value={local.packagingCost}
                  onChange={(v) => updateLocal({ packagingCost: v })}
                  small
                />
                <NumField
                  label="반품 리스크(%)"
                  value={local.returnRiskRate}
                  onChange={(v) => updateLocal({ returnRiskRate: v })}
                  suffix="%"
                  small
                  step={0.5}
                />
                <NumField
                  label="광고비(%)"
                  value={local.adCostRate}
                  onChange={(v) => updateLocal({ adCostRate: v })}
                  suffix="%"
                  small
                  step={0.5}
                />
                <NumField
                  label={`수수료율 (${local.feeRateOverride !== null ? '수동' : '자동'})`}
                  value={displayFeeRate}
                  onChange={(v) => updateLocal({ feeRateOverride: v })}
                  suffix="%"
                  small
                  step={0.1}
                />
                {local.feeRateOverride !== null && (
                  <div className="flex items-end pb-1">
                    <button
                      type="button"
                      onClick={() => updateLocal({ feeRateOverride: null })}
                      className="text-xs text-blue-500 hover:text-blue-700 underline"
                    >
                      자동 복원
                    </button>
                  </div>
                )}
              </div>

              {/* Breakdown table */}
              <div className="text-xs space-y-0.5 pt-1 border-t border-current/10">
                <div className="flex justify-between">
                  <span>공급가</span>
                  <span>{local.supplierPrice.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    네이버 수수료 ({(breakdown.naverFeeRate * 100).toFixed(1)}%)
                  </span>
                  <span>{breakdown.naverFee.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-gray-400 pl-2">
                  <span>└ 주문관리 ({(feeBreakdown.orderManagementRate * 100).toFixed(2)}%)</span>
                  <span>{breakdown.orderMgmtFee.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-gray-400 pl-2">
                  <span>└ 판매수수료 ({(feeBreakdown.salesFeeRate * 100).toFixed(2)}%)</span>
                  <span>{breakdown.salesFee.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span>배송비</span>
                  <span>{local.shippingFee.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span>포장비</span>
                  <span>{local.packagingCost.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span>반품 리스크 ({local.returnRiskRate}%)</span>
                  <span>{breakdown.returnRisk.toLocaleString()}원</span>
                </div>
                {local.adCostRate > 0 && (
                  <div className="flex justify-between">
                    <span>광고비 ({local.adCostRate}%)</span>
                    <span>{breakdown.adCost.toLocaleString()}원</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1 border-t border-current/10">
                  <span>총 비용</span>
                  <span>{breakdown.totalCost.toLocaleString()}원</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Target Margin + Recommended Price */}
      {local.supplierPrice > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-gray-600" />
            <span className="text-xs font-medium text-gray-600">목표 마진율</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={local.targetMargin}
                onChange={(e) => updateLocal({ targetMargin: parseFloat(e.target.value) || 0 })}
                className="w-14 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:ring-2 focus:ring-pink-500"
                min={0}
                max={90}
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
          </div>

          {/* Recommended margin profile hint */}
      {selectedD1 && (() => {
        const profile = getMarginProfile(selectedD1);
        return (
          <p className="text-[10px] text-blue-500 px-1">
            {selectedD1} 권장: 최소 {profile.min}% · 권장 {profile.recommended}% · {profile.reason}
          </p>
        );
      })()}

      {recommendedPrice > 0 && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">추천 판매가</p>
                <p className="text-lg font-bold text-pink-600">{recommendedPrice.toLocaleString()}원</p>
              </div>
              {local.salePrice !== recommendedPrice ? (
                <button
                  type="button"
                  onClick={applyRecommendedPrice}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-pink-500 hover:bg-pink-600 rounded-lg transition-colors"
                >
                  적용
                </button>
              ) : (
                <span className="text-xs text-green-600 font-medium">목표 달성 OK</span>
              )}
            </div>
          )}

          {local.salePrice > 0 && recommendedPrice > 0 && local.salePrice !== recommendedPrice && (
            <p className="mt-1.5 text-xs text-gray-500">
              {local.salePrice < recommendedPrice
                ? `${(recommendedPrice - local.salePrice).toLocaleString()}원 올리면 ${local.targetMargin}% 달성`
                : `현재 ${breakdown.marginRate.toFixed(1)}% > 목표 ${local.targetMargin}%`}
            </p>
          )}
        </div>
      )}

      {/* Margin level guide */}
      <div className="flex gap-1.5 text-[10px]">
        <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded">50%+ 우수</span>
        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">30~50% 양호</span>
        <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 rounded">15~30% 보통</span>
        <span className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded">~15% 낮음</span>
      </div>
    </div>
  );
}
