// src/components/dashboard/CompetitorRadarWidget.tsx
// ============================================================================
// Sprint 6-C (Session E-2 Phase 4): compact Inbox row group for competitor
// page-1 tracking. Mounts inside dashboard Section 2 (Inbox) and replaces the
// prior InboxPlaceholderRow for "다른 셀러 추적".
//
// Data: /api/competitors/latest — latest CompetitorSnapshot per active product.
// Empty state: green "추적 대기 중" row (similar pattern to PriceMovementWidget).
// ============================================================================

'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Users, Check, TrendingUp, TrendingDown, Equal } from 'lucide-react';
import strings from './CompetitorRadarWidget.strings.ko.json';
import type { CompetitorRow } from '@/app/api/competitors/latest/route';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const MAX_VISIBLE = 5;

interface ApiResponse {
  data: CompetitorRow[];
}

export default function CompetitorRadarWidget() {
  const { data, error, isLoading } = useSWR<ApiResponse>(
    '/api/competitors/latest',
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true },
  );

  const rows = data?.data ?? [];
  const visible = rows.slice(0, MAX_VISIBLE);
  const hidden = Math.max(0, rows.length - MAX_VISIBLE);

  if (isLoading) return <StateRow text={strings.loading} muted />;
  if (error)     return <StateRow text={strings.error} muted />;
  if (rows.length === 0) return <EmptyRow />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {visible.map((row) => (
        <CompetitorRowItem key={row.productId} row={row} />
      ))}
      {hidden > 0 && (
        <Link
          href="/automation"
          style={{
            textDecoration: 'none',
            display: 'block',
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: '#737373',
            padding: '6px 10px',
            background: '#FAFAFA',
            border: '1px dashed #E5E5E5',
            borderRadius: 8,
          }}
        >
          +{hidden}{strings.more}
        </Link>
      )}
    </div>
  );
}

function CompetitorRowItem({ row }: { row: CompetitorRow }) {
  // Compare ourPrice vs medianPrice when both exist
  const hasComparison = row.ourPrice != null && row.medianPrice != null && row.medianPrice > 0;
  const delta = hasComparison ? (row.ourPrice! - row.medianPrice!) / row.medianPrice! : 0;
  const absPct = Math.abs(delta);

  // Tone (§3): our price >=10% above median (margin risk) → coral, 5-10% → amber,
  // otherwise → mint. bg=-bg · border/accent=-fg · text=-tx (dark, AA).
  const tone = hasComparison && absPct >= 0.10
    ? { bg: 'var(--m-coral-bg)', border: 'var(--m-coral-fg)', accent: 'var(--m-coral-fg)', text: 'var(--m-coral-tx)' }
    : hasComparison && absPct >= 0.05
      ? { bg: 'var(--m-amber-bg)', border: 'var(--m-amber-fg)', accent: 'var(--m-amber-fg)', text: 'var(--m-amber-tx)' }
      : { bg: 'var(--m-mint-bg)', border: 'var(--m-mint-fg)', accent: 'var(--m-mint-fg)', text: 'var(--m-mint-tx)' };

  const Icon = !hasComparison ? Equal : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Equal;
  const productLabel = row.productName.length > 26
    ? `${row.productName.slice(0, 26)}…`
    : row.productName;

  const productHref = row.productId ? `/products/new?edit=${row.productId}` : '/automation';

  return (
    <Link
      href={productHref}
      style={{ textDecoration: 'none', display: 'block' }}
      title={`${row.productName} — 검색어 "${row.searchKeyword}" · 경쟁사 ${row.competitorCount}건`}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          borderRadius: 10,
          background: tone.bg,
          border: `1px solid ${tone.border}`,
        }}
      >
        <div
          style={{
            flexShrink: 0,
            width: 28,
            height: 28,
            borderRadius: 7,
            background: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tone.accent,
            border: `1px solid ${tone.border}`,
          }}
          aria-hidden="true"
        >
          <Icon size={14} strokeWidth={2.5} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: tone.text }}>
              {productLabel}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: tone.text,
                background: '#FFFFFF',
                padding: '2px 6px',
                borderRadius: 999,
                border: `1px solid ${tone.border}`,
              }}
            >
              {row.ourRank != null ? `#${row.ourRank}` : strings.labelNotRanked}
            </span>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#525252', lineHeight: 1.4 }}>
            {strings.labelCompetitors} {row.competitorCount}
            {row.medianPrice != null && (
              <> · {strings.labelMedian} {row.medianPrice.toLocaleString()}</>
            )}
            {row.ourPrice != null && (
              <> · {strings.labelOurs} {row.ourPrice.toLocaleString()}</>
            )}
          </p>
        </div>
        <span
          style={{
            flexShrink: 0,
            fontSize: 10,
            fontWeight: 700,
            color: '#737373',
            background: '#FFFFFF',
            padding: '2px 6px',
            borderRadius: 999,
            border: '1px solid #E5E5E5',
            whiteSpace: 'nowrap',
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
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          borderRadius: 10,
          background: 'var(--m-mint-bg)',
          border: '1px solid var(--m-mint-fg)',
        }}
      >
        <div
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#FFFFFF',
            border: '1px solid var(--m-mint-fg)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--m-mint-fg)',
          }}
          aria-hidden="true"
        >
          <Check size={16} strokeWidth={2.5} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--m-mint-tx)', lineHeight: 1.3 }}>
            {strings.title} — {strings.emptyOk}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--m-mint-tx)', lineHeight: 1.4 }}>
            {strings.emptyHint}
          </p>
        </div>
        <span
          style={{
            flexShrink: 0,
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--m-mint-tx)',
            background: '#FFFFFF',
            padding: '3px 8px',
            borderRadius: 999,
            border: '1px solid var(--m-mint-fg)',
            whiteSpace: 'nowrap',
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
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 10,
        background: '#FAFAFA',
        border: '1px dashed #E5E5E5',
        opacity: muted ? 0.7 : 1,
      }}
    >
      <Users size={16} strokeWidth={2.2} color="#A3A3A3" />
      <p style={{ margin: 0, fontSize: 12, color: '#737373' }}>{text}</p>
    </div>
  );
}
