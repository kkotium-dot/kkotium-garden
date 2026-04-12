'use client';
// /products/reactivation — 좀비 부활소 v2
// P2-3: "새 생명 부여" clone button, zombie auto-detection (30d+0 sales),
//        pipeline: clone → HIDDEN original → SEO refresh → excel → Naver upload

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, RefreshCw, ExternalLink, CheckCircle,
  Clock, TrendingDown, FileX, Sprout, Zap, X,
} from 'lucide-react';
import { calcHoneyScore } from '@/lib/honey-score';
import { getReactivationReason, type ReactivationReason } from '@/lib/daily-slots';
import { calcUploadReadiness, getReadinessColor } from '@/lib/upload-readiness';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string; name: string; sku: string; status: string;
  salePrice: number; supplierPrice: number;
  naverCategoryCode?: string; keywords?: string[]; tags?: string[];
  mainImage?: string; aiScore?: number;
  lastSaleDate?: string; updatedAt?: string; createdAt?: string;
}

interface ReactivationItem {
  product: Product;
  honeyScore: ReturnType<typeof calcHoneyScore>;
  reason: ReactivationReason;
  reasonLabel: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REASON_META: Record<ReactivationReason, {
  icon: React.ElementType; color: string; bgColor: string; borderColor: string; label: string;
}> = {
  out_of_stock:     { icon: AlertTriangle, color: '#b91c1c', bgColor: '#fff0ef', borderColor: '#ffd6d3', label: '품절' },
  long_inactive:    { icon: Clock,         color: '#c2410c', bgColor: '#fff7ed', borderColor: '#fed7aa', label: '장기 미판매' },
  score_drop:       { icon: TrendingDown,  color: '#b45309', bgColor: '#fffbeb', borderColor: '#fde68a', label: '점수 급락' },
  draft_incomplete: { icon: FileX,         color: '#555',    bgColor: '#f8f8f8', borderColor: '#F8DCE5', label: '등록 미완료' },
};

const GRADE_COLOR: Record<string, { bg: string; color: string }> = {
  S: { bg: '#f3e8ff', color: '#7e22ce' },
  A: { bg: '#dcfce7', color: '#15803d' },
  B: { bg: '#dbeafe', color: '#1d4ed8' },
  C: { bg: '#fef9c3', color: '#a16207' },
  D: { bg: '#fee2e2', color: '#b91c1c' },
};

// ─── Clone Confirm Modal ──────────────────────────────────────────────────────

function CloneConfirmModal({
  item,
  onConfirm,
  onCancel,
  loading,
}: {
  item: ReactivationItem;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-[460px] overflow-hidden" style={{ border: '1.5px solid #F8DCE5' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1.5px solid #F8DCE5' }}>
          <div className="flex items-center gap-2">
            <Sprout size={16} style={{ color: '#16a34a' }} />
            <p className="text-sm font-bold text-gray-900">새 생명 부여 — 복제 후 재등록</p>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-pink-50">
            <X size={16} style={{ color: '#9CA3AF' }} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl p-3" style={{ background: '#FFF0F5', border: '1px solid #F8DCE5' }}>
            <p className="text-xs font-semibold text-gray-700 truncate">{item.product.name}</p>
            <p className="text-xs font-mono mt-0.5" style={{ color: '#B0A0A8' }}>{item.product.sku}</p>
          </div>
          <div className="space-y-2 text-xs" style={{ color: '#555' }}>
            <p className="font-bold" style={{ color: '#1A1A1A' }}>진행될 작업:</p>
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#e62310' }}>1</span>
              <span>기존 상품 데이터를 복제합니다 (이미지, 옵션, 가격 모두 복사)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#e62310' }}>2</span>
              <span>새 상품코드 (SKU): <span className="font-mono font-bold">{item.product.sku.replace(/-R\d+$/, '')}-R1</span> (임시등록 상태)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#e62310' }}>3</span>
              <span>원본 상품은 앱에서 <strong>HIDDEN</strong> 처리됩니다</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#16a34a' }}>4</span>
              <span>검색 조련사로 이동하여 AI로 상품명·키워드를 완전히 새로 설정합니다</span>
            </div>
          </div>
          <div className="rounded-xl p-3 text-xs" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
            <strong>주의:</strong> 네이버에서 원본 상품의 판매중지는 직접 하셔야 합니다.
            향후 API 연동 시 자동화 예정입니다.
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">취소</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: '#16a34a' }}>
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Sprout size={14} />}
            {loading ? '복제 중...' : '새 생명 부여!'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReactivationPage() {
  const router = useRouter();
  const [items, setItems]       = useState<ReactivationItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<ReactivationReason | 'all'>('all');
  const [cloneTarget, setCloneTarget] = useState<ReactivationItem | null>(null);
  const [cloning, setCloning]   = useState(false);
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/products?limit=500');
      const data = await res.json();
      const prods: Product[] = data.products ?? data.data ?? [];

      const results: ReactivationItem[] = [];
      for (const p of prods) {
        const reason = getReactivationReason({
          ...p,
          createdAt:    p.createdAt    ? new Date(p.createdAt)    : undefined,
          lastSaleDate: p.lastSaleDate ? new Date(p.lastSaleDate) : undefined,
          updatedAt:    p.updatedAt    ? new Date(p.updatedAt)    : undefined,
        });
        if (!reason) continue;
        const hs = calcHoneyScore({
          salePrice: p.salePrice, supplierPrice: p.supplierPrice,
          categoryId: p.naverCategoryCode ?? '', productName: p.name,
          keywords: p.keywords ?? [], tags: p.tags ?? [], hasMainImage: !!p.mainImage,
        });
        results.push({ product: p, honeyScore: hs, reason: reason.reason, reasonLabel: reason.label });
      }
      results.sort((a, b) => {
        const order: Record<ReactivationReason, number> = { out_of_stock: 0, score_drop: 1, long_inactive: 2, draft_incomplete: 3 };
        if (order[a.reason] !== order[b.reason]) return order[a.reason] - order[b.reason];
        return b.honeyScore.total - a.honeyScore.total;
      });
      setItems(results);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleClone = async () => {
    if (!cloneTarget || cloning) return;
    setCloning(true);
    try {
      const res = await fetch('/api/products/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: cloneTarget.product.id }),
      });
      const result = await res.json();
      if (result.success) {
        showToast(`복제 완료! 상품코드 (SKU): ${result.clonedSku}`);
        setCloneTarget(null);
        load(); // refresh list
        // Navigate to SEO optimizer for the new clone
        setTimeout(() => {
          router.push(`/naver-seo?ids=${result.clonedId}`);
        }, 1200);
      } else {
        showToast(result.error ?? '복제 실패', false);
      }
    } catch (e) {
      showToast('네트워크 오류', false);
    } finally {
      setCloning(false);
    }
  };

  const filtered = filter === 'all' ? items : items.filter(i => i.reason === filter);
  const counts = {
    all:              items.length,
    out_of_stock:     items.filter(i => i.reason === 'out_of_stock').length,
    long_inactive:    items.filter(i => i.reason === 'long_inactive').length,
    score_drop:       items.filter(i => i.reason === 'score_drop').length,
    draft_incomplete: items.filter(i => i.reason === 'draft_incomplete').length,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', padding: '28px 24px 56px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Toast */}
        {toast && (
          <div className="fixed top-6 right-6 z-[70] flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold"
            style={{ background: toast.ok ? '#16a34a' : '#e62310', color: '#fff', minWidth: 240 }}>
            {toast.ok ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            {toast.msg}
          </div>
        )}

        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                  {([0,60,120,180,240,300] as number[]).map((deg, i) => {
                    const r = deg * Math.PI / 180; const cx = 26 + Math.cos(r) * 11.4; const cy = 26 + Math.sin(r) * 11.4;
                    return <ellipse key={i} cx={cx} cy={cy} rx={14} ry={10.4} transform={`rotate(${deg} ${cx} ${cy})`} fill="#e62310" />;
                  })}
                  <circle cx="26" cy="26" r="14.6" fill="#e62310" />
                </svg>
                <RefreshCw size={20} color="#fff" strokeWidth={2.5} style={{ position: 'relative', zIndex: 1 }} />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>좀비 부활소</h1>
            </div>
            <button onClick={load} disabled={loading} title="새로고침"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer' }}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} style={{ color: '#e62310' }} />
            </button>
          </div>
          <div style={{ height: 2.5, background: '#FFB3CE', borderRadius: 99, margin: '8px 0 6px' }} />
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>품절·장기미노출·점수급락·미완료 상품 관리 · 등록 30일+판매0건 자동 좀비 감지</p>
        </div>

        {/* Kkotti tip bubble */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
          borderRadius: 12, marginBottom: 16,
          background: 'linear-gradient(135deg,#ffe4ed,#ffd0e0)',
          border: '1.5px solid #FFB3CE',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: '#fff', border: '1.5px solid #FFB3CE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: '#e62310', letterSpacing: '-1px',
          }}>
            ;ㅅ;
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#e62310', margin: '0 0 2px' }}>꼬띠 긴급 알림</p>
            <p style={{ fontSize: 11, color: '#7f1d1d', margin: 0, lineHeight: 1.5 }}>
              <strong>새 생명 부여</strong> 버튼을 누르면 상품을 복제하고 검색 조련사로 이동해요.
              AI로 상품명·키워드를 완전히 갈아엎고 신규 등록하면 최신성 버프를 받을 수 있어유!
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          {(['out_of_stock', 'long_inactive', 'score_drop', 'draft_incomplete'] as ReactivationReason[]).map(reason => {
            const meta = REASON_META[reason];
            const Icon = meta.icon;
            const isActive = filter === reason;
            return (
              <button key={reason} onClick={() => setFilter(isActive ? 'all' : reason)}
                style={{
                  background: isActive ? meta.bgColor : '#fff',
                  border: `1.5px solid ${isActive ? meta.borderColor : '#F8DCE5'}`,
                  borderRadius: 14, padding: '14px 16px', textAlign: 'left',
                  cursor: 'pointer', transition: 'all 0.12s',
                }}>
                <Icon size={16} style={{ color: meta.color, marginBottom: 6 }} />
                <p style={{ fontSize: 22, fontWeight: 900, color: meta.color, margin: 0, lineHeight: 1 }}>{counts[reason]}</p>
                <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>{meta.label}</p>
              </button>
            );
          })}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {([['all', '전체'], ['out_of_stock', '품절'], ['long_inactive', '장기 미판매'], ['score_drop', '점수 급락'], ['draft_incomplete', '등록 미완료']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key as any)}
              style={{
                padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                border: '1.5px solid', cursor: 'pointer',
                background: filter === key ? '#e62310' : '#fff',
                color: filter === key ? '#fff' : '#555',
                borderColor: filter === key ? '#e62310' : '#F8DCE5',
                transition: 'all 0.12s',
              }}>
              {label}
              <span style={{
                marginLeft: 6, padding: '1px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                background: filter === key ? 'rgba(255,255,255,0.25)' : '#F8DCE5',
                color: filter === key ? '#fff' : '#e62310',
              }}>
                {counts[key as keyof typeof counts]}
              </span>
            </button>
          ))}
        </div>

        {/* Item list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height: 80, background: '#fff', borderRadius: 14, border: '1.5px solid #F8DCE5', opacity: 0.6 }} className="animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 18, padding: '48px 20px', textAlign: 'center' }}>
            <CheckCircle size={32} style={{ color: '#16a34a', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 700, color: '#1A1A1A', margin: '0 0 4px' }}>모두 양호합니다!</p>
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>재활성화가 필요한 상품이 없어요.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(item => {
              const meta  = REASON_META[item.reason];
              const grade = GRADE_COLOR[item.honeyScore.grade] ?? GRADE_COLOR.D;
              const isZombie = item.reason === 'long_inactive';
              const isDraft  = item.reason === 'draft_incomplete';

              return (
                <div key={item.product.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', background: '#fff', borderRadius: 14,
                    border: `1.5px solid ${meta.borderColor}`,
                  }}>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>
                        {item.product.name}
                      </p>
                      <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: grade.bg, color: grade.color, flexShrink: 0 }}>
                        {item.honeyScore.total}점 {item.honeyScore.grade}
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: meta.bgColor, color: meta.color, border: `1px solid ${meta.borderColor}`, flexShrink: 0 }}>
                        {meta.label}
                      </span>
                    </div>
                    <div style={{ height: 1, background: '#F8DCE5', margin: '6px 0' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <p style={{ fontSize: 11, color: '#888', margin: 0 }}>{item.reasonLabel}</p>
                      <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0, fontFamily: 'monospace' }}>{item.product.sku}</p>
                      <p style={{ fontSize: 11, color: '#888', margin: 0 }}>순마진 {item.honeyScore.netMarginRate.toFixed(1)}%</p>
                    </div>
                    {/* Readiness mini bar */}
                    {(() => {
                      const rd = calcUploadReadiness({
                        naverCategoryCode: item.product.naverCategoryCode,
                        keywords: item.product.keywords,
                        tags: item.product.tags,
                        name: item.product.name,
                        mainImage: item.product.mainImage,
                        salePrice: item.product.salePrice,
                        supplierPrice: item.product.supplierPrice,
                      });
                      const col = getReadinessColor(rd.score);
                      const failSnippets = rd.failed.slice(0, 2).map(f => f.label).join(', ');
                      return (
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: '#F8DCE5', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ width: `${rd.score}%`, height: '100%', background: col, borderRadius: 99, transition: 'width 0.4s' }} />
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 800, color: col, flexShrink: 0 }}>{rd.score}%</span>
                          {rd.failed.length > 0 && (
                            <span style={{ fontSize: 10, color: '#B0A0A8', flexShrink: 0 }}>
                              {failSnippets}{rd.failed.length > 2 ? ` 외 ${rd.failed.length - 2}건` : ''}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {/* 새 생명 부여 — for OOS and long_inactive */}
                    {(isZombie || item.reason === 'out_of_stock') && (
                      <button
                        onClick={() => setCloneTarget(item)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '8px 12px', borderRadius: 10,
                          fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          background: '#16a34a', color: '#fff', border: 'none',
                        }}>
                        <Sprout size={12} /> 새 생명 부여
                      </button>
                    )}
                    {/* SEO 최적화 — for score_drop */}
                    {item.reason === 'score_drop' && (
                      <a href={`/naver-seo?ids=${item.product.id}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '8px 12px', background: '#e62310', color: '#fff',
                          borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: 'none',
                        }}>
                        <Zap size={12} /> SEO 최적화
                      </a>
                    )}
                    {/* 등록 완료 — for draft */}
                    {isDraft && (
                      <a href={`/products/new?edit=${item.product.id}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '8px 12px', background: '#555', color: '#fff',
                          borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: 'none',
                        }}>
                        <ExternalLink size={11} /> 등록 완료
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clone confirm modal */}
      {cloneTarget && (
        <CloneConfirmModal
          item={cloneTarget}
          onConfirm={handleClone}
          onCancel={() => setCloneTarget(null)}
          loading={cloning}
        />
      )}
    </div>
  );
}
