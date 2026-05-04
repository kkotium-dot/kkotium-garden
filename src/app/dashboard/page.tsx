'use client';
// Dashboard — KKOTIUM v7 (Workflow Redesign Sprint Part A2b)
//
// Workflow Redesign (2026-05-03 → 2026-05-05):
//  - Parent fetch SWR migration (loadProducts/loadStats removed → SWR hooks)
//  - Four-section layout (today / action / market / tools) via CollapsibleSection
//  - Mode toggle (today / week / month) — drives Section 3 widget order
//  - KkottiBriefingWidget integrated at the top of Section 1
//  - ReviewGrowth + UploadReadiness now benefit automatically from parent SWR
//
// A2b additions (2026-05-05):
//  - Section 3 widgets reorder per mode via inline `order` (no widget hidden)
//  - sectionMarketSubtitle is data-driven (zero extra API — derived from SWR stats)
//  - ModeActionHint slim banner under the mode toggle (power-seller intent at-a-glance)
//
// Behavior preservation:
//  - Zero widget removed — every prior widget kept, only repositioned
//  - Single refresh button still triggers a global mutate via SWR hook refresh
//  - revalidateOnFocus is enabled (DASHBOARD_SWR_DEFAULTS) so the dashboard
//    self-updates when the user returns to the tab — no manual reload needed.

import { useMemo, useState, useCallback } from 'react';
import { Package, TrendingUp, AlertTriangle, Sparkles, Layers, Skull, ArrowRight, ShoppingCart, RefreshCw } from 'lucide-react';
import KkottiWidget from '@/components/dashboard/KkottiWidget';
import KkottiBriefingWidget from '@/components/dashboard/KkottiBriefingWidget';
import UploadReadinessWidget from '@/components/dashboard/UploadReadinessWidget';
import ReviewGrowthWidget from '@/components/dashboard/ReviewGrowthWidget';
import MarketTrendWidget from '@/components/dashboard/MarketTrendWidget';
import DailyPlanWidget from '@/components/dashboard/DailyPlanWidget';
import EventTimeline from '@/components/dashboard/EventTimeline';
import GoodServiceWidget from '@/components/dashboard/GoodServiceWidget';
import ProfitabilityWidget from '@/components/dashboard/ProfitabilityWidget';
import CompetitionMonitorWidget from '@/components/dashboard/CompetitionMonitorWidget';
import DataLabTrendWidget from '@/components/dashboard/DataLabTrendWidget';
import SourcingRecommendWidget from '@/components/dashboard/SourcingRecommendWidget';
import ProductLifecycleWidget from '@/components/dashboard/ProductLifecycleWidget';
import CollapsibleSection from '@/components/dashboard/layout/CollapsibleSection';
import {
  useProductsList,
  useDashboardStats,
  type DashboardStatsApiData,
} from '@/lib/hooks/useDashboardData';
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

// ── Mode Toggle (today / week / month) ───────────────────────────────────
type DashboardMode = 'today' | 'week' | 'month';

interface ModeToggleProps {
  mode: DashboardMode;
  onChange: (next: DashboardMode) => void;
}

const MODE_OPTIONS: Array<{ id: DashboardMode; label: string; hint: string }> = [
  { id: 'today', label: '오늘',   hint: '오늘 처리할 액션 위주' },
  { id: 'week',  label: '이번주', hint: '주간 시장 + 트렌드 분석' },
  { id: 'month', label: '이번달', hint: '월간 분석 + 라이프사이클' },
];

function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 3,
        borderRadius: 10,
        background: '#FEF0F3',
        border: '1px solid #F8DCE5',
      }}
      role="tablist"
      aria-label="대시보드 모드 전환"
    >
      {MODE_OPTIONS.map((opt) => {
        const active = opt.id === mode;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            title={opt.hint}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              borderRadius: 7,
              cursor: 'pointer',
              background: active ? '#FFFFFF' : 'transparent',
              color: active ? '#E8001F' : '#737373',
              boxShadow: active ? '0 1px 3px rgba(232, 0, 31, 0.12)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {opt.label}
          </button>
        );
      })}
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
  // E-15 Block D Part 2: fields needed by UploadReadinessWidget for accurate score calc.
  // Without these, widget always treated shipping_template/extra_images as failed,
  // causing PATCH newScore to disagree with widget-reload score by up to 18 points.
  shippingTemplateId?: string | null;
  images?: string[];
  shippingFee?: number;
}

// ── Raw product normalizer (extracted from previous loadProducts callback) ──
function normalizeProducts(raw: unknown[]): DashboardProduct[] {
  return raw.map((rawItem) => {
    const p = rawItem as Record<string, unknown>;
    const supplier = p.supplier as Record<string, unknown> | undefined;
    return {
      id: String(p.id ?? ''),
      name: String(p.name ?? ''),
      sku: String(p.sku ?? ''),
      status: String(p.status ?? 'DRAFT'),
      salePrice: typeof p.salePrice === 'number' ? p.salePrice : 0,
      supplierPrice: typeof p.supplierPrice === 'number' ? p.supplierPrice : 0,
      naverCategoryCode: (p.naverCategoryCode as string | undefined) ?? (p.category_id as string | undefined) ?? '',
      keywords: Array.isArray(p.keywords) ? (p.keywords as string[]) : [],
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : [],
      mainImage: (p.mainImage as string | undefined) ?? (p.main_image_url as string | undefined),
      aiScore: typeof p.aiScore === 'number' ? p.aiScore : undefined,
      createdAt: p.createdAt ? new Date(p.createdAt as string) : undefined,
      updatedAt: p.updatedAt ? new Date(p.updatedAt as string) : new Date(),
      lastSaleDate: p.lastSaleDate ? new Date(p.lastSaleDate as string) : undefined,
      supplierName: (supplier?.name as string | undefined) ?? (p.supplierName as string | undefined),
      // E-15 Block D Part 2: include fields used by UploadReadinessWidget
      shippingTemplateId: (p.shippingTemplateId as string | null | undefined) ?? (p.shipping_template_id as string | null | undefined) ?? null,
      images: Array.isArray(p.images) ? (p.images as string[]) : [],
      shippingFee: typeof p.shippingFee === 'number'
        ? p.shippingFee
        : typeof p.shipping_fee === 'number'
          ? p.shipping_fee
          : 3000,
    };
  });
}

// ── Section 3 widget order map (A2b) ─────────────────────────────────────
// Mode-driven order for the six market-section widgets. Each value is a CSS
// `order` integer: lower comes first. Rendering stays in a single flex column
// for layout-shift-free mode transitions.
//   - today : default order (Kkotti briefing first, then trend → datalab/comp → sourcing/lifecycle)
//   - week  : DataLab + Competition lifted to the top (trend + competition emphasis)
//   - month : Lifecycle + Sourcing lifted to the top (lifecycle + sourcing emphasis)
type Section3WidgetKey =
  | 'kkotti'
  | 'marketTrend'
  | 'datalab'
  | 'competition'
  | 'sourcing'
  | 'lifecycle';

const SECTION3_ORDER: Record<DashboardMode, Record<Section3WidgetKey, number>> = {
  today: { kkotti: 1, marketTrend: 2, datalab: 3, competition: 4, sourcing: 5, lifecycle: 6 },
  week:  { datalab: 1, competition: 2, kkotti: 3, marketTrend: 4, sourcing: 5, lifecycle: 6 },
  month: { lifecycle: 1, sourcing: 2, kkotti: 3, marketTrend: 4, datalab: 5, competition: 6 },
};

// ── Mode action hint (A2b) ───────────────────────────────────────────────
// Slim banner directly under the mode toggle that announces the current
// mode's intent in a single line. Pure presentation, no data dependency.
interface ModeActionHintProps {
  mode: DashboardMode;
}

function ModeActionHint({ mode }: ModeActionHintProps) {
  const config: Record<DashboardMode, { label: string; tone: string; bg: string; border: string }> = {
    today: {
      label: '오늘은 처리해야 할 액션 — DRAFT 등록 / 품절 보충 / 발주 처리에 집중하세요',
      tone:  '#16a34a',
      bg:    '#F0FDF4',
      border:'#BBF7D0',
    },
    week: {
      label: '이번주는 시장 신호 — 데이터랩 트렌드 + 경쟁사 가격 모니터링에 집중하세요',
      tone:  '#2563eb',
      bg:    '#EFF6FF',
      border:'#BFDBFE',
    },
    month: {
      label: '이번달은 구조 개선 — 좀비 부활 후보 + 라이프사이클 + 소싱 다양화를 점검하세요',
      tone:  '#7c3aed',
      bg:    '#F5F3FF',
      border:'#DDD6FE',
    },
  };
  const c = config[mode];
  return (
    <div
      style={{
        marginTop: 6,
        padding: '8px 14px',
        borderRadius: 10,
        background: c.bg,
        border: `1px solid ${c.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
      role="status"
      aria-live="polite"
    >
      <ArrowRight size={12} style={{ color: c.tone, flexShrink: 0 }} />
      <p style={{ fontSize: 12, fontWeight: 700, color: c.tone, margin: 0, lineHeight: 1.4 }}>
        {c.label}
      </p>
    </div>
  );
}

// ── Build dynamic Section 3 subtitle from already-fetched SWR stats (A2b) ─
// Replaces the prior static string. Uses only fields the dashboard already
// fetches via useDashboardStats() — no extra API call.
function buildMarketSubtitle(
  mode: DashboardMode,
  stats: DashboardStatsApiData | undefined,
): string {
  const sourcing = stats?.sourcingCount ?? 0;
  const draft    = stats?.draftProducts ?? 0;
  const oos      = stats?.outOfStockProducts ?? 0;
  const zombie   = stats?.zombieCount ?? 0;
  const active   = stats?.activeProducts ?? 0;

  if (mode === 'today') {
    return `오늘 액션 — 등록 대기 ${draft} · 품절 ${oos} · 좀비 ${zombie}`;
  }
  if (mode === 'week') {
    return `주간 시장 — 데이터랩 트렌드 + 경쟁사 가격 모니터 (소싱 후보 ${sourcing}건)`;
  }
  // month
  const zombiePct = active > 0 ? Math.round((zombie / active) * 100) : 0;
  return `월간 개선 — 좀비 ${zombie}건 (판매중 대비 ${zombiePct}%) · 소싱 ${sourcing}건 점검`;
}

// ── Stats type alias for the dashboard ───────────────────────────────────
// We keep the local DashStats shape narrowed to what the page renders.
type DashStats = DashboardStatsApiData;

export default function DashboardPage() {
  // ── Mode toggle (today / week / month) ─────────────────────────────────
  const [mode, setMode] = useState<DashboardMode>('today');

  // ── SWR hooks (replaces useState + useEffect + loadProducts/loadStats) ─
  // Each hook polls on a 60s cadence and revalidates on tab focus, so the
  // dashboard self-updates without any manual reload.
  const {
    rawProducts,
    isLoading: productsLoading,
    refresh: refreshProducts,
  } = useProductsList({ limit: 200 });

  const {
    data: stats,
    isLoading: statsLoading,
    refresh: refreshStats,
  } = useDashboardStats({ period: 'all' });

  // Normalize the raw payload once per fetch — preserves the previous behavior
  // exactly (including supplier.name fallback + shipping_fee default 3000).
  const products: DashboardProduct[] = useMemo(
    () => (rawProducts ? normalizeProducts(rawProducts) : []),
    [rawProducts],
  );

  // Single refresh: trigger SWR mutate on both endpoints.
  // SWR handles deduping so repeated taps within 10s are coalesced.
  const handleRefresh = useCallback(() => {
    refreshStats();
    refreshProducts();
  }, [refreshStats, refreshProducts]);

  const isRefreshing = statsLoading || productsLoading;

  const pipelineStages: PipelineStage[] = [
    { label: '소싱 대기', count: stats?.sourcingCount ?? 0, icon: Layers,     color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', href: '/crawl',                  hint: '보관함 SOURCED' },
    { label: '등록 대기', count: stats?.draftProducts ?? 0, icon: Package,    color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', href: '/products',               hint: 'DRAFT 상태'    },
    { label: '판매중',    count: stats?.activeProducts ?? 0, icon: TrendingUp, color: '#16a34a', bg: '#f0fdf4', border: '#86efac', href: '/products',               hint: 'ACTIVE 상태'   },
    { label: '좀비 감지', count: stats?.zombieCount ?? 0,   icon: Skull,      color: '#e62310', bg: '#fff0ef', border: '#ffd6d3', href: '/products/reactivation', hint: '30일+ 미판매'  },
  ];

  // Mode-specific Section 3 subtitle is now data-driven (A2b).
  // Power-seller intent: at-a-glance, every mode shows numeric deltas
  // pulled from already-fetched SWR stats (zero extra API).
  const sectionMarketSubtitle = buildMarketSubtitle(mode, stats);

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', padding: '24px', paddingBottom: 56 }} className="space-y-2">

      {/* ── Page header ─────────────────────────────────────── */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Mode toggle — drives Section 3 visual emphasis */}
            <ModeToggle mode={mode} onChange={setMode} />

            {/* Single refresh button — reloads stats + products at once via SWR mutate */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{ padding: 6, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#B0A0A8', opacity: isRefreshing ? 0.4 : 1 }}
              aria-label="대시보드 새로고침"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Mode action hint — slim banner announcing the current mode intent (A2b) */}
        <ModeActionHint mode={mode} />

        <div style={{ height: 2.5, background: '#FFB3CE', borderRadius: 99, margin: '8px 0 6px' }} />
        <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 1 — 오늘의 결과
          꼬띠 일일 브리핑 + 오늘 실적 + KPI + 파이프라인 + 수익성/굿서비스
          ════════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection section="today" variant="gardener">
        <div className="space-y-4">
          {/* Kkotti daily briefing — one-line auto inference (zero AI cost) */}
          <KkottiBriefingWidget />

          {/* Today's Naver API performance (only when API connected) */}
          {stats?.naverApiReady && (
            <TodayCard
              orderCount={stats.todayOrderCount ?? 0}
              revenue={stats.todayRevenue ?? 0}
              paidAmount={stats.todayPaidAmount ?? 0}
              loading={statsLoading}
            />
          )}

          {/* KPI 4-card grid */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiCard label="전체 상품"     value={stats?.totalProducts ?? 0}          sub="등록된 상품 수"  icon={Package}      valueColor="#1A1A1A" iconBg="#F5F5F5" iconColor="#9CA3AF" href="/products" />
            <KpiCard label="네이버 판매중"  value={stats?.activeProducts ?? 0}         sub="노출 중"        icon={TrendingUp}   valueColor="#16a34a" iconBg="#F0FDF4" iconColor="#16a34a" href="/products" />
            <KpiCard label="품절"           value={stats?.outOfStockProducts ?? 0}     sub="재고 보충 필요" icon={AlertTriangle} valueColor="#e62310" iconBg="#FFF0EF" iconColor="#e62310" href="/products/reactivation" />
            <KpiCard label="평균 꿀통지수"  value={stats?.avgScore ? `${stats.avgScore}점` : '—'} sub="AI 상품 품질" icon={Sparkles} valueColor="#FF6B8A" iconBg="#FFF0F5" iconColor="#FF6B8A" />
          </div>

          {/* Pipeline progression */}
          <PipelineCard stages={pipelineStages} />

          {/* Profitability + Good Service in 2-col grid (D-2 layout preserved) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GoodServiceWidget />
            <ProfitabilityWidget />
          </div>
        </div>
      </CollapsibleSection>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2 — 오늘의 액션
          오늘 할 일 + 등록 준비 명령탑 + 리뷰 성장 트래커
          ════════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection section="action" variant="hunter">
        <div className="space-y-4">
          {/* Today's actionable plan */}
          <DailyPlanWidget products={products} productsLoading={productsLoading} />

          {/* DRAFT readiness command center — auto-benefits from parent SWR */}
          <UploadReadinessWidget products={products} productsLoading={productsLoading} onRefresh={handleRefresh} />

          {/* Review growth tracker — uses useReviewGrowth() internally */}
          <ReviewGrowthWidget />
        </div>
      </CollapsibleSection>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 3 — 소싱 · 시장
          꼬띠 AI + 시장 트렌드 + 데이터랩 + 경쟁 모니터 + 소싱 추천 + 라이프사이클
          ════════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection
        section="market"
        variant="hunter"
        subtitle={sectionMarketSubtitle}
      >
        {/* A2b: flex column with inline `order` per widget — preserves all six
            widgets (zero hidden) while reordering on mode change. Single column
            keeps layout-shift to zero across mode transitions. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Kkotti AI — full breakdown for the products list */}
          <div style={{ order: SECTION3_ORDER[mode].kkotti }}>
            <KkottiWidget products={products} productsLoading={productsLoading} />
          </div>

          {/* Market trend (full width — product-level data needs space) */}
          <div style={{ order: SECTION3_ORDER[mode].marketTrend }}>
            <MarketTrendWidget products={products} productsLoading={productsLoading} />
          </div>

          {/* DataLab — promoted to top row in week mode */}
          <div style={{ order: SECTION3_ORDER[mode].datalab }}>
            <DataLabTrendWidget />
          </div>

          {/* Competition monitor — promoted to top row in week mode */}
          <div style={{ order: SECTION3_ORDER[mode].competition }}>
            <CompetitionMonitorWidget />
          </div>

          {/* Sourcing recommend — promoted to top row in month mode */}
          <div style={{ order: SECTION3_ORDER[mode].sourcing }}>
            <SourcingRecommendWidget />
          </div>

          {/* Product lifecycle — promoted to top row in month mode */}
          <div style={{ order: SECTION3_ORDER[mode].lifecycle }}>
            <ProductLifecycleWidget />
          </div>
        </div>
      </CollapsibleSection>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 4 — 도구 · 활동
          빠른 작업 + 이벤트 타임라인
          ════════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection section="tools" variant="celebrator">
        <div className="space-y-4">
          {/* Quick action shortcuts */}
          <div className="kk-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid #F8DCE5', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={14} style={{ color: '#FF6B8A' }} />
              <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>빠른 작업</p>
            </div>
            <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { label: '씨앗 심기', href: '/products/new', color: '#e62310', bg: '#FFF0F5', border: '#FFB3CE', icon: Package, hint: '상품 등록' },
                { label: '검색 조련사', href: '/naver-seo', color: '#2563eb', bg: '#EFF6FF', border: '#BFDBFE', icon: TrendingUp, hint: 'SEO 최적화' },
                { label: '주문 관리', href: '/orders', color: '#16a34a', bg: '#F0FDF4', border: '#BBF7D0', icon: ShoppingCart, hint: '발주/송장' },
                { label: '꿀통 사냥터', href: '/crawl', color: '#7c3aed', bg: '#F5F3FF', border: '#DDD6FE', icon: Layers, hint: '상품 수집' },
              ].map(item => (
                <Link key={item.label} href={item.href} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '14px 10px', borderRadius: 14, textAlign: 'center', background: item.bg, border: `1.5px solid ${item.border}`, cursor: 'pointer', transition: 'transform 0.1s' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, margin: '0 auto 8px', background: '#fff', border: `1.5px solid ${item.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <item.icon size={16} style={{ color: item.color }} />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: item.color, margin: '0 0 2px' }}>{item.label}</p>
                    <p style={{ fontSize: 10, color: '#B0A0A8', margin: 0 }}>{item.hint}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent event timeline */}
          <EventTimeline />
        </div>
      </CollapsibleSection>

    </div>
  );
}
