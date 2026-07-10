'use client';
// src/components/dashboard/cards/InboxSummaryCard.tsx
// 권위 DASHBOARD_DECLUTTER_IA_REAUDIT_2026-07-09 §2C — condenses ParetoInboxRow
// into a compact dashboard summary card. TOP1 상품 + 상위 20% 점유율 → /products.

import useSWR from 'swr';
import Link from 'next/link';
import { Trophy, ArrowRight, Inbox } from 'lucide-react';
import type { ParetoSummary } from '@/lib/pareto-analyzer';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function InboxSummaryCard() {
  const { data, isLoading, error } = useSWR<ParetoSummary>(
    '/api/products/pareto',
    fetcher,
    { refreshInterval: 10 * 60_000, revalidateOnFocus: true },
  );

  const topFive = Array.isArray(data?.topFive) ? data!.topFive : [];
  const paretoSlice = Array.isArray(data?.paretoSlice) ? data!.paretoSlice : [];
  const top1 = topFive[0];
  const top1Pct = top1 ? Math.round((top1.share ?? 0) * 100) : 0;
  const sharePct = Math.round((data?.paretoShare ?? 0) * 100);
  const hasData = !!top1;

  return (
    <div
      className="kk-card"
      style={{
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 180,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 8,
            background: hasData ? 'var(--m-amber-bg)' : '#F5F5F5',
          }}
        >
          <Inbox size={14} strokeWidth={2.4} style={{ color: hasData ? 'var(--m-amber-fg)' : '#A3A3A3' }} />
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#1A1A1A', flex: 1 }}>
          받은 편지함
        </p>
        {hasData && (
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 10, fontWeight: 800, color: 'var(--m-amber-tx)',
              background: 'var(--m-amber-bg)', border: '1px solid var(--m-amber-fg)',
              borderRadius: 99, padding: '2px 7px',
            }}
          >
            효자상품
          </span>
        )}
      </div>

      {isLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>불러오는 중…</p>
        </div>
      ) : error || !hasData ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center', padding: '12px 4px', textAlign: 'center' }}>
          <Trophy size={20} strokeWidth={2.2} style={{ color: '#D4D4D4' }} />
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#737373' }}>
            추적 대기 중
          </p>
          <p style={{ margin: 0, fontSize: 10, color: '#B0A0A8', lineHeight: 1.4 }}>
            판매 데이터가 쌓이면 효자 상품이 여기 표시됩니다
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              padding: '10px 12px', borderRadius: 10,
              background: 'var(--m-amber-bg)', border: '1px solid var(--m-amber-fg)',
            }}
          >
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--m-amber-tx)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              TOP 1
            </p>
            <p
              style={{
                margin: '4px 0 2px', fontSize: 13, fontWeight: 800, color: 'var(--m-amber-tx)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {top1.productName}
            </p>
            <p style={{ margin: 0, fontSize: 10, color: 'var(--m-amber-tx)', fontWeight: 700 }}>
              매출 점유율 {top1Pct}%
            </p>
          </div>

          <p style={{ margin: 0, fontSize: 11, color: '#525252', lineHeight: 1.4 }}>
            상위 {paretoSlice.length}개가 매출 <strong style={{ color: '#1A1A1A' }}>{sharePct}%</strong>를 차지합니다
          </p>
        </div>
      )}

      <Link
        href="/products"
        style={{
          marginTop: 'auto',
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 700, color: '#F63B28',
          textDecoration: 'none',
          alignSelf: 'flex-end',
        }}
      >
        자세히 <ArrowRight size={12} />
      </Link>
    </div>
  );
}
