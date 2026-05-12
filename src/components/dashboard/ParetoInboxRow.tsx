// src/components/dashboard/ParetoInboxRow.tsx
// ============================================================================
// Sprint 7 P0-C (Session E-2 Sprint 7): compact Inbox summary row for the
// Pareto 80/20 analysis. Mounts inside dashboard Section 2 (Inbox) and
// replaces the prior InboxPlaceholderRow for "효자 상품 자동 식별".
//
// Data: /api/products/pareto (computePareto, 30-day lookback).
// Empty state: green "추적 대기 중" row (consistent with PriceMovementWidget /
// CompetitorRadarWidget patterns).
// ============================================================================

'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Trophy, Check } from 'lucide-react';
import strings from './ParetoInboxRow.strings.ko.json';
import type { ParetoSummary } from '@/lib/pareto-analyzer';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ParetoInboxRow() {
  const { data, isLoading, error } = useSWR<ParetoSummary>(
    '/api/products/pareto',
    fetcher,
    { refreshInterval: 10 * 60_000, revalidateOnFocus: true },
  );

  if (isLoading) return <StateRow text={strings.loading} muted />;
  if (error)     return <StateRow text={strings.error} muted />;
  if (!data || data.topFive.length === 0) return <EmptyRow />;

  const sharePct = Math.round(data.paretoShare * 100);
  const top1 = data.topFive[0];
  const top1Pct = Math.round(top1.share * 100);

  return (
    <Link
      href="/products"
      style={{ textDecoration: 'none', display: 'block' }}
      title={`${strings.title} — ${top1.productName} ${top1Pct}% ${strings.share}`}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 10,
          background: '#FFFBEB', border: '1px solid #FDE68A',
        }}
      >
        <div
          style={{
            flexShrink: 0, width: 28, height: 28, borderRadius: 7,
            background: '#FFFFFF', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#CA8A04', border: '1px solid #FDE68A',
          }}
          aria-hidden="true"
        >
          <Trophy size={14} strokeWidth={2.5} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#854D0E' }}>
              {strings.labelTop} {data.paretoSlice.length}{strings.labelOf}
              {data.paretoSlice.length > 0 ? Math.ceil(data.paretoSlice.length / 0.2) : 0}
            </span>
            <span
              style={{
                fontSize: 10, fontWeight: 700, color: '#854D0E',
                background: '#FFFFFF', padding: '2px 6px',
                borderRadius: 999, border: '1px solid #FDE68A',
              }}
            >
              {sharePct}% {strings.share}
            </span>
          </div>
          <p
            style={{
              margin: '2px 0 0', fontSize: 11, color: '#7c2d12', lineHeight: 1.4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            #1 {top1.productName} · {top1Pct}%
          </p>
        </div>
        <span
          style={{
            flexShrink: 0, fontSize: 10, fontWeight: 700,
            color: '#737373', background: '#FFFFFF',
            padding: '2px 6px', borderRadius: 999,
            border: '1px solid #E5E5E5', whiteSpace: 'nowrap',
          }}
        >
          {strings.sprintLabel}
        </span>
      </div>
    </Link>
  );
}

function EmptyRow() {
  return (
    <Link
      href="/automation"
      style={{ textDecoration: 'none', display: 'block' }}
      title={strings.subtitleEmpty}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', borderRadius: 10,
          background: '#F0FDF4', border: '1px solid #BBF7D0',
        }}
      >
        <div
          style={{
            flexShrink: 0, width: 32, height: 32, borderRadius: 8,
            background: '#FFFFFF', border: '1px solid #BBF7D0',
            display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', color: '#16A34A',
          }}
          aria-hidden="true"
        >
          <Check size={16} strokeWidth={2.5} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#15803D', lineHeight: 1.3 }}>
            {strings.title} — {strings.emptyOk}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#16A34A', lineHeight: 1.4 }}>
            {strings.emptyHint}
          </p>
        </div>
        <span
          style={{
            flexShrink: 0, fontSize: 10, fontWeight: 700,
            color: '#15803D', background: '#FFFFFF',
            padding: '3px 8px', borderRadius: 999,
            border: '1px solid #BBF7D0', whiteSpace: 'nowrap',
          }}
        >
          {strings.sprintLabel}
        </span>
      </div>
    </Link>
  );
}

function StateRow({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 10,
        background: '#FAFAFA', border: '1px dashed #E5E5E5',
        opacity: muted ? 0.7 : 1,
      }}
    >
      <Trophy size={16} strokeWidth={2.2} color="#A3A3A3" />
      <p style={{ margin: 0, fontSize: 12, color: '#737373' }}>{text}</p>
    </div>
  );
}
