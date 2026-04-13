'use client';
// Dashboard — KKOTIUM v5
// TASK 3: unified product load — single /api/products call shared to KkottiWidget + DailyPlanWidget

import { useEffect, useState, useCallback } from 'react';
import { Package, TrendingUp, AlertTriangle, Sparkles, Layers, Skull, ArrowRight, ShoppingCart, RefreshCw } from 'lucide-react';
import KkottiWidget from '@/components/dashboard/KkottiWidget';
import MarketTrendWidget from '@/components/dashboard/MarketTrendWidget';
import DailyPlanWidget from '@/components/dashboard/DailyPlanWidget';
import EventTimeline from '@/components/dashboard/EventTimeline';
import GoodServiceWidget from '@/components/dashboard/GoodServiceWidget';
import Link from 'next/link';

// ── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, valueColor, iconBg, iconColor, href,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; valueColor: string; iconBg: string; iconColor: string; href?: string;
}) {
  const inner = (
    <div className="kk-card p-5 flex items-start justify-between" style={{ cursor: href ? 'pointer' : 'default' }}>
      <div>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#B0A0A8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
          {label}
        </p>
        <p style={{ fontSize: '32px', fontWeight: 900, color: valueColor, lineHeight: 1 }}>
          {value}
        </p>
        {sub && <p style={{ fontSize: '12px', color: '#B0A0A8', marginTop: '4px' }}>{sub}</p>}
      </div>
      <div className="flex items-center justify-center rounded-xl" style={{ width: 44, height: 44, background: iconBg, flexShrink: 0 }}>
        <Icon size={20} style={{ color: iconColor }} strokeWidth={2.5} />
      </div>
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link> : inner;
}

// ── Pipeline Stage Card ───────────────────────────────────────────────────
interface PipelineStage {
  label: string; count: number; icon: React.ElementType;
  color: string; bg: string; border: string; href: string; hint: string;
}

function PipelineCard({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="kk-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #F8DCE5', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Layers size={14} style={{ color: '#e62310' }} />
        <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>파이프라인 현황</p>
        <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>소싱 → 등록 → 판매 → 관리</p>
      </div>
      <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {stages.map((stage) => (
          <Link key={stage.label} href={stage.href} style={{ textDecoration: 'none' }}>
            <div style={{ padding: '14px 10px', borderRadius: 14, textAlign: 'center', background: stage.bg, border: `1.5px solid ${stage.border}`, cursor: 'pointer' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, margin: '0 auto 8px', background: '#fff', border: `1.5px solid ${stage.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stage.icon size={16} style={{ color: stage.color }} />
              </div>
              <p style={{ fontSize: 22, fontWeight: 900, color: stage.color, margin: '0 0 2px', lineHeight: 1 }}>{stage.count}</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#1A1A1A', margin: '0 0 3px' }}>{stage.label}</p>
              <p style={{ fontSize: 10, color: '#B0A0A8', margin: 0, lineHeight: 1.3 }}>{stage.hint}</p>
            </div>
          </Link>
        ))}
      </div>
      <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <ArrowRight size={12} style={{ color: '#B0A0A8' }} />
        <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>각 단계 클릭 시 해당 페이지로 이동합니다</p>
      </div>
    </div>
  );
}

// ── Today's Performance Card ─────────────────────────────────────────────
function TodayCard({ orderCount, revenue, paidAmount, loading }: {
  orderCount: number; revenue: number; paidAmount: number; loading?: boolean;
}) {
  const fmt = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(1)}만원` : `${n.toLocaleString()}원`;
  const items = [
    { label: '주문 수',   value: loading ? '...' : String(orderCount), unit: '건', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    { label: '총 매입',   value: loading ? '...' : (revenue > 0 ? fmt(revenue) : '—'), unit: '', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    { label: '정산 예정', value: loading ? '...' : (paidAmount > 0 ? fmt(paidAmount) : '—'), unit: '', color: '#e62310', bg: '#FFF0F5', border: '#FFB3CE' },
  ];
  return (
    <div className="kk-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid #F8DCE5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShoppingCart size={14} style={{ color: '#16a34a' }} />
          <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>오늘의 실적</p>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>네이버 실시간</span>
        </div>
        <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>
          {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} KST 기준
        </p>
      </div>
      <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {items.map(item => (
          <div key={item.label} style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 12, background: item.bg, border: `1px solid ${item.border}` }}>
            <p style={{ fontSize: 24, fontWeight: 900, color: item.color, margin: '0 0 4px', lineHeight: 1 }}>{item.value}{item.unit}</p>
            <p style={{ fontSize: 11, color: item.color, fontWeight: 700, margin: 0, opacity: 0.85 }}>{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared product shape for widgets ─────────────────────────────────────
export interface DashboardProduct {
  id: string; name: string; sku: string; status: string;
  salePrice: number; supplierPrice: number;
  naverCategoryCode?: string; keywords?: string[]; tags?: string[];
  mainImage?: string; aiScore?: number;
  createdAt?: Date; updatedAt?: Date; lastSaleDate?: Date;
  supplierName?: string;
}

interface DashStats {
  totalProducts: number; activeProducts: number;
  outOfStockProducts: number; draftProducts: number;
  avgScore: number; sourcingCount: number; zombieCount: number;
  todayOrderCount: number; todayRevenue: number; todayPaidAmount: number;
  naverApiReady: boolean;
}

export default function DashboardPage() {
  const [stats, setStats]               = useState<DashStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  // Shared product list — loaded once, passed to both widgets
  const [products, setProducts]         = useState<DashboardProduct[]>([]);
  const [productsLoading, setProdsLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    setProdsLoading(true);
    try {
      const res  = await fetch('/api/products?limit=200');
      const data = await res.json();
      const raw  = data.products ?? data.data ?? [];
      setProducts(raw.map((p: any) => ({
        id: p.id, name: p.name, sku: p.sku, status: p.status,
        salePrice: p.salePrice ?? 0, supplierPrice: p.supplierPrice ?? 0,
        naverCategoryCode: p.naverCategoryCode ?? p.category_id ?? '',
        keywords:  Array.isArray(p.keywords) ? p.keywords : [],
        tags:      Array.isArray(p.tags) ? p.tags : [],
        mainImage: p.mainImage ?? p.main_image_url,
        aiScore:   p.aiScore ?? null,
        createdAt:    p.createdAt    ? new Date(p.createdAt)    : undefined,
        updatedAt:    p.updatedAt    ? new Date(p.updatedAt)    : new Date(),
        lastSaleDate: p.lastSaleDate ? new Date(p.lastSaleDate) : undefined,
        supplierName: p.supplier?.name ?? p.supplierName,
      })));
    } catch (e) {
      console.error('[Dashboard] products load error:', e);
    } finally {
      setProdsLoading(false);
    }
  }, []);

  const loadStats = useCallback(() => {
    setStatsLoading(true);
    fetch('/api/dashboard/stats?period=all')
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.data?.summary ?? d.data); })
      .catch(() => null)
      .finally(() => setStatsLoading(false));
  }, []);

  // Single refresh: reload both stats + products
  const handleRefresh = useCallback(() => {
    loadStats();
    loadProducts();
  }, [loadStats, loadProducts]);

  useEffect(() => {
    loadStats();
    loadProducts();
  }, [loadStats, loadProducts]);

  const pipelineStages: PipelineStage[] = [
    { label: '소싱 대기', count: stats?.sourcingCount ?? 0, icon: Layers,     color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', href: '/crawl',                  hint: '보관함 SOURCED' },
    { label: '등록 대기', count: stats?.draftProducts ?? 0, icon: Package,    color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', href: '/products',               hint: 'DRAFT 상태'    },
    { label: '판매중',    count: stats?.activeProducts ?? 0, icon: TrendingUp, color: '#16a34a', bg: '#f0fdf4', border: '#86efac', href: '/products',               hint: 'ACTIVE 상태'   },
    { label: '좀비 감지', count: stats?.zombieCount ?? 0,   icon: Skull,      color: '#e62310', bg: '#fff0ef', border: '#ffd6d3', href: '/products/reactivation', hint: '30일+ 미판매'  },
  ];

  const isRefreshing = statsLoading || productsLoading;

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', padding: '24px', paddingBottom: 56 }} className="space-y-6">

      {/* ── Page header ─────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                {([0,60,120,180,240,300] as number[]).map((deg, i) => { const r=deg*Math.PI/180; const cx=26+Math.cos(r)*11.4; const cy=26+Math.sin(r)*11.4; return <ellipse key={i} cx={cx} cy={cy} rx={14} ry={10.4} transform={`rotate(${deg} ${cx} ${cy})`} fill="#e62310" />; })}
                <circle cx="26" cy="26" r="14.6" fill="#e62310" />
              </svg>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'relative', zIndex: 1 }}>
                <path d="M12 22V12"/><path d="M12 12C12 12 8 9 8 6a4 4 0 0 1 8 0c0 3-4 6-4 6z"/>
                <path d="M12 12c0 0-4 3-7 3"/><path d="M12 12c0 0 4 3 7 3"/>
                <ellipse cx="12" cy="20" rx="5" ry="2"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.3px', margin: 0 }}>정원 일지</h1>
          </div>
          {/* Single refresh button — reloads stats + products at once */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{ padding: 6, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#B0A0A8', opacity: isRefreshing ? 0.4 : 1 }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        <div style={{ height: 2.5, background: '#FFB3CE', borderRadius: 99, margin: '8px 0 6px' }} />
        <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
        </p>
      </div>

      {/* ── 오늘의 실적 (네이버 API 연동 시에만 표시) ──────── */}
      {stats?.naverApiReady && (
        <TodayCard
          orderCount={stats.todayOrderCount ?? 0}
          revenue={stats.todayRevenue ?? 0}
          paidAmount={stats.todayPaidAmount ?? 0}
          loading={statsLoading}
        />
      )}

      {/* ── KPI 4개 ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="전체 상품"     value={stats?.totalProducts ?? 0}          sub="등록된 상품 수"  icon={Package}      valueColor="#1A1A1A" iconBg="#F5F5F5" iconColor="#9CA3AF" href="/products" />
        <KpiCard label="네이버 판매중"  value={stats?.activeProducts ?? 0}         sub="노출 중"        icon={TrendingUp}   valueColor="#16a34a" iconBg="#F0FDF4" iconColor="#16a34a" href="/products" />
        <KpiCard label="품절"           value={stats?.outOfStockProducts ?? 0}     sub="재고 보충 필요" icon={AlertTriangle} valueColor="#e62310" iconBg="#FFF0EF" iconColor="#e62310" href="/products/reactivation" />
        <KpiCard label="평균 꿀통지수"  value={stats?.avgScore ? `${stats.avgScore}점` : '—'} sub="AI 상품 품질" icon={Sparkles} valueColor="#FF6B8A" iconBg="#FFF0F5" iconColor="#FF6B8A" />
      </div>

      {/* ── 파이프라인 현황 ──────────────────────────────────── */}
      <PipelineCard stages={pipelineStages} />

      {/* ── 오늘 할 일 — products prop으로 단일 로드 공유 ───── */}
      <DailyPlanWidget products={products} productsLoading={productsLoading} />

      {/* ── 꼬띠 위젯 — products prop으로 단일 로드 공유 ────── */}
      <KkottiWidget products={products} productsLoading={productsLoading} />

      {/* C-9: Good Service score widget */}
      <GoodServiceWidget />

      {/* C-12: Market trend widget */}
      <MarketTrendWidget products={products} productsLoading={productsLoading} />

      {/* Recent event timeline */}
      <EventTimeline />

    </div>
  );
}
