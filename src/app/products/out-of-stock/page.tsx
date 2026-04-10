'use client';
// Out-of-Stock Improvement Page
// Shows sold-out products with Kkotti analysis + alternative product suggestions
// Improvement actions: restock alert, find alternative, deactivate, reprice

import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, RefreshCw, Search, TrendingUp, Package, ArrowRight, CheckCircle, XCircle, Zap } from 'lucide-react';
import { calcHoneyScore } from '@/lib/honey-score';
import type { HoneyScoreResult } from '@/lib/honey-score';

// ── Types ──────────────────────────────────────────────────────────────────────
interface OutOfStockProduct {
  id: string;
  sku: string;
  name: string;
  salePrice: number;
  supplierPrice: number;
  status: string;
  naverCategoryCode: string | null;
  brand: string | null;
  tags: string[] | null;
  keywords: string[] | null;
  mainImage: string | null;
  supplierId: string | null;
  supplierName: string | null;
  createdAt: string;
  updatedAt: string;
  // Computed
  honeyScore?: HoneyScoreResult;
  daysOutOfStock?: number;
}

type ActionType = 'restock' | 'replace' | 'reprice' | 'deactivate' | 'none';

interface ImprovementAction {
  productId: string;
  action: ActionType;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function formatPrice(n: number): string {
  return n.toLocaleString('ko-KR') + '원';
}

// ── Kkotti out-of-stock advice ─────────────────────────────────────────────────
function getOosAdvice(days: number, honey: HoneyScoreResult) {
  if (days <= 3 && honey.total >= 70) return { label: '긴급 재입고', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: 'urgent', msg: `꿀통 ${honey.total}점 상품! ${days}일째 품절 중 — 빨리 재입고하면 손해가 없어요!` };
  if (days <= 7 && honey.total >= 50) return { label: '재입고 권장', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: 'warn', msg: `아직 늦지 않았어요! ${days}일째 품절 — 공급사에 연락해봐요.` };
  if (days > 14 && honey.total < 40) return { label: '대체상품 찾기', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: 'find', msg: `${days}일이나 품절! 꿀통지수도 낮아요. 더 좋은 상품으로 교체해봐요.` };
  if (days > 30) return { label: '정리 권장', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', icon: 'clean', msg: `${days}일 품절 장기화. 비활성화 후 유사 상품으로 교체를 고려하세요.` };
  return { label: '모니터링 중', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'wait', msg: `${days}일째 품절 중이에요. 공급사 재고를 확인해보세요.` };
}

const ACTION_LABELS: Record<ActionType, string> = {
  restock:    '재입고 요청',
  replace:    '대체상품 찾기',
  reprice:    '가격 재조정',
  deactivate: '비활성화',
  none:       '미정',
};

// ── Stats card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-black ${color ?? 'text-gray-800'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function OutOfStockPage() {
  const [products, setProducts] = useState<OutOfStockProduct[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [actions, setActions]   = useState<ImprovementAction[]>([]);
  const [saving, setSaving]     = useState<Record<string, boolean>>({});

  // Load out-of-stock products
  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products?status=OUT_OF_STOCK&limit=100');
      const data = await res.json();
      const list: OutOfStockProduct[] = (data.products ?? data.data ?? []).map((p: any) => ({
        ...p,
        daysOutOfStock: daysSince(p.updatedAt ?? p.createdAt),
        honeyScore: calcHoneyScore({
          salePrice:     p.salePrice ?? 0,
          supplierPrice: p.supplierPrice ?? 0,
          categoryId:    p.naverCategoryCode ?? '',
          productName:   p.name ?? '',
          keywords:      Array.isArray(p.keywords) ? p.keywords : [],
          tags:          Array.isArray(p.tags) ? p.tags : [],
          hasMainImage:  !!p.mainImage,
          hasDescription: false,
        }),
      }));
      setProducts(list);
    } catch {
      // Silently fail — show empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }, [products, search]);

  // Stats
  const urgentCount    = products.filter(p => (p.daysOutOfStock ?? 0) <= 3 && (p.honeyScore?.total ?? 0) >= 70).length;
  const avgHoney       = products.length > 0 ? Math.round(products.reduce((a, p) => a + (p.honeyScore?.total ?? 0), 0) / products.length) : 0;
  const longTermCount  = products.filter(p => (p.daysOutOfStock ?? 0) > 14).length;
  const lostRevEstimate = products.reduce((a, p) => a + (p.salePrice * 0.3), 0); // rough 30% daily loss estimate

  const setAction = (productId: string, action: ActionType) => {
    setActions(prev => {
      const existing = prev.find(a => a.productId === productId);
      if (existing) return prev.map(a => a.productId === productId ? { ...a, action } : a);
      return [...prev, { productId, action }];
    });
  };

  const getAction = (productId: string): ActionType =>
    actions.find(a => a.productId === productId)?.action ?? 'none';

  const handleApplyAction = async (product: OutOfStockProduct, action: ActionType) => {
    if (action === 'none') return;
    setSaving(prev => ({ ...prev, [product.id]: true }));
    try {
      if (action === 'deactivate') {
        await fetch(`/api/products/${product.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'INACTIVE' }),
        });
        setProducts(prev => prev.filter(p => p.id !== product.id));
      } else if (action === 'restock') {
        // Navigate to supplier page
        window.open(`/settings/platforms?supplierId=${product.supplierId}`, '_blank');
      } else if (action === 'replace') {
        // Navigate to new product with pre-filled category
        const params = new URLSearchParams({ categoryCode: product.naverCategoryCode ?? '', ref: product.sku });
        window.open(`/products/new?${params}`, '_blank');
      } else if (action === 'reprice') {
        // Navigate to product edit
        window.open(`/products/${product.id}/edit`, '_blank');
      }
    } finally {
      setSaving(prev => ({ ...prev, [product.id]: false }));
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/products" className="text-gray-400 hover:text-gray-600 text-sm">← 목록</a>
            <span className="text-gray-300">|</span>
            <AlertTriangle size={16} className="text-orange-500" />
            <h1 className="text-lg font-bold text-gray-900">품절 상품 개선</h1>
            {products.length > 0 && (
              <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2.5 py-1 rounded-full">
                {products.length}개 품절
              </span>
            )}
          </div>
          <button
            onClick={loadProducts}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            <RefreshCw size={12} />
            새로고침
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="총 품절 상품" value={products.length} sub="개" color="text-orange-600" />
          <StatCard label="긴급 재입고 필요" value={urgentCount} sub="꿀통 70+ / 3일내" color="text-red-600" />
          <StatCard label="평균 꿀통지수" value={avgHoney} sub="점" color={avgHoney >= 70 ? 'text-green-600' : avgHoney >= 50 ? 'text-blue-600' : 'text-gray-500'} />
          <StatCard label="장기 품절" value={longTermCount} sub="14일 이상" color="text-gray-600" />
        </div>

        {/* Kkotti summary banner */}
        {urgentCount > 0 && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <Zap size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700">꼬띠 긴급 알림</p>
              <p className="text-xs text-red-600 mt-0.5">
                꿀통 상품 {urgentCount}개가 3일 이내에 품절됐어요! 지금 바로 재입고 요청하면 매출 손실을 최소화할 수 있어요.
              </p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 placeholder-gray-300"
            placeholder="상품명 또는 SKU 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Product list */}
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">품절 상품이 없어요!</p>
            <p className="text-xs text-gray-400 mt-1">재고가 잘 관리되고 있어요. 수고하셨어요!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(product => {
              const honey = product.honeyScore!;
              const days  = product.daysOutOfStock ?? 0;
              const advice = getOosAdvice(days, honey);
              const currentAction = getAction(product.id);

              return (
                <div key={product.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  {/* Top bar: urgency color */}
                  <div className={`h-1 w-full ${
                    days <= 3 && honey.total >= 70 ? 'bg-red-400' :
                    days <= 7 ? 'bg-orange-300' :
                    days > 14 ? 'bg-gray-200' : 'bg-yellow-300'
                  }`} />

                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Image placeholder */}
                      <div className="w-14 h-14 shrink-0 bg-gray-100 rounded-xl flex items-center justify-center text-gray-300">
                        {product.mainImage ? (
                          <img src={product.mainImage} alt="" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <Package size={20} />
                        )}
                      </div>

                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{product.sku}</p>
                          </div>
                          {/* Honey score badge */}
                          <div className={`shrink-0 text-center px-2.5 py-1 rounded-xl border ${
                            honey.grade === 'S' ? 'bg-purple-50 border-purple-200' :
                            honey.grade === 'A' ? 'bg-green-50 border-green-200' :
                            honey.grade === 'B' ? 'bg-blue-50 border-blue-200' :
                            honey.grade === 'C' ? 'bg-yellow-50 border-yellow-200' :
                            'bg-gray-50 border-gray-200'
                          }`}>
                            <p className={`text-xs font-black ${
                              honey.grade === 'S' ? 'text-purple-700' :
                              honey.grade === 'A' ? 'text-green-700' :
                              honey.grade === 'B' ? 'text-blue-700' :
                              honey.grade === 'C' ? 'text-yellow-700' : 'text-gray-500'
                            }`}>{honey.total}</p>
                            <p className="text-xs text-gray-400">{honey.grade}등급</p>
                          </div>
                        </div>

                        {/* Price info */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span>판매가 <strong className="text-gray-800">{formatPrice(product.salePrice)}</strong></span>
                          <span>공급가 <strong className="text-gray-700">{formatPrice(product.supplierPrice)}</strong></span>
                          <span className={`font-semibold ${honey.netMarginRate >= 30 ? 'text-green-600' : honey.netMarginRate >= 20 ? 'text-yellow-600' : 'text-red-500'}`}>
                            순마진 {honey.netMarginRate.toFixed(1)}%
                          </span>
                        </div>

                        {/* Days out of stock + advice */}
                        <div className={`mt-2 px-3 py-2 rounded-xl border text-xs ${advice.bg} ${advice.border}`}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`font-bold ${advice.color}`}>{advice.label}</span>
                            <span className="text-gray-400">{days}일째 품절</span>
                          </div>
                          <p className={`${advice.color} opacity-80`}>{advice.msg}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action selector */}
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400 shrink-0">개선안:</span>
                      {(['restock', 'replace', 'reprice', 'deactivate'] as ActionType[]).map(act => (
                        <button
                          key={act}
                          onClick={() => setAction(product.id, act)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all font-medium ${
                            currentAction === act
                              ? act === 'deactivate'
                                ? 'bg-red-500 text-white border-red-500'
                                : 'bg-green-500 text-white border-green-500'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {ACTION_LABELS[act]}
                        </button>
                      ))}
                      {currentAction !== 'none' && (
                        <button
                          onClick={() => handleApplyAction(product, currentAction)}
                          disabled={saving[product.id]}
                          className={`ml-auto flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                            currentAction === 'deactivate'
                              ? 'bg-red-500 hover:bg-red-600 text-white'
                              : 'bg-green-500 hover:bg-green-600 text-white'
                          } disabled:opacity-50`}
                        >
                          {saving[product.id] ? '처리 중...' : '실행'}
                          <ArrowRight size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
