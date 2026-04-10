'use client';
// NaverSeoProductTable v2 — Kkotium garden design system
// Inline accordion AI: orthodox / emotional / niche
// No emoji in JSX — Lucide React icons only

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import {
  ChevronDown, ChevronRight, Tag, Image as ImageIcon,
  Check, AlertTriangle, Zap, Heart, Target,
  RefreshCw, Edit2, TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { calcUploadReadiness, getReadinessColor } from '@/lib/upload-readiness';
import { formatSearchVolume, getCompetitionColor, type KeywordStat } from '@/lib/naver/keyword-api';

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

// Mini 5-segment score bar
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
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(seg.score / seg.max) * 100}%`, background: seg.score === seg.max ? seg.color : seg.score > 0 ? seg.color + 'AA' : '#F8DCE5' }}
            />
          </div>
          <span className="text-[10px] w-8 text-right font-mono" style={{ color: seg.score === seg.max ? seg.color : '#888' }}>
            {seg.score}/{seg.max}
          </span>
        </div>
      ))}
    </div>
  );
}

// Checklist dot row
function CheckDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {ok
        ? <Check size={10} className="shrink-0" style={{ color: '#16a34a' }} />
        : <AlertTriangle size={10} className="shrink-0" style={{ color: '#e62310' }} />
      }
      <span style={{ color: ok ? '#16a34a' : '#e62310' }}>{label}</span>
    </div>
  );
}

// ─── Keyword Search Volume Panel ─────────────────────────────────────────────
// Loads on accordion open — shows monthly search volume + competition per keyword

function KeywordStatsPanel({ keywords }: { keywords: string[] }) {
  const [stats, setStats]   = useState<KeywordStat[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (loaded || loading || keywords.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const kws = keywords.slice(0, 5).join(',');
      const res  = await fetch(`/api/naver/keyword-stats?keywords=${encodeURIComponent(kws)}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.keywords);
      } else {
        setError(data.error ?? '검색량 조회 실패');
      }
    } catch {
      setError('네트워크 오류');
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [keywords, loaded, loading]);

  // Auto-load on mount
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (keywords.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <TrendingUp size={11} style={{ color: '#0891b2' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            월간 검색량
          </span>
        </div>
        {!loaded && !loading && (
          <button
            onClick={load}
            style={{ fontSize: 10, fontWeight: 700, color: '#0891b2', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}
          >
            조회
          </button>
        )}
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 0' }}>
          <RefreshCw size={11} className="animate-spin" style={{ color: '#0891b2' }} />
          <span style={{ fontSize: 11, color: '#B0A0A8' }}>네이버 검색광고 API 조회 중...</span>
        </div>
      )}

      {error && (
        <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>
          {error === 'Naver Search Ad API credentials not configured'
            ? 'API 키 설정 필요 (네이버 기본값 메뉴)'
            : error}
        </p>
      )}

      {stats && stats.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {stats.map(s => {
            const comp = getCompetitionColor(s.competition);
            return (
              <div
                key={s.keyword}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 9px', borderRadius: 99,
                  background: '#f0f9ff', border: '1px solid #bae6fd',
                  fontSize: 11,
                }}
              >
                <span style={{ fontWeight: 700, color: '#1A1A1A' }}>{s.keyword}</span>
                <span style={{ fontWeight: 800, color: '#0891b2' }}>{formatSearchVolume(s.totalMonthly)}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99,
                  background: comp.bg, color: comp.text,
                }}>
                  {s.competition === 'low' ? '저' : s.competition === 'mid' ? '중' : s.competition === 'high' ? '고' : '?'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {stats && stats.length === 0 && (
        <p style={{ fontSize: 11, color: '#B0A0A8' }}>검색량 데이터 없음</p>
      )}
    </div>
  );
}

// ─── AI Style Accordion (inline) ─────────────────────────────────────────────

const AI_STYLES = [
  {
    key: 'orthodox' as const,
    icon: Zap,
    label: '정석 SEO',
    desc: '검색량 최대화, 정확한 키워드 매칭',
    color: '#e62310',
    bg: '#FFF0F5',
    border: '#FFB3CE',
  },
  {
    key: 'emotional' as const,
    icon: Heart,
    label: '감성 타겟',
    desc: '감성·시즌·선물 소구, 높은 클릭률',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  {
    key: 'niche' as const,
    icon: Target,
    label: '틈새 키워드',
    desc: '세부 속성·롱테일, 낮은 경쟁·높은 전환',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
  },
] as const;

function AiAccordion({
  productId,
  productName,
  currentTags,
  onGenerate,
  onSaveTags,
}: {
  productId: string;
  productName: string;
  currentTags?: string[];
  onGenerate: (style: 'orthodox' | 'emotional' | 'niche') => Promise<void>;
  onSaveTags?: (tags: string[]) => Promise<void>;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(currentTags ?? []);
  const [savingTags, setSavingTags] = useState(false);

  const handleClick = async (style: 'orthodox' | 'emotional' | 'niche') => {
    if (loading) return;
    setLoading(style);
    try { await onGenerate(style); }
    finally { setLoading(null); }
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (!t || tags.includes(t) || tags.length >= 10) return;
    setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handleSaveTags = async () => {
    if (!onSaveTags) return;
    setSavingTags(true);
    try { await onSaveTags(tags); }
    finally { setSavingTags(false); }
  };

  return (
    <>
      {/* AI style buttons */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {AI_STYLES.map(({ key, icon: Icon, label, desc, color, bg, border }) => (
          <button
            key={key}
            onClick={() => handleClick(key)}
            disabled={!!loading}
            className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border transition disabled:opacity-50"
            style={{ background: loading === key ? bg : '#fff', border: `1.5px solid ${loading === key ? color : border}`, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading === key
              ? <RefreshCw size={16} className="animate-spin" style={{ color }} />
              : <Icon size={16} style={{ color }} />
            }
            <span className="text-xs font-bold" style={{ color }}>{label}</span>
            <span className="text-[10px] text-center leading-tight" style={{ color: '#888' }}>{desc}</span>
          </button>
        ))}
      </div>

      {/* Tags inline editor */}
      <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #F8DCE5' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            SEO 태그 ({tags.length}/10)
          </span>
          {tags.length !== (currentTags ?? []).length || tags.some((t, i) => t !== (currentTags ?? [])[i]) ? (
            <button
              onClick={handleSaveTags}
              disabled={savingTags}
              style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#e62310', border: 'none', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', opacity: savingTags ? 0.6 : 1 }}
            >
              {savingTags ? '저장 중...' : '태그 저장'}
            </button>
          ) : null}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {tags.map(tag => (
            <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#FFF0F5', color: '#e62310', border: '1px solid #FFB3CE' }}>
              #{tag}
              <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FFB3CE', padding: 0, lineHeight: 1, fontSize: 13 }}>x</button>
            </span>
          ))}
          {tags.length === 0 && <span style={{ fontSize: 11, color: '#B0A0A8' }}>태그를 추가하세요 (10개 권장)</span>}
        </div>
        {tags.length < 10 && (
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="태그 입력 (Enter)"
              style={{ flex: 1, fontSize: 11, padding: '4px 10px', borderRadius: 8, border: '1.5px solid #F8DCE5', outline: 'none', background: '#fff' }}
            />
            <button onClick={addTag} style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: '#FFF0F5', color: '#e62310', border: '1px solid #FFB3CE', cursor: 'pointer' }}>
              + 추가
            </button>
          </div>
        )}
      </div>
    </>
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
        <Package size={32} className="mx-auto mb-3" style={{ color: '#F8DCE5' }} />
        <p className="text-sm" style={{ color: '#B0A0A8' }}>표시할 상품이 없습니다</p>
      </div>
    );
  }

  const isAllSelected = selectedIds.length === products.length && products.length > 0;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < products.length;

  // Grid: checkbox | image+name | score bar | checklist | actions
  const COL = '36px 1fr 200px 160px 100px';

  return (
    <div style={{ background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 18, overflow: 'hidden' }}>
      {/* Header */}
      <div className="grid items-center gap-3 px-4"
        style={{ gridTemplateColumns: COL, background: '#FFF0F5', borderBottom: '2px solid #FFB3CE', paddingTop: 10, paddingBottom: 10 }}>
        <input
          type="checkbox"
          checked={isAllSelected}
          ref={input => { if (input) input.indeterminate = isSomeSelected; }}
          onChange={handleSelectAll}
          className="w-4 h-4 rounded border-gray-300 text-[#E8001F] focus:ring-[#E8001F]/30"
        />
        {['상품명 / SKU', 'SEO 점수 상세', '체크리스트', '작업'].map(h => (
          <span key={h} className="text-[11px] font-black tracking-wide" style={{ color: '#e62310' }}>{h}</span>
        ))}
      </div>
      <div style={{ height: 1, background: '#F8DCE5' }} />

      {/* Rows */}
      {products.map((product, idx) => {
        const isSelected  = selectedIds.includes(product.id);
        const isExpanded  = expandedId === product.id;
        const { bg, color, label } = gradeBadgeStyle(product.seoScore);
        const kwArr = [
          // Merge naver_keywords (comma string) + keywords array — deduplicated
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
                onClick={() => toggleExpand(product.id)}
              >
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
                    {/* AI-generated title comparison — show when naver_title differs from name */}
                    {product.naver_title && product.naver_title !== product.name ? (
                      <div style={{ marginTop: 3, padding: '4px 8px', background: '#FFF8F0', border: '1px solid #FDE68A', borderRadius: 8 }} onClick={e => e.stopPropagation()}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: '#D97706', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI 생성명</p>
                        <p className="text-xs truncate" style={{ color: '#92400E', fontWeight: 600 }}>{product.naver_title}</p>
                        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                          <button
                            onClick={async () => {
                              await fetch(`/api/products/${product.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name: product.naver_title }),
                              });
                              onRefresh?.();
                            }}
                            style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: '#D97706', color: '#fff', border: 'none', cursor: 'pointer' }}
                          >
                            적용
                          </button>
                          <button
                            onClick={async () => {
                              await fetch(`/api/products/${product.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ naver_title: null }),
                              });
                              onRefresh?.();
                            }}
                            style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: '#f3f4f6', color: '#6B7280', border: '1px solid #e5e7eb', cursor: 'pointer' }}
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : product.naver_title ? (
                      <p className="text-xs truncate mt-0.5" style={{ color: '#B0A0A8' }}>네이버: {product.naver_title}</p>
                    ) : (
                      <p className="text-xs mt-0.5" style={{ color: '#FFB3CE' }}>네이버 상품명 미입력</p>
                    )}
                  </div>
                  {isExpanded
                    ? <ChevronDown size={14} className="shrink-0" style={{ color: '#e62310' }} />
                    : <ChevronRight size={14} className="shrink-0" style={{ color: '#D4B0BC' }} />
                  }
                </div>

                {/* Score bar */}
                <ScoreBar detail={product.seoDetail} total={product.seoScore} />

                {/* Checklist + Readiness mini bar */}
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
                  <CheckDot ok={!!hasCat}                                         label="카테고리" />
                  <CheckDot ok={!!(product.naver_title && product.naver_title.length >= 15)} label="상품명" />
                  <CheckDot ok={product.keywordCount >= 5}                        label={`키워드 ${product.keywordCount}/5`} />
                  <CheckDot ok={!!product.naver_brand && !!product.naver_material} label="속성" />
                  <CheckDot ok={product.imageCount >= 2}                          label={`이미지 ${product.imageCount}장`} />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  <Link
                    href={`/products/new?edit=${product.id}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition"
                    style={{ background: '#FFF0F5', color: '#e62310', border: '1px solid #FFB3CE' }}
                  >
                    <Edit2 size={11} /> 수정
                  </Link>
                </div>
              </div>
            </div>

            {/* Expanded AI accordion */}
            {isExpanded && (
              <div className="px-4 pb-4" style={{ background: '#FFF8FA', borderTop: '1px solid #F8DCE5' }}>
                {/* Suggestions */}
                {product.suggestions.length > 0 && (
                  <div className="pt-3 pb-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#888' }}>개선 필요 항목</p>
                    <div className="space-y-1">
                      {product.suggestions.slice(0, 5).map((s, i) => (
                        <p key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#666' }}>
                          <AlertTriangle size={10} className="shrink-0 mt-0.5" style={{ color: '#e62310' }} />
                          {s}
                        </p>
                      ))}
                      {product.suggestions.length > 5 && (
                        <p className="text-xs" style={{ color: '#B0A0A8' }}>+{product.suggestions.length - 5}개 더</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Keyword preview + search volume stats */}
                {kwArr.length > 0 && (
                  <div className="py-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#888' }}>현재 키워드</p>
                    <div className="flex flex-wrap gap-1">
                      {kwArr.map((kw, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-lg font-medium"
                          style={{ background: '#F8DCE5', color: '#e62310' }}>
                          {kw}
                        </span>
                      ))}
                    </div>
                    {/* Search volume panel — auto-loads on accordion open */}
                    <KeywordStatsPanel keywords={kwArr.slice(0, 5)} />
                  </div>
                )}

                {/* AI style buttons + tags inline editor */}
                {onAiGenerate && (
                  <div className="pt-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#888' }}>
                      꼬띠 AI 최적화 — 스타일 선택
                    </p>
                    <AiAccordion
                      productId={product.id}
                      productName={product.name}
                      currentTags={product.tags ?? []}
                      onGenerate={(style) => handleAiGenerate(product.id, style)}
                      onSaveTags={async (tags) => {
                        await fetch(`/api/products/${product.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ tags }),
                        });
                        onRefresh?.();
                      }}
                    />
                  </div>
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

// Needed for empty state (imported locally since no global Package in this file)
function Package({ size, className, style }: { size: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}
