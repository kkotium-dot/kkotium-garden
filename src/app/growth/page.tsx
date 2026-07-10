'use client';
// src/app/growth/page.tsx
// Growth · sourcing dedicated page (권위 DASHBOARD_DECLUTTER_IA_REAUDIT_2026-07-09 §2).
// Houses the 5 growth widgets moved off the dashboard so the command center stays lean.
// Phase 2c 소싱성장군 hue 통일은 각 위젯 자체에서 이미 적용됨 — 이동만으로 유지.

import { useMemo, useCallback } from 'react';
import { Sprout, RefreshCw } from 'lucide-react';
import SourcingRecommendWidget from '@/components/dashboard/SourcingRecommendWidget';
import SupplierGardenWidget from '@/components/dashboard/SupplierGardenWidget';
import ReviewGrowthWidget from '@/components/dashboard/ReviewGrowthWidget';
import ProductLifecycleWidget from '@/components/dashboard/ProductLifecycleWidget';
import UploadReadinessWidget from '@/components/dashboard/UploadReadinessWidget';
import { useProductsList } from '@/lib/hooks/useDashboardData';
import { normalizeProducts, type DashboardProduct } from '@/lib/dashboard-product';

export default function GrowthPage() {
  const { rawProducts, isLoading: productsLoading, refresh: refreshProducts } = useProductsList({ limit: 200 });

  const products: DashboardProduct[] = useMemo(
    () => (rawProducts ? normalizeProducts(rawProducts as unknown[]) : []),
    [rawProducts],
  );

  const handleRefresh = useCallback(() => {
    refreshProducts();
  }, [refreshProducts]);

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', padding: '24px', paddingBottom: 56 }} className="space-y-4">
      {/* Page header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: '#F0FDF4' }}>
              <Sprout size={22} strokeWidth={2.2} style={{ color: '#16a34a' }} />
            </div>
            <div>
              <h1 className="kk-pop-title" style={{ fontSize: 24, fontWeight: 400, color: '#1A1A1A', margin: 0 }}>
                성장 · 소싱
              </h1>
              <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
                소싱 추천 · 공급사 정원 · 리뷰 성장 · 라이프사이클 · 등록 준비
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={productsLoading}
            style={{ padding: 6, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#B0A0A8', opacity: productsLoading ? 0.4 : 1 }}
            aria-label="새로고침"
          >
            <RefreshCw size={14} className={productsLoading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div style={{ height: 2.5, background: '#BBF7D0', borderRadius: 99, margin: '10px 0 6px' }} />
      </div>

      {/* Upload readiness (등록 준비) — hero-position: highest actionable value */}
      <UploadReadinessWidget products={products} productsLoading={productsLoading} onRefresh={handleRefresh} />

      {/* Growth widgets grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        <SourcingRecommendWidget />
        <SupplierGardenWidget />
        <ReviewGrowthWidget />
        <ProductLifecycleWidget />
      </div>
    </div>
  );
}
