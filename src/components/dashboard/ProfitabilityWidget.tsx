// src/components/dashboard/ProfitabilityWidget.tsx
// C-4: Profitability analysis dashboard widget
// Fee comparison (normal vs marketing link) + margin distribution + top/bottom products

'use client';

import { useEffect, useState, useCallback } from 'react';
import { DollarSign, TrendingUp, TrendingDown, BarChart3, RefreshCw, ChevronRight, Link2 } from 'lucide-react';

interface ProfitData {
  summary: {
    totalProducts: number;
    activeCount: number;
    avgMarginNormal: number;
    totalFeeNormal: number;
    totalFeeMarketing: number;
    totalFeeSaved: number;
    totalProfitNormal: number;
    totalProfitMarketing: number;
    monthlySimulation: {
      normal: number;
      marketing: number;
      difference: number;
    };
  };
  distribution: {
    excellent: number;
    good: number;
    normal: number;
    low: number;
    danger: number;
  };
  top5: Array<{ id: string; name: string; sku: string; profitNormal: number; marginNormal: number }>;
  bottom5: Array<{ id: string; name: string; sku: string; profitNormal: number; marginNormal: number }>;
  feeComparison: {
    normalRate: number;
    marketingRate: number;
    savedRate: number;
  };
}

// Compact bar for margin distribution
function DistributionBar({ distribution, total }: {
  distribution: ProfitData['distribution']; total: number;
}) {
  if (total === 0) return null;
  const segments = [
    { key: 'excellent', count: distribution.excellent, color: '#16a34a', label: '50%+' },
    { key: 'good', count: distribution.good, color: '#2563eb', label: '30~50%' },
    { key: 'normal', count: distribution.normal, color: '#eab308', label: '15~30%' },
    { key: 'low', count: distribution.low, color: '#f97316', label: '0~15%' },
    { key: 'danger', count: distribution.danger, color: '#e62310', label: '적자' },
  ].filter(s => s.count > 0);

  return (
    <div>
      <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', gap: 1 }}>
        {segments.map(s => (
          <div key={s.key} style={{
            flex: s.count / total,
            background: s.color,
            borderRadius: 2,
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
        {segments.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
            <span style={{ fontSize: 10, color: '#6B7280' }}>
              {s.label} {s.count}개
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfitabilityWidget() {
  const [data, setData] = useState<ProfitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profitability');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error('[Profitability] load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="kk-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DollarSign size={14} style={{ color: '#B0A0A8' }} />
          <span style={{ fontSize: 14, fontWeight: 800, color: '#B0A0A8' }}>
            수익성 분석 불러오는 중...
          </span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, distribution, top5, bottom5, feeComparison } = data;
  const fmt = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(1)}만` : n.toLocaleString();
  const marginColor = summary.avgMarginNormal >= 30 ? '#16a34a' : summary.avgMarginNormal >= 15 ? '#eab308' : '#e62310';

  return (
    <div className="kk-card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px 12px',
        borderBottom: '1px solid #F8DCE5',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DollarSign size={14} style={{ color: '#e62310' }} />
          <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
            수익성 분석
          </p>
          <span style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 99,
            background: '#FEF0F3', color: '#e62310', fontWeight: 700,
          }}>
            {summary.totalProducts}개 상품
          </span>
        </div>
        <button onClick={loadData} disabled={loading} style={{
          padding: 4, borderRadius: 6, background: 'transparent', border: 'none',
          cursor: 'pointer', color: '#B0A0A8',
        }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Key metrics row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div style={{
            textAlign: 'center', padding: '10px 8px', borderRadius: 12,
            background: marginColor + '10', border: `1px solid ${marginColor}30`,
          }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: marginColor, margin: '0 0 2px', lineHeight: 1 }}>
              {summary.avgMarginNormal}%
            </p>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', margin: 0 }}>
              평균 순마진율
            </p>
          </div>
          <div style={{
            textAlign: 'center', padding: '10px 8px', borderRadius: 12,
            background: '#F0FDF4', border: '1px solid #BBF7D0',
          }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: '#16a34a', margin: '0 0 2px', lineHeight: 1 }}>
              {fmt(summary.totalProfitNormal)}원
            </p>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', margin: 0 }}>
              건당 총이익
            </p>
          </div>
          <div style={{
            textAlign: 'center', padding: '10px 8px', borderRadius: 12,
            background: '#EFF6FF', border: '1px solid #BFDBFE',
          }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: '#2563eb', margin: '0 0 2px', lineHeight: 1 }}>
              {fmt(summary.totalFeeNormal)}원
            </p>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', margin: 0 }}>
              건당 수수료
            </p>
          </div>
        </div>

        {/* Fee comparison card */}
        <div style={{
          padding: '12px 14px', borderRadius: 10,
          background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Link2 size={12} style={{ color: '#B45309' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#92400E' }}>
              마케팅 링크 수수료 절감 효과
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 10, color: '#92400E', margin: '0 0 2px' }}>일반 노출</p>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#B45309', margin: 0 }}>
                {feeComparison.normalRate.toFixed(2)}%
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <ChevronRight size={16} style={{ color: '#F59E0B' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 10, color: '#15803D', margin: '0 0 2px' }}>마케팅 링크</p>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#16a34a', margin: 0 }}>
                {feeComparison.marketingRate.toFixed(2)}%
              </p>
            </div>
          </div>
          <p style={{ fontSize: 10, color: '#92400E', margin: '8px 0 0', textAlign: 'center' }}>
            마케팅 링크 유입 시 건당 {fmt(summary.totalFeeSaved)}원 절감
          </p>
        </div>

        {/* Margin distribution */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#1A1A1A', marginBottom: 6 }}>
            마진율 분포
          </p>
          <DistributionBar distribution={distribution} total={summary.totalProducts} />
        </div>

        {/* Detail toggle */}
        <button
          onClick={() => setShowDetail(!showDetail)}
          style={{
            width: '100%', padding: '10px 14px',
            borderRadius: 10, border: '1px solid #F8DCE5', background: '#FAFAFA',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <BarChart3 size={12} style={{ color: '#e62310' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>
              상품별 수익 순위
            </span>
          </div>
          <ChevronRight size={14} style={{
            color: '#B0A0A8',
            transform: showDetail ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }} />
        </button>

        {showDetail && (
          <div style={{ marginTop: 8, padding: '12px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            {/* Top 5 */}
            <p style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', marginBottom: 6 }}>
              수익 TOP 5
            </p>
            {top5.map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 0', borderBottom: i < top5.length - 1 ? '1px solid #F3F4F6' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#16a34a', width: 16 }}>{i + 1}</span>
                  <span style={{ fontSize: 11, color: '#1A1A1A', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>
                    +{p.profitNormal.toLocaleString()}원
                  </span>
                  <span style={{ fontSize: 10, color: '#6B7280' }}>{p.marginNormal}%</span>
                </div>
              </div>
            ))}

            {/* Bottom 5 */}
            {bottom5.some(p => p.profitNormal < 0) && (
              <>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#e62310', margin: '12px 0 6px' }}>
                  주의 상품
                </p>
                {bottom5.filter(p => p.marginNormal < 15).map((p, i) => (
                  <div key={p.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 0', borderBottom: i < 4 ? '1px solid #F3F4F6' : 'none',
                  }}>
                    <span style={{ fontSize: 11, color: '#1A1A1A', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: p.profitNormal < 0 ? '#e62310' : '#f97316' }}>
                        {p.profitNormal >= 0 ? '+' : ''}{p.profitNormal.toLocaleString()}원
                      </span>
                      <span style={{ fontSize: 10, color: '#6B7280' }}>{p.marginNormal}%</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
