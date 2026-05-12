// src/components/dashboard/PriceMovementWidget.tsx
// ============================================================================
// Sprint 6-B (Session E-2 Phase 3): compact Inbox row group for supplier-side
// price movement alerts. Mounts inside dashboard Section 2 (Inbox) and replaces
// the prior InboxPlaceholderRow for "가격 변동 감지".
//
// Data: /api/alerts/price-movements (unresolved only, sorted by level+time).
// Empty state: renders a single "이상 없음" row (still visible so Inbox layout
// stays consistent and registry-driven IA principle holds).
//
// Korean strings live in PriceMovementWidget.strings.ko.json (principle #35).
// ============================================================================

'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { CircleDollarSign, TrendingUp, TrendingDown, Check } from 'lucide-react';
import strings from './PriceMovementWidget.strings.ko.json';
import type { PriceMovementAlertRow } from '@/app/api/alerts/price-movements/route';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const MAX_VISIBLE = 5;

interface ApiResponse {
  data: PriceMovementAlertRow[];
}

const LEVEL_TONE: Record<
  PriceMovementAlertRow['level'],
  { bg: string; border: string; iconColor: string; text: string }
> = {
  red:    { bg: '#FEF2F2', border: '#FCA5A5', iconColor: '#DC2626', text: '#991B1B' },
  orange: { bg: '#FFF7ED', border: '#FED7AA', iconColor: '#EA580C', text: '#9A3412' },
  yellow: { bg: '#FEFCE8', border: '#FEF08A', iconColor: '#CA8A04', text: '#854D0E' },
};

const LEVEL_LABEL: Record<PriceMovementAlertRow['level'], string> = {
  red: strings.levelRed,
  orange: strings.levelOrange,
  yellow: strings.levelYellow,
};

export default function PriceMovementWidget() {
  const { data, error, isLoading } = useSWR<ApiResponse>(
    '/api/alerts/price-movements',
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true },
  );

  const rows = data?.data ?? [];
  const visible = rows.slice(0, MAX_VISIBLE);
  const hidden = Math.max(0, rows.length - MAX_VISIBLE);

  if (isLoading) {
    return <StateRow text={strings.loading} muted />;
  }

  if (error) {
    return <StateRow text={strings.error} muted />;
  }

  if (rows.length === 0) {
    return <EmptyRow />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {visible.map((alert) => (
        <AlertRow key={alert.id} alert={alert} />
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
          +{hidden}
          {strings.more}
        </Link>
      )}
    </div>
  );
}

function AlertRow({ alert }: { alert: PriceMovementAlertRow }) {
  const tone = LEVEL_TONE[alert.level];
  const isUp = alert.direction === 'up';
  const DirIcon = isUp ? TrendingUp : TrendingDown;
  const deltaText = `${isUp ? '+' : ''}${(alert.deltaPct * 100).toFixed(1)}%`;
  const productHref = alert.product.id ? `/products/new?edit=${alert.product.id}` : '/automation';
  const productLabel = alert.product.name.length > 28
    ? `${alert.product.name.slice(0, 28)}…`
    : alert.product.name;

  return (
    <Link
      href={productHref}
      style={{
        textDecoration: 'none',
        display: 'block',
      }}
      title={`${alert.product.name} — ${strings.baselineLabel} ${alert.baselinePrice.toLocaleString()} → ${strings.currentLabel} ${alert.currentPrice.toLocaleString()}`}
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
          transition: 'transform 0.15s ease',
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
            color: tone.iconColor,
            border: `1px solid ${tone.border}`,
          }}
          aria-hidden="true"
        >
          <DirIcon size={14} strokeWidth={2.5} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: tone.text }}>
              {deltaText}
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
              {LEVEL_LABEL[alert.level]}
            </span>
            <span style={{ fontSize: 11, color: '#525252', fontWeight: 600 }}>
              {isUp ? strings.directionUp : strings.directionDown}
            </span>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#525252', lineHeight: 1.4 }}>
            {productLabel}
            {alert.product.supplierName ? ` · ${alert.product.supplierName}` : ''}
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
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          transition: 'background 0.15s ease',
        }}
      >
        <div
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#FFFFFF',
            border: '1px solid #BBF7D0',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#16A34A',
          }}
          aria-hidden="true"
        >
          <Check size={16} strokeWidth={2.5} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              color: '#15803D',
              lineHeight: 1.3,
            }}
          >
            {strings.title} — {strings.emptyOk}
          </p>
          <p
            style={{
              margin: '2px 0 0',
              fontSize: 11,
              color: '#16A34A',
              lineHeight: 1.4,
            }}
          >
            {strings.subtitleEmpty}
          </p>
        </div>
        <span
          style={{
            flexShrink: 0,
            fontSize: 10,
            fontWeight: 700,
            color: '#15803D',
            background: '#FFFFFF',
            padding: '3px 8px',
            borderRadius: 999,
            border: '1px solid #BBF7D0',
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
      <CircleDollarSign size={16} strokeWidth={2.2} color="#A3A3A3" />
      <p style={{ margin: 0, fontSize: 12, color: '#737373' }}>{text}</p>
    </div>
  );
}
