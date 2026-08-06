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
  Target, Shield, X, ExternalLink, Sprout, ArrowRight,
  Star, EyeOff,
} from 'lucide-react';
import { useSourcingRecommend, type SourcingRecommendApiData, type SourcingOpportunityItem } from '@/lib/hooks/useDashboardData';

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

// 도매처 플랫폼 코드 → 셀러가 바로 아는 한글 라벨 + 색(#317 개발자 은어 금지).
// DMM/DMK는 내부 코드일 뿐 화면에는 "도매매"/"도매꾹"으로 노출한다. 카드·드로어
// 두 곳이 이 단일 함수를 공유해 표기가 갈라지지 않게 한다(#62 단일 권위).
function getPlatformLabel(platform?: string): { label: string; bg: string; text: string } {
  // DMK=도매꾹(초록), DMM=도매매(빨강) — 기존 색 관례 유지.
  if (platform === 'DMK') return { label: '도매꾹', bg: '#dcfce7', text: '#15803d' };
  return { label: '도매매', bg: '#fee2e2', text: '#b91c1c' };
}

export default function SourcingRecommendWidget() {
  // Option E: SWR-backed cache + setData for POST scan replace.
  // 트랙C-1(2026-08-05): setStatus로 낙점 상태를 변경한다(낙관적 업데이트).
  const { data: result, isLoading, setData, setStatus } = useSourcingRecommend();
  const [scanning, setScanning] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  // 트랙C-1: 제외(skipped) 항목 펼치기 토글. 기본은 접힘(화면 정리).
  const [showSkipped, setShowSkipped] = useState(false);
  // 트랙C-2(2026-08-06): 낙점 상태별 세그먼트 필터. 상단 요약 배지를 탭하면
  // 해당 상태만 걸러 본다. 'all'=제외 뺀 전부(기본). 순수 클라이언트 필터.
  const [filter, setFilter] = useState<'all' | 'interested' | 'sourcing_started'>('all');
  // 트랙B(2026-08-05): 우측 슬라이드 드로어로 상세를 연다. 카드=빠른 스캔용
  // 요약, 드로어=심화(도매매칭 전체·AI인사이트 전문·소싱 시작). 프리미엄 SaaS
  // 표준 패턴 — 인라인 확장(expanded)은 보존하되 드로어가 주 상세 경로다.
  const [drawerItem, setDrawerItem] = useState<SourcingOpportunityItem | null>(null);

  // Trigger fresh scan via POST and replace SWR cache directly with the response.
  // Note: do NOT call refresh() after scan — that would re-GET and overwrite
  // the fresh result with a possibly-stale cached one.
  //
  // 2026-08-05: discord:false로 호출한다. 웹 "스캔 시작"은 운영자가 화면에서
  // 최신 데이터를 새로고침하는 동작이지 Discord 알림을 발송하는 게 아니다.
  // 기존 discord:true는 웹에서 버튼을 누를 때마다 실제 Discord 채널에 알림이
  // 나가는 부수효과가 있었다(아침 크론과 웹 스캔의 목적 혼동). POST는
  // discord:false여도 DB 저장·최신 데이터 반환은 그대로 수행하므로 화면
  // 갱신에는 문제가 없다. 실제 Discord 발송은 아침 크론(E-7)만 담당한다.
  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/sourcing-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discord: false }),
      });
      const json: SourcingRecommendApiData = await res.json();
      if (json.ok) setData(json);
    } catch { /* silent */ }
    setScanning(false);
  };

  // 트랙C-1(2026-08-05): 낙점 파이프라인 파생 계산.
  // - 요약 카운트: 상단 배지에 "관심 N·소싱중 M" 표시(0이면 숨김).
  // - 표시 목록: skipped(제외)는 기본 접힘. showSkipped일 때만 펼친다.
  //   원본 인덱스(expanded 상태 키)를 보존하기 위해 [opp, originalIndex] 페어로 담는다.
  const allOpps = result?.opportunities ?? [];
  const interestedCount = allOpps.filter((o) => o.operatorStatus === 'interested').length;
  const sourcingCount = allOpps.filter((o) => o.operatorStatus === 'sourcing_started').length;
  const skippedCount = allOpps.filter((o) => o.operatorStatus === 'skipped').length;
  const visibleOpps = allOpps
    .map((opp, i) => ({ opp, i }))
    .filter(({ opp }) => opp.operatorStatus !== 'skipped');
  const skippedOpps = allOpps
    .map((opp, i) => ({ opp, i }))
    .filter(({ opp }) => opp.operatorStatus === 'skipped');

  // 트랙C-2(2026-08-06): 세그먼트 필터 적용. visibleOpps(제외 뺀 전부)에서
  // 현재 필터에 맞는 것만 화면에 표시한다. 'all'이면 그대로. 제외 접기는
  // 이 필터와 독립적으로 하단에 유지된다(제외는 세그먼트가 아니라 숨김 축).
  const displayedOpps = filter === 'all'
    ? visibleOpps
    : visibleOpps.filter(({ opp }) => opp.operatorStatus === filter);
  // 필터가 활성인데(전체 아님) 관심/소싱중 카운트가 0이 되면(마지막 항목을
  // 해제/재분류) 필터 칩 자체가 사라지므로 자동으로 'all'로 되돌린다.
  // (렌더 중 setState 금지 — 파생값으로만 처리: 표시할 게 없으면 안내 표시)
  const filterActive = filter !== 'all';
  const filterEmpty = filterActive && displayedOpps.length === 0;

  // 관심 토글 — interested ↔ null. stopPropagation은 호출부(칩 onClick)에서 처리.
  const toggleInterest = (opp: SourcingOpportunityItem) => {
    const next = opp.operatorStatus === 'interested' ? null : 'interested';
    void setStatus(opp.keyword, next, opp.recordId);
  };
  // 제외 토글 — skipped ↔ null.
  const toggleSkip = (opp: SourcingOpportunityItem) => {
    const next = opp.operatorStatus === 'skipped' ? null : 'skipped';
    void setStatus(opp.keyword, next, opp.recordId);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 트랙C-2(2026-08-06): 낙점 상태별 세그먼트 필터 — 요약 배지를
              탭 가능한 필터 칩으로 승격(표시+필터 겸용). 관심/소싱중이 하나라도
              있을 때만 필터 UI를 노출한다(둘 다 0이면 필터 자체가 무의미).
              단일 선택(라디오식): 활성 칩은 채워진 배경, 비활성은 외곽선. */}
          {(interestedCount > 0 || sourcingCount > 0) && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              padding: 2, borderRadius: 8, background: '#f3f4f6',
            }}>
              <button
                onClick={() => setFilter('all')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 6,
                  border: 'none', cursor: 'pointer',
                  background: filter === 'all' ? '#fff' : 'transparent',
                  color: filter === 'all' ? '#374151' : '#9ca3af',
                  boxShadow: filter === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.12s',
                }}
              >
                전체 {visibleOpps.length}
              </button>
              {interestedCount > 0 && (
                <button
                  onClick={() => setFilter('interested')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 6,
                    border: 'none', cursor: 'pointer',
                    background: filter === 'interested' ? '#fef3c7' : 'transparent',
                    color: filter === 'interested' ? '#b45309' : '#9ca3af',
                    boxShadow: filter === 'interested' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.12s',
                  }}
                >
                  <Star size={11} fill={filter === 'interested' ? '#f59e0b' : '#d1d5db'} strokeWidth={0} /> 관심 {interestedCount}
                </button>
              )}
              {sourcingCount > 0 && (
                <button
                  onClick={() => setFilter('sourcing_started')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 6,
                    border: 'none', cursor: 'pointer',
                    background: filter === 'sourcing_started' ? '#dcfce7' : 'transparent',
                    color: filter === 'sourcing_started' ? '#15803d' : '#9ca3af',
                    boxShadow: filter === 'sourcing_started' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.12s',
                  }}
                >
                  <Sprout size={11} /> 소싱중 {sourcingCount}
                </button>
              )}
            </div>
          )}
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

      {/* 트랙C-2: 필터 결과 빈 목록 안내 — 무음 폴백(#270) 대신 왜 비었는지
          알리고 전체로 돌아가는 버튼을 준다. */}
      {filterEmpty && (
        <div style={{
          textAlign: 'center', padding: '20px 16px', borderRadius: 8,
          background: '#f9fafb', border: '1px dashed var(--color-border)',
        }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            {filter === 'interested' ? '관심 표시한 항목이 없어요.' : '소싱 진행 중인 항목이 없어요.'}
          </div>
          <button
            onClick={() => setFilter('all')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
              border: '1px solid var(--color-border)', background: '#fff',
              fontSize: 12, fontWeight: 600, color: '#374151',
            }}
          >
            전체 보기
          </button>
        </div>
      )}

      {/* Opportunity cards — 트랙C-1: 제외(skipped) 항목은 여기서 빠지고
          아래 "제외 N건" 토글로 내려간다. 트랙C-2: 세그먼트 필터(displayedOpps)
          적용. i = 원본 인덱스(expanded 상태 키 보존) */}
      {displayedOpps.map(({ opp, i }) => {
        const compBadge = getCompBadge(opp.competition);
        const barrierBadge = getBarrierBadge(opp.entryBarrierLevel);
        const isExpanded = expanded === i;
        const isInterested = opp.operatorStatus === 'interested';
        const isSourcing = opp.operatorStatus === 'sourcing_started';

        return (
          <div key={opp.keyword} style={{
            border: isSourcing
              ? '1.5px solid #86efac'
              : isInterested
                ? '1.5px solid #fcd34d'
                : '1px solid var(--color-border)',
            borderRadius: 8, marginBottom: 8, overflow: 'hidden',
            background: isSourcing ? '#f0fdf4' : isInterested ? '#fffbeb' : '#fff',
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
                {/* 트랙C-1: 관심 토글(⭐). 카드 확장과 분리하기 위해 stopPropagation.
                    소싱중(🌱)이면 관심 칩 대신 소싱중 상태를 표시한다. */}
                {isSourcing ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 20,
                    background: '#dcfce7', color: '#15803d',
                  }}>
                    <Sprout size={10} /> 소싱중
                  </span>
                ) : (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); toggleInterest(opp); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toggleInterest(opp); } }}
                    title={isInterested ? '관심 해제' : '관심 표시'}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 26, height: 26, borderRadius: 7, cursor: 'pointer',
                      background: isInterested ? '#fef3c7' : 'transparent',
                      border: isInterested ? '1px solid #fcd34d' : '1px solid var(--color-border)',
                      transition: 'all 0.12s',
                    }}
                  >
                    <Star
                      size={13}
                      fill={isInterested ? '#f59e0b' : 'none'}
                      color={isInterested ? '#f59e0b' : '#9ca3af'}
                      strokeWidth={isInterested ? 0 : 2}
                    />
                  </span>
                )}

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
                        도매 매칭 ({(opp.wholesalePlatforms ?? []).map((p) => getPlatformLabel(p).label).join('·') || ''})
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
                            {(() => { const p = getPlatformLabel(w.platform); return (
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '1px 4px', borderRadius: 3, marginRight: 4,
                                background: p.bg, color: p.text,
                              }}>{p.label}</span>
                            ); })()}
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

                {/* 트랙B: 상세 드로어 열기 + 트랙C-1: 제외 버튼.
                    상세 보기(주 액션)와 제외(보조)를 나란히 둔다. */}
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDrawerItem(opp); }}
                    style={{
                      flex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '8px 12px', borderRadius: 8,
                      border: 'none', background: '#FF6B8A', color: '#fff',
                      cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    }}
                  >
                    <Sprout size={13} />
                    상세 보기 · 소싱 시작
                    <ArrowRight size={13} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSkip(opp); }}
                    title="이 키워드를 제외 목록으로 보냅니다"
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      padding: '8px 12px', borderRadius: 8,
                      border: '1px solid var(--color-border)', background: '#fff', color: '#9ca3af',
                      cursor: 'pointer', fontSize: 12, fontWeight: 500,
                    }}
                  >
                    <EyeOff size={13} />
                    제외
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 트랙C-1: 제외(skipped) 항목 접기 — 기본 숨김, 토글로 펼침(정보 손실 0) */}
      {skippedCount > 0 && (
        <div style={{ marginTop: 4 }}>
          <button
            onClick={() => setShowSkipped((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 4px', background: 'transparent', border: 'none',
              cursor: 'pointer', fontSize: 12, color: '#9ca3af', fontWeight: 500,
            }}
          >
            <EyeOff size={12} />
            제외 {skippedCount}건 {showSkipped ? '숨기기' : '보기'}
            {showSkipped ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showSkipped && (
            <div style={{ marginTop: 4 }}>
              {skippedOpps.map(({ opp }) => (
                <div key={opp.keyword} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 8, marginBottom: 6,
                  background: '#f9fafb', border: '1px dashed var(--color-border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#9ca3af', textDecoration: 'line-through' }}>
                      {opp.keyword}
                    </span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>
                      {opp.monthlySearchVolume.toLocaleString()}/월
                    </span>
                  </div>
                  <button
                    onClick={() => toggleSkip(opp)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                      border: '1px solid var(--color-border)', background: '#fff',
                      fontSize: 11, fontWeight: 500, color: '#6b7280',
                    }}
                  >
                    <RefreshCw size={11} /> 되돌리기
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 트랙B(2026-08-05): 소싱 상세 드로어 — 우측 슬라이드 오버레이 */}
      {drawerItem && (
        <SourcingDetailDrawer
          item={drawerItem}
          onStartSourcing={(kw, recId) => { void setStatus(kw, 'sourcing_started', recId); }}
          onClose={() => setDrawerItem(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 트랙B: 소싱 상세 드로어 (프리미엄 SaaS 우측 슬라이드 패턴)
// 카드가 요약이라면 드로어는 심화 — 도매매칭 전체 목록(경고 이유 포함),
// AI 인사이트 전문, 그리고 "이 키워드로 소싱 시작"(씨앗심기 프리필) 액션.
// ─────────────────────────────────────────────────────────────────────────────
function SourcingDetailDrawer({
  item,
  onStartSourcing,
  onClose,
}: {
  item: SourcingOpportunityItem;
  // 트랙C-1: "소싱 시작" 클릭 시 자동 낙점(sourcing_started). 행동이 곧 상태.
  onStartSourcing: (keyword: string, recordId?: string) => void;
  onClose: () => void;
}) {
  const compBadge = getCompBadge(item.competition);
  const scoreColor = getScoreColor(item.blueOceanScore);

  // "이 키워드로 소싱 시작" — 씨앗심기(상품 등록) 화면으로 키워드를 프리필해
  // 이동한다. 운영자가 발굴→등록 사이에서 키워드를 다시 입력할 필요가 없다.
  // /products/new는 이미 ?prefillName= 파라미터로 상품명 입력란을 채우는
  // 기능이 있다(page.tsx:1296 setProductName) — 새 파라미터를 만들지 않고
  // 그 기존 경로를 재사용한다(#62 — 같은 목적의 기능을 중복 생성 금지).
  const seedUrl = `/products/new?prefillName=${encodeURIComponent(item.keyword)}`;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)',
          zIndex: 1000, animation: 'kkotiFadeIn 0.15s ease',
        }}
      />
      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(460px, 92vw)', background: '#fff', zIndex: 1001,
          boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          animation: 'kkotiSlideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 22px 16px', borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Sparkles size={16} style={{ color: '#FF6B8A' }} />
              <span style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>
                {item.keyword}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '2px 8px', borderRadius: 6, background: '#f0fdf4',
                fontSize: 13, fontWeight: 700, color: scoreColor,
              }}>
                <Target size={12} /> 블루오션 {item.blueOceanScore}점
              </span>
              <span style={{
                fontSize: 11, padding: '2px 7px', borderRadius: 5,
                background: compBadge.bg, color: compBadge.text, fontWeight: 600,
              }}>
                경쟁 {compBadge.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{
              flexShrink: 0, width: 32, height: 32, borderRadius: 8,
              border: 'none', background: '#f3f4f6', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} color="#6b7280" />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          {/* 핵심 지표 그리드 */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18,
          }}>
            <div style={{ padding: '12px 14px', borderRadius: 10, background: '#f9fafb' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>월 검색량</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                {item.monthlySearchVolume.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: 10, background: '#f9fafb' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>카테고리</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                {item.category || '-'}
              </div>
            </div>
            {item.supplyPriceRange && (
              <div style={{ padding: '12px 14px', borderRadius: 10, background: '#f9fafb', gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>실측 도매 공급가</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                  {item.supplyPriceRange.min.toLocaleString()}
                  {item.supplyPriceRange.min !== item.supplyPriceRange.max
                    ? ` ~ ${item.supplyPriceRange.max.toLocaleString()}`
                    : ''}원
                </div>
              </div>
            )}
          </div>

          {/* AI 인사이트 전문 */}
          {item.aiInsight && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sparkles size={13} style={{ color: '#FF6B8A' }} /> 꼬띠의 소싱 조언
              </div>
              <div style={{
                padding: '12px 14px', borderRadius: 10, background: '#FEF0F3',
                fontSize: 13, lineHeight: 1.6, color: '#374151',
              }}>
                {item.aiInsight}
              </div>
            </div>
          )}

          {/* 도매매칭 전체 목록 */}
          {item.wholesaleMatches && item.wholesaleMatches.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <ShoppingBag size={13} style={{ color: '#228f18' }} />
                도매 매칭 {item.wholesalePlatforms?.length ? `(${item.wholesalePlatforms.map((p) => getPlatformLabel(p).label).join('·')})` : ''}
                <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400 }}>최소수량 1개</span>
              </div>
              {item.wholesaleMatches.map((w, wi) => (
                <a
                  key={wi}
                  href={w.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10, marginBottom: 6,
                    background: '#fff', textDecoration: 'none',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      {(() => { const p = getPlatformLabel(w.platform); return (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                          background: p.bg, color: p.text,
                        }}>{p.label}</span>
                      ); })()}
                      {/* 경고 이유를 드로어에서는 전체로 명시(카드는 축약) */}
                      {w.priceOutlier && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: '#fef3c7', color: '#b45309' }}>
                          ⚠️ 다른 상품일 수 있어요
                        </span>
                      )}
                      {!w.priceOutlier && w.accessoryRisk && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: '#fef3c7', color: '#b45309' }}>
                          ⚠️ 부속품일 수 있어요
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.4 }}>
                      {w.name}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                      {w.supplyPrice.toLocaleString()}원
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                      보러가기 <ExternalLink size={9} />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* 도매 사이트 직접 검색 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <a
              href={`https://domeme.domeggook.com/main/index.php?log=search&keyword=${encodeURIComponent(item.keyword)}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                fontSize: 12, padding: '8px 10px', borderRadius: 8,
                background: '#fff', color: '#F63B28', textDecoration: 'none',
                fontWeight: 600, border: '1px solid #F63B28',
              }}
            >
              <Search size={12} /> 도매매에서 더 찾기
            </a>
            <a
              href={`https://domeggook.com/main/index.php?log=search&keyword=${encodeURIComponent(item.keyword)}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                fontSize: 12, padding: '8px 10px', borderRadius: 8,
                background: '#fff', color: '#228f18', textDecoration: 'none',
                fontWeight: 600, border: '1px solid #228f18',
              }}
            >
              <Search size={12} /> 도매꾹에서 더 찾기
            </a>
          </div>
        </div>

        {/* Footer — 주 액션(소싱 시작) */}
        <div style={{
          padding: '16px 22px', borderTop: '1px solid var(--color-border)',
          background: '#fff',
        }}>
          <a
            href={seedUrl}
            onClick={() => onStartSourcing(item.keyword, item.recordId)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '13px', borderRadius: 10,
              background: '#FF6B8A', color: '#fff', textDecoration: 'none',
              fontSize: 14, fontWeight: 700,
            }}
          >
            <Sprout size={16} />
            이 키워드로 소싱 시작
            <ArrowRight size={16} />
          </a>
          <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>
            씨앗 심기에서 &quot;{item.keyword}&quot; 키워드로 상품 등록을 시작해요
          </div>
        </div>
      </div>

      {/* 드로어 애니메이션 keyframes */}
      <style>{`
        @keyframes kkotiSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes kkotiFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
