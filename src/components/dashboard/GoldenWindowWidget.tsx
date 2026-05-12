// src/components/dashboard/GoldenWindowWidget.tsx
// ============================================================================
// Sprint 7 P0-B (Session E-2 Sprint 7): compact Inbox row group for the
// 7-day registration golden window. Replaces Inbox 3rd placeholder.
//
// Data: /api/golden-window/active — evaluates each active product against
// D+1 / D+3 / D+7 milestones. Cold start (0 active products) shows green
// "추적 대기 중" row.
// ============================================================================

'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Sparkles, Check, AlertTriangle, Clock } from 'lucide-react';
import strings from './GoldenWindowWidget.strings.ko.json';
import type { GoldenWindowRow } from '@/lib/golden-window-tracker';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const MAX_VISIBLE = 5;

interface ApiResponse {
  data: GoldenWindowRow[];
}

export default function GoldenWindowWidget() {
  const { data, error, isLoading } = useSWR<ApiResponse>(
    '/api/golden-window/active',
    fetcher,
    { refreshInterval: 5 * 60_000, revalidateOnFocus: true },
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
        <GoldenRow key={row.productId} row={row} />
      ))}
      {hidden > 0 && (
        <Link
          href="/products"
          style={{
            textDecoration: 'none', display: 'block', textAlign: 'center',
            fontSize: 11, fontWeight: 700, color: '#737373',
            padding: '6px 10px', background: '#FAFAFA',
            border: '1px dashed #E5E5E5', borderRadius: 8,
          }}
        >
          +{hidden}{strings.more}
        </Link>
      )}
    </div>
  );
}

function GoldenRow({ row }: { row: GoldenWindowRow }) {
  // Sprint 7 P0-B enhancement: tone driven by severity (which blends stage status
  // with market context). critical = red, warning = orange, note = gray, ok = green.
  const tone = row.severity === 'critical'
    ? { bg: '#FEF2F2', border: '#FCA5A5', accent: '#DC2626', text: '#991B1B' }
    : row.severity === 'warning'
      ? { bg: '#FFF7ED', border: '#FED7AA', accent: '#EA580C', text: '#9A3412' }
      : row.severity === 'note'
        ? { bg: '#FAFAFA', border: '#E5E5E5', accent: '#737373', text: '#525252' }
        : row.stage === 'expired'
          ? { bg: '#FAFAFA', border: '#E5E5E5', accent: '#737373', text: '#525252' }
          : { bg: '#F0FDF4', border: '#BBF7D0', accent: '#16A34A', text: '#15803D' };

  const Icon =
    row.severity === 'critical' ? AlertTriangle :
    row.severity === 'warning'  ? AlertTriangle :
    row.stage === 'expired'     ? Clock :
                                   Check;
  const stageLabel = strings.stageLabel[row.stage];
  const marketLabel = strings.marketLabel[row.marketLevel];
  const productLabel = row.productName.length > 26
    ? `${row.productName.slice(0, 26)}…`
    : row.productName;

  const href = row.productId ? `/products/new?edit=${row.productId}` : '/products';

  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }} title={row.message}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 10,
          background: tone.bg, border: `1px solid ${tone.border}`,
        }}
      >
        <div
          style={{
            flexShrink: 0, width: 28, height: 28, borderRadius: 7,
            background: '#FFFFFF', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            color: tone.accent, border: `1px solid ${tone.border}`,
          }}
          aria-hidden="true"
        >
          <Icon size={14} strokeWidth={2.5} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: tone.text }}>
              {productLabel}
            </span>
            <span
              style={{
                fontSize: 10, fontWeight: 700, color: tone.text,
                background: '#FFFFFF', padding: '2px 6px',
                borderRadius: 999, border: `1px solid ${tone.border}`,
              }}
            >
              {stageLabel}
            </span>
            <span
              style={{
                fontSize: 10, fontWeight: 600, color: '#525252',
                background: '#F5F5F5', padding: '2px 6px',
                borderRadius: 999, border: '1px solid #E5E5E5',
              }}
              title={`DataLab 카테고리 트렌드 ${row.marketTrendScore}`}
            >
              {marketLabel}
            </span>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#525252', lineHeight: 1.4 }}>
            {row.message}
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
      <Sparkles size={16} strokeWidth={2.2} color="#A3A3A3" />
      <p style={{ margin: 0, fontSize: 12, color: '#737373' }}>{text}</p>
    </div>
  );
}
