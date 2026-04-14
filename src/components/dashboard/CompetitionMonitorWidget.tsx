// src/components/dashboard/CompetitionMonitorWidget.tsx
// D-3: Competition monitoring dashboard widget
// Shows competitor price trends, alerts, and market position for each product

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity, TrendingUp, TrendingDown, RefreshCw, AlertTriangle,
  Eye, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';

interface CompetitorItem {
  title: string;
  price: number;
  mallName: string;
}

interface Snapshot {
  query: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  totalResults: number;
  competitionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  topItems: CompetitorItem[];
  timestamp: string;
}

interface ProductMonitor {
  productId: string;
  productName: string;
  keyword: string;
  myPrice: number;
  status: string;
  naverProductId: string | null;
  snapshot: Snapshot | null;
  previousSnapshot: Snapshot | null;
  hasData: boolean;
}

interface MonitorData {
  success: boolean;
  totalTracked: number;
  withData: number;
  products: ProductMonitor[];
  lastCheck: string | null;
}

const LEVEL_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  LOW:       { bg: '#dcfce7', text: '#166534', label: '\uB0AE\uC74C' },
  MEDIUM:    { bg: '#fef9c3', text: '#854d0e', label: '\uBCF4\uD1B5' },
  HIGH:      { bg: '#fed7aa', text: '#9a3412', label: '\uB192\uC74C' },
  VERY_HIGH: { bg: '#fecaca', text: '#991b1b', label: '\uCE58\uC5F4' },
};

function PricePosition({ myPrice, avgPrice }: { myPrice: number; avgPrice: number }) {
  if (!avgPrice || !myPrice) return null;
  const diff = ((myPrice - avgPrice) / avgPrice) * 100;
  if (diff < -10) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, color: '#16a34a' }}>
      <ArrowDownRight size={12} /> {Math.abs(diff).toFixed(0)}% below
    </span>
  );
  if (diff > 10) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, color: '#dc2626' }}>
      <ArrowUpRight size={12} /> {diff.toFixed(0)}% above
    </span>
  );
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, color: '#ca8a04' }}>
      <Minus size={12} /> avg range
    </span>
  );
}

function PriceChangeIndicator({ current, previous }: { current: number; previous: number }) {
  if (!current || !previous) return null;
  const diff = current - previous;
  const pct = (diff / previous) * 100;
  if (Math.abs(pct) < 2) return null;
  const isUp = diff > 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      fontSize: 10, fontWeight: 600,
      color: isUp ? '#dc2626' : '#16a34a',
      background: isUp ? '#fef2f2' : '#f0fdf4',
      padding: '1px 6px', borderRadius: 8,
    }}>
      {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {isUp ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

export default function CompetitionMonitorWidget() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/competition');
      const json = await res.json();
      if (json.success) setData(json);
      else setError(json.error ?? 'Failed to fetch');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch('/api/competition', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await fetchData();
      } else {
        setError(json.error ?? 'Scan failed');
      }
    } catch {
      setError('Scan failed');
    } finally {
      setScanning(false);
    }
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
          <Eye size={18} style={{ color: '#e62310' }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>{'\uACBD\uC7C1 \uC0C1\uD488 \uBAA8\uB2C8\uD130\uB9C1'}</span>
          {data && (
            <span style={{
              fontSize: 11, background: '#f5f5f5', padding: '2px 8px',
              borderRadius: 8, color: '#888',
            }}>
              {data.withData}/{data.totalTracked}
            </span>
          )}
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 12px', borderRadius: 10,
            border: '1px solid #e5e5e5', background: scanning ? '#f5f5f5' : '#fff',
            fontSize: 12, fontWeight: 600, cursor: scanning ? 'not-allowed' : 'pointer',
            color: scanning ? '#aaa' : '#555',
            transition: 'all 0.15s',
          }}
        >
          <RefreshCw size={13} style={{ animation: scanning ? 'spin 1s linear infinite' : 'none' }} />
          {scanning ? '\uBD84\uC11D \uC911...' : '\uC804\uCCB4 \uC2A4\uCE94'}
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '12px 16px' }}>
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 10,
            background: '#fef2f2', color: '#991b1b', fontSize: 12, marginBottom: 8,
          }}>
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {loading && !data && (
          <div style={{ textAlign: 'center', padding: 20, color: '#aaa', fontSize: 13 }}>
            {'\uB370\uC774\uD130 \uBD88\uB7EC\uC624\uB294 \uC911...'}
          </div>
        )}

        {data && data.products.length === 0 && (
          <div style={{ textAlign: 'center', padding: 20, color: '#aaa', fontSize: 13 }}>
            {'\uBAA8\uB2C8\uD130\uB9C1\uD560 \uC0C1\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4'}
          </div>
        )}

        {data && data.products.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.products.map(p => {
              const isExpanded = expanded === p.productId;
              const s = p.snapshot;
              const prev = p.previousSnapshot;
              const lvl = s ? LEVEL_STYLE[s.competitionLevel] ?? LEVEL_STYLE.MEDIUM : null;

              return (
                <div key={p.productId} style={{
                  borderRadius: 12, border: '1px solid #f0f0f0',
                  overflow: 'hidden', transition: 'all 0.15s',
                }}>
                  {/* Row */}
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : p.productId)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 12px', background: isExpanded ? '#fafafa' : '#fff',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {/* Status dot */}
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: p.naverProductId ? '#16a34a' : p.status === 'DRAFT' ? '#d1d5db' : '#f59e0b',
                    }} />

                    {/* Product name */}
                    <span style={{
                      flex: 1, fontSize: 13, fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.productName}
                    </span>

                    {/* Competition level badge */}
                    {lvl && (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 8,
                        background: lvl.bg, color: lvl.text,
                      }}>
                        {lvl.label}
                      </span>
                    )}

                    {/* Avg price */}
                    {s && (
                      <span style={{ fontSize: 12, color: '#555', fontWeight: 500, minWidth: 70, textAlign: 'right' }}>
                        {s.avgPrice.toLocaleString()}{'\uC6D0'}
                      </span>
                    )}

                    {/* Price change */}
                    {s && prev && <PriceChangeIndicator current={s.avgPrice} previous={prev.avgPrice} />}

                    {/* My price position */}
                    {s && <PricePosition myPrice={p.myPrice} avgPrice={s.avgPrice} />}

                    {/* Chevron */}
                    {isExpanded ? <ChevronUp size={14} style={{ color: '#aaa' }} /> : <ChevronDown size={14} style={{ color: '#aaa' }} />}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && s && (
                    <div style={{ padding: '0 12px 12px', background: '#fafafa' }}>
                      <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10,
                      }}>
                        <div style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', border: '1px solid #f0f0f0' }}>
                          <div style={{ fontSize: 10, color: '#888' }}>{'\uCD5C\uC800\uAC00'}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>{s.minPrice.toLocaleString()}{'\uC6D0'}</div>
                        </div>
                        <div style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', border: '1px solid #f0f0f0' }}>
                          <div style={{ fontSize: 10, color: '#888' }}>{'\uD3C9\uADE0\uAC00'}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#555' }}>{s.avgPrice.toLocaleString()}{'\uC6D0'}</div>
                        </div>
                        <div style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', border: '1px solid #f0f0f0' }}>
                          <div style={{ fontSize: 10, color: '#888' }}>{'\uCD5C\uACE0\uAC00'}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>{s.maxPrice.toLocaleString()}{'\uC6D0'}</div>
                        </div>
                      </div>

                      {/* My price bar position */}
                      {s.minPrice > 0 && s.maxPrice > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{'\uB0B4 \uD310\uB9E4\uAC00 \uC704\uCE58'}</div>
                          <div style={{ position: 'relative', height: 8, background: '#e5e7eb', borderRadius: 4 }}>
                            <div style={{
                              position: 'absolute', top: 0, left: 0,
                              width: `${Math.min(100, Math.max(0, ((p.myPrice - s.minPrice) / (s.maxPrice - s.minPrice)) * 100))}%`,
                              height: 8, borderRadius: 4,
                              background: 'linear-gradient(90deg, #16a34a, #ca8a04, #dc2626)',
                            }} />
                            <div style={{
                              position: 'absolute', top: -3,
                              left: `${Math.min(96, Math.max(2, ((p.myPrice - s.minPrice) / (s.maxPrice - s.minPrice)) * 100))}%`,
                              width: 14, height: 14, borderRadius: '50%',
                              background: '#e62310', border: '2px solid #fff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#aaa', marginTop: 2 }}>
                            <span>{s.minPrice.toLocaleString()}</span>
                            <span style={{ fontWeight: 700, color: '#e62310' }}>{'\uB0B4 \uAC00\uACA9'}: {p.myPrice.toLocaleString()}</span>
                            <span>{s.maxPrice.toLocaleString()}</span>
                          </div>
                        </div>
                      )}

                      {/* Top competitors */}
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{'\uC0C1\uC704 \uACBD\uC7C1\uC0C1\uD488'}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {s.topItems.slice(0, 3).map((item, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 8px', background: '#fff', borderRadius: 8,
                            border: '1px solid #f0f0f0', fontSize: 12,
                          }}>
                            <span style={{ fontWeight: 700, color: '#888', width: 16 }}>{i + 1}</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.title}
                            </span>
                            <span style={{ fontWeight: 600, color: '#555' }}>{item.price.toLocaleString()}{'\uC6D0'}</span>
                            <span style={{ fontSize: 10, color: '#aaa' }}>{item.mallName}</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ fontSize: 10, color: '#bbb', textAlign: 'right', marginTop: 6 }}>
                        {'\uACBD\uC7C1\uC0C1\uD488 \uCD1D'} {s.totalResults.toLocaleString()}{'\uAC1C'} | {new Date(s.timestamp).toLocaleString('ko-KR')}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {data?.lastCheck && (
          <div style={{ fontSize: 10, color: '#bbb', textAlign: 'right', marginTop: 8 }}>
            {'\uB9C8\uC9C0\uB9C9 \uC2A4\uCE94'}: {new Date(data.lastCheck).toLocaleString('ko-KR')}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
