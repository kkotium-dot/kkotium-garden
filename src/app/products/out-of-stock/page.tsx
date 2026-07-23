'use client';
// src/app/products/out-of-stock/page.tsx
// ============================================================================
// 처분 결정 대기함 (#278/#273/#62) — 예전 "품절 상품 개선" 페이지의 재정의.
//
// ── 왜 재정의했나 ──────────────────────────────────────────────────────────
// 1) 이 화면은 `status=OUT_OF_STOCK`인 상품만 불러왔다. 그런데 **공급처가 끊긴
//    상품은 앱 상태가 ACTIVE인 채로 남아 있을 수 있다** — 가장 급한 처분 대상이
//    이 화면에서 통째로 누락되고 있었다. 처분 권고(#273)는 재고 상태가 아니라
//    "재고 신호 + 자산 유무"로 판정되므로, 대기함은 **전 상품**을 훑어야 한다.
// 2) 상품마다 사이드패널을 열어 하나씩 판단하는 반복이 남아 있었다. 같은 결론이
//    붙은 상품은 묶어서 한 번에 처리하는 게 실무 동선이다.
//
// ── 화면 정의 ──────────────────────────────────────────────────────────────
// "앱이 판단한 할 일"이 모이는 단일 지점. 처분 권고별로 그룹핑하고, 그룹 안에서
// 선택 → 일괄 반영한다. 권고가 없는 품절 상품은 마지막 "재입고 검토" 그룹으로
// 내려 꿀통지수 기준 우선순위만 보여준다(기존 가치 보존 — 아무것도 잃지 않는다).
//
// ── 안전 ───────────────────────────────────────────────────────────────────
// 일괄 반영도 단건과 동일한 #46 이중 게이트를 거친다: 전 건 dryRun 미리보기 →
// 운영자 확인 → 순차 실행. 앱이 자동으로 스토어에 쓰는 경로는 존재하지 않는다.
// 변경 없는 항목(no-op)은 미리보기 단계에서 제외해 헛쓰기를 만들지 않는다(#277).
// ============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, RefreshCw, Search, Package, ArrowRight, CheckCircle,
  Unplug, PackageX, PauseCircle, Loader2, ShieldAlert, Trash2,
} from 'lucide-react';
import { calcHoneyScore } from '@/lib/honey-score';
import type { HoneyScoreResult } from '@/lib/honey-score';
import { decideDisposition, LONG_OUT_OF_STOCK_DAYS, type DispositionAction } from '@/lib/products/disposition';
import dispositionCopy from '@/lib/products/disposition.strings.ko.json';
import { useInventoryBadges } from '@/lib/hooks/useInventoryBadges';
import { deriveLifecycleState, isQueueEligible } from '@/lib/products/surfaceRules';

// ── Types ──────────────────────────────────────────────────────────────────────
interface QueueProduct {
  id: string;
  sku: string;
  name: string;
  salePrice: number;
  supplierPrice: number;
  status: string;
  naverCategoryCode: string | null;
  mainImage: string | null;
  supplierId: string | null;
  supplierName: string | null;
  createdAt: string;
  updatedAt: string;
  naverProductId?: string | null;
  naver_status_type?: string | null;
  salesCount?: number | null;
  lastSaleDate?: string | null;
  // Computed
  honeyScore?: HoneyScoreResult;
  daysOutOfStock?: number | null;
  action: DispositionAction;
  hasAssets: boolean;
}

/** 일괄 반영이 가능한 그룹(스토어 상태 push로 의미가 통일되는 것만). */
type BulkTarget = 'OUTOFSTOCK' | 'SUSPENSION';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatPrice(n: number): string {
  return n.toLocaleString('ko-KR') + '원';
}

// ── 그룹 정의 ─────────────────────────────────────────────────────────────────
// 순서 = 급한 순(돈이 새는 순서, #274와 같은 사상). 위에서부터 처리하면 된다.
const GROUPS: Array<{
  action: DispositionAction | 'RESTOCK';
  title: string;
  why: string;
  tone: { fg: string; bg: string; bd: string };
  icon: typeof Unplug;
  bulk: BulkTarget | null;
}> = [
  {
    action: 'RESOURCE',
    title: '대체 소싱 필요',
    why: '공급처가 끊겼지만 판매 이력이 있어요. 삭제하면 리뷰·검색순위가 영구히 사라집니다 — 판매중지 후 같은 상품에 다른 공급처를 연결하세요.',
    tone: { fg: '#86198f', bg: '#fdf4ff', bd: '#f5d0fe' },
    icon: Unplug,
    bulk: 'SUSPENSION',
  },
  {
    action: 'MARK_OUT_OF_STOCK',
    title: '품절 처리 필요',
    why: '공급사 재고가 없는데 스토어는 아직 판매 중이에요. 주문이 들어오면 취소해야 하고, 취소가 쌓이면 스토어 등급이 깎입니다.',
    tone: { fg: '#991b1b', bg: '#fef2f2', bd: '#fecaca' },
    icon: PackageX,
    bulk: 'OUTOFSTOCK',
  },
  {
    action: 'SUSPEND',
    title: '판매중지 권장',
    why: `${LONG_OUT_OF_STOCK_DAYS}일 넘게 품절이에요. 이대로 두면 노출이 점점 낮아져 순위가 깎입니다. 판매중지는 검색에서만 내려가고 URL·리뷰는 보존돼요.`,
    tone: { fg: '#9a3412', bg: '#fff7ed', bd: '#fed7aa' },
    icon: PauseCircle,
    bulk: 'SUSPENSION',
  },
  {
    action: 'DELETE_SAFE',
    title: '삭제 안전',
    why: '공급처가 끊겼고 판매 이력도 없어요. 지킬 리뷰·순위가 없으니 목록에서 정리해도 괜찮습니다.',
    tone: { fg: '#86198f', bg: '#fdf4ff', bd: '#f5d0fe' },
    icon: Trash2,
    bulk: null,
  },
  {
    action: 'RESTOCK',
    title: '재입고 검토',
    why: '아직 처분할 단계는 아니에요. 꿀통지수가 높을수록 재입고 우선순위가 높습니다.',
    tone: { fg: '#b45309', bg: '#fffbeb', bd: '#fde68a' },
    icon: Package,
    bulk: null,
  },
];

interface BulkPreviewRow {
  productId: string;
  name: string;
  ok: boolean;
  changed: string[];
  noop: boolean;
  error?: string;
}

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
export default function DispositionQueuePage() {
  const [raw, setRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<{ target: BulkTarget; rows: BulkPreviewRow[] } | null>(null);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const { byProductId: inventory, refresh: refreshInventory } = useInventoryBadges();

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      // 전 상품을 읽는다 — 처분 대상은 status가 아니라 재고신호+자산으로 정해진다(#273).
      const res = await fetch('/api/products?limit=200');
      const data = await res.json();
      setRaw(data.products ?? data.data ?? []);
    } catch {
      setRaw([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  // 처분 판정 — disposition.ts 단일 권위(#62). 이 화면은 자체 규칙을 두지 않는다.
  const products: QueueProduct[] = useMemo(() => {
    return raw.map((p: any) => {
      const inv = inventory[p.id];
      const v = decideDisposition({
        salesCount: p.salesCount,
        lastSaleDate: p.lastSaleDate,
        naverProductId: p.naverProductId,
        naverStatusType: p.naver_status_type,
        sourceGone: inv?.sourceGone,
        qty: inv?.qty,
        supplierStatus: inv?.status,
        daysOutOfStock: inv?.daysOutOfStock,
      });
      return {
        ...p,
        action: v.action,
        hasAssets: v.hasAssets,
        daysOutOfStock: v.daysOutOfStock,
        honeyScore: calcHoneyScore({
          salePrice: p.salePrice ?? 0,
          supplierPrice: p.supplierPrice ?? 0,
          categoryId: p.naverCategoryCode ?? '',
          productName: p.name ?? '',
          keywords: Array.isArray(p.keywords) ? p.keywords : [],
          tags: Array.isArray(p.tags) ? p.tags : [],
          hasMainImage: !!p.mainImage,
          hasDescription: false,
        }),
      } as QueueProduct;
    });
  }, [raw, inventory]);

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
  }, [products, search]);

  // 그룹 배분. RESTOCK 그룹에는 "권고 없음 + 앱 상태가 품절"인 것만 담는다 —
  // 정상 판매 중인 상품까지 대기함에 쌓이면 대기함이 아니라 전체 목록이 된다.
  const grouped = useMemo(() => {
    const map = new Map<string, QueueProduct[]>();
    for (const g of GROUPS) map.set(g.action, []);
    for (const p of searched) {
      if (p.action !== 'NONE') {
        map.get(p.action)?.push(p);
      } else if (
        p.status === 'OUT_OF_STOCK' &&
        // 작업2(#295 실배선) — 재입고 검토도 작업 큐(발행 전용, T-19)다. action이
        // 이미 !naverProductId면 NONE을 돌려주지만(disposition.ts:129) 그 경우
        // status만 보고 여기서 다시 주워담으면 미발행 상품이 새어 들어온다.
        isQueueEligible(deriveLifecycleState({ naverProductId: p.naverProductId, status: p.status }))
      ) {
        map.get('RESTOCK')?.push(p);
      }
    }
    // 재입고 검토는 꿀통 높은 순 = 재입고 우선순위
    map.get('RESTOCK')?.sort((a, b) => (b.honeyScore?.total ?? 0) - (a.honeyScore?.total ?? 0));
    return map;
  }, [searched]);

  const totalPending = GROUPS.filter(g => g.action !== 'RESTOCK')
    .reduce((n, g) => n + (grouped.get(g.action)?.length ?? 0), 0);
  const criticalCount = grouped.get('RESOURCE')?.length ?? 0;
  const restockCount = grouped.get('RESTOCK')?.length ?? 0;

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleGroup = (items: QueueProduct[]) => {
    const allSel = items.length > 0 && items.every(p => selected.has(p.id));
    setSelected(prev => {
      const next = new Set(prev);
      for (const p of items) { if (allSel) next.delete(p.id); else next.add(p.id); }
      return next;
    });
  };

  // ── 일괄 반영: 1단계 전 건 dryRun 미리보기 (#46 — 실제 쓰기 전에 반드시) ──
  async function previewBulk(target: BulkTarget, items: QueueProduct[]) {
    const picked = items.filter(p => selected.has(p.id) && p.naverProductId);
    if (picked.length === 0) return;
    setBulkBusy(true); setBulkResult(null);
    const rows: BulkPreviewRow[] = [];
    for (const p of picked) {
      try {
        const r = await fetch(`/api/products/${p.id}/naver-status`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target, dryRun: true }),
        });
        const j = await r.json();
        if (!j.success) throw new Error(j.error ?? 'preview failed');
        rows.push({
          productId: p.id, name: p.name, ok: true,
          changed: j.changedTopLevelFields ?? [],
          noop: (j.changedTopLevelFields ?? []).length === 0,
        });
      } catch (e) {
        rows.push({ productId: p.id, name: p.name, ok: false, changed: [], noop: false, error: e instanceof Error ? e.message : '실패' });
      }
    }
    setBulkPreview({ target, rows });
    setBulkBusy(false);
  }

  // ── 일괄 반영: 2단계 실제 실행 (운영자 확인 후에만) ──
  async function applyBulk() {
    if (!bulkPreview) return;
    const applicable = bulkPreview.rows.filter(r => r.ok && !r.noop);
    if (applicable.length === 0) return;
    const ok = window.confirm(
      `네이버 스토어에 ${applicable.length}건을 실제로 반영합니다.\n\n` +
      applicable.map(r => `· ${r.name}`).join('\n') +
      `\n\n비가역 작업입니다. 계속할까요?`,
    );
    if (!ok) return;
    setBulkBusy(true);
    let done = 0; let failed = 0;
    for (const r of applicable) {
      try {
        const res = await fetch(`/api/products/${r.productId}/naver-status`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: bulkPreview.target, dryRun: false, confirm: true }),
        });
        const j = await res.json();
        if (j.success && j.applied) done++; else failed++;
      } catch { failed++; }
    }
    setBulkBusy(false);
    setBulkPreview(null);
    setSelected(new Set());
    setBulkResult(`반영 완료 ${done}건${failed > 0 ? ` · 실패 ${failed}건` : ''}`);
    await loadProducts();
    refreshInventory();
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/products" className="text-gray-400 hover:text-gray-600 text-sm">← 목록</a>
            <span className="text-gray-300">|</span>
            <AlertTriangle size={16} className="text-orange-500" />
            <h1 className="text-lg font-bold text-gray-900">처분 결정 대기함</h1>
            {totalPending > 0 && (
              <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2.5 py-1 rounded-full">
                {totalPending}건 대기
              </span>
            )}
          </div>
          <button onClick={() => { void loadProducts(); refreshInventory(); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            <RefreshCw size={12} />새로고침
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="처분 대기" value={totalPending} sub="건" color="text-orange-600" />
          <StatCard label="대체 소싱 필요" value={criticalCount} sub="자산 보호 대상" color="text-fuchsia-700" />
          <StatCard label="재입고 검토" value={restockCount} sub="건" color="text-amber-600" />
          <StatCard label="선택" value={selected.size} sub="건" color="text-gray-700" />
        </div>

        {bulkResult && (
          <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
            <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-green-700">{bulkResult}</p>
          </div>
        )}

        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 placeholder-gray-300"
            placeholder="상품명 또는 상품코드(SKU) 검색..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : totalPending === 0 && restockCount === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">처분할 상품이 없어요!</p>
            <p className="text-xs text-gray-400 mt-1">공급처도 재고도 안정적이에요. 수고하셨어요!</p>
          </div>
        ) : (
          <div className="space-y-5">
            {GROUPS.map(g => {
              const items = grouped.get(g.action) ?? [];
              if (items.length === 0) return null;
              const Icon = g.icon;
              const selInGroup = items.filter(p => selected.has(p.id)).length;
              const allSel = selInGroup === items.length;
              return (
                <section key={g.action} className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: g.tone.bd }}>
                  <header className="px-4 py-3" style={{ background: g.tone.bg, borderBottom: `1px solid ${g.tone.bd}` }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Icon size={15} style={{ color: g.tone.fg }} />
                      <span className="text-sm font-black" style={{ color: g.tone.fg }}>{g.title}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#fff', color: g.tone.fg, border: `1px solid ${g.tone.bd}` }}>{items.length}</span>
                      <button onClick={() => toggleGroup(items)}
                        className="ml-auto text-[11px] font-bold underline" style={{ color: g.tone.fg }}>
                        {allSel ? '선택 해제' : '그룹 전체 선택'}
                      </button>
                    </div>
                    <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: '#6b7280' }}>{g.why}</p>
                    {g.bulk && selInGroup > 0 && (
                      <button onClick={() => void previewBulk(g.bulk as BulkTarget, items)} disabled={bulkBusy}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-extrabold rounded-lg px-3 py-1.5"
                        style={{ color: '#fff', background: bulkBusy ? '#9ca3af' : g.tone.fg, cursor: bulkBusy ? 'not-allowed' : 'pointer' }}>
                        {bulkBusy ? <Loader2 size={13} className="animate-spin" /> : <ShieldAlert size={13} />}
                        선택 {selInGroup}건 일괄 반영 미리보기
                      </button>
                    )}
                  </header>

                  <ul>
                    {items.map(p => {
                      const honey = p.honeyScore;
                      const copy = p.action !== 'NONE' ? (dispositionCopy as any)[p.action] : null;
                      return (
                        <li key={p.id} className="px-4 py-3 border-b last:border-b-0 border-gray-100 flex items-start gap-3">
                          <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)}
                            className="mt-1 w-4 h-4 rounded border-gray-300 text-[#F63B28] focus:ring-[#F63B28]/30 shrink-0" />
                          <div className="w-11 h-11 shrink-0 bg-gray-100 rounded-xl flex items-center justify-center text-gray-300 overflow-hidden">
                            {p.mainImage
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={p.mainImage} alt="" className="w-full h-full object-cover" />
                              : <Package size={18} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-gray-500">
                              <span className="font-mono text-[11px] text-gray-400">{p.sku}</span>
                              <span>{formatPrice(p.salePrice ?? 0)}</span>
                              {typeof p.daysOutOfStock === 'number' && p.daysOutOfStock > 0 && (
                                <span className="text-amber-700 font-semibold">{p.daysOutOfStock}일째 품절</span>
                              )}
                              {p.hasAssets && (
                                <span className="text-fuchsia-700 font-semibold">판매 이력 {p.salesCount ?? 0}건</span>
                              )}
                              {g.action === 'RESTOCK' && honey && (
                                <span className="font-semibold" style={{ color: honey.total >= 70 ? '#15803d' : honey.total >= 50 ? '#2563eb' : '#6b7280' }}>
                                  꿀통 {honey.total}
                                </span>
                              )}
                            </div>
                            {copy && (
                              <p className="text-[11px] mt-1" style={{ color: g.tone.fg }}>{copy.action}</p>
                            )}
                          </div>
                          <Link href={`/products?open=${p.id}`}
                            className="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg"
                            style={{ color: g.tone.fg, background: g.tone.bg, border: `1px solid ${g.tone.bd}`, textDecoration: 'none' }}>
                            상세<ArrowRight size={11} />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* 일괄 반영 미리보기 모달 — #46 이중 게이트의 1단계. */}
      {bulkPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.35)' }}
          onClick={() => !bulkBusy && setBulkPreview(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3" style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe' }}>
              <p className="text-sm font-black" style={{ color: '#1d4ed8' }}>
                일괄 반영 미리보기 (dry-run) — {bulkPreview.target === 'SUSPENSION' ? '판매중지' : '품절 처리'}
              </p>
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {bulkPreview.rows.map(r => (
                <li key={r.productId} className="px-4 py-2.5 border-b last:border-b-0 border-gray-100 flex items-center gap-2">
                  {r.ok
                    ? (r.noop ? <CheckCircle size={13} className="text-gray-400 shrink-0" /> : <ShieldAlert size={13} className="text-orange-600 shrink-0" />)
                    : <AlertTriangle size={13} className="text-red-500 shrink-0" />}
                  <span className="text-xs text-gray-800 truncate flex-1">{r.name}</span>
                  <span className="text-[11px] shrink-0" style={{ color: r.ok ? (r.noop ? '#9ca3af' : '#c2410c') : '#dc2626' }}>
                    {r.ok ? (r.noop ? '변경 없음' : r.changed.join(', ')) : r.error}
                  </span>
                </li>
              ))}
            </ul>
            <div className="p-4 flex items-center gap-2" style={{ borderTop: '1px solid #f3f4f6' }}>
              <p className="text-[11px] flex-1" style={{ color: '#9a3412' }}>
                실제 반영은 대표님 확인 후에만 실행됩니다. 변경 없는 항목은 건너뜁니다.
              </p>
              <button onClick={() => setBulkPreview(null)} disabled={bulkBusy}
                className="text-xs font-bold px-3 py-2 rounded-lg border border-gray-200 text-gray-600">취소</button>
              <button onClick={() => void applyBulk()} disabled={bulkBusy || bulkPreview.rows.every(r => !r.ok || r.noop)}
                className="text-xs font-extrabold px-3 py-2 rounded-lg text-white inline-flex items-center gap-1.5"
                style={{ background: bulkBusy || bulkPreview.rows.every(r => !r.ok || r.noop) ? '#9ca3af' : '#dc2626' }}>
                {bulkBusy ? <Loader2 size={13} className="animate-spin" /> : <ShieldAlert size={13} />}
                GO — 실제 반영
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
