// src/components/dashboard/SourcingRecommendWidget.tsx
// E-7 + E-10: Kkotti Sourcing Recommendation Widget for Dashboard
// Shows blue-ocean product opportunities from trend analysis
// Includes scan button + opportunity cards with key metrics + entry barrier breakdown
// Option E (2026-05-03): SWR migration via useSourcingRecommend() hook (24h cadence + setData for POST scan)

'use client';

import { useState } from 'react';
import {
  Search, TrendingUp, RefreshCw,
  ChevronDown, ChevronUp, Sparkles, ShoppingBag,
  Target, Shield,
} from 'lucide-react';
import { useSourcingRecommend, type SourcingRecommendApiData } from '@/lib/hooks/useDashboardData';

// Competition badge color
function getCompBadge(comp: string): { label: string; bg: string; text: string } {
  switch (comp) {
    case 'low':     return { label: '낮음',  bg: '#dcfce7', text: '#15803d' };
    case 'mid':     return { label: '보통',  bg: '#fef3c7', text: '#b45309' };
    case 'high':    return { label: '높음', bg: '#fee2e2', text: '#b91c1c' };
    default:        return { label: '-',    bg: '#f3f4f6', text: '#6b7280' };
  }
}

// E-10: Entry barrier badge style
function getBarrierBadge(level?: 'LOW' | 'MEDIUM' | 'HIGH'): { label: string; bg: string; text: string; bar: string } | null {
  if (!level) return null;
  if (level === 'LOW')    return { label: '낮음', bg: '#dcfce7', text: '#166534', bar: '#16a34a' };
  if (level === 'HIGH')   return { label: '높음', bg: '#fecaca', text: '#991b1b', bar: '#dc2626' };
  return                       { label: '보통', bg: '#fef9c3', text: '#854d0e', bar: '#ca8a04' };
}

// Blue ocean score color
function getScoreColor(score: number): string {
  if (score >= 80) return '#228f18';
  if (score >= 60) return '#15803d';
  if (score >= 40) return '#b45309';
  return '#b91c1c';
}

export default function SourcingRecommendWidget() {
  // Option E: SWR-backed cache + setData for POST scan replace.
  const { data: result, isLoading, setData } = useSourcingRecommend();
  const [scanning, setScanning] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Trigger fresh scan via POST and replace SWR cache directly with the response.
  // Note: do NOT call refresh() after scan — that would re-GET and overwrite
  // the fresh result with a possibly-stale cached one.
  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/sourcing-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discord: true }),
      });
      const json: SourcingRecommendApiData = await res.json();
      if (json.ok) setData(json);
    } catch { /* silent */ }
    setScanning(false);
  };

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      padding: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} style={{ color: '#FF6B8A' }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            소싱 추천
          </span>
          {result?.trendSource && (
            <span style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', borderRadius: 4, padding: '2px 6px' }}>
              {result.trendSource === 'fallback' ? '기본값' : result.trendSource === 'datalab' ? 'DataLab' : result.trendSource}
            </span>
          )}
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 12px', borderRadius: 6,
            border: '1px solid var(--color-border)', background: scanning ? '#f3f4f6' : '#fff',
            cursor: scanning ? 'not-allowed' : 'pointer',
            fontSize: 12, fontWeight: 500,
          }}
        >
          <RefreshCw size={13} className={scanning ? 'animate-spin' : ''} />
          {scanning ? '분석 중...' : '스캔 시작'}
        </button>
      </div>

      {/* Trend categories */}
      {result?.trendCategories && result.trendCategories.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <TrendingUp size={13} style={{ color: '#228f18', marginTop: 2 }} />
          {result.trendCategories.map(cat => (
            <span key={cat} style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 10,
              background: '#dcfce7', color: '#15803d', fontWeight: 500,
            }}>
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* AI Summary */}
      {result?.aiSummary && (
        <div style={{
          background: '#FEF0F3', borderRadius: 8, padding: '10px 12px',
          marginBottom: 14, fontSize: 13, lineHeight: 1.5, color: '#374151',
        }}>
          <Sparkles size={12} style={{ color: '#FF6B8A', display: 'inline', marginRight: 4 }} />
          {result.aiSummary}
        </div>
      )}

      {/* Loading state */}
      {isLoading && !result && (
        <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 13 }}>
          로딩 중...
        </div>
      )}

      {/* Empty state */}
      {result && result.opportunities.length === 0 && !isLoading && (
        <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 13 }}>
          {result.error ?? '추천 기회가 없습니다. 스캔을 시도해보세요.'}
        </div>
      )}

      {/* Opportunity cards */}
      {result?.opportunities.map((opp, i) => {
        const compBadge = getCompBadge(opp.competition);
        const barrierBadge = getBarrierBadge(opp.entryBarrierLevel);
        const isExpanded = expanded === i;

        return (
          <div key={opp.keyword} style={{
            border: '1px solid var(--color-border)', borderRadius: 8, marginBottom: 8,
            overflow: 'hidden',
          }}>
            {/* Card header - always visible */}
            <button
              onClick={() => setExpanded(isExpanded ? null : i)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '10px 12px', background: 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, minWidth: 20, textAlign: 'center',
                  color: i < 3 ? '#FF6B8A' : '#6b7280',
                }}>
                  {i + 1}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>
                    {opp.keyword}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10, padding: '1px 5px', borderRadius: 4,
                      background: compBadge.bg, color: compBadge.text, fontWeight: 600,
                    }}>
                      {compBadge.label}
                    </span>
                    {/* E-10: Entry barrier chip */}
                    {barrierBadge && (
                      <span
                        title={`진입장벽 ${barrierBadge.label} (BlueOcean ${(opp.entryBarrierBonus ?? 0) >= 0 ? '+' : ''}${opp.entryBarrierBonus ?? 0})`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 2,
                          fontSize: 10, padding: '1px 5px', borderRadius: 4,
                          background: barrierBadge.bg, color: barrierBadge.text, fontWeight: 600,
                        }}
                      >
                        <Shield size={9} />
                        진입 {barrierBadge.label}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: '#6b7280' }}>
                      {opp.monthlySearchVolume.toLocaleString()}/월
                    </span>
                    {/* SOURCING_NEGATIVE_MARGIN_ROOT_CAUSE(2026-08-04): avgPrice는
                        더 이상 채워지지 않는다(항상 0) — supplyPriceRange(실측
                        도매공급가)로 교체. 없으면 표시하지 않는다(가짜값 금지). */}
                    {opp.supplyPriceRange && (
                      <span style={{ fontSize: 11, color: '#6b7280' }}>
                        공급가 {opp.supplyPriceRange.min.toLocaleString()}
                        {opp.supplyPriceRange.min !== opp.supplyPriceRange.max
                          ? `~${opp.supplyPriceRange.max.toLocaleString()}`
                          : ''}원
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Blue ocean score badge */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  padding: '3px 8px', borderRadius: 6,
                  background: '#f0fdf4',
                }}>
                  <Target size={11} style={{ color: getScoreColor(opp.blueOceanScore) }} />
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: getScoreColor(opp.blueOceanScore),
                  }}>
                    {opp.blueOceanScore}
                  </span>
                </div>

                {/* SOURCING_NEGATIVE_MARGIN_ROOT_CAUSE(2026-08-04): estimatedMargin은
                    이종상품 오염 위험으로 폐기됨(API가 항상 0을 반환) — 지어낸
                    마진(%) 배지를 제거한다. 판단은 공급가 범위+도매처 링크로. */}

                {isExpanded ? <ChevronUp size={14} color="#9ca3af" /> : <ChevronDown size={14} color="#9ca3af" />}
              </div>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div style={{ padding: '0 12px 12px', borderTop: '1px solid #f3f4f6' }}>
                {/* E-10: BlueOcean score breakdown (base + entry barrier bonus) */}
                {opp.blueOceanBase !== undefined && opp.entryBarrierBonus !== undefined && (
                  <div style={{
                    marginTop: 10, padding: '8px 10px', borderRadius: 6,
                    background: '#f9fafb', display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 11, color: '#374151',
                  }}>
                    <Target size={12} style={{ color: getScoreColor(opp.blueOceanScore) }} />
                    <span>
                      <span style={{ color: '#9ca3af' }}>BlueOcean:</span>{' '}
                      <span style={{ fontWeight: 600 }}>기본 {opp.blueOceanBase}</span>
                      {' '}
                      <span style={{
                        color: opp.entryBarrierBonus > 0 ? '#15803d' : opp.entryBarrierBonus < 0 ? '#b91c1c' : '#9ca3af',
                        fontWeight: 600,
                      }}>
                        {opp.entryBarrierBonus > 0 ? '+' : ''}{opp.entryBarrierBonus}
                      </span>
                      {' '}
                      <span style={{ color: '#9ca3af' }}>진입가산 =</span>{' '}
                      <span style={{ fontWeight: 700, color: getScoreColor(opp.blueOceanScore) }}>
                        {opp.blueOceanScore}점
                      </span>
                    </span>
                  </div>
                )}

                {/* SOURCING_NEGATIVE_MARGIN_ROOT_CAUSE(2026-08-04): 가격대·예상공급가·
                    검색결과수·경쟁강도·가격분산은 SE05(쇼핑검색 종료) 이후 API가
                    더 이상 채우지 않는다(전부 0/빈값 고정) — 지어낸 상세 그리드를
                    통째로 제거. 실측 정보(공급가 범위)는 카드 헤더에 이미 표시됨. */}

                {/* Entry barrier factors — API가 실제로 채우는 값만 남긴다 */}
                {(opp.entryBarrierScore !== undefined || opp.uniqueSellersInTop !== undefined) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10, fontSize: 12 }}>
                    {opp.entryBarrierScore !== undefined && (
                      <div>
                        <span style={{ color: '#9ca3af' }}>진입장벽 점수</span>
                        <div style={{ fontWeight: 600, color: barrierBadge?.bar ?? '#374151' }}>
                          {opp.entryBarrierScore.toFixed(1)} / 5
                        </div>
                      </div>
                    )}
                    {opp.uniqueSellersInTop !== undefined && (
                      <div>
                        <span style={{ color: '#9ca3af' }}>판매처 다양성</span>
                        <div style={{ fontWeight: 600, color: '#374151' }}>
                          {opp.uniqueSellersInTop}개
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Top sellers */}
                {opp.topSellers.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280' }}>
                    <ShoppingBag size={11} style={{ display: 'inline', marginRight: 4 }} />
                    {opp.topSellers.join(' / ')}
                  </div>
                )}

                {/* AI insight */}
                {opp.aiInsight && (
                  <div style={{
                    marginTop: 8, padding: '6px 10px', borderRadius: 6,
                    background: '#FEF0F3', fontSize: 12, color: '#374151', lineHeight: 1.4,
                  }}>
                    <Sparkles size={11} style={{ color: '#FF6B8A', display: 'inline', marginRight: 4 }} />
                    {opp.aiInsight}
                  </div>
                )}

                {/* Action: search on wholesale */}
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <a
                    href={`https://domeggook.com/main/index.php?log=search&keyword=${encodeURIComponent(opp.keyword)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, padding: '4px 10px', borderRadius: 5,
                      background: '#228f18', color: '#fff', textDecoration: 'none',
                      fontWeight: 500,
                    }}
                  >
                    <Search size={11} />
                    도매꾹 검색
                  </a>
                  <a
                    href={`https://domeme.domeggook.com/main/index.php?log=search&keyword=${encodeURIComponent(opp.keyword)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, padding: '4px 10px', borderRadius: 5,
                      background: '#F63B28', color: '#fff', textDecoration: 'none',
                      fontWeight: 500,
                    }}
                  >
                    <Search size={11} />
                    도매매 검색
                  </a>
                </div>

                {/* E-8: Wholesale matched products */}
                {opp.wholesaleMatches && opp.wholesaleMatches.length > 0 && (
                  <div style={{ marginTop: 12, borderTop: '1px solid #f3f4f6', paddingTop: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                      <ShoppingBag size={12} style={{ color: '#228f18' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>
                        도매 매칭 ({opp.wholesalePlatforms?.join('+') ?? ''})
                      </span>
                      <span style={{ fontSize: 10, color: '#9ca3af' }}>최소수량 1개</span>
                    </div>
                    {opp.wholesaleMatches.map((w, wi) => (
                      <a
                        key={wi}
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '6px 8px', borderRadius: 6, marginBottom: 4,
                          background: '#f9fafb', textDecoration: 'none', border: '1px solid var(--color-border)',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '1px 4px', borderRadius: 3, marginRight: 4,
                              background: w.platform === 'DMK' ? '#dcfce7' : '#fee2e2',
                              color: w.platform === 'DMK' ? '#15803d' : '#b91c1c',
                            }}>{w.platform}</span>
                            {w.name.slice(0, 35)}{w.name.length > 35 ? '...' : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                            {w.supplyPrice.toLocaleString()}원
                          </span>
                          {/* #326-B(2026-08-04): 마진(%) 지어내지 않는다. 이종상품
                              오염 의심만 경고로 표시(배제하지 않음) — 판단은
                              대표님이 링크를 보고 내린다. 2026-08-05: 부속품/소모품
                              의심(accessoryRisk)도 동일하게 경고(디스코드와 정합). */}
                          {w.priceOutlier ? (
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 4,
                              background: '#fef3c7', color: '#b45309',
                            }}>
                              ⚠️ 다른상품?
                            </span>
                          ) : w.accessoryRisk ? (
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 4,
                              background: '#fef3c7', color: '#b45309',
                            }}>
                              ⚠️ 부속품?
                            </span>
                          ) : null}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
