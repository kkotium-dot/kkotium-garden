'use client';
// src/components/dashboard/cards/ControlTowerSummaryCard.tsx
// 권위 DASHBOARD_DECLUTTER_IA_REAUDIT_2026-07-09 §2B — condenses
// PublishControlTowerWidget + ControlTowerMatrixWidget into a dashboard summary.
// 발행 준비 신호등(green/yellow/red 카운트) + 개입 필요(risk) → /control.

import useSWR from 'swr';
import Link from 'next/link';
import { Workflow, ArrowRight, CheckCircle2, AlertTriangle, XCircle, Wrench } from 'lucide-react';

interface PublishItem {
  publishReady: boolean;
  hardComplete: boolean;
}
interface PublishResponse { ok?: boolean; items?: PublishItem[] }

interface MatrixCounts { risk?: number; attention?: number; caution?: number; ok?: number; none?: number }
interface MatrixResponse { success?: boolean; counts?: MatrixCounts }

const fetcher = <T,>(url: string): Promise<T> => fetch(url).then((r) => r.json());

export default function ControlTowerSummaryCard() {
  const { data: pub, isLoading: pubLoading } = useSWR<PublishResponse>(
    '/api/products/publish-readiness?status=DRAFT&limit=50',
    (url: string) => fetcher<PublishResponse>(url),
    { revalidateOnFocus: true },
  );
  const { data: mat, isLoading: matLoading } = useSWR<MatrixResponse>(
    '/api/products/asset-jobs-matrix',
    (url: string) => fetcher<MatrixResponse>(url),
    { refreshInterval: 60_000, revalidateOnFocus: true },
  );

  const isLoading = pubLoading || matLoading;

  const items = pub?.items ?? [];
  const greenCount = items.filter((it) => it.publishReady).length;
  const yellowCount = items.filter((it) => !it.publishReady && it.hardComplete).length;
  const redCount = items.filter((it) => !it.hardComplete).length;

  const riskCount = mat?.success ? (mat.counts?.risk ?? 0) : 0;
  const attentionCount = mat?.success ? (mat.counts?.attention ?? 0) : 0;

  const anyPending = greenCount > 0 || riskCount > 0;

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
            background: anyPending ? '#FEF0F3' : '#F5F5F5',
          }}
        >
          <Workflow size={14} strokeWidth={2.4} style={{ color: anyPending ? '#F63B28' : '#A3A3A3' }} />
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#1A1A1A', flex: 1 }}>
          관제탑
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1 }}>
        {/* Publish signal */}
        <Link href="/control" style={{ textDecoration: 'none' }}>
          <div
            style={{
              height: '100%',
              padding: '10px 12px', borderRadius: 10,
              background: greenCount > 0 ? '#F0FDF4' : '#FAFAFA',
              border: `1px solid ${greenCount > 0 ? '#86EFAC' : '#E5E5E5'}`,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#15803d', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              발행 준비
            </p>
            <div>
              <p
                style={{
                  margin: '4px 0 0', fontSize: 22, fontWeight: 900,
                  color: greenCount > 0 ? '#15803d' : '#A3A3A3', lineHeight: 1,
                }}
              >
                {isLoading ? '—' : greenCount}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 10, fontWeight: 700 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: '#15803d' }}>
                  <CheckCircle2 size={10} />{greenCount}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: '#A16207' }}>
                  <AlertTriangle size={10} />{yellowCount}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: '#C2410C' }}>
                  <XCircle size={10} />{redCount}
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Intervention */}
        <Link href="/control" style={{ textDecoration: 'none' }}>
          <div
            style={{
              height: '100%',
              padding: '10px 12px', borderRadius: 10,
              background: riskCount > 0 ? 'var(--m-coral-bg)' : '#FAFAFA',
              border: `1px solid ${riskCount > 0 ? 'var(--m-coral-fg)' : '#E5E5E5'}`,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: riskCount > 0 ? 'var(--m-coral-tx)' : '#525252', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              개입 필요
            </p>
            <div>
              <p
                style={{
                  margin: '4px 0 0', fontSize: 22, fontWeight: 900,
                  color: riskCount > 0 ? 'var(--m-coral-tx)' : '#A3A3A3', lineHeight: 1,
                }}
              >
                {isLoading ? '—' : riskCount}
              </p>
              <p
                style={{
                  margin: '2px 0 0', fontSize: 10, fontWeight: 700,
                  color: riskCount > 0 ? 'var(--m-coral-tx)' : '#737373',
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                }}
              >
                <Wrench size={10} />
                주의 {attentionCount}
              </p>
            </div>
          </div>
        </Link>
      </div>

      <Link
        href="/control"
        style={{
          marginTop: 'auto',
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 700, color: '#F63B28',
          textDecoration: 'none',
          alignSelf: 'flex-end',
        }}
      >
        관제탑 열기 <ArrowRight size={12} />
      </Link>
    </div>
  );
}
