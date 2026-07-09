'use client';
// src/components/dashboard/KpiStrip.tsx
// ============================================================================
// DASHBOARD-SHELL Phase 1 (#216) — top-right KPI strip (4 cards, Cowan ≤4).
//
// Monitoring numbers (research §6 "모니터링 = KPI 카드", distinct from the
// action To-do queue): 오늘 매출 / 신규 주문 / 정산 예정 / 품절 경보.
// Big number + label + semantic-colored icon, each deep-linked.
//
// Data — all read from /api/dashboard/stats (same SWR key the page already
// uses → cache read, no extra request):
//   revenue/orders/settlement come from the Naver order API; 품절 is DB-native.
//
// HONESTY (#82 no fake zeros / #45 fact-checked output): the three Naver-derived
// cards show "—" + a "확인 필요" chip when naverOrderStatus is not 'ok', instead
// of a fabricated 0. 품절 경보 is always DB-truthful.
//
// NOTE (deferred): the spec also calls for a delta arrow + sparkline. Both need
// a time-series the stats API does not expose today (only current snapshot).
// Rather than fabricate a trend, this strip ships the honest big-number cards;
// delta/sparkline is a backend follow-up (add a daily-metrics endpoint).
//
// No emoji (Lucide only). Korean strings in KpiStrip.strings.ko.json (#3-1).
// ============================================================================

import Link from 'next/link';
import { TrendingUp, ShoppingCart, CreditCard, AlertTriangle, type LucideIcon } from 'lucide-react';
import strings from './KpiStrip.strings.ko.json';
import { useDashboardStats } from '@/lib/hooks/useDashboardData';

// Currency formatter — matches the existing dashboard TodayCard convention.
const fmtWon = (n: number): string =>
  n >= 10000 ? `${(n / 10000).toFixed(1)}만원` : `${n.toLocaleString()}원`;

interface KpiCardModel {
  key: string;
  label: string;
  sub: string;
  value: string;
  down: boolean;      // Naver source unavailable → honest "확인 필요"
  icon: LucideIcon;
  color: string;
  iconBg: string;
  href: string;
}

function KpiCard({ card }: { card: KpiCardModel }) {
  const Icon = card.icon;
  return (
    <Link href={card.href} style={{ textDecoration: 'none' }}>
      <div className="kk-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, height: '100%', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#B0A0A8', letterSpacing: '0.02em' }}>{card.label}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: card.iconBg, flexShrink: 0 }}>
            <Icon size={16} style={{ color: card.color }} strokeWidth={2.4} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <p className="kk-pop-num" style={{ margin: 0, fontSize: 26, fontWeight: 400, color: card.down ? '#B0A0A8' : card.color, lineHeight: 1 }}>
            {card.value}
          </p>
          {card.down && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 99, padding: '1px 6px', whiteSpace: 'nowrap' }}>
              {strings.naverDown}
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 11, color: '#A3A3A3' }}>{card.sub}</p>
      </div>
    </Link>
  );
}

export default function KpiStrip() {
  const { data: stats, isLoading } = useDashboardStats({ period: 'all' });

  // Naver-derived cards degrade honestly when the order API is unavailable.
  const naverDown = stats?.naverOrderStatus !== undefined && stats.naverOrderStatus !== 'ok';
  const revenue    = stats?.todayRevenue ?? 0;
  const orders     = stats?.todayOrderCount ?? 0;
  const settlement = stats?.todayPaidAmount ?? 0;
  const oos        = stats?.outOfStockProducts ?? 0;

  const empty = strings.empty;
  const cards: KpiCardModel[] = [
    {
      key: 'revenue', label: strings.cards.revenue.label, sub: strings.cards.revenue.sub,
      value: isLoading ? empty : naverDown ? empty : (revenue > 0 ? fmtWon(revenue) : empty),
      down: !isLoading && naverDown,
      icon: TrendingUp, color: '#16a34a', iconBg: '#F0FDF4', href: '/orders',
    },
    {
      key: 'orders', label: strings.cards.orders.label, sub: strings.cards.orders.sub,
      value: isLoading ? empty : naverDown ? empty : `${orders}${strings.unit.count}`,
      down: !isLoading && naverDown,
      icon: ShoppingCart, color: '#1d4ed8', iconBg: '#EFF6FF', href: '/orders',
    },
    {
      key: 'settlement', label: strings.cards.settlement.label, sub: strings.cards.settlement.sub,
      value: isLoading ? empty : naverDown ? empty : (settlement > 0 ? fmtWon(settlement) : empty),
      down: !isLoading && naverDown,
      icon: CreditCard, color: '#15803d', iconBg: '#F0FDF4', href: '/orders',
    },
    {
      key: 'oos', label: strings.cards.oos.label, sub: strings.cards.oos.sub,
      value: isLoading ? empty : `${oos}${strings.unit.count}`,
      down: false,
      icon: AlertTriangle, color: '#e62310', iconBg: '#FFF0EF', href: '/products/reactivation',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, alignContent: 'start' }}>
      {cards.map((card) => <KpiCard key={card.key} card={card} />)}
    </div>
  );
}
