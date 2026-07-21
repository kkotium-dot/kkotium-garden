'use client';
// Out-of-Stock Improvement Page
// Shows sold-out products with Kkotti analysis + alternative product suggestions
// Improvement actions: restock alert, find alternative, deactivate, reprice

import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, RefreshCw, Search, TrendingUp, Package, ArrowRight, CheckCircle, XCircle, Zap } from 'lucide-react';
import { calcHoneyScore } from '@/lib/honey-score';
import type { HoneyScoreResult } from '@/lib/honey-score';
import { decideDisposition, LONG_OUT_OF_STOCK_DAYS } from '@/lib/products/disposition';
import dispositionCopy from '@/lib/products/disposition.strings.ko.json';

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
  // 처분 권고(#273) 판정 입력. 판매 이력이 있으면 "정리"가 아니라 "대체 소싱"이
  // 정답이므로(#272) 이 네 필드 없이는 올바른 권고를 낼 수 없다.
  naverProductId?: string | null;
  naver_status_type?: string | null;
  salesCount?: number | null;
  lastSaleDate?: string | null;
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

// ── 처분 권고 (#273) ──────────────────────────────────────────────────────────
// 이 화면은 자체 규칙을 두지 않는다. "이 상품을 어떻게 할까"의 답은
// disposition.ts 단일 권위가 낸다(#62). 예전 이 자리에 있던 로직은 판매 이력을
// 모른 채 "30일 품절 = 정리 권장"을 띄워, 리뷰·검색순위가 쌓인 상품까지 지우도록
// 유도할 수 있었다(#272 위반). 그 결론을 엔진으로 옮기고, 이 함수는 엔진의 판정을
// 화면 표현(색·문구·기본 선택 버튼)으로 옮기는 역할만 한다.
//
// 꿀통지수는 처분 여부가 아니라 *재입고 우선순위*에만 쓴다 — 점수가 높다고 자산이
// 지켜지는 것도, 낮다고 지워도 되는 것도 아니기 때문.
function getOosAdvice(product: OutOfStockProduct, days: number, honey: HoneyScoreResult) {
  const verdict = decideDisposition({
    // 이 페이지에 오는 상품은 정의상 품절 상태다.
    qty: 0,
    daysOutOfStock: days,
    naverProductId: product.naverProductId,
    naverStatusType: product.naver_status_type,
    salesCount: product.salesCount,
    lastSaleDate: product.lastSaleDate,
    // 공급처 단절 판정은 재고 스냅샷이 필요하다(#271). 이 화면은 스냅샷을 읽지
    // 않으므로 미판정으로 두고, 단절 신호는 목록 배지가 담당한다.
    sourceGone: false,
  });

  if (verdict.action === 'RESOURCE') {
    return {
      label: dispositionCopy.RESOURCE.action, color: 'text-fuchsia-700', bg: 'bg-fuchsia-50',
      border: 'border-fuchsia-200', icon: 'find', recommended: 'replace' as ActionType,
      msg: dispositionCopy.RESOURCE.tooltip,
    };
  }
  if (verdict.action === 'DELETE_SAFE') {
    return {
      label: dispositionCopy.DELETE_SAFE.action, color: 'text-fuchsia-700', bg: 'bg-fuchsia-50',
      border: 'border-fuchsia-200', icon: 'clean', recommended: 'deactivate' as ActionType,
      msg: dispositionCopy.DELETE_SAFE.tooltip,
    };
  }
  if (verdict.action === 'SUSPEND') {
    // 장기 품절 — 자산 유무로 "그 다음에 뭘 할지"가 갈린다.
    const tail = verdict.hasAssets
      ? ' 이 상품은 팔린 적이 있어서 리뷰와 순위가 쌓여 있어요. 삭제하지 말고 판매중지 후 대체 공급처를 찾아주세요.'
      : ' 판매 이력이 없어서 지킬 리뷰·순위는 없어요. 정리하거나 더 나은 상품으로 교체해도 괜찮아요.';
    return {
      label: dispositionCopy.SUSPEND.action, color: 'text-orange-700', bg: 'bg-orange-50',
      border: 'border-orange-200', icon: 'clean', recommended: 'deactivate' as ActionType,
      msg: dispositionCopy.SUSPEND.tooltip + tail,
    };
  }
  if (verdict.action === 'MARK_OUT_OF_STOCK') {
    return {
      label: dispositionCopy.MARK_OUT_OF_STOCK.action, color: 'text-red-600', bg: 'bg-red-50',
      border: 'border-red-200', icon: 'urgent', recommended: 'restock' as ActionType,
      msg: dispositionCopy.MARK_OUT_OF_STOCK.tooltip,
    };
  }

  // 권고 없음(이미 품절 처리된 단기 품절) — 남은 질문은 "얼마나 급히 재입고하나"뿐.
  // 여기서만 꿀통지수를 쓴다.
  if (days <= 3 && honey.total >= 70) {
    return { label: '긴급 재입고', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: 'urgent', recommended: 'restock' as ActionType, msg: `꿀통 ${honey.total}점 상품! ${days}일째 품절 중 — 빨리 재입고하면 손해가 없어요!` };
  }
  if (honey.total >= 50) {
    return { label: '재입고 권장', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: 'warn', recommended: 'restock' as ActionType, msg: `아직 늦지 않았어요! ${days}일째 품절 — 공급사에 연락해봐요.` };
  }
  return { label: '모니터링 중', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'wait', recommended: 'none' as ActionType, msg: `${days}일째 품절 중이에요. ${LONG_OUT_OF_STOCK_DAYS}일이 넘으면 판매중지를 권해드릴게요.` };
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
            placeholder="상품명 또는 상품코드(SKU) 검색..."
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
              const advice = getOosAdvice(product, days, honey);
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
                          {advice.recommended === act && currentAction !== act && (
                            <span className="ml-1 text-[10px] font-bold text-rose-500">추천</span>
                          )}
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
