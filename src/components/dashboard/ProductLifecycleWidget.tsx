// src/components/dashboard/ProductLifecycleWidget.tsx
// E-3: Product lifecycle dashboard widget
// Shows lifecycle stage distribution + zombie risk + per-product detail

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity, AlertTriangle, TrendingUp, TrendingDown,
  Skull, Sprout, Star, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';

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
  NEW:       { label: 'New',       color: '#2563eb', bg: '#dbeafe', icon: Sprout },
  GROWING:   { label: 'Growing',   color: '#16a34a', bg: '#dcfce7', icon: TrendingUp },
  PEAK:      { label: 'Peak',      color: '#9333ea', bg: '#f3e8ff', icon: Star },
  DECLINING: { label: 'Declining', color: '#b45309', bg: '#fef3c7', icon: TrendingDown },
  ZOMBIE:    { label: 'Zombie',    color: '#b91c1c', bg: '#fee2e2', icon: Skull },
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
  const [data, setData] = useState<LifecycleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/product-lifecycle');
      const json = await res.json();
      if (json.ok) setData(json);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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
          <span style={{ fontWeight: 700, fontSize: 15 }}>product lifecycle</span>
          {total > 0 && <span style={{ fontSize: 11, color: '#9ca3af' }}>{total} products</span>}
        </div>
        <button onClick={fetchData} disabled={loading} style={{
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
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>avg zombie risk</span>
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
        {expanded ? 'collapse' : `show all ${total} products`}
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
                  <span>{p.ageDays}d old</span>
                  <span>{p.salesCount} sold</span>
                  {p.daysSinceLastSale !== null && <span>last sale {p.daysSinceLastSale}d ago</span>}
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
      {loading && !data && <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 13 }}>loading...</div>}
      {!loading && total === 0 && <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 13 }}>no products found</div>}
    </div>
  );
}
