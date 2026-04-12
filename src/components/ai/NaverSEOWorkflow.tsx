'use client';

// NaverSEOWorkflow — 꼬띠 황금 키워드 사냥꾼
// 5단계: 카테고리 / 황금키워드 / 상품명 3종 / 태그 / 훅문구
// Design: app unified style — #e62310 accent, #FFB3CE lines, Kkotti face by state

import { useState, useMemo, useEffect } from 'react';
import {
  Sparkles, RotateCcw, Check, Loader2,
  Tag, Search, FileText, Zap, LayoutGrid,
  ChevronRight, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { NaverCategoryEntry } from '@/lib/naver/naver-categories-full';
import { NAVER_CATEGORIES_FULL } from '@/lib/naver/naver-categories-full';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CategorySuggestion  { code: string; path: string; reason: string; }
interface ProductNameVariant  { type: 'keyword' | 'benefit' | 'emotion'; name: string; strategy: string; }
interface HookVariant         { type: 'price' | 'emotion' | 'feature'; text: string; }

interface SEOResult {
  success: boolean;
  category: CategorySuggestion;
  keywords: string[];
  productNames: ProductNameVariant[];
  tags: string[];
  hooks: HookVariant[];
  qualityScore: number;
}

export interface SEOApplyCallbacks {
  onApplyCategory:    (code: string, d1: string, d2: string, d3: string, d4: string) => void;
  onApplyKeywords:    (keywords: string[]) => void;
  onApplyProductName: (name: string) => void;
  onApplyTags:        (tags: string[]) => void;
  onApplyHook:        (hook: string) => void;
}

interface NaverSEOWorkflowProps extends SEOApplyCallbacks {
  productName:      string;
  categoryPath?:    string;
  categoryCode?:    string;
  description?:     string;
  price?:           number;
  supplierPrice?:   number;
  currentKeywords?: string[];
  autoRun?:         boolean; // auto-trigger SEO analysis on mount (from sourcing shelf)
}

// ── Kkotti face by workflow state ─────────────────────────────────────────────
// idle=ready, scanning=loading, done=celebrate, warn=no product name
const KKOTTI_FACE: Record<'idle' | 'scanning' | 'done' | 'warn', { face: string; color: string; bg: string; label: string }> = {
  idle:     { face: '^_^',   color: '#e62310', bg: '#fff0f0', label: '준비 완료' },
  scanning: { face: '·_·',   color: '#2563eb', bg: '#eff6ff', label: '사냥 중...' },
  done:     { face: '✿ㅅ✿', color: '#9333ea', bg: '#faf5ff', label: '사냥 완료!' },
  warn:     { face: ';ㅅ;',  color: '#ca8a04', bg: '#fefce8', label: '상품명 필요' },
};

// ── Category resolver ─────────────────────────────────────────────────────────
function resolveCategory(
  code: string,
  fallbackPath?: string
): { d1: string; d2: string; d3: string; d4: string; confirmedCode: string } | null {
  const exact = NAVER_CATEGORIES_FULL.find((c: NaverCategoryEntry) => c.code === code);
  if (exact) return { d1: exact.d1, d2: exact.d2 ?? '', d3: exact.d3 ?? '', d4: exact.d4 ?? '', confirmedCode: exact.code };
  if (!fallbackPath) return null;

  const pathLower = fallbackPath.toLowerCase().replace(/\s+/g, '');
  const exactPath = NAVER_CATEGORIES_FULL.find((c: NaverCategoryEntry) => {
    const full = [c.d1, c.d2, c.d3, c.d4].filter(Boolean).join('>').toLowerCase().replace(/\s+/g, '');
    return full === pathLower;
  });
  if (exactPath) return { d1: exactPath.d1, d2: exactPath.d2 ?? '', d3: exactPath.d3 ?? '', d4: exactPath.d4 ?? '', confirmedCode: exactPath.code };

  const pathParts = fallbackPath.split('>').map(s => s.trim().toLowerCase()).filter(Boolean);
  let bestEntry: NaverCategoryEntry | null = null;
  let bestScore = 0;
  for (const c of NAVER_CATEGORIES_FULL) {
    const ep = [c.d1, c.d2, c.d3, c.d4].filter(Boolean).map(s => s.toLowerCase());
    let score = 0;
    for (const part of pathParts) {
      if (ep.includes(part)) score += 2;
      else if (ep.some(e => e.includes(part) || part.includes(e))) score += 1;
    }
    if (score > bestScore) { bestScore = score; bestEntry = c; }
  }
  if (bestEntry && bestScore >= 3) {
    return { d1: bestEntry.d1, d2: bestEntry.d2 ?? '', d3: bestEntry.d3 ?? '', d4: bestEntry.d4 ?? '', confirmedCode: bestEntry.code };
  }
  return null;
}

// ── Step color config ─────────────────────────────────────────────────────────
const STEP_META = {
  category: { icon: LayoutGrid, label: '카테고리 추천',    color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe', tag: '1개'    },
  keywords: { icon: Search,     label: '황금 키워드',       color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', tag: '7~10개' },
  names:    { icon: FileText,   label: '상품명 3가지 전략', color: '#059669', bg: '#f0fdf4', border: '#a7f3d0', tag: '선택'   },
  tags:     { icon: Tag,        label: '태그',              color: '#d97706', bg: '#fffbeb', border: '#fde68a', tag: '10개'   },
  hooks:    { icon: Zap,        label: '훅문구 3가지',      color: '#e62310', bg: '#fff0f0', border: '#fecaca', tag: '선택'   },
} as const;

const NAME_TYPE_LABEL: Record<ProductNameVariant['type'], string> = {
  keyword: '키워드강조형', benefit: '혜택강조형', emotion: '감성강조형',
};
const HOOK_TYPE_LABEL: Record<HookVariant['type'], string> = {
  price: '가격/혜택형', emotion: '감성/스토리형', feature: '기능/스펙형',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function NaverSEOWorkflow({
  productName, categoryPath, categoryCode,
  description, price, supplierPrice, currentKeywords,
  autoRun,
  onApplyCategory, onApplyKeywords, onApplyProductName, onApplyTags, onApplyHook,
}: NaverSEOWorkflowProps) {

  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<SEOResult | null>(null);
  const [error,    setError]    = useState('');
  const [expanded, setExpanded] = useState(true);

  const [appliedCategory, setAppliedCategory] = useState(false);
  const [appliedKeywords, setAppliedKeywords] = useState(false);
  const [appliedTags,     setAppliedTags]     = useState(false);
  const [selectedNameIdx, setSelectedNameIdx] = useState<number | null>(null);
  const [selectedHookIdx, setSelectedHookIdx] = useState<number | null>(null);

  const isReady    = useMemo(() => productName.trim().length >= 2, [productName]);
  const hasCategory = (categoryPath?.trim().length ?? 0) > 0;

  // Kkotti state
  const kkottiState: keyof typeof KKOTTI_FACE =
    loading    ? 'scanning' :
    result     ? 'done'     :
    !isReady   ? 'warn'     : 'idle';
  const kk = KKOTTI_FACE[kkottiState];

  const flash = (setter: (v: boolean) => void) => {
    setter(true); setTimeout(() => setter(false), 1800);
  };

  const handleRun = async () => {
    if (!isReady) return;
    setLoading(true); setError(''); setResult(null);
    setSelectedNameIdx(null); setSelectedHookIdx(null);
    try {
      const res = await fetch('/api/ai/seo-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName, categoryPath, categoryCode, description, price, supplierPrice, keywords: currentKeywords }),
      });
      const data: SEOResult = await res.json();
      if (!data.success) throw new Error((data as unknown as { error?: string }).error ?? 'AI 분석 오류');
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'SEO 분석 실패');
    } finally {
      setLoading(false);
    }
  };

  // Auto-run SEO analysis when coming from sourcing shelf (?autoSeo=1)
  useEffect(() => {
    if (!autoRun || !isReady || loading || result) return;
    // Longer delay to ensure prefill data has settled before triggering
    const timer = setTimeout(() => { handleRun(); }, 1500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, isReady]);

  const handleApplyCategory = () => {
    if (!result?.category) return;
    const resolved = resolveCategory(result.category.code, result.category.path);
    if (resolved) {
      onApplyCategory(resolved.confirmedCode, resolved.d1, resolved.d2, resolved.d3, resolved.d4);
    } else {
      const parts = result.category.path.split('>').map(s => s.trim());
      onApplyCategory(result.category.code, parts[0] ?? '', parts[1] ?? '', parts[2] ?? '', parts[3] ?? '');
    }
    flash(setAppliedCategory);
  };

  const handleApplyName = (idx: number) => {
    if (!result?.productNames[idx]) return;
    setSelectedNameIdx(idx);
    onApplyProductName(result.productNames[idx].name);
  };

  const handleApplyHook = (idx: number) => {
    if (!result?.hooks[idx]) return;
    setSelectedHookIdx(idx);
    onApplyHook(result.hooks[idx].text);
  };

  const handleApplyAll = () => {
    if (!result) return;
    handleApplyCategory();
    onApplyKeywords(result.keywords); flash(setAppliedKeywords);
    if (result.productNames[0]) { onApplyProductName(result.productNames[0].name); setSelectedNameIdx(0); }
    onApplyTags(result.tags); flash(setAppliedTags);
    if (result.hooks[0]) { onApplyHook(result.hooks[0].text); setSelectedHookIdx(0); }
  };

  // ── Shared styles ──────────────────────────────────────────────────────────
  const applyBtn = (applied: boolean, accentColor: string) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
    cursor: 'pointer', border: 'none', transition: 'all 0.15s',
    background: applied ? '#dcfce7' : accentColor,
    color: applied ? '#15803d' : '#fff',
  } as React.CSSProperties);

  return (
    <div className="kk-card" style={{ overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => setExpanded(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '12px 16px',
          background: kk.bg, border: 'none', cursor: 'pointer',
          borderBottom: expanded ? '1px solid #F8DCE5' : 'none',
          transition: 'background 0.3s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Kkotti face bubble */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#fff', border: `2px solid ${kk.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: kk.color, flexShrink: 0,
            letterSpacing: '-1px', transition: 'all 0.3s',
          }}>
            {loading ? (
              <Loader2 size={14} style={{ color: kk.color, animation: 'spin 1s linear infinite' }} />
            ) : kk.face}
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
              꼬띠 황금 키워드 사냥
            </p>
            <p style={{ fontSize: 10, color: kk.color, margin: 0, fontWeight: 700 }}>
              {kk.label}
            </p>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99,
            background: '#e62310', color: '#fff', flexShrink: 0,
          }}>
            5단계
          </span>
          {result && (
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99,
              background: '#dcfce7', color: '#15803d', flexShrink: 0,
            }}>
              사냥 완료
            </span>
          )}
        </div>
        <div style={{ color: '#B0A0A8', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* ── Readiness state ── */}
          {!isReady && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 10,
              background: '#FFF8FB', border: '1px solid #F8DCE5',
            }}>
              <AlertCircle size={12} style={{ color: '#B0A0A8', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#B0A0A8' }}>상품명을 먼저 입력해주세요</span>
            </div>
          )}

          {isReady && !result && !loading && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '8px 12px', borderRadius: 10,
              background: hasCategory ? '#f0fdf4' : '#fffbeb',
              border: `1px solid ${hasCategory ? '#bbf7d0' : '#fde68a'}`,
            }}>
              {hasCategory
                ? <Check size={12} style={{ color: '#16a34a', flexShrink: 0, marginTop: 1 }} />
                : <AlertCircle size={12} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
              }
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: hasCategory ? '#15803d' : '#92400e', margin: 0 }}>
                  {hasCategory ? '분석 준비 완료' : '카테고리 미선택 — 정확도 낮음'}
                </p>
                {hasCategory && (
                  <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>{categoryPath}</p>
                )}
              </div>
            </div>
          )}

          {/* ── Run button ── */}
          <button
            onClick={handleRun}
            disabled={loading || !isReady}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 800,
              border: 'none', cursor: loading || !isReady ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              background: loading || !isReady
                ? '#F8DCE5'
                : result
                  ? '#fff0f0'
                  : 'linear-gradient(135deg, #e62310, #ff6b8a)',
              color: loading || !isReady ? '#B0A0A8' : result ? '#e62310' : '#fff',
            }}
          >
            {loading ? (
              <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> AI 사냥 중 (5~10초)...</>
            ) : result ? (
              <><RotateCcw size={14} /> 재사냥</>
            ) : (
              <><Sparkles size={14} /> AI SEO 전체 분석 시작</>
            )}
          </button>

          {/* ── Step preview (before run) ── */}
          {!result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {(Object.entries(STEP_META) as [string, typeof STEP_META[keyof typeof STEP_META]][]).map(([key, s]) => {
                const Icon = s.icon;
                return (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 9,
                    background: s.bg, border: `1px solid ${s.border}`,
                  }}>
                    <Icon size={11} style={{ color: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#374151', flex: 1 }}>{s.label}</span>
                    <span style={{ fontSize: 10, color: s.color, fontWeight: 700 }}>{s.tag}</span>
                    <ChevronRight size={10} style={{ color: '#D1C4CA' }} />
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '8px 12px', borderRadius: 10,
              background: '#fef2f2', border: '1px solid #fecaca',
            }}>
              <AlertCircle size={12} style={{ color: '#e62310', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 11, color: '#dc2626', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* ── Results ── */}
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Step 1: Category */}
              {(() => {
                const s = STEP_META.category;
                const resolved = resolveCategory(result.category.code, result.category.path);
                const isExact = !!NAVER_CATEGORIES_FULL.find((c: NaverCategoryEntry) => c.code === result.category.code);
                const Icon = s.icon;
                return (
                  <div style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 12, padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Icon size={12} style={{ color: s.color }} />
                      <span style={{ fontSize: 12, fontWeight: 800, color: s.color }}>카테고리 추천</span>
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '8px 10px', background: '#fff', borderRadius: 9,
                      border: `1px solid ${s.border}`,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                            background: isExact ? '#dcfce7' : resolved ? '#fef9c3' : '#fee2e2',
                            color:      isExact ? '#15803d' : resolved ? '#a16207' : '#dc2626',
                          }}>
                            {isExact ? 'DB 확인' : resolved ? '유사 매칭' : '수동 확인'}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', margin: '0 0 2px' }}>{result.category.path}</p>
                        <p style={{ fontSize: 10, color: '#6b7280', margin: '0 0 2px' }}>{result.category.reason}</p>
                        <p style={{ fontSize: 10, color: s.color, fontFamily: 'monospace', margin: 0 }}>
                          #{resolved?.confirmedCode ?? result.category.code}
                        </p>
                      </div>
                      <button onClick={handleApplyCategory} style={applyBtn(appliedCategory, s.color)}>
                        {appliedCategory ? <><Check size={10} /> 적용됨</> : '적용'}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Step 2: Keywords */}
              {(() => {
                const s = STEP_META.keywords;
                const Icon = s.icon;
                return (
                  <div style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 12, padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Icon size={12} style={{ color: s.color }} />
                      <span style={{ fontSize: 12, fontWeight: 800, color: s.color }}>황금 키워드</span>
                      <span style={{ fontSize: 10, color: s.color, marginLeft: 'auto', fontWeight: 700 }}>{result.keywords.length}개</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                      {result.keywords.map((kw, i) => (
                        <span key={i} style={{
                          padding: '3px 9px', borderRadius: 99,
                          background: '#fff', border: `1px solid ${s.border}`,
                          fontSize: 11, fontWeight: 600, color: s.color,
                        }}>
                          {kw}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => { onApplyKeywords(result.keywords); flash(setAppliedKeywords); }}
                      style={{
                        ...applyBtn(appliedKeywords, s.color),
                        width: '100%', padding: '7px 0',
                        background: appliedKeywords ? '#dcfce7' : '#fff',
                        color: appliedKeywords ? '#15803d' : s.color,
                        border: `1.5px solid ${appliedKeywords ? '#bbf7d0' : s.border}`,
                      }}
                    >
                      {appliedKeywords
                        ? <><Check size={11} /> 키워드 적용 완료</>
                        : `${result.keywords.length}개 키워드 적용`}
                    </button>
                  </div>
                );
              })()}

              {/* Step 3: Product names */}
              {(() => {
                const s = STEP_META.names;
                const Icon = s.icon;
                return (
                  <div style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 12, padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Icon size={12} style={{ color: s.color }} />
                      <span style={{ fontSize: 12, fontWeight: 800, color: s.color }}>상품명 3가지 전략</span>
                      <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 'auto' }}>하나 선택 후 적용</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {result.productNames.map((pn, idx) => {
                        const isSelected = selectedNameIdx === idx;
                        return (
                          <div key={idx} style={{
                            padding: '9px 10px', borderRadius: 9,
                            background: '#fff',
                            border: `1.5px solid ${isSelected ? '#16a34a' : s.border}`,
                            transition: 'border-color 0.15s',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                  <span style={{
                                    fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                                    background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                                  }}>
                                    {NAME_TYPE_LABEL[pn.type]}
                                  </span>
                                  <span style={{
                                    fontSize: 10, fontWeight: 700,
                                    color: pn.name.length >= 25 && pn.name.length <= 50 ? '#16a34a' : '#d97706',
                                  }}>
                                    {pn.name.length}자
                                  </span>
                                </div>
                                <p style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', margin: '0 0 2px', lineHeight: 1.4 }}>{pn.name}</p>
                                <p style={{ fontSize: 10, color: '#9CA3AF', margin: 0 }}>{pn.strategy}</p>
                              </div>
                              <button onClick={() => handleApplyName(idx)} style={{
                                ...applyBtn(isSelected, s.color),
                                background: isSelected ? '#16a34a' : '#f3f4f6',
                                color: isSelected ? '#fff' : '#374151',
                                flexShrink: 0,
                              }}>
                                {isSelected ? <><Check size={10} /> 선택됨</> : '적용'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Step 4: Tags */}
              {(() => {
                const s = STEP_META.tags;
                const Icon = s.icon;
                return (
                  <div style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 12, padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Icon size={12} style={{ color: s.color }} />
                      <span style={{ fontSize: 12, fontWeight: 800, color: s.color }}>태그</span>
                      <span style={{ fontSize: 10, color: s.color, marginLeft: 'auto', fontWeight: 700 }}>{result.tags.length}/10개</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {result.tags.map((tag, i) => (
                        <span key={i} style={{
                          padding: '2px 8px', borderRadius: 6,
                          background: '#fff', border: `1px solid ${s.border}`,
                          fontSize: 11, color: s.color,
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => { onApplyTags(result.tags); flash(setAppliedTags); }}
                      style={{
                        ...applyBtn(appliedTags, s.color),
                        width: '100%', padding: '7px 0',
                        background: appliedTags ? '#dcfce7' : '#fff',
                        color: appliedTags ? '#15803d' : s.color,
                        border: `1.5px solid ${appliedTags ? '#bbf7d0' : s.border}`,
                      }}
                    >
                      {appliedTags
                        ? <><Check size={11} /> 태그 적용 완료</>
                        : `태그 ${result.tags.length}개 전체 적용`}
                    </button>
                  </div>
                );
              })()}

              {/* Step 5: Hook phrases */}
              {(() => {
                const s = STEP_META.hooks;
                const Icon = s.icon;
                return (
                  <div style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 12, padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Icon size={12} style={{ color: s.color }} />
                      <span style={{ fontSize: 12, fontWeight: 800, color: s.color }}>훅문구 3가지 스타일</span>
                      <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 'auto' }}>하나 선택 후 적용</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {result.hooks.map((hook, idx) => {
                        const isSelected = selectedHookIdx === idx;
                        return (
                          <div key={idx} style={{
                            padding: '9px 10px', borderRadius: 9, background: '#fff',
                            border: `1.5px solid ${isSelected ? '#16a34a' : s.border}`,
                            transition: 'border-color 0.15s',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                  <span style={{
                                    fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                                    background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                                  }}>
                                    {HOOK_TYPE_LABEL[hook.type]}
                                  </span>
                                  <span style={{
                                    fontSize: 10, fontWeight: 700,
                                    color: hook.text.length <= 100 ? '#16a34a' : '#dc2626',
                                  }}>
                                    {hook.text.length}/100자
                                  </span>
                                </div>
                                <p style={{ fontSize: 12, color: '#1A1A1A', margin: 0, lineHeight: 1.5 }}>{hook.text}</p>
                              </div>
                              <button onClick={() => handleApplyHook(idx)} style={{
                                ...applyBtn(isSelected, s.color),
                                background: isSelected ? '#16a34a' : '#f3f4f6',
                                color: isSelected ? '#fff' : '#374151',
                                flexShrink: 0,
                              }}>
                                {isSelected ? <><Check size={10} /> 선택됨</> : '적용'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Quality score */}
              {result.qualityScore > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 10,
                  background: '#FFF8FB', border: '1px solid #F8DCE5',
                }}>
                  <span style={{ fontSize: 11, color: '#B0A0A8' }}>꼬띠 분석 품질 점수</span>
                  <span style={{
                    fontSize: 12, fontWeight: 800, padding: '2px 10px', borderRadius: 99,
                    background: result.qualityScore >= 85 ? '#dcfce7' : result.qualityScore >= 75 ? '#dbeafe' : '#fef9c3',
                    color:      result.qualityScore >= 85 ? '#15803d' : result.qualityScore >= 75 ? '#1d4ed8' : '#a16207',
                  }}>
                    {result.qualityScore}점
                  </span>
                </div>
              )}

              {/* Kkotti celebrate banner */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 12,
                background: 'linear-gradient(135deg, #ffe4ed, #ffd0e0)',
                border: '1.5px solid #FFB3CE',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: '#fff', border: '1.5px solid #FFB3CE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: '#e62310',
                }}>
                  ✿ㅅ✿
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#e62310', margin: '0 0 2px' }}>
                    황금 키워드 사냥 완료!
                  </p>
                  <p style={{ fontSize: 11, color: '#7f1d1d', margin: 0 }}>
                    각 항목 적용 후 전체 1클릭 버튼으로 한번에 반영하세요.
                  </p>
                </div>
              </div>

              {/* Apply all */}
              <button
                onClick={handleApplyAll}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: '11px 0', borderRadius: 12, fontSize: 12, fontWeight: 800,
                  background: '#e62310', color: '#fff', border: 'none', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Sparkles size={13} />
                전체 1클릭 적용
              </button>

            </div>
          )}

        </div>
      )}
    </div>
  );
}
