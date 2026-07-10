'use client';
// Dashboard — KKOTIUM v9 (2026-07-09 DECLUTTER-IA-REAUDIT)
//
// 권위 docs/design/DASHBOARD_DECLUTTER_IA_REAUDIT_2026-07-09.md (원칙 #232).
// Command-post 6 청크 재편 — 27+ 위젯을 지휘소 6개로 축약, 분석은 /market ·
// 성장은 /growth · 관제탑은 /control 전용 페이지로 이동.
//
// 시선 흐름 (Z/F pattern):
//   [상단 얇은 경보] NaverHealthBanner (조건부·정상 시 self-hide)
//   ─────
//   [Zone 1 · 히어로 60/40]
//     좌 60%: TodayQueue (오늘 할 일 — OrderNudge/Confirmation/DailyPlan 병합)
//     우 40%: KpiStrip (핵심지표 4 — 매출/주문/정산/품절)
//   ─────
//   [Zone 2 · 3열 요약 균등]
//     상품 건강 요약 | 받은 편지함 요약 | 관제탑 요약
//   ─────
//   [Zone 3 · 접힘 (기본 접힘)]
//     더보기 = 파이프라인 + 빠른 작업 + 활동 타임라인 + 좀비 부활소
//
// 대시보드에서 제거된 위젯 (전용 페이지로 이동 또는 병합·요약):
//   - /market   : Competition · CompetitorRadar · MarketTrend · PriceMovement
//                 · DataLab · GoldenWindow
//   - /growth   : Sourcing · SupplierGarden · ReviewGrowth · ProductLifecycle
//                 · UploadReadiness
//   - /control  : PublishControlTower · ControlTowerMatrix (요약 카드만 유지)
//   - 병합     : OrderProcessingNudge/ConfirmationReminder/DailyPlan → TodayQueue
//   - 병합     : LowStock/Profitability/HealthCombined → ProductHealthSummaryCard
//   - 요약     : ParetoInbox → InboxSummaryCard
//   - 제거     : KkottiBriefingWidget/KkottiWidget 상시 노출 (#228 — 마스코트는
//                TodayQueue empty state에서만).
//
// Backward-compat exports (다른 페이지에서 재사용):
//   - DashboardProduct : /market · /growth 페이지 · UploadReadinessWidget import 소스
//   - normalizeProducts: 동일

import { useMemo, useCallback } from 'react';
import {
  Package, TrendingUp, AlertTriangle, Sparkles, Layers, Skull,
  ArrowRight, ShoppingCart, RefreshCw,
} from 'lucide-react';
import TodayQueue from '@/components/dashboard/TodayQueue';
import KpiStrip from '@/components/dashboard/KpiStrip';
import NaverHealthBanner from '@/components/dashboard/NaverHealthBanner';
import EventTimeline from '@/components/dashboard/EventTimeline';
import CollapsibleSection from '@/components/dashboard/layout/CollapsibleSection';
import ZombieReactivationCard from '@/components/dashboard/cards/ZombieReactivationCard';
import ProductHealthSummaryCard from '@/components/dashboard/cards/ProductHealthSummaryCard';
import InboxSummaryCard from '@/components/dashboard/cards/InboxSummaryCard';
import ControlTowerSummaryCard from '@/components/dashboard/cards/ControlTowerSummaryCard';
import { SystemHealthCard } from '@/components/dashboard/SystemHealthCard';
import {
  useProductsList,
  useDashboardStats,
} from '@/lib/hooks/useDashboardData';
import Link from 'next/link';

// Shared shape + normalizer live in @/lib/dashboard-product (Next.js App
// Router forbids non-page value exports from a page.tsx file).

// ── Pipeline Stage Card (Zone 3 · 더보기) ──────────────────────────────────
interface PipelineStage {
  label: string; count: number; icon: React.ElementType;
  color: string; bg: string; border: string; href: string; hint: string;
}

function PipelineCard({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="kk-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #F8DCE5', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Layers size={14} style={{ color: '#F63B28' }} />
        <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>파이프라인 현황</p>
        <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>소싱 → 등록 → 판매 → 관리</p>
      </div>
      <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }}>
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
    </div>
  );
}

export default function DashboardPage() {
  const {
    isLoading: productsLoading,
    refresh: refreshProducts,
  } = useProductsList({ limit: 200 });

  const {
    data: stats,
    isLoading: statsLoading,
    refresh: refreshStats,
  } = useDashboardStats({ period: 'all' });

  const handleRefresh = useCallback(() => {
    refreshStats();
    refreshProducts();
  }, [refreshStats, refreshProducts]);

  const isRefreshing = statsLoading || productsLoading;

  const pipelineStages: PipelineStage[] = useMemo(() => [
    { label: '소싱 대기', count: stats?.sourcingCount ?? 0, icon: Layers,     color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', href: '/crawl',                  hint: '보관함 SOURCED' },
    { label: '등록 대기', count: stats?.draftProducts ?? 0, icon: Package,    color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', href: '/products',               hint: 'DRAFT 상태'    },
    { label: '판매중',    count: stats?.activeProducts ?? 0, icon: TrendingUp, color: '#16a34a', bg: '#f0fdf4', border: '#86efac', href: '/products',               hint: 'ACTIVE 상태'   },
    { label: '좀비 감지', count: stats?.zombieCount ?? 0,   icon: Skull,      color: '#F63B28', bg: '#fff0ef', border: '#ffd6d3', href: '/products/reactivation', hint: '30일+ 미판매'  },
  ], [stats]);

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', padding: '24px', paddingBottom: 56 }} className="space-y-2">

      {/* ── Page header ─────────────────────────────────────── */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                {([0,60,120,180,240,300] as number[]).map((deg, i) => { const r=deg*Math.PI/180; const cx=26+Math.cos(r)*11.4; const cy=26+Math.sin(r)*11.4; return <ellipse key={i} cx={cx} cy={cy} rx={14} ry={10.4} transform={`rotate(${deg} ${cx} ${cy})`} fill="#F63B28" />; })}
                <circle cx="26" cy="26" r="14.6" fill="#F63B28" />
              </svg>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'relative', zIndex: 1 }}>
                <path d="M12 22V12"/><path d="M12 12C12 12 8 9 8 6a4 4 0 0 1 8 0c0 3-4 6-4 6z"/>
                <path d="M12 12c0 0-4 3-7 3"/><path d="M12 12c0 0 4 3 7 3"/>
                <ellipse cx="12" cy="20" rx="5" ry="2"/>
              </svg>
            </div>
            <h1 className="kk-pop-title" style={{ fontSize: 26, fontWeight: 400, color: '#1A1A1A', margin: 0 }}>정원 일지</h1>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{ padding: 6, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#B0A0A8', opacity: isRefreshing ? 0.4 : 1 }}
            aria-label="대시보드 새로고침"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div style={{ height: 2.5, background: '#FFB3CE', borderRadius: 99, margin: '10px 0 6px' }} />
        <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
        </p>
      </div>

      {/* ── Top alert bar (conditional) ─────────────────────── */}
      <NaverHealthBanner />

      {/* ════════════════════════════════════════════════════════════════════
          ZONE 1 · 히어로 (60/40)
          Left  60% : TodayQueue (오늘 할 일 — OrderNudge·Confirmation·DailyPlan 병합)
          Right 40% : KpiStrip (핵심지표 4)
          ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5" style={{ marginTop: 12, marginBottom: 20 }}>
        <div className="xl:col-span-3">
          <TodayQueue />
        </div>
        <div className="xl:col-span-2">
          <KpiStrip />
        </div>
      </div>

      {/* System health slim card (Sprint 8-IA) — kept above summary triplet */}
      <div style={{ marginBottom: 16 }}>
        <SystemHealthCard />
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          ZONE 2 · 요약 카드 3열 균등
          상품 건강 | 받은 편지함 | 관제탑
          각 카드 = 핵심 수치 1~2 + "자세히" 링크 (권위 §3).
          ════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <ProductHealthSummaryCard />
        <InboxSummaryCard />
        <ControlTowerSummaryCard />
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          ZONE 3 · 더보기 (기본 접힘)
          파이프라인 + 빠른 작업 + 좀비 부활소 + 활동 타임라인
          권위 §2D — MoreWidget·EventTimeline을 접힌 섹션으로.
          ════════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection
        section="more"
        variant="cowgirl"
        subtitle="파이프라인 · 빠른 작업 · 좀비 부활소 · 활동 타임라인"
        defaultCollapsed
      >
        <div className="space-y-4">
          <PipelineCard stages={pipelineStages} />

          {/* Quick action shortcuts */}
          <div className="kk-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid #F8DCE5', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={14} style={{ color: '#FF6B8A' }} />
              <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>빠른 작업</p>
            </div>
            <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }}>
              {[
                { label: '씨앗 심기', href: '/products/new', color: '#F63B28', bg: '#FFF0F5', border: '#FFB3CE', icon: Package, hint: '상품 등록' },
                { label: '검색 조련사', href: '/naver-seo', color: '#2563eb', bg: '#EFF6FF', border: '#BFDBFE', icon: TrendingUp, hint: 'SEO 최적화' },
                { label: '주문 관리', href: '/orders', color: '#16a34a', bg: '#F0FDF4', border: '#BBF7D0', icon: ShoppingCart, hint: '발주/송장' },
                { label: '꿀통 꽃나들이', href: '/crawl', color: '#7c3aed', bg: '#F5F3FF', border: '#DDD6FE', icon: Layers, hint: '꽃 한 송이씩 담기' },
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

          {/* Zombie reactivation card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 14,
            }}
          >
            <ZombieReactivationCard
              zombieCount={stats?.zombieCount ?? 0}
              activeCount={stats?.activeProducts ?? 0}
              loading={statsLoading}
            />
            <div
              className="kk-card"
              style={{
                padding: '14px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: 120,
                background: '#FAFAFA',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <AlertTriangle size={20} style={{ color: '#B0A0A8', margin: '0 auto 6px' }} />
                <p style={{ margin: 0, fontSize: 11, color: '#737373', lineHeight: 1.4 }}>
                  전용 페이지로 이동
                </p>
                <div style={{ marginTop: 6, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link href="/market" style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', background: '#EFF6FF', padding: '3px 8px', borderRadius: 99, textDecoration: 'none' }}>
                    시장 분석 →
                  </Link>
                  <Link href="/growth" style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#F0FDF4', padding: '3px 8px', borderRadius: 99, textDecoration: 'none' }}>
                    성장 · 소싱 →
                  </Link>
                  <Link href="/control" style={{ fontSize: 10, fontWeight: 700, color: '#F63B28', background: '#FEF0F3', padding: '3px 8px', borderRadius: 99, textDecoration: 'none' }}>
                    관제탑 →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Recent event timeline */}
          <EventTimeline />
        </div>
      </CollapsibleSection>

    </div>
  );
}
