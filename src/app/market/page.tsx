'use client';
// src/app/market/page.tsx
// Market analysis dedicated page (권위 DASHBOARD_DECLUTTER_IA_REAUDIT_2026-07-09 §2).
// Hosts the 6 analysis widgets moved off the dashboard so the command center stays
// focused on 지휘소 essentials (오늘 할 일 + KPI + 요약 3열 + 접힘).

import { useMemo } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import CompetitionMonitorWidget from '@/components/dashboard/CompetitionMonitorWidget';
import CompetitorRadarWidget from '@/components/dashboard/CompetitorRadarWidget';
import MarketTrendWidget from '@/components/dashboard/MarketTrendWidget';
import PriceMovementWidget from '@/components/dashboard/PriceMovementWidget';
import DataLabTrendWidget from '@/components/dashboard/DataLabTrendWidget';
import GoldenWindowWidget from '@/components/dashboard/GoldenWindowWidget';
import { useProductsList } from '@/lib/hooks/useDashboardData';
import { normalizeProducts, type DashboardProduct } from '@/lib/dashboard-product';

export default function MarketPage() {
  const { rawProducts, isLoading: productsLoading, refresh } = useProductsList({ limit: 200 });

  const products: DashboardProduct[] = useMemo(
    () => (rawProducts ? normalizeProducts(rawProducts as unknown[]) : []),
    [rawProducts],
  );

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', padding: '24px', paddingBottom: 56 }} className="space-y-4">
      {/* Page header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: '#EFF6FF' }}>
              <BarChart3 size={22} strokeWidth={2.2} style={{ color: '#2563eb' }} />
            </div>
            <div>
              <h1 className="kk-pop-title" style={{ fontSize: 24, fontWeight: 400, color: '#1A1A1A', margin: 0 }}>
                시장 분석
              </h1>
              <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
                경쟁·트렌드·데이터랩·가격 이동·골든 윈도우
              </p>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={productsLoading}
            style={{ padding: 6, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#B0A0A8', opacity: productsLoading ? 0.4 : 1 }}
            aria-label="새로고침"
          >
            <RefreshCw size={14} className={productsLoading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div style={{ height: 2.5, background: '#BFDBFE', borderRadius: 99, margin: '10px 0 6px' }} />
      </div>

      {/* Grid — 2 columns on wide screens for scan density; stacks on narrow. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        <MarketTrendWidget products={products} productsLoading={productsLoading} />
        <DataLabTrendWidget />
        <CompetitionMonitorWidget />
        <CompetitorRadarWidget />
        <PriceMovementWidget />
        <GoldenWindowWidget />
      </div>
    </div>
  );
}
