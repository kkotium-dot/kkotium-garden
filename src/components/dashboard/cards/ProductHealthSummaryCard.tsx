'use client';
// src/components/dashboard/cards/ProductHealthSummaryCard.tsx
// 권위 DASHBOARD_DECLUTTER_IA_REAUDIT_2026-07-09 §2C — merges HealthCombinedCard +
// LowStockAlertWidget + ProfitabilityWidget into a single dashboard summary card.
// 재고 경보 + 평균 마진 + 굿서비스 등급을 축약 표시하고, 자세한 뷰는 각 링크로.
// One primary drill-down link per card (§3 "요약 수치 1~2 + 액션 1").

import Link from 'next/link';
import { Heart, ArrowRight, AlertOctagon } from 'lucide-react';
import { useLowStockAlerts } from '@/lib/hooks/useLowStockAlerts';
import { useProfitability, useGoodService } from '@/lib/hooks/useDashboardData';

export default function ProductHealthSummaryCard() {
  const { alerts, isLoading: alertsLoading } = useLowStockAlerts();
  const { data: profit, isLoading: profitLoading } = useProfitability();
  const good = useGoodService();

  const isLoading = alertsLoading || profitLoading || good.isLoading;

  const alertCount = alerts.length;
  const redCount = alerts.filter((a) => a.level === 'red').length;
  const avgMargin = profit?.summary.avgMarginNormal ?? null;
  const dangerCount = profit?.distribution.danger ?? 0;
  const grade = good.data?.score.grade ?? null;
  const gradeColor = good.data?.score.gradeColor ?? '#A3A3A3';

  // Overall tone — red when any red-level stock alert or 적자 상품 exists.
  const critical = redCount > 0 || dangerCount > 0;

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
            background: critical ? 'var(--m-coral-bg)' : '#F0FDF4',
          }}
        >
          <Heart size={14} strokeWidth={2.4} style={{ color: critical ? 'var(--m-coral-fg)' : '#16a34a' }} />
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#1A1A1A', flex: 1 }}>
          상품 건강
        </p>
        {critical && (
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 10, fontWeight: 800, color: 'var(--m-coral-tx)',
              background: 'var(--m-coral-bg)', border: '1px solid var(--m-coral-fg)',
              borderRadius: 99, padding: '2px 7px',
            }}
          >
            <AlertOctagon size={10} /> 주의
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1 }}>
        {/* Stock alerts */}
        <div
          style={{
            padding: '10px 12px', borderRadius: 10,
            background: alertCount > 0 ? 'var(--m-coral-bg)' : '#F0FDF4',
            border: `1px solid ${alertCount > 0 ? 'var(--m-coral-fg)' : '#BBF7D0'}`,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}
        >
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: alertCount > 0 ? 'var(--m-coral-tx)' : '#15803d', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            재고 경보
          </p>
          <div>
            <p
              style={{
                margin: '4px 0 0', fontSize: 22, fontWeight: 900,
                color: alertCount > 0 ? 'var(--m-coral-tx)' : '#16a34a', lineHeight: 1,
              }}
            >
              {isLoading ? '—' : alertCount}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: alertCount > 0 ? 'var(--m-coral-tx)' : '#16a34a', fontWeight: 700 }}>
              {redCount > 0 ? `치명 ${redCount}건` : '이상 없음'}
            </p>
          </div>
        </div>

        {/* Margin health */}
        <div
          style={{
            padding: '10px 12px', borderRadius: 10,
            background: dangerCount > 0 ? 'var(--m-orange-bg)' : '#EFF6FF',
            border: `1px solid ${dangerCount > 0 ? 'var(--m-orange-fg)' : '#BFDBFE'}`,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}
        >
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: dangerCount > 0 ? 'var(--m-orange-tx)' : '#1d4ed8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            평균 마진
          </p>
          <div>
            <p
              style={{
                margin: '4px 0 0', fontSize: 22, fontWeight: 900,
                color: dangerCount > 0 ? 'var(--m-orange-tx)' : '#2563eb', lineHeight: 1,
              }}
            >
              {isLoading || avgMargin === null ? '—' : `${avgMargin}%`}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: dangerCount > 0 ? 'var(--m-orange-tx)' : '#2563eb', fontWeight: 700 }}>
              {dangerCount > 0 ? `적자 ${dangerCount}건` : '정상'}
            </p>
          </div>
        </div>
      </div>

      {/* Good service grade (small chip) + drill-down */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 800, color: gradeColor,
            background: '#FAFAFA', border: `1px solid ${gradeColor}30`,
            borderRadius: 99, padding: '3px 10px',
          }}
        >
          굿서비스 <strong style={{ color: gradeColor }}>{grade ?? '—'}</strong>
        </span>
        <Link
          href="/products"
          style={{
            marginLeft: 'auto',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 700, color: '#F63B28',
            textDecoration: 'none',
          }}
        >
          자세히 <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
