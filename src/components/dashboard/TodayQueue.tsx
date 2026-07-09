'use client';
// src/components/dashboard/TodayQueue.tsx
// ============================================================================
// DASHBOARD-SHELL Phase 1 (#216) — single priority "오늘 할 일" queue.
//
// Merges the three scattered action surfaces (오늘 한 가지 / 받은편지함 /
// 작업 관제탑 개입점) into ONE prioritized to-do at the top of the dashboard,
// so the solo seller sees a single focus with a single primary action.
//
// This is a SURFACING widget, not new business logic (spec §2 Phase 1
// "신규 로직 아님·기존 개입점 통합"): every count is read from data the
// dashboard already fetches —
//   - ordersToShip / ordersClaim / outOfStockProducts : /api/dashboard/stats
//     (same SWR key OrderProcessingNudge + the page already use → cache read)
//   - control-tower intervention count (counts.risk)   : /api/products/
//     asset-jobs-matrix (same key ControlTowerMatrixWidget uses → cache read)
//
// Priority order (research §1 alert tiers + §6 "행동필요 = To-do 큐"):
//   발송 필요 → 클레임 응대 → 품절 경보 → 상품 작업 개입.
// The single primary button is the highest-priority non-zero item (research
// checklist ③ — one primary action per screen). Remaining items are compact
// deep-link rows. 0-total → calm empty state with one gentle next action
// (checklist ⑦). Red is reserved for real-urgency items only (checklist ④).
//
// No emoji (Lucide only). Korean strings in TodayQueue.strings.ko.json (#3-1).
// ============================================================================

import Link from 'next/link';
import useSWR from 'swr';
import {
  ListChecks, Truck, RotateCcw, PackageX, Wrench, ArrowRight, Sparkles, ChevronRight,
} from 'lucide-react';
import strings from './TodayQueue.strings.ko.json';
import { useDashboardStats } from '@/lib/hooks/useDashboardData';

// Control-tower matrix counts — reuses the exact SWR key the matrix widget
// already mounts on this page, so this is a cache read (no extra request).
interface MatrixCountsResponse {
  success?: boolean;
  counts?: { risk?: number; attention?: number; caution?: number; ok?: number; none?: number };
}
const matrixFetcher = (url: string): Promise<MatrixCountsResponse> =>
  fetch(url).then((r) => r.json());

interface QueueItem {
  key: 'ship' | 'claim' | 'oos' | 'intervention';
  icon: typeof Truck;
  label: string;
  hint: string;
  count: number;
  href: string;
  // Semantic tone — red only for real-urgency items (research checklist ④).
  color: string;
  bg: string;
  border: string;
}

export default function TodayQueue() {
  const { data: stats } = useDashboardStats({ period: 'all' });
  const { data: matrix } = useSWR<MatrixCountsResponse>(
    '/api/products/asset-jobs-matrix',
    matrixFetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true, dedupingInterval: 10_000, keepPreviousData: true },
  );

  const shipCount   = stats?.ordersToShip ?? 0;
  const claimCount  = stats?.ordersClaim ?? 0;
  const oosCount    = stats?.outOfStockProducts ?? 0;
  // Intervention = products blocked and waiting on the operator (risk tier).
  const riskCount   = matrix?.success ? (matrix.counts?.risk ?? 0) : 0;

  // Priority order — most time-critical first.
  const allItems: QueueItem[] = [
    {
      key: 'ship', icon: Truck,
      label: strings.items.ship.label, hint: strings.items.ship.hint,
      count: shipCount, href: '/orders?status=PAID',
      color: '#C2410C', bg: '#FFF0EF', border: '#FFD6D3',
    },
    {
      key: 'claim', icon: RotateCcw,
      label: strings.items.claim.label, hint: strings.items.claim.hint,
      count: claimCount, href: '/orders',
      color: '#C2410C', bg: '#FFF0EF', border: '#FFD6D3',
    },
    {
      key: 'oos', icon: PackageX,
      label: strings.items.oos.label, hint: strings.items.oos.hint,
      count: oosCount, href: '/products/reactivation',
      color: '#C2410C', bg: '#FFF0EF', border: '#FFD6D3',
    },
    {
      key: 'intervention', icon: Wrench,
      label: strings.items.intervention.label, hint: strings.items.intervention.hint,
      count: riskCount, href: '/studio',
      color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE',
    },
  ];
  const items = allItems.filter((i) => i.count > 0);
  const total = items.reduce((sum, i) => sum + i.count, 0);

  // ── Empty state — calm, one gentle next action (research checklist ⑦) ──
  if (items.length === 0) {
    return (
      <div className="kk-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 9, background: '#FEF0F3' }}>
            <ListChecks size={18} style={{ color: '#e62310' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1A1A1A', lineHeight: 1.2 }}>
              {strings.header.title}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>{strings.header.empty}</p>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '18px 12px', background: '#FFF8FA', border: '1px solid #FBD3DE', borderRadius: 12, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#171717' }}>{strings.empty.title}</p>
          <p style={{ margin: 0, fontSize: 12, color: '#737373', lineHeight: 1.5 }}>{strings.empty.body}</p>
          <Link href="/crawl" style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: '#e62310', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            <Sparkles size={14} />{strings.empty.cta}
          </Link>
        </div>
      </div>
    );
  }

  const primary = items[0];
  const rest = items.slice(1);
  const PrimaryIcon = primary.icon;

  return (
    <div className="kk-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header — title + "지금 N건" count pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 9, background: '#FEF0F3' }}>
          <ListChecks size={18} style={{ color: '#e62310' }} />
        </div>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1A1A1A', lineHeight: 1.2, flex: 1 }}>
          {strings.header.title}
        </p>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#e62310', background: '#FFF0EF', border: '1px solid #FFD6D3', borderRadius: 99, padding: '3px 10px', whiteSpace: 'nowrap' }}>
          {strings.header.countNow.replace('{count}', String(total))}
        </span>
      </div>

      {/* Primary action — the single most-important item (one primary/screen) */}
      <Link href={primary.href} style={{ textDecoration: 'none' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', borderRadius: 12,
            background: primary.bg, border: `1.5px solid ${primary.border}`, cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, background: '#fff', border: `1.5px solid ${primary.border}`, flexShrink: 0 }}>
            <PrimaryIcon size={20} style={{ color: primary.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: primary.color, lineHeight: 1.3 }}>
              {primary.label}{' '}
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{primary.count}</span>{strings.unit}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{primary.hint}</p>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 9, background: primary.color, color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
            {strings.cta}<ArrowRight size={14} />
          </span>
        </div>
      </Link>

      {/* Remaining items — compact deep-link rows (secondary) */}
      {rest.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rest.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.key} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: '#fff', border: '1px solid #F0E0E5', cursor: 'pointer' }}>
                  <Icon size={16} style={{ color: item.color, flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#3A3A3A', flex: 1, minWidth: 0 }}>
                    {item.label}{' '}
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: item.color, fontWeight: 800 }}>{item.count}</span>{strings.unit}
                  </p>
                  <ChevronRight size={14} style={{ color: '#B0A0A8', flexShrink: 0 }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
