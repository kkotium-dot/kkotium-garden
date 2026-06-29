'use client';

// NaverSEOWorkflow — 꼬띠 황금 키워드 사냥꾼
// 5단계: 카테고리 / 황금키워드 / 상품명 3종 / 태그 / 훅문구
// Design: app unified style — #e62310 accent, #FFB3CE lines, Kkotti face by state

import { useState, useMemo, useEffect } from 'react';
import {
  Sparkles, RotateCcw, Check, Loader2,
  Tag, Search, FileText, Zap, LayoutGrid,
  ChevronRight, AlertCircle, ChevronDown, ChevronUp, Copy, Megaphone,
  CheckCircle2, XCircle, Star,
} from 'lucide-react';
import { copyContainsKeyword } from '@/lib/seo/copy-tone';
import type { NaverCategoryEntry } from '@/lib/naver/naver-categories-full';
import { NAVER_CATEGORIES_FULL } from '@/lib/naver/naver-categories-full';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CategorySuggestion  { code: string; path: string; reason: string; }
interface ProductNameVariant  { type: 'keyword' | 'benefit' | 'emotion'; name: string; strategy: string; }
// HOOK-2: 2-slot hooks. event_field = Naver 이벤트필드 혜택 1줄(적용); detail =
// 상세페이지용 headline+sub by tone(복사). text = 결합본(onApplyHook 호환).
interface HookVariant         { slot: 'event_field' | 'detail'; tone?: 'benefit' | 'emotion' | 'trust'; headline?: string; sub?: string; text: string; }

interface SEOResult {
  success: boolean;
  category: CategorySuggestion;
  keywords: string[];
  productNames: ProductNameVariant[];
  tags: string[];
  hooks: HookVariant[];
  recommendedTone?: 'benefit' | 'emotion' | 'trust'; // HOOK-HYBRID-1
  recommendedToneReason?: string;
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
  hooks:    { icon: Zap,        label: '훅문구',           color: '#e62310', bg: '#fff0f0', border: '#fecaca', tag: '선택'   },
} as const;

const NAME_TYPE_LABEL: Record<ProductNameVariant['type'], string> = {
  keyword: '키워드강조형', benefit: '혜택강조형', emotion: '감성강조형',
};
const HOOK_TONE_LABEL: Record<'benefit' | 'emotion' | 'trust', string> = {
  benefit: '혜택 강조', emotion: '감성', trust: '신뢰',
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
  const [hookApplied,     setHookApplied]     = useState(false);   // event_field applied
  const [copiedKey,       setCopiedKey]       = useState<string | null>(null); // detail copy feedback
  const [activeTone,      setActiveTone]      = useState<'benefit' | 'emotion' | 'trust' | null>(null); // HOOK-HYBRID-1

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
    setSelectedNameIdx(null); setHookApplied(false); setCopiedKey(null);
    try {
      const res = await fetch('/api/ai/seo-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 사냥 버튼 = explicit user action → paid (Anthropic) fallback allowed
        // only if both free providers (Groq·Gemini) fail (#155).
        // AI-PRIORITY-1 (#162): providerProfile wired as 'speed' for now (no
        // behavior change). The copy/hook quality flip to 'quality' (Gemini-first)
        // is a separate commit, gated on Gemini slot1 returning 200.
        body: JSON.stringify({ productName, categoryPath, categoryCode, description, price, supplierPrice, keywords: currentKeywords, allowPaidFallback: true, providerProfile: 'speed' }),
      });
      const data: SEOResult = await res.json();
      if (!data.success) throw new Error((data as unknown as { error?: string }).error ?? 'AI 분석 오류');
      setResult(data);
      // HOOK-HYBRID-1: Zero-Touch-lite — auto-select the recommended detail tone.
      const detailTones = data.hooks.filter(h => h.slot === 'detail' && h.tone).map(h => h.tone);
      setActiveTone(
        (data.recommendedTone && detailTones.includes(data.recommendedTone))
          ? data.recommendedTone
          : (detailTones[0] ?? null),
      );
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

  // HOOK-2: 적용 = event_field 혜택문구를 훅 필드에 반영.
  const handleApplyEventHook = (text: string) => {
    onApplyHook(text);
    setHookApplied(true);
  };

  const handleCopyDetail = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(k => (k === key ? null : k)), 1500);
  };

  const handleApplyAll = () => {
    if (!result) return;
    handleApplyCategory();
    onApplyKeywords(result.keywords); flash(setAppliedKeywords);
    if (result.productNames[0]) { onApplyProductName(result.productNames[0].name); setSelectedNameIdx(0); }
    onApplyTags(result.tags); flash(setAppliedTags);
    const ev = result.hooks.find(h => h.slot === 'event_field');
    if (ev) { onApplyHook(ev.text); setHookApplied(true); }
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

              {/* Step 5: Hook phrases — HOOK-2 2-slot (이벤트필드용 + 상세페이지용) */}
              {(() => {
                const s = STEP_META.hooks;
                const eventHook = result.hooks.find(h => h.slot === 'event_field');
                const detailHooks = result.hooks.filter(h => h.slot === 'detail');
                return (
                  <div style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 12, padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <Zap size={12} style={{ color: s.color }} />
                      <span style={{ fontSize: 12, fontWeight: 800, color: s.color }}>훅문구 (노출 위치별)</span>
                    </div>

                    {/* 이벤트필드용 — 1개, 적용 */}
                    {eventHook && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                          <Megaphone size={11} style={{ color: s.color }} />
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#1A1A1A' }}>이벤트필드용</span>
                          <span style={{ fontSize: 9.5, color: '#6b7280' }}>상품명 하단 혜택문구 · 수치 혜택</span>
                        </div>
                        <div style={{ padding: '9px 10px', borderRadius: 9, background: '#fff', border: `1.5px solid ${hookApplied ? '#16a34a' : s.border}` }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 9.5, fontWeight: 700, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>{eventHook.text.length}자</span>
                              <p style={{ fontSize: 12, color: '#1A1A1A', margin: '3px 0 0', lineHeight: 1.5 }}>{eventHook.text}</p>
                            </div>
                            <button onClick={() => handleApplyEventHook(eventHook.text)} style={{
                              ...applyBtn(hookApplied, s.color),
                              background: hookApplied ? '#16a34a' : '#f3f4f6',
                              color: hookApplied ? '#fff' : '#374151', flexShrink: 0,
                            }}>
                              {hookApplied ? <><Check size={10} /> 적용됨</> : '적용'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 상세페이지용 — HOOK-HYBRID-1: 추천 톤 + 1클릭 톤 칩 + SEO 신호등 */}
                    {detailHooks.length > 0 && (() => {
                      const present = detailHooks.map(h => h.tone).filter(Boolean) as ('benefit'|'emotion'|'trust')[];
                      const active = (activeTone && detailHooks.find(h => h.tone === activeTone)) || detailHooks[0];
                      const hl = active.headline ?? '';
                      const sub = active.sub ?? '';
                      const sigOk = copyContainsKeyword(`${hl} ${sub}`, result.keywords);
                      const copied = copiedKey === `detail-${active.tone}`;
                      return (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
                            <FileText size={11} style={{ color: s.color }} />
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#1A1A1A' }}>상세페이지용</span>
                            <span style={{ fontSize: 9.5, color: '#6b7280' }}>헤드라인 + 서브카피 · 복사해 온실 아틀리에에 사용</span>
                          </div>

                          {/* 추천 톤 근거 */}
                          {result.recommendedToneReason && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, padding: '6px 8px', borderRadius: 8, background: '#fff7ed', border: '1px solid #fed7aa', marginBottom: 6 }}>
                              <Star size={11} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
                              <span style={{ fontSize: 10.5, color: '#9a3412', lineHeight: 1.4 }}>
                                <b>{result.recommendedTone ? HOOK_TONE_LABEL[result.recommendedTone] : ''}</b> 추천 — {result.recommendedToneReason}
                              </span>
                            </div>
                          )}

                          {/* 1클릭 톤 칩 (추가 호출 0) */}
                          <div role="tablist" style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                            {present.map(tone => {
                              const on = active.tone === tone;
                              const rec = result.recommendedTone === tone;
                              return (
                                <button key={tone} type="button" role="tab" aria-selected={on}
                                  onClick={() => setActiveTone(tone)}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 99,
                                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                    border: `1px solid ${on ? s.color : s.border}`,
                                    background: on ? s.color : '#fff', color: on ? '#fff' : '#6b7280',
                                  }}>
                                  {HOOK_TONE_LABEL[tone]}
                                  {rec && <Star size={9} style={{ color: on ? '#fff' : '#d97706' }} />}
                                </button>
                              );
                            })}
                          </div>

                          {/* 활성 카피 카드 + SEO 신호등 */}
                          <div style={{ padding: '9px 10px', borderRadius: 9, background: '#fff', border: `1.5px solid ${s.border}` }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, flexWrap: 'wrap' }}>
                                  {hl && (
                                    <span style={{ fontSize: 9.5, fontWeight: 700, color: hl.length <= 15 ? '#16a34a' : '#d97706', fontVariantNumeric: 'tabular-nums' }}>제목 {hl.length}/15</span>
                                  )}
                                  {sub && (
                                    <span style={{ fontSize: 9.5, fontWeight: 700, color: sub.length >= 40 && sub.length <= 60 ? '#16a34a' : '#d97706', fontVariantNumeric: 'tabular-nums' }}>본문 {sub.length}자</span>
                                  )}
                                  {/* SEO 신호등: 타깃 키워드 포함 여부 */}
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 800, color: sigOk ? '#16a34a' : '#dc2626' }}>
                                    {sigOk ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                                    {sigOk ? 'SEO 키워드 포함' : 'SEO 키워드 없음'}
                                  </span>
                                </div>
                                {hl && <p style={{ fontSize: 12.5, fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: 1.45 }}>{hl}</p>}
                                {sub && <p style={{ fontSize: 11.5, color: '#555', margin: '2px 0 0', lineHeight: 1.5 }}>{sub}</p>}
                              </div>
                              <button onClick={() => handleCopyDetail(active.text, `detail-${active.tone}`)} style={{
                                ...applyBtn(copied, s.color),
                                background: copied ? '#16a34a' : '#f3f4f6',
                                color: copied ? '#fff' : '#374151', flexShrink: 0,
                              }}>
                                {copied ? <><Check size={10} /> 복사됨</> : <><Copy size={10} /> 복사</>}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
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
