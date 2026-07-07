// src/components/dashboard/OrderProcessingNudge.tsx
// ============================================================================
// ORDER-QUEUE-1 (#195): order-processing nudge for the dashboard action surface.
//
// Surfaces orders that need an operator action right now, so the solo seller
// doesn't have to dig through /orders:
//   - 발송 필요  = Order.status PAID/PAYED (paid, not yet dispatched) — top priority
//   - 클레임 응대 = Order.status CANCEL_REQUESTED + RETURN_REQUESTED (needs a reply)
//
// Design decisions (per ORDER_QUEUE_SPEC_2026-07-06 + work principle #195):
//   - Order intervention lives on the dashboard surface, NOT the product C-9
//     matrix (Order and Product are different entities — #56 places each
//     intervention point on its own entity).
//   - Read-only judgment: counts come from the already-synced Order table via
//     /api/dashboard/stats (ORDER-SYNC keeps status accurate). No new columns.
//   - The nudge is a deep link only; the actual write actions (dispatch /
//     confirm / claim) stay on /orders (#46 — writes on operator click).
//   - 0-count states are hidden entirely (this is a nudge, not a persistent
//     panel — when there is nothing to process, the widget renders nothing).
//   - Korean strings live in OrderProcessingNudge.strings.ko.json (#3-1).
// ============================================================================

'use client';

import Link from 'next/link';
import { ShoppingCart, Truck, RotateCcw, ChevronRight } from 'lucide-react';
import strings from './OrderProcessingNudge.strings.ko.json';
import { useDashboardStats } from '@/lib/hooks/useDashboardData';

// Shares the exact SWR key the dashboard page already uses
// (`/api/dashboard/stats?period=all`), so this is a cache read — no extra fetch.
interface NudgeItem {
  key: 'ship' | 'claim';
  icon: typeof Truck;
  label: string;
  hint: string;
  count: number;
  href: string;
  color: string;
  bg: string;
  border: string;
}

export default function OrderProcessingNudge() {
  const { data: stats } = useDashboardStats({ period: 'all' });

  const shipCount   = stats?.ordersToShip ?? 0;
  const cancelCount = stats?.ordersCancelRequested ?? 0;
  const returnCount = stats?.ordersReturnRequested ?? 0;
  const claimCount  = stats?.ordersClaim ?? (cancelCount + returnCount);

  // Claim deep link: filter to the single claim status when only one kind is
  // pending; land on the full /orders list (problem rows highlighted) when both
  // cancels and returns are pending, since the status filter is single-valued.
  const claimHref =
    cancelCount > 0 && returnCount === 0 ? '/orders?status=CANCEL_REQUESTED' :
    returnCount > 0 && cancelCount === 0 ? '/orders?status=RETURN_REQUESTED' :
    '/orders';

  const allItems: NudgeItem[] = [
    {
      key: 'ship',
      icon: Truck,
      label: strings.nudge.shipLabel,
      hint: strings.nudge.shipHint,
      count: shipCount,
      href: '/orders?status=PAID',
      color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe',
    },
    {
      key: 'claim',
      icon: RotateCcw,
      label: strings.nudge.claimLabel,
      hint: strings.nudge.claimHint,
      count: claimCount,
      href: claimHref,
      color: '#b45309', bg: '#fffbeb', border: '#fde68a',
    },
  ];
  const items = allItems.filter((item) => item.count > 0);

  // 0-count → nothing to process → render nothing (spec: 0건 미표시).
  if (items.length === 0) return null;

  const total = items.reduce((sum, i) => sum + i.count, 0);

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #F8DCE5',
        borderRadius: 16,
        padding: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8, background: '#eff6ff',
        }}>
          <ShoppingCart size={18} style={{ color: '#1d4ed8' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>
            {strings.header.title}
            <span style={{
              marginLeft: 8, fontSize: 11, fontWeight: 800,
              color: '#1d4ed8', background: '#eff6ff',
              border: '1px solid #bfdbfe', borderRadius: 99,
              padding: '1px 8px',
            }}>
              {total}
            </span>
          </p>
          <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
            {strings.header.subtitle}
          </p>
        </div>
      </div>

      {/* Nudge rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              style={{ textDecoration: 'none' }}
            >
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px',
                  background: item.bg,
                  border: `1px solid ${item.border}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                <Icon size={18} style={{ color: item.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: item.color, lineHeight: 1.3 }}>
                    {item.label}{' '}
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{item.count}</span>
                    {strings.nudge.countSuffix}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                    {item.hint}
                  </p>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 2,
                  fontSize: 11, fontWeight: 700, color: item.color,
                  flexShrink: 0, whiteSpace: 'nowrap',
                }}>
                  {strings.nudge.cta}
                  <ChevronRight size={13} style={{ flexShrink: 0 }} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
