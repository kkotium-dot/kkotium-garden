'use client';
// NaverSeoProductTable v3 — full inline SEO editing panel
// No emoji in JSX — Lucide React icons only

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import {
  ChevronDown, ChevronRight, Image as ImageIcon,
  Check, AlertTriangle, Zap, Heart, Target,
  RefreshCw, Edit2, TrendingUp, Save, X, MessageSquarePlus, FileText,
  Sparkles, MessageCircle, ThumbsUp, ThumbsDown, Plus,
} from 'lucide-react';
import Link from 'next/link';
import { calcUploadReadiness, getReadinessColor } from '@/lib/upload-readiness';
import { checkProductName, getGradeColor, getSeverityColor } from '@/lib/product-name-checker';
import { formatSearchVolume, getCompetitionColor, type KeywordStat } from '@/lib/naver/keyword-api';
import type { SentimentResult, KeywordWithSentiment, Sentiment } from '@/lib/review-sentiment-analyzer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeoDetail {
  categoryScore: number;
  titleScore: number;
  attributeScore: number;
  keywordScore: number;
  imageScore: number;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  mainImage: string | null;
  salePrice: number;
  supplierPrice?: number;
  shippingFee?: number;
  naverCategoryCode?: string | null;
  keywords?: string[];
  tags?: string[];
  shippingTemplateId?: string | null;
  naver_title: string | null;
  naver_keywords: string | null;
  naver_description: string | null;
  naver_brand: string | null;
  naver_origin: string | null;
  naver_material: string | null;
  naver_color: string | null;
  naver_size: string | null;
  naver_care_instructions: string | null;
  supplierName?: string | null;
  seoScore: number;
  seoDetail?: SeoDetail;
  suggestions: string[];
  needsImprovement: boolean;
  keywordCount: number;
  imageCount: number;
}

interface Props {
  products: Product[];
  onProductClick?: (productId: string) => void;
  selectedIds: string[];
  onSelectChange: (ids: string[]) => void;
  onAiGenerate?: (productId: string, style: 'orthodox' | 'emotional' | 'niche') => Promise<void>;
  onRefresh?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORY = '50003307';

function gradeBadgeStyle(score: number): { bg: string; color: string; label: string } {
  if (score >= 90) return { bg: '#F5F3FF', color: '#7C3AED', label: 'S' };
  if (score >= 75) return { bg: '#F0FDF4', color: '#16a34a', label: 'A' };
  if (score >= 60) return { bg: '#EFF6FF', color: '#2563EB', label: 'B' };
  if (score >= 45) return { bg: '#FFFBEB', color: '#D97706', label: 'C' };
  return              { bg: '#FFF0F5',  color: '#e62310',  label: 'D' };
}

// C-12: Inline competition level badge for table rows
function CompetitionCell({ productName }: { productName: string }) {
  const [level, setLevel] = useState<string | null>(null);

  useEffect(() => {
    if (!productName) return;
    let cancelled = false;
    fetch(`/api/naver/market-analysis?q=${encodeURIComponent(productName)}`)
      .then(r => r.json())
      .then(j => { if (!cancelled && j.success) setLevel(j.competition?.competitionLevel ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [productName]);

  const COMP_BADGE: Record<string, { bg: string; color: string; text: string }> = {
    LOW:       { bg: '#dcfce7', color: '#15803d', text: '\uB0AE\uC74C' },
    MEDIUM:    { bg: '#dbeafe', color: '#1d4ed8', text: '\uBCF4\uD1B5' },
    HIGH:      { bg: '#fef9c3', color: '#a16207', text: '\uB192\uC74C' },
    VERY_HIGH: { bg: '#fee2e2', color: '#b91c1c', text: '\uCE58\uC5F4' },
  };

  if (!level) return <div className="text-center text-[10px]" style={{ color: '#ccc' }}>-</div>;
  const s = COMP_BADGE[level] ?? COMP_BADGE.MEDIUM;
  return (
    <div className="text-center">
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
        {s.text}
      </span>
    </div>
  );
}

function ScoreBar({ detail, total }: { detail?: SeoDetail; total: number }) {
  if (!detail) return <span className="text-xs" style={{ color: '#B0A0A8' }}>{total}점</span>;
  const segments = [
    { label: '카테고리', score: detail.categoryScore, max: 25, color: '#e62310' },
    { label: '상품명',   score: detail.titleScore,     max: 25, color: '#F97316' },
    { label: '속성',     score: detail.attributeScore, max: 15, color: '#EAB308' },
    { label: '키워드',   score: detail.keywordScore,   max: 15, color: '#22C55E' },
    { label: '이미지',   score: detail.imageScore,     max: 20, color: '#3B82F6' },
  ];
  return (
    <div className="space-y-1.5">
      {segments.map(seg => (
        <div key={seg.label} className="flex items-center gap-2">
          <span className="text-[10px] w-14 shrink-0" style={{ color: '#B0A0A8' }}>{seg.label}</span>
          <div className="flex-1 rounded-full overflow-hidden" style={{ height: 5, background: '#F8DCE5' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${(seg.score / seg.max) * 100}%`, background: seg.score === seg.max ? seg.color : seg.score > 0 ? seg.color + 'AA' : '#F8DCE5' }} />
          </div>
          <span className="text-[10px] w-8 text-right font-mono" style={{ color: seg.score === seg.max ? seg.color : '#888' }}>
            {seg.score}/{seg.max}
          </span>
        </div>
      ))}
    </div>
  );
}

function CheckDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {ok
        ? <Check size={10} className="shrink-0" style={{ color: '#16a34a' }} />
        : <AlertTriangle size={10} className="shrink-0" style={{ color: '#e62310' }} />}
      <span style={{ color: ok ? '#16a34a' : '#e62310' }}>{label}</span>
    </div>
  );
}

// ─── Keyword Search Volume Panel ─────────────────────────────────────────────

function KeywordStatsPanel({ keywords }: { keywords: string[] }) {
  const [stats, setStats]     = useState<KeywordStat[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (loaded || loading || keywords.length === 0) return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`/api/naver/keyword-stats?keywords=${encodeURIComponent(keywords.slice(0, 5).join(','))}`);
      const data = await res.json();
      if (data.success) setStats(data.keywords);
      else setError(data.error ?? '검색량 조회 실패');
    } catch { setError('네트워크 오류'); }
    finally { setLoading(false); setLoaded(true); }
  }, [keywords, loaded, loading]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (keywords.length === 0) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <TrendingUp size={11} style={{ color: '#0891b2' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>월간 검색량</span>
      </div>
      {loading && <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><RefreshCw size={11} className="animate-spin" style={{ color: '#0891b2' }} /><span style={{ fontSize: 11, color: '#B0A0A8' }}>조회 중...</span></div>}
      {error && <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>{error === 'Naver Search Ad API credentials not configured' ? 'API 키 설정 필요' : error}</p>}
      {stats && stats.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {stats.map(s => {
            const comp = getCompetitionColor(s.competition);
            return (
              <div key={s.keyword} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99, background: '#f0f9ff', border: '1px solid #bae6fd', fontSize: 11 }}>
                <span style={{ fontWeight: 700, color: '#1A1A1A' }}>{s.keyword}</span>
                <span style={{ fontWeight: 800, color: '#0891b2' }}>{formatSearchVolume(s.totalMonthly)}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99, background: comp.bg, color: comp.text }}>
                  {s.competition === 'low' ? '저' : s.competition === 'mid' ? '중' : s.competition === 'high' ? '고' : '?'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── AI Style Buttons ─────────────────────────────────────────────────────────

const AI_STYLES = [
  { key: 'orthodox' as const, icon: Zap,    label: '정석 SEO',   desc: '검색량 최대화, 정확한 키워드 매칭', color: '#e62310', bg: '#FFF0F5', border: '#FFB3CE' },
  { key: 'emotional' as const, icon: Heart, label: '감성 타겟',  desc: '감성·시즌·선물 소구, 높은 클릭률',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  { key: 'niche' as const, icon: Target,    label: '틈새 키워드', desc: '세부 속성·롱테일, 낮은 경쟁',       color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
] as const;

// ─── Review Analysis Panel (E-11) ─────────────────────────────────────────────
// Pastes competitor reviews / wholesale text → AI sentiment analysis
// → suggests SEO tags directly applicable to the current product

function sentimentChipStyle(sentiment: Sentiment): React.CSSProperties {
  const PALETTE: Record<Sentiment, { bg: string; color: string; border: string }> = {
    POSITIVE: { bg: '#F0FDF4', color: '#15803d', border: '#86efac' },
    NEGATIVE: { bg: '#FEF2F2', color: '#b91c1c', border: '#fca5a5' },
    NEUTRAL:  { bg: '#F3F4F6', color: '#4b5563', border: '#d1d5db' },
  };
  const p = PALETTE[sentiment];
  return {
    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
    background: p.bg, color: p.color, border: `1px solid ${p.border}`,
  };
}

function sentimentLabel(sentiment: Sentiment): string {
  if (sentiment === 'POSITIVE') return '긍정';
  if (sentiment === 'NEGATIVE') return '부정';
  return '중립';
}

function ReviewAnalysisPanel({
  productName,
  currentTags,
  onApplyTag,
  onApplyAllTags,
  onApplySummary,
}: {
  productName: string;
  currentTags: string[];
  onApplyTag: (tag: string) => void;
  onApplyAllTags: (tags: string[]) => void;
  onApplySummary?: (summary: string) => void;
}) {
  const [reviewText, setReviewText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estimate review count from textarea (one review per non-empty line)
  const reviewLines = reviewText
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length >= 5);
  const reviewCount = reviewLines.length;
  const totalChars = reviewText.length;

  const canAnalyze = reviewCount >= 1 && reviewCount <= 50 && totalChars <= 30000 && !analyzing;

  const runAnalysis = async () => {
    if (!canAnalyze) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/review-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews: reviewLines, productName }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setResult(data.data as SentimentResult);
      } else {
        setError(data.error ?? '분석 실패');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '네트워크 오류');
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  // Filter suggested tags: skip ones already added
  const newTags = result
    ? result.suggestedTags.filter(t => !currentTags.includes(t))
    : [];
  const remainingSlots = 10 - currentTags.length;

  return (
    <div
      style={{
        gridColumn: '1 / -1',
        marginTop: 8,
        padding: 14,
        borderRadius: 12,
        background: '#FAFAFF',
        border: '1.5px dashed #C4B5FD',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} style={{ color: '#7C3AED' }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#7C3AED' }}>경쟁사 리뷰 / 도매 텍스트 AI 분석</span>
        </div>
        <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>
          무료 · Groq AI
        </span>
      </div>

      <p style={{ fontSize: 11, color: '#6B7280', margin: '0 0 10px', lineHeight: 1.55 }}>
        경쟁사 리뷰나 도매 사이트의 상품 설명을 한 줄에 하나씩 붙여넣고 분석하세요.
        AI가 감정·핵심 키워드를 추출하여 SEO 태그로 자동 추천합니다.
      </p>

      {/* Input area */}
      {!result && (
        <>
          <textarea
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            rows={5}
            placeholder="예시:&#10;정말 만족스러워요. 색이 예쁘고 가격대비 좋습니다&#10;선물로 드렸는데 받는 분이 매우 좋아하셨어요&#10;포장이 꼼꼼하고 배송도 빨라요"
            style={{
              width: '100%', fontSize: 12, padding: '10px 12px', borderRadius: 8,
              border: '1.5px solid #DDD6FE', outline: 'none', background: '#fff',
              color: '#1F2937', boxSizing: 'border-box', resize: 'vertical',
              fontFamily: 'inherit', lineHeight: 1.6,
            }}
            disabled={analyzing}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#6B7280' }}>
              <span style={{ fontWeight: 700, color: reviewCount >= 1 && reviewCount <= 50 ? '#16a34a' : '#dc2626' }}>
                {reviewCount}개 리뷰
              </span>
              <span>·</span>
              <span>{totalChars.toLocaleString()}자</span>
              {reviewCount > 50 && <span style={{ color: '#dc2626' }}>(50개 초과)</span>}
              {totalChars > 30000 && <span style={{ color: '#dc2626' }}>(30000자 초과)</span>}
            </div>
            <button
              onClick={runAnalysis}
              disabled={!canAnalyze}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 8,
                background: canAnalyze ? '#7C3AED' : '#D1D5DB',
                color: '#fff', border: 'none',
                cursor: canAnalyze ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s',
              }}
            >
              {analyzing
                ? <RefreshCw size={12} className="animate-spin" />
                : <Sparkles size={12} />}
              {analyzing ? '분석 중...' : 'AI 분석 시작'}
            </button>
          </div>

          {error && (
            <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FCA5A5', fontSize: 11, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={11} />
              <span>{error}</span>
            </div>
          )}
        </>
      )}

      {/* Result area */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* AI summary */}
          {result.aiSummary && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#fff', border: '1px solid #DDD6FE' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <MessageCircle size={11} style={{ color: '#7C3AED' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  AI 요약 ({result.reviewCount}개 분석 · {result.provider})
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.55 }}>{result.aiSummary}</p>
              {onApplySummary && (
                <button
                  onClick={() => onApplySummary(result.aiSummary)}
                  style={{
                    marginTop: 6, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                    background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                  }}
                >
                  <Plus size={10} /> 상품 설명에 추가
                </button>
              )}
            </div>
          )}

          {/* Sentiment distribution bar */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                감정 분포
              </span>
              <span style={sentimentChipStyle(result.overallSentiment)}>
                전반적: {sentimentLabel(result.overallSentiment)}
              </span>
            </div>
            <div style={{ display: 'flex', height: 22, borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
              {result.positiveRatio > 0 && (
                <div style={{ width: `${result.positiveRatio}%`, background: '#86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#15803d' }}>
                  {result.positiveRatio >= 12 ? `긍정 ${result.positiveRatio}%` : ''}
                </div>
              )}
              {result.neutralRatio > 0 && (
                <div style={{ width: `${result.neutralRatio}%`, background: '#D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#4b5563' }}>
                  {result.neutralRatio >= 12 ? `중립 ${result.neutralRatio}%` : ''}
                </div>
              )}
              {result.negativeRatio > 0 && (
                <div style={{ width: `${result.negativeRatio}%`, background: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#b91c1c' }}>
                  {result.negativeRatio >= 12 ? `부정 ${result.negativeRatio}%` : ''}
                </div>
              )}
            </div>
          </div>

          {/* Strengths + Pain points */}
          {(result.strengths.length > 0 || result.painPoints.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {result.strengths.length > 0 && (
                <div style={{ padding: '8px 10px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #86efac' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <ThumbsUp size={11} style={{ color: '#15803d' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#15803d' }}>강점</span>
                  </div>
                  <ul style={{ margin: 0, padding: '0 0 0 14px', fontSize: 11, color: '#166534', lineHeight: 1.6 }}>
                    {result.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {result.painPoints.length > 0 && (
                <div style={{ padding: '8px 10px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #fca5a5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <ThumbsDown size={11} style={{ color: '#b91c1c' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#b91c1c' }}>약점 (회피 포인트)</span>
                  </div>
                  <ul style={{ margin: 0, padding: '0 0 0 14px', fontSize: 11, color: '#991b1b', lineHeight: 1.6 }}>
                    {result.painPoints.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Top keywords with sentiment */}
          {result.topKeywords.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Top 키워드 (감정별)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {result.topKeywords.map((kw, i) => (
                  <span key={i} style={{ ...sentimentChipStyle(kw.sentiment), display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    {kw.keyword}
                    {kw.frequency > 1 && <span style={{ opacity: 0.7 }}>×{kw.frequency}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggested SEO tags — main payoff */}
          {result.suggestedTags.length > 0 && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#FFF0F5', border: '1.5px solid #FFB3CE' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Sparkles size={11} style={{ color: '#e62310' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#e62310', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    추천 SEO 태그 ({newTags.length}개 추가 가능 · 남은 슬롯 {remainingSlots}/10)
                  </span>
                </div>
                {newTags.length > 0 && remainingSlots > 0 && (
                  <button
                    onClick={() => onApplyAllTags(newTags.slice(0, remainingSlots))}
                    style={{
                      fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 6,
                      background: '#e62310', color: '#fff', border: 'none', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                    }}
                  >
                    <Plus size={10} /> 일괄 추가 ({Math.min(newTags.length, remainingSlots)}개)
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {result.suggestedTags.map((tag, i) => {
                  const already = currentTags.includes(tag);
                  return (
                    <button
                      key={i}
                      onClick={() => !already && remainingSlots > 0 && onApplyTag(tag)}
                      disabled={already || remainingSlots <= 0}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                        background: already ? '#E5E7EB' : '#fff',
                        color: already ? '#9CA3AF' : '#e62310',
                        border: `1px solid ${already ? '#D1D5DB' : '#FFB3CE'}`,
                        cursor: already || remainingSlots <= 0 ? 'not-allowed' : 'pointer',
                        textDecoration: already ? 'line-through' : 'none',
                      }}
                    >
                      {already ? <Check size={9} /> : <Plus size={9} />}
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reset / re-analyze */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={reset}
              style={{
                fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8,
                background: '#fff', color: '#6B7280', border: '1px solid #D1D5DB',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              <RefreshCw size={11} /> 다시 분석
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline SEO Edit Panel ────────────────────────────────────────────────────

function SeoEditPanel({
  product,
  onGenerate,
  onRefresh,
}: {
  product: Product;
  onGenerate: (style: 'orthodox' | 'emotional' | 'niche') => Promise<void>;
  onRefresh?: () => void;
}) {
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  // Editable SEO fields — initialized from product
  const [title, setTitle]       = useState(product.naver_title ?? '');
  const [keywords, setKeywords] = useState(product.naver_keywords ?? '');
  const [desc, setDesc]         = useState(product.naver_description ?? '');
  const [brand, setBrand]       = useState(product.naver_brand ?? '');
  const [origin, setOrigin]     = useState(product.naver_origin ?? '');
  const [material, setMaterial] = useState(product.naver_material ?? '');
  const [color, setColor]       = useState(product.naver_color ?? '');
  const [size, setSize]         = useState(product.naver_size ?? '');
  const [care, setCare]         = useState(product.naver_care_instructions ?? '');

  // Tag state
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags]         = useState<string[]>(product.tags ?? []);

  // Sync fields when AI generate refreshes (product prop changes)
  useEffect(() => {
    setTitle(product.naver_title ?? '');
    setKeywords(product.naver_keywords ?? '');
    setDesc(product.naver_description ?? '');
    setBrand(product.naver_brand ?? '');
    setOrigin(product.naver_origin ?? '');
    setMaterial(product.naver_material ?? '');
    setColor(product.naver_color ?? '');
    setSize(product.naver_size ?? '');
    setCare(product.naver_care_instructions ?? '');
    setTags(product.tags ?? []);
  }, [product]);

  const handleAiClick = async (style: 'orthodox' | 'emotional' | 'niche') => {
    if (aiLoading) return;
    setAiLoading(style);
    try { await onGenerate(style); }
    finally { setAiLoading(null); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naver_title: title || null,
          naver_keywords: keywords || null,
          naver_description: desc || null,
          naver_brand: brand || null,
          naver_origin: origin || null,
          naver_material: material || null,
          naver_color: color || null,
          naver_size: size || null,
          naver_care_instructions: care || null,
          tags,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onRefresh?.();
    } finally { setSaving(false); }
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (!t || tags.includes(t) || tags.length >= 10) return;
    setTags(prev => [...prev, t]);
    setTagInput('');
  };

  // Input style helper
  const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', fontSize: 12, padding: '7px 10px', borderRadius: 8,
    border: '1.5px solid #F8DCE5', outline: 'none', background: '#fff',
    color: '#1A1A1A', boxSizing: 'border-box', ...extra,
  });
  const lbl = (extra?: React.CSSProperties): React.CSSProperties => ({
    fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase',
    letterSpacing: '0.05em', display: 'block', marginBottom: 4, ...extra,
  });

  return (
    <div style={{ paddingTop: 12 }}>
      {/* AI style buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <p style={lbl({ marginBottom: 0 })}>꼼띄 AI 최적화 — 스타일 선택</p>
            <button
              onClick={async () => {
                try {
                  const r = await fetch(`/api/products/${product.id}/aeo-generate`, { method: 'POST' });
                  const j = await r.json();
                  if (j.success) alert(`AEO Q&A ${j.qnaCount}개 + FAQ ${j.faqCount}개 생성 완료 (${j.provider})`);
                  else alert(j.error || 'AEO 생성 실패');
                } catch { alert('AEO API 오류'); }
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac',
                cursor: 'pointer',
              }}
            >
              <FileText size={12} />
              {'AEO Q&A 생성'}
            </button>
          </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {AI_STYLES.map(({ key, icon: Icon, label, desc: d, color, bg, border }) => (
          <button
            key={key}
            onClick={() => handleAiClick(key)}
            disabled={!!aiLoading}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              padding: '10px 8px', borderRadius: 10,
              background: aiLoading === key ? bg : '#fff',
              border: `1.5px solid ${aiLoading === key ? color : border}`,
              cursor: aiLoading ? 'not-allowed' : 'pointer',
              opacity: aiLoading && aiLoading !== key ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            {aiLoading === key
              ? <RefreshCw size={15} className="animate-spin" style={{ color }} />
              : <Icon size={15} style={{ color }} />}
            <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
            <span style={{ fontSize: 10, color: '#888', textAlign: 'center', lineHeight: 1.4 }}>{d}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#F8DCE5', marginBottom: 14 }} />

      {/* SEO fields — all editable */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ ...lbl(), margin: 0 }}>SEO 검색최적화 필드 직접 편집</p>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8,
            background: saved ? '#16a34a' : '#e62310', color: '#fff',
            border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1, transition: 'background 0.2s',
          }}
        >
          {saving ? <RefreshCw size={11} className="animate-spin" /> : saved ? <Check size={11} /> : <Save size={11} />}
          {saving ? '저장 중...' : saved ? '저장 완료!' : '전체 저장'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

        {/* 네이버 상품명 — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={lbl()}>
            네이버 상품명
            <span style={{ fontWeight: 400, color: '#B0A0A8', marginLeft: 4 }}>({title.length}/40자 권장)</span>
          </label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="검색 노출용 상품명 (25~35자 권장)"
            style={inp({ borderColor: title.length >= 25 && title.length <= 40 ? '#22C55E' : '#F8DCE5' })} />
          {/* D-1: Name quality check */}
          {title.length >= 5 && (() => {
            const nq = checkProductName(title, { keywords: keywords.split(',').filter(k => k.trim()) });
            return nq.issues.length > 0 ? (
              <div style={{ marginTop: 4 }}>
                {nq.issues.slice(0, 2).map((issue, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: 11, color: getSeverityColor(issue.severity), marginTop: 2 }}>
                    <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{issue.message}</span>
                  </div>
                ))}
                {nq.issues.length > 2 && (
                  <span style={{ fontSize: 10, color: '#B0A0A8', marginLeft: 16 }}>+{nq.issues.length - 2}\uAC74 \uCD94\uAC00</span>
                )}
              </div>
            ) : null;
          })()}
        </div>

        {/* 키워드 — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={lbl()}>
            SEO 키워드
            <span style={{ fontWeight: 400, color: '#B0A0A8', marginLeft: 4 }}>쉼표로 구분, 5~7개 권장</span>
          </label>
          <input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="키워드1,키워드2,키워드3,키워드4,키워드5"
            style={inp({ borderColor: keywords.split(',').filter(k => k.trim()).length >= 5 ? '#22C55E' : '#F8DCE5' })} />
          {/* keyword preview chips */}
          {keywords && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
              {keywords.split(',').filter(k => k.trim()).map((kw, i) => (
                <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#F8DCE5', color: '#e62310', fontWeight: 600 }}>{kw.trim()}</span>
              ))}
            </div>
          )}
        </div>

        {/* 상품 설명 — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={lbl()}>
            상품 설명 (SEO 메모)
            <span style={{ fontWeight: 400, color: '#B0A0A8', marginLeft: 4 }}>({desc.length}자 / 80~200자 권장)</span>
          </label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
            placeholder="상품의 특징, 용도, 타겟 고객을 자연스럽게 설명하세요"
            style={{ ...inp(), resize: 'vertical', lineHeight: 1.6, borderColor: desc.length >= 80 ? '#22C55E' : '#F8DCE5' }} />
        </div>

        {/* 속성 2열 */}
        <div>
          <label style={lbl()}>브랜드</label>
          <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="브랜드명 (없으면 빈칸)" style={inp()} />
        </div>
        <div>
          <label style={lbl()}>원산지</label>
          <input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="예: 국내산, 중국산" style={inp()} />
        </div>
        <div>
          <label style={lbl()}>소재</label>
          <input value={material} onChange={e => setMaterial(e.target.value)} placeholder="예: 면100%, 폴리에스터" style={inp()} />
        </div>
        <div>
          <label style={lbl()}>색상</label>
          <input value={color} onChange={e => setColor(e.target.value)} placeholder="예: 화이트, 블랙, 핑크" style={inp()} />
        </div>
        <div>
          <label style={lbl()}>사이즈</label>
          <input value={size} onChange={e => setSize(e.target.value)} placeholder="예: FREE, S/M/L/XL" style={inp()} />
        </div>
        <div>
          <label style={lbl()}>세탁/관리방법</label>
          <input value={care} onChange={e => setCare(e.target.value)} placeholder="예: 손세탁 권장, 드라이클리닝" style={inp()} />
        </div>

        {/* 태그 — full width */}
        <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #F8DCE5', paddingTop: 12 }}>
          <label style={lbl()}>SEO 태그 ({tags.length}/10)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {tags.map(tag => (
              <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#FFF0F5', color: '#e62310', border: '1px solid #FFB3CE' }}>
                #{tag}
                <button onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FFB3CE', padding: 0, lineHeight: 1, fontSize: 14, display: 'flex', alignItems: 'center' }}>
                  <X size={10} />
                </button>
              </span>
            ))}
            {tags.length === 0 && <span style={{ fontSize: 11, color: '#B0A0A8' }}>태그를 추가하세요 (최대 10개)</span>}
          </div>
          {tags.length < 10 && (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="태그 입력 후 Enter"
                style={{ ...inp({ flex: '1' }) }}
              />
              <button onClick={addTag}
                style={{ fontSize: 11, fontWeight: 700, padding: '7px 12px', borderRadius: 8, background: '#FFF0F5', color: '#e62310', border: '1px solid #FFB3CE', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                + 추가
              </button>
            </div>
          )}
        </div>

        {/* E-11: Review analysis panel — paste competitor reviews → AI suggested tags */}
        <ReviewAnalysisPanel
          productName={product.name}
          currentTags={tags}
          onApplyTag={(tag) => {
            if (!tags.includes(tag) && tags.length < 10) {
              setTags(prev => [...prev, tag]);
            }
          }}
          onApplyAllTags={(newTags) => {
            setTags(prev => {
              const merged = [...prev];
              for (const t of newTags) {
                if (!merged.includes(t) && merged.length < 10) merged.push(t);
              }
              return merged;
            });
          }}
          onApplySummary={(summary) => {
            setDesc(prev => {
              if (!prev) return summary;
              if (prev.includes(summary)) return prev;
              return prev + (prev.endsWith('\n') ? '' : '\n') + summary;
            });
          }}
        />
      </div>
    </div>
  );
}

// ─── Main Table ───────────────────────────────────────────────────────────────

export default function NaverSeoProductTable({
  products,
  onProductClick,
  selectedIds,
  onSelectChange,
  onAiGenerate,
  onRefresh,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSelectAll = () => {
    onSelectChange(selectedIds.length === products.length ? [] : products.map(p => p.id));
  };
  const handleSelectOne = (id: string) => {
    onSelectChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  };
  const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id);

  const handleAiGenerate = async (productId: string, style: 'orthodox' | 'emotional' | 'niche') => {
    if (!onAiGenerate) return;
    await onAiGenerate(productId, style);
    onRefresh?.();
  };

  if (products.length === 0) {
    return (
      <div className="py-16 text-center rounded-2xl" style={{ background: '#fff', border: '1.5px solid #F8DCE5' }}>
        <PackageIcon size={32} className="mx-auto mb-3" style={{ color: '#F8DCE5' }} />
        <p className="text-sm" style={{ color: '#B0A0A8' }}>표시할 상품이 없습니다</p>
      </div>
    );
  }

  const isAllSelected   = selectedIds.length === products.length && products.length > 0;
  const isSomeSelected  = selectedIds.length > 0 && selectedIds.length < products.length;
  const COL = '36px 1fr 80px 200px 160px 100px';

  return (
    <div style={{ background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 18, overflow: 'hidden' }}>
      {/* Header */}
      <div className="grid items-center gap-3 px-4"
        style={{ gridTemplateColumns: COL, background: '#FFF0F5', borderBottom: '2px solid #FFB3CE', paddingTop: 10, paddingBottom: 10 }}>
        <input type="checkbox" checked={isAllSelected}
          ref={input => { if (input) input.indeterminate = isSomeSelected; }}
          onChange={handleSelectAll}
          className="w-4 h-4 rounded border-gray-300 text-[#E8001F] focus:ring-[#E8001F]/30" />
        {['상품명 / SKU', '경쟁', 'SEO 점수 상세', '체크리스트', '작업'].map(h => (
          <span key={h} className="text-[11px] font-black tracking-wide" style={{ color: '#e62310' }}>{h}</span>
        ))}
      </div>
      <div style={{ height: 1, background: '#F8DCE5' }} />

      {/* Rows */}
      {products.map((product, idx) => {
        const isSelected = selectedIds.includes(product.id);
        const isExpanded = expandedId === product.id;
        const { bg, color, label } = gradeBadgeStyle(product.seoScore);
        const kwArr = [
          ...(product.naver_keywords ?? '').split(',').map(k => k.trim()).filter(Boolean),
          ...(product.keywords ?? []),
        ].filter((v, i, a) => v && a.indexOf(v) === i);
        const hasCat = product.naverCategoryCode && product.naverCategoryCode !== DEFAULT_CATEGORY;
        const isLast = idx === products.length - 1;

        return (
          <div key={product.id}>
            {/* Main row */}
            <div
              className="group transition-colors"
              style={{
                background: isSelected ? 'rgba(230,35,16,0.04)' : 'transparent',
                borderLeft: isExpanded ? '3px solid #e62310' : '3px solid transparent',
              }}
              onMouseEnter={e => { if (!isSelected && !isExpanded) (e.currentTarget as HTMLElement).style.background = '#FFF8FA'; }}
              onMouseLeave={e => { if (!isSelected && !isExpanded) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <div className="grid items-center gap-3 px-4 py-3 cursor-pointer"
                style={{ gridTemplateColumns: COL }}
                onClick={() => toggleExpand(product.id)}>

                {/* Checkbox */}
                <div onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={isSelected} onChange={() => handleSelectOne(product.id)}
                    className="w-4 h-4 rounded border-gray-300 text-[#E8001F] focus:ring-[#E8001F]/30" />
                </div>

                {/* Image + Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden" style={{ background: '#F8DCE5' }}>
                    {product.mainImage ? (
                      <Image src={product.mainImage} alt={product.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon size={18} style={{ color: '#FFB3CE' }} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: bg, color }}>{label}급</span>
                      <span className="text-xs font-bold" style={{ color }}>{product.seoScore}점</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate leading-snug">{product.name}</p>
                    {product.naver_title && product.naver_title !== product.name
                      ? <p className="text-xs truncate mt-0.5" style={{ color: '#D97706', fontWeight: 600 }}>네이버명: {product.naver_title}</p>
                      : product.naver_title
                        ? <p className="text-xs truncate mt-0.5" style={{ color: '#B0A0A8' }}>네이버: {product.naver_title}</p>
                        : <p className="text-xs mt-0.5" style={{ color: '#FFB3CE' }}>네이버 상품명 미입력 — 행 클릭 후 편집</p>
                    }
                  </div>
                  {isExpanded
                    ? <ChevronDown size={14} className="shrink-0" style={{ color: '#e62310' }} />
                    : <ChevronRight size={14} className="shrink-0" style={{ color: '#D4B0BC' }} />}
                </div>

                {/* Competition level cell — C-12 */}
                <CompetitionCell productName={product.name} />

                {/* Score bar */}
                <ScoreBar detail={product.seoDetail} total={product.seoScore} />

                {/* Checklist + Readiness */}
                <div className="space-y-1">
                  {(() => {
                    const rd = calcUploadReadiness({
                      naverCategoryCode: product.naverCategoryCode ?? undefined,
                      keywords: product.keywords ?? [],
                      tags: product.tags ?? [],
                      name: product.name,
                      mainImage: product.mainImage ?? undefined,
                      shippingTemplateId: product.shippingTemplateId ?? undefined,
                      salePrice: product.salePrice,
                      supplierPrice: product.supplierPrice ?? 0,
                      shippingFee: product.shippingFee ?? 3000,
                    });
                    const rdCol = getReadinessColor(rd.score);
                    return (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 10, color: '#888', fontWeight: 600 }}>업로드 준비도</span>
                          <span style={{ fontSize: 11, fontWeight: 800, color: rdCol }}>{rd.score}%</span>
                        </div>
                        <div style={{ height: 4, background: '#F8DCE5', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                          <div style={{ width: `${rd.score}%`, height: '100%', background: rdCol, borderRadius: 99, transition: 'width 0.4s' }} />
                        </div>
                      </>
                    );
                  })()}
                  <CheckDot ok={!!hasCat} label="카테고리" />
                  <CheckDot ok={!!(product.naver_title && product.naver_title.length >= 15)} label="상품명" />
                  <CheckDot ok={product.keywordCount >= 5} label={`키워드 ${product.keywordCount}/5`} />
                  <CheckDot ok={!!product.naver_brand && !!product.naver_material} label="속성" />
                  <CheckDot ok={product.imageCount >= 2} label={`이미지 ${product.imageCount}장`} />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  <Link href={`/products/new?edit=${product.id}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition"
                    style={{ background: '#FFF0F5', color: '#e62310', border: '1px solid #FFB3CE' }}>
                    <Edit2 size={11} /> 수정
                  </Link>
                </div>
              </div>
            </div>

            {/* Expanded SEO edit panel */}
            {isExpanded && (
              <div className="px-5 pb-5" style={{ background: '#FDFAFC', borderTop: '1.5px solid #F8DCE5' }}>

                {/* Suggestions */}
                {product.suggestions.length > 0 && (
                  <div style={{ paddingTop: 12, paddingBottom: 10 }}>
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#e62310' }}>개선 필요 항목</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {product.suggestions.slice(0, 4).map((s, i) => (
                        <p key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#666', margin: 0 }}>
                          <AlertTriangle size={10} className="shrink-0 mt-0.5" style={{ color: '#e62310' }} />
                          {s}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Keyword search volume */}
                {kwArr.length > 0 && (
                  <div style={{ paddingBottom: 10, borderBottom: '1px solid #F8DCE5' }}>
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#888' }}>현재 키워드</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                      {kwArr.map((kw, i) => (
                        <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#F8DCE5', color: '#e62310', fontWeight: 600 }}>{kw}</span>
                      ))}
                    </div>
                    <KeywordStatsPanel keywords={kwArr.slice(0, 5)} />
                  </div>
                )}

                {/* Full SEO edit panel */}
                {onAiGenerate && (
                  <SeoEditPanel
                    product={product}
                    onGenerate={(style) => handleAiGenerate(product.id, style)}
                    onRefresh={onRefresh}
                  />
                )}
              </div>
            )}

            {!isLast && <div style={{ height: 1, background: '#F8DCE5', margin: '0 16px' }} />}
          </div>
        );
      })}

      {/* Footer */}
      <div className="px-4 py-2.5 flex items-center justify-between text-xs"
        style={{ borderTop: '1px solid #F8DCE5', background: '#FFF8FA', color: '#B0A0A8' }}>
        <span>{products.length}개 상품</span>
        {selectedIds.length > 0 && (
          <span style={{ color: '#e62310', fontWeight: 700 }}>{selectedIds.length}개 선택됨</span>
        )}
      </div>
    </div>
  );
}

function PackageIcon({ size, className, style }: { size: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M16.5 9.4 7.55 4.24"/>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}
