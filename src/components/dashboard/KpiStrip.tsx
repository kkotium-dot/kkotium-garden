'use client';
// src/components/dashboard/KpiStrip.tsx
// ============================================================================
// DASHBOARD-SHELL Phase 1 (#216) + KPI-TIMESERIES (#223) — top-right KPI strip
// (4 cards, Cowan ≤4): 오늘 매출 / 신규 주문 / 정산 예정 / 품절 경보.
//
// Data sources:
//   - 오늘 매출 / 신규 주문 : LOCAL Order aggregation via
//       /api/dashboard/metrics-timeseries (#223) — big number + delta vs
//       yesterday + a lightweight inline-SVG 14-day sparkline. ALWAYS a real
//       value (0 is real, #82) — never degrades with the Naver API.
//   - 정산 예정              : Naver order API (/api/dashboard/stats) — degrades
//       to "—" + "확인 필요" when naverOrderStatus != ok (#82/#45).
//   - 처분 대기              : DB-native (dispositionPending, 판정 기준 #290).
//
// Sparkline = pure inline SVG (no chart lib, #223). Delta: 상승 → --success /
// 하락 → --danger (trendy semantic). No emoji (Lucide only).
// ============================================================================

import Link from 'next/link';
import useSWR from 'swr';
import { TrendingUp, ShoppingCart, CreditCard, AlertTriangle, ArrowUp, ArrowDown, type LucideIcon } from 'lucide-react';
import strings from './KpiStrip.strings.ko.json';
import { useDashboardStats } from '@/lib/hooks/useDashboardData';

const fmtWon = (n: number): string =>
  n >= 10000 ? `${(n / 10000).toFixed(1)}만원` : `${n.toLocaleString()}원`;

// ── metrics-timeseries (#223) — daily local Order aggregation ───────────────
interface TimeseriesPoint { date: string; revenue: number; orderCount: number }
interface TimeseriesResponse { success?: boolean; series?: TimeseriesPoint[]; filledDays?: number }
const tsFetcher = (url: string): Promise<TimeseriesResponse> => fetch(url).then((r) => r.json());

// ── Lightweight inline-SVG sparkline (no chart library) ─────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 72, h = 20;
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const n = values.length - 1;
  const pts = values.map((v, i) => {
    const x = (i / n) * w;
    const y = h - ((v - min) / range) * (h - 2) - 1; // 1px padding top/bottom
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const lastX = w, lastY = h - ((values[values.length - 1] - min) / range) * (h - 2) - 1;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={2} fill={color} />
    </svg>
  );
}

// ── Delta vs yesterday — up = --success, down = --danger (#223) ─────────────
function Delta({ curr, prev, currency }: { curr: number; prev: number; currency: boolean }) {
  const diff = curr - prev;
  if (diff === 0) return null;
  const up = diff > 0;
  const pct = prev > 0 ? Math.round((diff / prev) * 100) : null;
  const mag = currency ? fmtWon(Math.abs(diff)) : `${Math.abs(diff)}${strings.unit.count}`;
  const label = pct !== null ? `${up ? '+' : '-'}${Math.abs(pct)}%` : `${up ? '+' : '-'}${mag}`;
  const color = up ? 'var(--success)' : 'var(--danger)';
  return (
    <span
      title={`어제 대비 ${up ? '+' : '-'}${mag}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 1, fontSize: 11, fontWeight: 800, color, whiteSpace: 'nowrap' }}
    >
      {up ? <ArrowUp size={11} strokeWidth={2.6} /> : <ArrowDown size={11} strokeWidth={2.6} />}
      {label}
    </span>
  );
}

interface KpiCardModel {
  key: string;
  label: string;
  sub: string;
  value: string;
  down: boolean;                                    // Naver source unavailable → "확인 필요"
  icon: LucideIcon;
  color: string;
  iconBg: string;
  href: string;
  delta?: { curr: number; prev: number; currency: boolean };
  spark?: number[];
}

function KpiCard({ card }: { card: KpiCardModel }) {
  const Icon = card.icon;
  return (
    <Link href={card.href} style={{ textDecoration: 'none' }}>
      <div className="kk-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, height: '100%', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#B0A0A8', letterSpacing: '0.02em' }}>{card.label}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: card.iconBg, flexShrink: 0 }}>
            <Icon size={16} style={{ color: card.color }} strokeWidth={2.4} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <p className="kk-pop-num" style={{ margin: 0, fontSize: 26, fontWeight: 400, color: card.down ? '#B0A0A8' : '#2A1F1A', lineHeight: 1 }}>
            {card.value}
          </p>
          {card.delta && <Delta curr={card.delta.curr} prev={card.delta.prev} currency={card.delta.currency} />}
          {card.down && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#8a5a00', background: 'var(--warning-bg)', border: '1px solid var(--warning)', borderRadius: 99, padding: '1px 6px', whiteSpace: 'nowrap' }}>
              {strings.naverDown}
            </span>
          )}
        </div>
        {card.spark && card.spark.length >= 2
          ? <Sparkline values={card.spark} color="var(--brand-pink-mid)" />
          : <p style={{ margin: 0, fontSize: 11, color: '#A3A3A3' }}>{card.sub}</p>}
      </div>
    </Link>
  );
}

export default function KpiStrip() {
  const { data: stats, isLoading } = useDashboardStats({ period: 'all' });
  const { data: ts } = useSWR<TimeseriesResponse>(
    '/api/dashboard/metrics-timeseries?days=14',
    tsFetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true, dedupingInterval: 10_000, keepPreviousData: true },
  );

  // Local Order series — always real (#82); "—" only while unavailable/loading.
  const series = ts?.success ? (ts.series ?? []) : [];
  const hasSeries = series.length >= 1;
  const today = hasSeries ? series[series.length - 1] : null;
  const prev  = series.length >= 2 ? series[series.length - 2] : null;
  const revSpark = series.map((p) => p.revenue);
  const cntSpark = series.map((p) => p.orderCount);

  // Naver-derived (settlement only) degrades honestly.
  const naverDown = stats?.naverOrderStatus !== undefined && stats.naverOrderStatus !== 'ok';
  const settlement = stats?.todayPaidAmount ?? 0;
  // #290/#278 — status가 아니라 **판정** 기준. 공급처가 끊긴 상품은 앱 status가
  // ACTIVE로 남아 outOfStockProducts에서 빠지는데 그게 가장 급한 처분 대상이다.
  // 구버전 API 응답 대비 fallback 유지(#82).
  const oos        = stats?.dispositionPending ?? stats?.outOfStockProducts ?? 0;

  const empty = strings.empty;
  const cards: KpiCardModel[] = [
    {
      key: 'revenue', label: strings.cards.revenue.label, sub: strings.cards.revenue.sub,
      value: today ? fmtWon(today.revenue) : empty,
      down: false,
      icon: TrendingUp, color: 'var(--success)', iconBg: 'var(--success-bg)', href: '/orders',
      delta: today && prev ? { curr: today.revenue, prev: prev.revenue, currency: true } : undefined,
      spark: hasSeries ? revSpark : undefined,
    },
    {
      key: 'orders', label: strings.cards.orders.label, sub: strings.cards.orders.sub,
      value: today ? `${today.orderCount}${strings.unit.count}` : empty,
      down: false,
      icon: ShoppingCart, color: 'var(--info)', iconBg: 'var(--info-bg)', href: '/orders',
      delta: today && prev ? { curr: today.orderCount, prev: prev.orderCount, currency: false } : undefined,
      spark: hasSeries ? cntSpark : undefined,
    },
    {
      key: 'settlement', label: strings.cards.settlement.label, sub: strings.cards.settlement.sub,
      value: isLoading ? empty : naverDown ? empty : (settlement > 0 ? fmtWon(settlement) : empty),
      down: !isLoading && naverDown,
      icon: CreditCard, color: 'var(--success)', iconBg: 'var(--success-bg)', href: '/orders',
    },
    {
      key: 'oos', label: strings.cards.oos.label, sub: strings.cards.oos.sub,
      value: isLoading ? empty : `${oos}${strings.unit.count}`,
      down: false,
      // 처분이 필요한 상품은 "되살리기"(부활소)가 아니라 "어떻게 할지 정하기"
      // (처분 결정 대기함)로 보낸다(#285 — 행동과 화면 목적을 맞춘다).
      icon: AlertTriangle, color: 'var(--danger)', iconBg: 'var(--danger-bg)', href: '/products/out-of-stock',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, alignContent: 'start' }}>
      {cards.map((card) => <KpiCard key={card.key} card={card} />)}
    </div>
  );
}
