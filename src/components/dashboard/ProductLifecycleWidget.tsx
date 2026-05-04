// src/components/dashboard/ProductLifecycleWidget.tsx
// E-3: Product lifecycle dashboard widget
// Shows lifecycle stage distribution + zombie risk + per-product detail

'use client';

import { useState } from 'react';
import {
  Activity, AlertTriangle, TrendingUp, TrendingDown,
  Skull, Sprout, Star, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import { useProductLifecycle } from '@/lib/hooks/useDashboardData';

interface ProductLifecycle {
  id: string;
  name: string;
  sku: string;
  status: string;
  ageDays: number;
  salesCount: number;
  daysSinceLastSale: number | null;
  salesVelocity: number;
  honeyScore: number;
  stage: string;
  zombieRisk: number;
  suggestion: string;
}

interface LifecycleResult {
  ok: boolean;
  total: number;
  stageCounts: Record<string, number>;
  avgZombieRisk: number;
  products: ProductLifecycle[];
}

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  NEW:       { label: '신상품',    color: '#2563eb', bg: '#dbeafe', icon: Sprout },
  GROWING:   { label: '성장중',    color: '#16a34a', bg: '#dcfce7', icon: TrendingUp },
  PEAK:      { label: '최고실적',  color: '#9333ea', bg: '#f3e8ff', icon: Star },
  DECLINING: { label: '하락세',    color: '#b45309', bg: '#fef3c7', icon: TrendingDown },
  ZOMBIE:    { label: '좀비',      color: '#b91c1c', bg: '#fee2e2', icon: Skull },
};

function ZombieRiskBar({ risk }: { risk: number }) {
  const color = risk >= 70 ? '#ef4444' : risk >= 40 ? '#f59e0b' : '#22c55e';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${risk}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, minWidth: 28, textAlign: 'right' }}>{risk}%</span>
    </div>
  );
}

export default function ProductLifecycleWidget() {
  // Workflow Redesign Part A2 (2026-05-04): SWR migration.
  // 60s cadence matches Sidebar / Profitability / DRAFT readiness so the
  // dashboard's freshness floor stays uniform.
  const { data: rawData, isLoading: loading, refresh } =
    useProductLifecycle<{ ok?: boolean } & LifecycleResult>();

  // Surface only successful payloads to the existing rendering path.
  // Anything else is treated as "no data yet" (matches previous fetchData
  // behavior which silently skipped on json.ok === false).
  const data: LifecycleResult | null =
    rawData && rawData.ok ? rawData : null;

  const [expanded, setExpanded] = useState(false);

  const stages = data?.stageCounts ?? {};
  const total = data?.total ?? 0;

  // Sort: zombies first, then by risk desc
  const sortedProducts = [...(data?.products ?? [])].sort((a, b) => {
    const stageOrder: Record<string, number> = { ZOMBIE: 0, DECLINING: 1, NEW: 2, GROWING: 3, PEAK: 4 };
    const aDiff = (stageOrder[a.stage] ?? 5);
    const bDiff = (stageOrder[b.stage] ?? 5);
    if (aDiff !== bDiff) return aDiff - bDiff;
    return b.zombieRisk - a.zombieRisk;
  });

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={18} style={{ color: '#e62310' }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>상품 수명 주기</span>
          {total > 0 && <span style={{ fontSize: 11, color: '#9ca3af' }}>{total}개 상품</span>}
        </div>
        <button onClick={refresh} disabled={loading} style={{
          padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6,
          background: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 11,
        }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stage distribution bar */}
      {total > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
            {(['NEW', 'GROWING', 'PEAK', 'DECLINING', 'ZOMBIE'] as const).map(stage => {
              const count = stages[stage] ?? 0;
              if (count === 0) return null;
              const cfg = STAGE_CONFIG[stage];
              const pct = (count / total) * 100;
              return (
                <div key={stage} style={{
                  width: `${pct}%`, background: cfg.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', minWidth: pct > 8 ? 0 : 24,
                  borderRight: '1px solid #fff',
                }} title={`${cfg.label}: ${count}`}>
                  {pct > 12 && <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color }}>{count}</span>}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {(['NEW', 'GROWING', 'PEAK', 'DECLINING', 'ZOMBIE'] as const).map(stage => {
              const count = stages[stage] ?? 0;
              const cfg = STAGE_CONFIG[stage];
              const Icon = cfg.icon;
              return (
                <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <Icon size={12} style={{ color: cfg.color }} />
                  <span style={{ color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                  <span style={{ color: '#9ca3af' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Average zombie risk */}
      {data && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <AlertTriangle size={12} style={{ color: data.avgZombieRisk >= 50 ? '#ef4444' : '#f59e0b' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>평균 좀비 위험도</span>
          </div>
          <ZombieRiskBar risk={data.avgZombieRisk} />
        </div>
      )}

      {/* Product list toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, width: '100%',
          padding: '8px 0', border: 'none', background: 'transparent',
          cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#6b7280',
        }}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? '접기' : `전체 ${total}개 상품 보기`}
      </button>

      {/* Expanded product list */}
      {expanded && sortedProducts.map(p => {
        const cfg = STAGE_CONFIG[p.stage] ?? STAGE_CONFIG.GROWING;
        const Icon = cfg.icon;
        return (
          <div key={p.id} style={{
            padding: '10px 12px', borderBottom: '1px solid #f3f4f6',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{p.name}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: '#9ca3af' }}>
                  <span>{p.sku}</span>
                  <span>{p.ageDays}일차</span>
                  <span>{p.salesCount}건 판매</span>
                  {p.daysSinceLastSale !== null && <span>마지막 판매 {p.daysSinceLastSale}일 전</span>}
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 6, background: cfg.bg,
              }}>
                <Icon size={12} style={{ color: cfg.color }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
              </div>
            </div>
            <ZombieRiskBar risk={p.zombieRisk} />
            {p.suggestion && (
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, lineHeight: 1.4 }}>
                {p.suggestion}
              </div>
            )}
          </div>
        );
      })}

      {/* Loading / empty state */}
      {loading && !data && <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 13 }}>로딩 중...</div>}
      {!loading && total === 0 && <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 13 }}>상품이 없습니다</div>}
    </div>
  );
}
