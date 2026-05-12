// src/components/dashboard/cards/ZombieReactivationCard.tsx
// Session E-2 Phase 2 (2026-05-12)
// "좀비 부활소" surface — small Section 4 card that surfaces the live zombie
// (30+ days no-sale) count and links to /products/reactivation. Pure
// presentation: counts come from useDashboardStats via prop, so this card
// stays in sync with the rest of the dashboard's SWR cache.

'use client';

import Link from 'next/link';
import { Skull, ArrowRight } from 'lucide-react';

interface ZombieReactivationCardProps {
  zombieCount: number;
  activeCount: number;
  loading?: boolean;
}

export default function ZombieReactivationCard({
  zombieCount,
  activeCount,
  loading,
}: ZombieReactivationCardProps) {
  const pct = activeCount > 0 ? Math.round((zombieCount / activeCount) * 100) : 0;
  const tone = zombieCount === 0
    ? { bg: '#F0FDF4', border: '#BBF7D0', accent: '#16a34a', label: '깨끗해요' }
    : zombieCount <= 3
      ? { bg: '#FFFBEB', border: '#FDE68A', accent: '#a16207', label: '점검 권장' }
      : { bg: '#FFF0EF', border: '#FFD6D3', accent: '#e62310', label: '부활 작전' };

  return (
    <Link href="/products/reactivation" style={{ textDecoration: 'none' }}>
      <div
        className="kk-card"
        style={{
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minHeight: 168,
          cursor: 'pointer',
          transition: 'transform 0.12s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Skull size={14} style={{ color: tone.accent }} />
          <p
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#1A1A1A',
              margin: 0,
              flex: 1,
            }}
          >
            좀비 부활소
          </p>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: tone.accent,
              background: tone.bg,
              padding: '2px 7px',
              borderRadius: 999,
              border: `1px solid ${tone.border}`,
            }}
          >
            {tone.label}
          </span>
        </div>

        <div
          style={{
            flex: 1,
            background: tone.bg,
            border: `1px solid ${tone.border}`,
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 36,
              fontWeight: 900,
              color: tone.accent,
              lineHeight: 1,
            }}
          >
            {loading ? '—' : zombieCount}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 700, color: tone.accent }}>
            30일+ 미판매 상품 {activeCount > 0 ? `(판매중 대비 ${pct}%)` : ''}
          </p>
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: '#525252',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          부활 작전 시작 <ArrowRight size={11} />
        </span>
      </div>
    </Link>
  );
}
