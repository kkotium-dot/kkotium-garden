'use client';
// KkottiWidget — v3
// TASK 3: accepts parent-provided products prop — no duplicate fetch when used in dashboard

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, AlertTriangle, Zap,
  ExternalLink, Bell, Package, Wifi, WifiOff,
} from 'lucide-react';
import { calcHoneyScore } from '@/lib/honey-score';
import type { DashboardProduct } from '@/app/dashboard/page';

interface DailyRec {
  id: string; name: string; score: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  netMarginRate?: number; supplierName?: string;
}

interface OosProduct {
  id: string; name: string; sku: string;
  daysOos: number; honeyScore: number; honeyGrade: string;
}

interface WidgetStats {
  totalProducts: number; activeProducts: number; oosProducts: number;
  avgHoneyScore: number;
  topRecs: DailyRec[]; oosUrgent: OosProduct[];
}

const GRADE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  S: { bg: '#f3e8ff', text: '#7e22ce', label: 'S' },
  A: { bg: '#dcfce7', text: '#15803d', label: 'A' },
  B: { bg: '#dbeafe', text: '#1d4ed8', label: 'B' },
  C: { bg: '#fef9c3', text: '#a16207', label: 'C' },
  D: { bg: '#fee2e2', text: '#b91c1c', label: 'D' },
};

const KKOTTI_FACE: Record<string, string> = {
  S: '✿ㅅ✿', A: '^ㅅ^', B: '·ㅅ·', C: ';ㅅ;', D: ';ㅅ;',
};

interface KkottiWidgetProps {
  products?: DashboardProduct[];
  productsLoading?: boolean;
}

export default function KkottiDashboardWidget({ products: propProducts, productsLoading }: KkottiWidgetProps = {}) {
  const [stats, setStats]           = useState<WidgetStats | null>(null);
  const [loading, setLoading]       = useState(true);
  const [sending, setSending]       = useState<string | null>(null);
  const [lastSent, setLastSent]     = useState<Record<string, boolean | null>>({});
  const [discordStatus, setDiscordStatus] = useState<boolean | null>(null);
  const [kkottiComment, setKkottiComment] = useState<string>('');
  const [commentLoading, setCommentLoading] = useState(false);

  const loadKkottiComment = useCallback(async (topRecs: DailyRec[], allProducts: any[]) => {
    setCommentLoading(true);
    try {
      // Build extended context: keywords, tags, categoryName, uploadReadiness
      const enriched = topRecs.map(r => {
        const raw = allProducts.find((p: any) => p.id === r.id);
        return {
          name:           r.name,
          score:          r.score,
          margin:         r.netMarginRate,
          keywords:       Array.isArray(raw?.keywords) ? raw.keywords : [],
          tags:           Array.isArray(raw?.tags)     ? raw.tags     : [],
          categoryName:   raw?.naverCategoryCode ?? '',
          uploadReadiness: raw?.uploadReadiness ?? undefined,
        };
      });
      const res = await fetch('/api/kkotti-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: 'slot_a', products: enriched }),
      });
      const data = await res.json();
      if (data.success && data.comment) setKkottiComment(data.comment);
    } catch { /* non-critical */ }
    finally { setCommentLoading(false); }
  }, []);

  // Compute stats from a product array (shared with parent load or own fetch)
  const computeStats = useCallback((raw: any[]) => {
    const scored = raw
      .filter((p: any) => p.salePrice > 0 && (p.supplierPrice ?? 0) > 0)
      .map((p: any) => ({
        id: p.id, name: p.name, sku: p.sku, status: p.status,
        updatedAt: p.updatedAt,
        supplierName: p.supplier?.name ?? p.supplierName,
        hs: calcHoneyScore({
          salePrice:    p.salePrice,
          supplierPrice: p.supplierPrice ?? 0,
          categoryId:   p.naverCategoryCode ?? '',
          productName:  p.name,
          keywords:     Array.isArray(p.keywords) ? p.keywords : [],
          tags:         Array.isArray(p.tags) ? p.tags : [],
          hasMainImage: !!p.mainImage,
        }),
      }));

    const activeScored = scored.filter((p: any) => p.status !== 'OUT_OF_STOCK');
    const oosScored    = scored.filter((p: any) => p.status === 'OUT_OF_STOCK');

    const topRecs: DailyRec[] = activeScored
      .sort((a: any, b: any) => b.hs.total - a.hs.total)
      .slice(0, 5)
      .map((p: any) => ({
        id: p.id, name: p.name, score: p.hs.total,
        grade: p.hs.grade, netMarginRate: p.hs.netMarginRate,
        supplierName: p.supplierName,
      }));

    const oosUrgent: OosProduct[] = oosScored
      .sort((a: any, b: any) => b.hs.total - a.hs.total)
      .slice(0, 5)
      .map((p: any) => ({
        id: p.id, name: p.name, sku: p.sku,
        honeyScore: p.hs.total, honeyGrade: p.hs.grade,
        daysOos: Math.floor((Date.now() - new Date(p.updatedAt ?? Date.now()).getTime()) / 86_400_000),
      }));

    const avg = activeScored.length > 0
      ? Math.round(activeScored.reduce((s: number, p: any) => s + p.hs.total, 0) / activeScored.length)
      : 0;

    const nextStats: WidgetStats = {
      totalProducts:  raw.length,
      activeProducts: raw.filter((p: any) => p.status === 'ACTIVE').length,
      oosProducts:    raw.filter((p: any) => p.status === 'OUT_OF_STOCK').length,
      avgHoneyScore:  avg,
      topRecs, oosUrgent,
    };
    setStats(nextStats);
    loadKkottiComment(topRecs, raw);
  }, [loadKkottiComment]);

  // Own fetch — only used when not driven by parent props
  const fetchAndCompute = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/products?limit=200');
      const data = await res.json();
      computeStats(data.products ?? data.data ?? []);
    } catch (e) {
      console.error('[KkottiWidget]', e);
    } finally {
      setLoading(false);
    }
  }, [computeStats]);

  // React to parent-provided products — skip own fetch entirely
  useEffect(() => {
    if (propProducts === undefined) return; // let fetchAndCompute handle it
    setLoading(productsLoading ?? false);
    if (!productsLoading) {
      computeStats(propProducts);
      setLoading(false);
    }
  }, [propProducts, productsLoading, computeStats]);

  // Own fetch — runs only once on mount when no parent props
  useEffect(() => {
    if (propProducts !== undefined) return; // parent is handling it
    fetchAndCompute();
  }, [fetchAndCompute, propProducts]);

  // Refresh button handler
  const handleRefresh = useCallback(() => {
    if (propProducts !== undefined) {
      computeStats(propProducts);
    } else {
      fetchAndCompute();
    }
  }, [propProducts, computeStats, fetchAndCompute]);

  const triggerDailyRec = async () => {
    setSending('daily');
    try {
      const res  = await fetch('/api/daily-recommendation', { method: 'POST' });
      const data = await res.json();
      setLastSent(prev => ({ ...prev, daily: data.sent ?? false }));
      setDiscordStatus(data.sent ?? false);
    } finally { setSending(null); }
  };

  const testDiscord = async () => {
    setSending('test');
    try {
      const res  = await fetch('/api/discord', { method: 'POST' });
      const data = await res.json();
      const anyOk = Object.values(data.results ?? {}).some((v: any) => v?.ok);
      setDiscordStatus(anyOk);
    } catch {
      setDiscordStatus(false);
    } finally { setSending(null); }
  };

  if (loading) {
    return (
      <div className="kk-card p-5 animate-pulse space-y-3">
        <div style={{ height: 16, background: '#F8DCE5', borderRadius: 8, width: '40%' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: 56, background: '#FFF0F5', borderRadius: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const avgGrade = stats.avgHoneyScore >= 85 ? 'S'
    : stats.avgHoneyScore >= 70 ? 'A'
    : stats.avgHoneyScore >= 50 ? 'B'
    : stats.avgHoneyScore >= 30 ? 'C' : 'D';
  const face = KKOTTI_FACE[avgGrade];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

      {/* ── 꼬띠 오늘의 추천 ──────────────────────────────── */}
      <div className="kk-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #F8DCE5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, #ffe4ed, #ffd0e0)',
              border: '2px solid #FFB3CE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#e62310', flexShrink: 0,
            }}>
              {face}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>꼬띠 오늘의 추천</p>
              <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>꿀통지수 상위 TOP {stats.topRecs.length}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={triggerDailyRec}
              disabled={sending === 'daily'}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                background: lastSent.daily ? '#dcfce7' : '#e62310',
                color: lastSent.daily ? '#15803d' : '#fff',
                border: lastSent.daily ? '1px solid #bbf7d0' : 'none',
                cursor: sending === 'daily' ? 'not-allowed' : 'pointer',
                opacity: sending === 'daily' ? 0.6 : 1,
              }}
            >
              <Bell size={10} />
              {sending === 'daily' ? '발송 중' : lastSent.daily ? '완료' : '디스코드'}
            </button>
            <button onClick={handleRefresh} style={{ padding: 6, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#B0A0A8' }}>
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {stats.topRecs.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 28, margin: '0 0 8px' }}>·ㅅ·</p>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
              판매가 + 공급가가 입력된 상품을 등록하면 쫳통지수가 계산됩니다.
            </p>
          </div>
        ) : (
          <>
            {(kkottiComment || commentLoading) && (
              <div style={{
                margin: '12px 20px 0', padding: '10px 14px',
                background: 'linear-gradient(135deg, #FFF0F5, #FFF8FA)',
                border: '1.5px solid #FFB3CE', borderRadius: 12,
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: '#e62310', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px',
                }}>
                  {face}
                </div>
                <p style={{ fontSize: 12, color: '#3A1A1A', margin: 0, lineHeight: 1.6, flex: 1 }}>
                  {commentLoading
                    ? <span style={{ color: '#B0A0A8' }}>코디가 생각 중...</span>
                    : kkottiComment}
                </p>
              </div>
            )}
            {stats.topRecs.map((rec, i) => {
              const gs = GRADE_STYLE[rec.grade];
              return (
                <div key={rec.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px',
                  borderBottom: i < stats.topRecs.length - 1 ? '1px solid #F8DCE5' : 'none',
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: i === 0 ? '#e62310' : i === 1 ? '#ff6b8a' : '#FFB3CE',
                    color: '#fff', fontSize: 11, fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.name}</p>
                    <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>
                      {rec.supplierName ? `${rec.supplierName} · ` : ''}
                      {rec.netMarginRate !== undefined ? `순마진 ${rec.netMarginRate.toFixed(1)}%` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: '#1A1A1A' }}>{rec.score}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: gs.bg, color: gs.text }}>{gs.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <a
                      href={`/products/new?prefillName=${encodeURIComponent(rec.name)}`}
                      title="씨앗 심기로 바로 등록"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                        background: '#e62310', color: '#fff', textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Package size={9} /> 등록
                    </a>
                    <a href="/naver-seo" title="SEO 조련사" style={{ color: '#FFB3CE', flexShrink: 0 }}><ExternalLink size={13} /></a>
                  </div>
                </div>
              );
            })}
            <div style={{ padding: '10px 20px', borderTop: '1px solid #F8DCE5', background: '#FFF8FB', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: '#B0A0A8', fontWeight: 600 }}>평균 쫳통지수</span>
              <div style={{ flex: 1, height: 6, background: '#F8DCE5', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(stats.avgHoneyScore, 100)}%`, height: '100%', background: stats.avgHoneyScore >= 70 ? '#e62310' : stats.avgHoneyScore >= 50 ? '#ff6b8a' : '#FFB3CE', borderRadius: 99, transition: 'width 0.6s ease' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#e62310', minWidth: 32 }}>{stats.avgHoneyScore}점</span>
            </div>
          </>
        )}
      </div>

      {/* ── 품절 현황 + 디스코드 1줄 ───────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="kk-card" style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #F8DCE5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={14} style={{ color: stats.oosProducts > 0 ? '#e62310' : '#B0A0A8' }} />
              <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>품절 현황</p>
              {stats.oosProducts > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#fee2e2', color: '#b91c1c' }}>
                  {stats.oosProducts}개
                </span>
              )}
            </div>
            <a href="/products/reactivation" style={{ fontSize: 12, fontWeight: 600, color: '#e62310', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              전체 <ExternalLink size={11} />
            </a>
          </div>

          {stats.oosUrgent.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, margin: '0 0 4px', color: '#e62310' }}>^ㅅ^</p>
              <p style={{ fontSize: 12, color: '#B0A0A8', margin: 0 }}>품절 상품 없음</p>
            </div>
          ) : (
            stats.oosUrgent.map((p, i) => {
              const gs = GRADE_STYLE[p.honeyGrade] ?? GRADE_STYLE['D'];
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderBottom: i < stats.oosUrgent.length - 1 ? '1px solid #F8DCE5' : 'none' }}>
                  <Package size={13} style={{ color: '#e62310', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    <p style={{ fontSize: 10, color: '#B0A0A8', margin: 0 }}>{p.daysOos > 0 ? `${p.daysOos}일째 품절` : '방금 품절'}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 99, background: gs.bg, color: gs.text, flexShrink: 0 }}>{p.honeyScore}</span>
                </div>
              );
            })
          )}
        </div>

        {/* 디스코드 1줄 연결 상태 */}
        <div className="kk-card" style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {discordStatus === true  ? <Wifi    size={14} style={{ color: '#16a34a' }} /> :
               discordStatus === false ? <WifiOff size={14} style={{ color: '#e62310' }} /> :
               <Zap size={14} style={{ color: '#B0A0A8' }} />}
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>디스코드 알림</p>
                <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>
                  {discordStatus === true  ? '연결됨 — 알림 채널 정상' :
                   discordStatus === false ? '연결 오류 — 설정을 확인해주세요' :
                   '미테스트 — 테스트 버튼으로 확인'}
                </p>
              </div>
            </div>
            <button
              onClick={testDiscord}
              disabled={sending === 'test'}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                borderRadius: 10, fontSize: 11, fontWeight: 700,
                background: discordStatus === true ? '#dcfce7' : '#e62310',
                color: discordStatus === true ? '#15803d' : '#fff',
                border: discordStatus === true ? '1px solid #bbf7d0' : 'none',
                cursor: sending === 'test' ? 'not-allowed' : 'pointer',
                opacity: sending === 'test' ? 0.6 : 1, flexShrink: 0,
              }}
            >
              <Zap size={10} />
              {sending === 'test' ? '테스트 중' : '전체 테스트'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
