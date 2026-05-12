// src/components/dashboard/SupplierGardenWidget.tsx
// ============================================================================
// Sprint 6-C.2 (Session E-2 Phase 4): per-supplier trust score grid.
// Mounts in dashboard Section 4 (잠재력).
//
// Data: /api/suppliers/scores — pure compute from existing data (no new tables).
// Shows top suppliers sorted by composite score (best first).
// Each card: tier color band + composite + 3 sub-metrics.
// ============================================================================

'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Sprout, AlertTriangle, BarChart3 } from 'lucide-react';
import strings from './SupplierGardenWidget.strings.ko.json';
import type { SupplierScore } from '@/lib/supplier-score-aggregator';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const MAX_VISIBLE = 6;

interface ApiResponse {
  data: SupplierScore[];
}

const TIER_TONE = {
  green:  { bg: '#F0FDF4', border: '#BBF7D0', accent: '#16A34A', text: '#15803D' },
  yellow: { bg: '#FEFCE8', border: '#FEF08A', accent: '#CA8A04', text: '#854D0E' },
  red:    { bg: '#FEF2F2', border: '#FCA5A5', accent: '#DC2626', text: '#991B1B' },
} as const;

export default function SupplierGardenWidget() {
  const { data, error, isLoading } = useSWR<ApiResponse>(
    '/api/suppliers/scores',
    fetcher,
    { refreshInterval: 5 * 60_000, revalidateOnFocus: true },
  );

  const rows = data?.data ?? [];

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5E5E5',
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#F5F5F5',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#16A34A',
          }}
          aria-hidden="true"
        >
          <Sprout size={16} strokeWidth={2.3} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#171717', lineHeight: 1.3 }}>
            {strings.title}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#737373', lineHeight: 1.4 }}>
            {strings.subtitle}
          </p>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#737373',
            background: '#F5F5F5',
            padding: '3px 8px',
            borderRadius: 999,
            border: '1px solid #E5E5E5',
            whiteSpace: 'nowrap',
          }}
        >
          {strings.sprintLabel}
        </span>
      </div>

      {isLoading && <PlainRow text={strings.loading} />}
      {error && <PlainRow text={strings.error} />}
      {!isLoading && !error && rows.length === 0 && <EmptyState />}
      {!isLoading && !error && rows.length > 0 && <Grid rows={rows.slice(0, MAX_VISIBLE)} />}
      {!isLoading && !error && rows.length > MAX_VISIBLE && (
        <Link
          href="/settings/suppliers"
          style={{
            display: 'block',
            marginTop: 8,
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: '#737373',
            textDecoration: 'none',
            padding: '8px 10px',
            background: '#FAFAFA',
            border: '1px dashed #E5E5E5',
            borderRadius: 8,
          }}
        >
          +{rows.length - MAX_VISIBLE} {strings.more}
        </Link>
      )}
    </div>
  );
}

function Grid({ rows }: { rows: SupplierScore[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 10,
      }}
    >
      {rows.map((row) => (
        <SupplierCard key={row.supplierId} row={row} />
      ))}
    </div>
  );
}

function SupplierCard({ row }: { row: SupplierScore }) {
  const tone = TIER_TONE[row.tier];
  return (
    <Link
      href={`/settings/suppliers?focus=${encodeURIComponent(row.supplierId)}`}
      style={{ textDecoration: 'none', display: 'block' }}
      title={`${row.supplierName} · ${strings.tier[row.tier]}`}
    >
      <div
        style={{
          padding: 12,
          borderRadius: 10,
          background: tone.bg,
          border: `1px solid ${tone.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 800,
                color: tone.text,
                lineHeight: 1.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.supplierName}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: tone.text, lineHeight: 1.4 }}>
              {strings.labelProducts} {row.productCount} · {strings.labelActive} {row.activeProductCount}
            </p>
          </div>
          <div
            style={{
              flexShrink: 0,
              minWidth: 44,
              height: 44,
              padding: '0 6px',
              borderRadius: 10,
              background: '#FFFFFF',
              border: `1px solid ${tone.border}`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: tone.accent,
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            {row.composite}
          </div>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <Metric label={strings.metric.trust} value={row.trustScore} tone={tone} />
          <Metric label={strings.metric.depletion} value={row.depletionScore} tone={tone} />
          <Metric label={strings.metric.priceStability} value={row.priceStability} tone={tone} />
        </div>
        {(row.untrustworthyCount > 0 || row.recentPriceAlerts > 0) && (
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              fontSize: 10,
              color: tone.text,
            }}
          >
            <AlertTriangle size={12} strokeWidth={2.3} />
            {row.untrustworthyCount > 0 && (
              <span>{strings.labelUntrustworthy} {row.untrustworthyCount}</span>
            )}
            {row.recentPriceAlerts > 0 && (
              <span>· {strings.labelRecentAlerts} {row.recentPriceAlerts}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: typeof TIER_TONE[keyof typeof TIER_TONE];
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: '6px 8px',
        background: '#FFFFFF',
        borderRadius: 7,
        border: `1px solid ${tone.border}`,
      }}
    >
      <p style={{ margin: 0, fontSize: 9, color: '#737373', lineHeight: 1.2 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: tone.text, lineHeight: 1.2 }}>
        {value}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 12px',
        borderRadius: 10,
        background: '#FAFAFA',
        border: '1px dashed #E5E5E5',
      }}
    >
      <BarChart3 size={20} strokeWidth={2.2} color="#A3A3A3" />
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#525252', lineHeight: 1.3 }}>
          {strings.emptyTitle}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#A3A3A3', lineHeight: 1.4 }}>
          {strings.emptyHint}
        </p>
      </div>
    </div>
  );
}

function PlainRow({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 10,
        background: '#FAFAFA',
        border: '1px dashed #E5E5E5',
      }}
    >
      <p style={{ margin: 0, fontSize: 12, color: '#737373' }}>{text}</p>
    </div>
  );
}
