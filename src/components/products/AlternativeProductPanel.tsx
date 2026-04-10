'use client';
// AlternativeProductPanel v2 — 대체상품 등록 및 관리
// 개선사항:
// - 유사도% 삭제 → 실제 공급가/재고 직접 입력
// - URL 입력 시 자동 크롤링으로 상품명/가격/재고 채우기
// - 원본 상품 대비 가격차 자동 계산 표시
// - 재고 상태: 직접 확인 or 크롤링으로 자동 감지

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, ExternalLink, AlertTriangle,
  ChevronDown, ChevronUp, ArrowUpDown, Search,
  TrendingDown, TrendingUp, Minus, RefreshCw,
} from 'lucide-react';

interface Supplier { id: string; name: string; code: string; platformCode?: string; }

interface AlternativeProduct {
  id?: string;
  product_id?: string;
  priority: number;
  alt_product_name: string;
  supplier_id: string | null;
  supplier_name?: string;
  platform_code: string;
  platform_product_code: string;
  platform_url: string;
  memo: string;
  // v2: concrete fields instead of abstract similarity_score
  alt_supply_price: number | null;   // 대체상품 도매 공급가
  alt_sale_price: number | null;     // 대체상품 예상 판매가
  stock_count: number | null;        // 현재 재고 수량
  alt_stock_status: 'in_stock' | 'out_of_stock' | 'unknown';
  auto_switch: boolean;
  crawl_name?: string;
  crawl_price?: number;
  crawl_checked_at?: string;
  // UI
  _isNew?: boolean;
  _expanded?: boolean;
  _crawling?: boolean;
}

interface Props {
  productId?: string;
  productName?: string;
  productSupplyPrice?: number;  // 원본 상품 공급가 (비교용)
  productSalePrice?: number;    // 원본 상품 판매가 (비교용)
  isOutOfStock?: boolean;
  suppliers?: Supplier[];
  onAltCountChange?: (count: number) => void;
  onChange?: (alts: AlternativeProduct[]) => void;
}

const EMPTY_ALT = (): AlternativeProduct => ({
  priority: 1,
  alt_product_name: '',
  supplier_id: null,
  platform_code: '',
  platform_product_code: '',
  platform_url: '',
  memo: '',
  alt_supply_price: null,
  alt_sale_price: null,
  stock_count: null,
  alt_stock_status: 'unknown',
  auto_switch: false,
  _isNew: true,
  _expanded: true,
  _crawling: false,
});

const inp = 'w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white transition';
const sel = inp + ' appearance-none cursor-pointer';

// Price diff badge
function PriceDiffBadge({ diff, pct }: { diff: number; pct: number }) {
  if (!diff && !pct) return null;
  const isUp   = diff > 0;
  const isSame = diff === 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${
      isSame ? 'bg-gray-100 text-gray-500' :
      isUp ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
    }`}>
      {isSame ? <Minus size={10} /> : isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {isSame ? '동일' : `${isUp ? '+' : ''}${diff.toLocaleString()}원 (${isUp ? '+' : ''}${pct.toFixed(1)}%)`}
    </span>
  );
}

// Stock status badge
function StockBadge({ status, count }: { status: AlternativeProduct['alt_stock_status']; count: number | null }) {
  if (status === 'in_stock') return (
    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">
      재고있음 {count !== null ? `(${count.toLocaleString()}개)` : ''}
    </span>
  );
  if (status === 'out_of_stock') return (
    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">품절</span>
  );
  return count !== null ? (
    <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold">
      재고 {count.toLocaleString()}개
    </span>
  ) : null;
}

export default function AlternativeProductPanel({
  productId,
  productName,
  productSupplyPrice,
  productSalePrice,
  isOutOfStock,
  suppliers = [],
  onAltCountChange,
  onChange,
}: Props) {
  const [alts, setAlts]         = useState<AlternativeProduct[]>([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState<Record<number, boolean>>({});
  const [panelOpen, setPanelOpen] = useState(false);

  const loadAlts = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/products/alternatives?productId=${productId}`);
      const data = await res.json();
      if (data.success) {
        setAlts(data.alternatives.map((a: any) => ({
          ...a,
          alt_supply_price: a.alt_supply_price ?? null,
          alt_sale_price:   a.alt_sale_price   ?? null,
          alt_stock_status: a.alt_stock_status  ?? 'unknown',
          stock_count:      a.stock_count       ?? null,
          _expanded: false,
        })));
        onAltCountChange?.(data.alternatives.length);
      }
    } finally {
      setLoading(false);
    }
  }, [productId, onAltCountChange]);

  useEffect(() => { if (productId) loadAlts(); }, [productId, loadAlts]);
  useEffect(() => {
    onChange?.(alts.filter(a => !a._isNew || a.alt_product_name.trim()));
  }, [alts, onChange]);

  // Auto-crawl: when URL is entered, fetch product info
  const autoCrawl = async (idx: number, url: string) => {
    if (!url.includes('domemedb.com') && !url.includes('domeggook.com')) return;
    setAlts(prev => prev.map((a, i) => i === idx ? { ...a, _crawling: true } : a));
    try {
      const res  = await fetch('/api/crawler/domemae', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const d = data.data;
        setAlts(prev => prev.map((a, i) => i === idx ? {
          ...a,
          alt_product_name: a.alt_product_name || d.name || a.alt_product_name,
          alt_supply_price: d.supplierPrice || a.alt_supply_price,
          crawl_name:  d.name,
          crawl_price: d.supplierPrice,
          crawl_checked_at: new Date().toISOString(),
          _crawling: false,
        } : a));
      } else {
        setAlts(prev => prev.map((a, i) => i === idx ? { ...a, _crawling: false } : a));
      }
    } catch {
      setAlts(prev => prev.map((a, i) => i === idx ? { ...a, _crawling: false } : a));
    }
  };

  const addAlt = () => {
    setAlts(prev => [...prev, { ...EMPTY_ALT(), priority: prev.length + 1 }]);
    setPanelOpen(true);
  };

  const removeAlt = async (idx: number) => {
    const alt = alts[idx];
    if (alt.id && productId) {
      await fetch(`/api/products/alternatives?id=${alt.id}`, { method: 'DELETE' });
    }
    setAlts(prev => prev.filter((_, i) => i !== idx).map((a, i) => ({ ...a, priority: i + 1 })));
    onAltCountChange?.(alts.length - 1);
  };

  const updateAlt = (idx: number, field: keyof AlternativeProduct, val: any) => {
    setAlts(prev => prev.map((a, i) => i === idx ? { ...a, [field]: val } : a));
  };

  const handleUrlBlur = (idx: number, url: string) => {
    if (url.trim()) autoCrawl(idx, url.trim());
  };

  const saveAlt = async (idx: number) => {
    if (!productId) return;
    const alt = alts[idx];
    setSaving(prev => ({ ...prev, [idx]: true }));
    try {
      const payload = {
        productId,
        altProductName:      alt.alt_product_name,
        supplierId:          alt.supplier_id,
        platformCode:        alt.platform_code,
        platformProductCode: alt.platform_product_code,
        platformUrl:         alt.platform_url,
        memo:                alt.memo,
        altSupplyPrice:      alt.alt_supply_price,
        altSalePrice:        alt.alt_sale_price,
        stockCount:          alt.stock_count,
        altStockStatus:      alt.alt_stock_status,
        autoSwitch:          alt.auto_switch,
        priority:            alt.priority,
        // price_diff computed server-side from original product
        priceDiff: productSupplyPrice && alt.alt_supply_price
          ? alt.alt_supply_price - productSupplyPrice
          : 0,
        similarityScore: 0, // deprecated — kept for DB compat
      };

      if (alt.id) {
        await fetch(`/api/products/alternatives?id=${alt.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setAlts(prev => prev.map((a, i) => i === idx ? { ...a, _expanded: false } : a));
      } else {
        const res  = await fetch('/api/products/alternatives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setAlts(prev => prev.map((a, i) =>
            i === idx ? { ...data.alternative, _isNew: false, _expanded: false } : a
          ));
          onAltCountChange?.(alts.length);
        }
      }
    } finally {
      setSaving(prev => ({ ...prev, [idx]: false }));
    }
  };

  const toggleExpand = (idx: number) =>
    setAlts(prev => prev.map((a, i) => i === idx ? { ...a, _expanded: !a._expanded } : a));

  // Compute price diff vs original product
  const calcDiff = (altPrice: number | null) => {
    if (!altPrice || !productSupplyPrice) return { diff: 0, pct: 0 };
    const diff = altPrice - productSupplyPrice;
    const pct  = (diff / productSupplyPrice) * 100;
    return { diff, pct };
  };

  return (
    <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setPanelOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${panelOpen ? 'bg-rose-50' : 'hover:bg-gray-50'}`}
      >
        <div className="flex items-center gap-2">
          <ArrowUpDown size={14} className="text-rose-400" />
          <span className="text-sm font-semibold text-gray-800">대체상품 관리</span>
          {alts.length > 0 && (
            <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
              {alts.length}개 등록
            </span>
          )}
          {isOutOfStock && alts.length === 0 && (
            <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle size={10} /> 품절 중 — 미등록
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!panelOpen && alts.length === 0 && <span className="text-xs text-gray-400">품절 시 대체할 상품 미리 등록</span>}
          {panelOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>

      {panelOpen && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3">

          {isOutOfStock && (
            <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
              <AlertTriangle size={14} className="text-orange-500 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700">
                <strong>{productName}</strong>이 현재 품절 상태입니다.
                대체상품을 등록하면 디스코드 #재고-알림으로 자동 발송됩니다.
              </p>
            </div>
          )}

          {alts.length === 0 && (
            <p className="text-xs text-gray-400">
              공급사 URL만 입력하면 상품명과 가격을 자동으로 가져옵니다.
              도매매/도매꾹에 로그인하면 더 정확한 가격을 가져옵니다.
            </p>
          )}

          {loading ? <p className="text-xs text-gray-400 text-center py-3">불러오는 중...</p> : (
            <div className="space-y-2">
              {alts.map((alt, idx) => {
                const { diff, pct } = calcDiff(alt.alt_supply_price);
                return (
                  <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Row header */}
                    <div
                      className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${alt._expanded ? 'bg-rose-50' : 'hover:bg-gray-50'}`}
                      onClick={() => toggleExpand(idx)}
                    >
                      <span className="text-xs font-bold text-gray-400 w-5 text-center shrink-0">{alt.priority}</span>
                      <div className="flex-1 min-w-0">
                        {alt.alt_product_name
                          ? <p className="text-xs font-semibold text-gray-800 truncate">{alt.alt_product_name}</p>
                          : <p className="text-xs text-gray-400 italic">상품명 미입력</p>
                        }
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {alt.platform_code && <span className="text-xs text-blue-500">{alt.platform_code}</span>}
                          {alt.alt_supply_price && (
                            <span className="text-xs font-semibold text-gray-700">{alt.alt_supply_price.toLocaleString()}원</span>
                          )}
                          {alt.alt_supply_price && productSupplyPrice && (
                            <PriceDiffBadge diff={diff} pct={pct} />
                          )}
                          <StockBadge status={alt.alt_stock_status} count={alt.stock_count} />
                          {alt.auto_switch && <span className="text-xs bg-purple-100 text-purple-600 px-1.5 rounded">자동전환</span>}
                          {alt._crawling && <span className="text-xs text-blue-400 animate-pulse">크롤링 중...</span>}
                        </div>
                      </div>
                      {alt.platform_url && (
                        <a href={alt.platform_url} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()} className="text-blue-400 hover:text-blue-600 p-1 shrink-0">
                          <ExternalLink size={12} />
                        </a>
                      )}
                      <button onClick={e => { e.stopPropagation(); removeAlt(idx); }}
                        className="text-red-300 hover:text-red-500 p-1 shrink-0"><Trash2 size={12} /></button>
                      {alt._expanded ? <ChevronUp size={12} className="text-gray-400 shrink-0" /> : <ChevronDown size={12} className="text-gray-400 shrink-0" />}
                    </div>

                    {/* Expanded form */}
                    {alt._expanded && (
                      <div className="px-3 pb-3 pt-2 border-t border-gray-100 space-y-2.5">

                        {/* Crawl hint */}
                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
                          <Search size={11} className="text-blue-400 shrink-0" />
                          <p className="text-xs text-blue-600">
                            도매매/도매꾹 URL을 입력하면 상품명·가격이 자동으로 채워집니다.
                            <a href="/settings" className="ml-1 underline font-semibold">로그인 설정</a>
                          </p>
                        </div>

                        {/* URL (primary — auto-crawls on blur) */}
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block font-semibold">
                            공급사 상품 URL
                            <span className="text-gray-400 font-normal ml-1">(입력 후 자동 크롤링)</span>
                          </label>
                          <div className="relative">
                            <input className={inp} value={alt.platform_url}
                              onChange={e => updateAlt(idx, 'platform_url', e.target.value)}
                              onBlur={e => handleUrlBlur(idx, e.target.value)}
                              placeholder="https://www.domemedb.com/product/..." />
                            {alt._crawling && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                <RefreshCw size={12} className="text-blue-400 animate-spin" />
                              </span>
                            )}
                          </div>
                          {alt.crawl_name && alt.crawl_name !== alt.alt_product_name && (
                            <p className="text-xs text-blue-500 mt-1">
                              크롤링 결과: {alt.crawl_name}
                              <button className="ml-2 underline" onClick={() => updateAlt(idx, 'alt_product_name', alt.crawl_name!)}>적용</button>
                            </p>
                          )}
                        </div>

                        {/* Row: name + platform */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2">
                            <label className="text-xs text-gray-500 mb-1 block">대체상품명</label>
                            <input className={inp} value={alt.alt_product_name}
                              onChange={e => updateAlt(idx, 'alt_product_name', e.target.value)}
                              placeholder="상품명 (URL 입력 시 자동 채워짐)" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">공급사</label>
                            <select className={sel} value={alt.supplier_id ?? ''}
                              onChange={e => updateAlt(idx, 'supplier_id', e.target.value || null)}>
                              <option value="">선택 안함</option>
                              {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">플랫폼</label>
                            <select className={sel} value={alt.platform_code}
                              onChange={e => updateAlt(idx, 'platform_code', e.target.value)}>
                              <option value="">선택</option>
                              <option value="DMM">도매매 (DMM)</option>
                              <option value="DMK">도매꾹 (DMK)</option>
                              <option value="OWN">자체 공급</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">플랫폼 상품코드</label>
                            <input className={inp} value={alt.platform_product_code}
                              onChange={e => updateAlt(idx, 'platform_product_code', e.target.value)}
                              placeholder="12345678" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">메모</label>
                            <input className={inp} value={alt.memo}
                              onChange={e => updateAlt(idx, 'memo', e.target.value)}
                              placeholder="예) 색상 동일, 소재 다름" />
                          </div>
                        </div>

                        {/* Price / Stock section */}
                        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                          <p className="text-xs font-semibold text-gray-600">가격 &amp; 재고 정보</p>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">대체상품 공급가 (원)</label>
                              <input className={inp} type="number" min={0}
                                value={alt.alt_supply_price ?? ''}
                                onChange={e => updateAlt(idx, 'alt_supply_price', e.target.value ? Number(e.target.value) : null)}
                                placeholder="도매가 직접 입력" />
                              {/* vs original comparison */}
                              {alt.alt_supply_price && productSupplyPrice && (
                                <p className="text-xs mt-1 text-gray-500">
                                  원본 공급가 {productSupplyPrice.toLocaleString()}원 대비
                                  {' '}<PriceDiffBadge diff={diff} pct={pct} />
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">대체상품 예상 판매가 (원)</label>
                              <input className={inp} type="number" min={0}
                                value={alt.alt_sale_price ?? ''}
                                onChange={e => updateAlt(idx, 'alt_sale_price', e.target.value ? Number(e.target.value) : null)}
                                placeholder={productSalePrice ? String(productSalePrice) : '원본과 동일하면 비워두세요'} />
                              {!alt.alt_sale_price && productSalePrice && (
                                <p className="text-xs text-gray-400 mt-0.5">미입력 시 원본 판매가 {productSalePrice.toLocaleString()}원 유지</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">현재 재고 수량</label>
                              <input className={inp} type="number" min={0}
                                value={alt.stock_count ?? ''}
                                onChange={e => updateAlt(idx, 'stock_count', e.target.value ? Number(e.target.value) : null)}
                                placeholder="공급사에서 확인한 재고수" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">재고 상태</label>
                              <select className={sel} value={alt.alt_stock_status}
                                onChange={e => updateAlt(idx, 'alt_stock_status', e.target.value as any)}>
                                <option value="unknown">미확인</option>
                                <option value="in_stock">재고 있음</option>
                                <option value="out_of_stock">품절</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Auto-switch */}
                        <label className="flex items-center gap-2 cursor-pointer px-1">
                          <input type="checkbox" checked={alt.auto_switch}
                            onChange={e => updateAlt(idx, 'auto_switch', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-purple-500" />
                          <span className="text-xs text-gray-600">
                            원본 품절 시 이 상품으로 자동 전환 알림 발송
                          </span>
                        </label>

                        {productId && (
                          <button onClick={() => saveAlt(idx)} disabled={saving[idx]}
                            className="w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition disabled:opacity-50">
                            {saving[idx] ? '저장 중...' : alt.id ? '수정 저장' : '대체상품 등록'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={addAlt}
            className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-rose-300 hover:text-rose-500 transition flex items-center justify-center gap-1.5 font-medium">
            <Plus size={12} />
            대체상품 추가 {alts.length > 0 ? `(현재 ${alts.length}개)` : ''}
          </button>

          {!productId && alts.some(a => a.alt_product_name) && (
            <p className="text-xs text-blue-500 text-center">상품 등록 완료 시 대체상품 정보도 함께 저장됩니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
