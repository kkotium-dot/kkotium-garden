// src/components/dashboard/DataLabTrendWidget.tsx
// D-4: Naver DataLab real-time category trend chart widget
// Displays category shopping trends with sparkline mini-charts
// Option E (2026-05-03): SWR migration via useDataLabTrend(period) hook (24h cadence + period as key)

'use client';

import { useState } from 'react';
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, BarChart3, ChevronRight,
} from 'lucide-react';
import { useDataLabTrend, type DataLabTrendPoint } from '@/lib/hooks/useDashboardData';

// Mini sparkline SVG chart
function Sparkline({ data, color }: { data: DataLabTrendPoint[]; color: string }) {
  if (data.length < 2) return null;
  const vals = data.map(d => d.ratio);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const pad = 2;

  const points = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} style={{ flexShrink: 0 }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChangeIndicator({ change }: { change: number }) {
  if (Math.abs(change) < 1) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, color: '#888' }}>
      <Minus size={10} /> {'\uBCF4\uD569'}
    </span>
  );
  const isUp = change > 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      fontSize: 11, fontWeight: 600,
      color: isUp ? '#16a34a' : '#dc2626',
      background: isUp ? '#f0fdf4' : '#fef2f2',
      padding: '1px 6px', borderRadius: 8,
    }}>
      {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {isUp ? '+' : ''}{change.toFixed(1)}%
    </span>
  );
}

const PERIOD_OPTIONS = [
  { value: 7, label: '7\uC77C' },
  { value: 30, label: '30\uC77C' },
  { value: 90, label: '90\uC77C' },
];

export default function DataLabTrendWidget() {
  // Period state still owned locally — drives the SWR key inside the hook.
  const [period, setPeriod] = useState(30);

  // Option E: SWR-backed (24h refresh, period included in cache key).
  const { data, isLoading, isValidating, error, refresh } = useDataLabTrend(period);

  // Combined indicator: spinner shows on either initial load OR background revalidation.
  const showSpinner = isLoading || isValidating;

  const handlePeriodChange = (p: number) => {
    setPeriod(p);
    // SWR will auto-fetch when the key changes (period -> different URL).
  };

  return (
    <div style={{
      background: '#fff', borderRadius: 16,
      border: '1px solid #f0f0f0', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #f5f5f5',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={18} style={{ color: '#e62310' }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>{'\uCE74\uD14C\uACE0\uB9AC \uD2B8\uB80C\uB4DC'}</span>
          <span style={{ fontSize: 10, color: '#aaa' }}>DataLab</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Period selector */}
          <div style={{ display: 'flex', gap: 2, background: '#f5f5f5', borderRadius: 8, padding: 2 }}>
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handlePeriodChange(opt.value)}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none',
                  fontSize: 11, fontWeight: period === opt.value ? 700 : 400,
                  background: period === opt.value ? '#fff' : 'transparent',
                  color: period === opt.value ? '#e62310' : '#888',
                  cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: period === opt.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={refresh}
            disabled={showSpinner}
            style={{
              display: 'flex', alignItems: 'center', padding: '4px 8px',
              borderRadius: 8, border: '1px solid #e5e5e5', background: '#fff',
              cursor: showSpinner ? 'not-allowed' : 'pointer', fontSize: 11,
            }}
          >
            <RefreshCw size={12} style={{ animation: showSpinner ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '12px 16px' }}>
        {error && (
          <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: '#fef2f2', color: '#991b1b', fontSize: 12, marginBottom: 8,
          }}>
            {error}
          </div>
        )}

        {isLoading && !data && (
          <div style={{ textAlign: 'center', padding: 24, color: '#aaa', fontSize: 13 }}>
            {'\uD2B8\uB80C\uB4DC \uB370\uC774\uD130 \uBD88\uB7EC\uC624\uB294 \uC911...'}
          </div>
        )}

        {data && data.trends && (
          <>
            {/* Top rising / declining summary */}
            {(data.topRising?.length > 0 || data.topDecline?.length > 0) && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {data.topRising?.map(cat => (
                  <span key={cat} style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 8,
                    background: '#f0fdf4', color: '#166534', fontWeight: 500,
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                  }}>
                    <TrendingUp size={10} /> {cat}
                  </span>
                ))}
                {data.topDecline?.map(cat => (
                  <span key={cat} style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 8,
                    background: '#fef2f2', color: '#991b1b', fontWeight: 500,
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                  }}>
                    <TrendingDown size={10} /> {cat}
                  </span>
                ))}
              </div>
            )}

            {/* Category list with sparklines */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {data.trends.map((trend, i) => {
                const sparkColor = trend.change > 1 ? '#16a34a' : trend.change < -1 ? '#dc2626' : '#888';
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 10,
                    background: i < 3 ? '#fafafa' : '#fff',
                    border: '1px solid #f0f0f0',
                  }}>
                    {/* Rank */}
                    <span style={{
                      width: 20, height: 20, borderRadius: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                      background: i < 3 ? '#e62310' : '#e5e5e5',
                      color: i < 3 ? '#fff' : '#888',
                    }}>
                      {i + 1}
                    </span>

                    {/* Category name */}
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                      {trend.title}
                    </span>

                    {/* Sparkline */}
                    <Sparkline data={trend.data} color={sparkColor} />

                    {/* Latest ratio */}
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#555', minWidth: 32, textAlign: 'right' }}>
                      {trend.latestRatio}
                    </span>

                    {/* Change indicator */}
                    <ChangeIndicator change={trend.change} />

                    <ChevronRight size={12} style={{ color: '#ddd', flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>

            {data.cached && (
              <div style={{ fontSize: 10, color: '#ccc', textAlign: 'right', marginTop: 6 }}>
                {'\uCE90\uC2DC\uB41C \uB370\uC774\uD130'}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
