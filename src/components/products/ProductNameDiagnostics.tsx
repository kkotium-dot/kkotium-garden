// src/components/products/ProductNameDiagnostics.tsx
// ============================================================================
// NAME-DIAG-1 (#151) — live 상품명 진단 패널. Calls the PURE rule engine
// (src/lib/seo/product-name-diagnosis.ts) on a 250ms debounce and renders a
// traffic-light checklist (red-first) with inline "이렇게 고치기" one-click
// fixes. No API. Lucide icons only (rule 3-1, no emoji). Brand tokens + the
// semantic traffic-light colors; numbers tabular-nums.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Wand2, Sparkles, TrendingDown, Loader2, BarChart3, ArrowRight } from 'lucide-react';
import {
  diagnoseProductName,
  type NameDiagnosis,
  type NameDiagnosisContext,
  type CheckStatus,
  type KeywordCompetition,
  type CompetitionBand,
} from '@/lib/seo/product-name-diagnosis';

interface Props {
  name: string;
  ctx: NameDiagnosisContext;
  onApplyFix: (name: string) => void;
}

const STATUS_ORDER: Record<CheckStatus, number> = { fail: 0, warn: 1, pass: 2 };

const STATUS_STYLE: Record<CheckStatus, { color: string; bg: string; Icon: typeof CheckCircle2 }> = {
  fail: { color: '#dc2626', bg: '#fef2f2', Icon: XCircle },
  warn: { color: '#d97706', bg: '#fffbeb', Icon: AlertTriangle },
  pass: { color: '#16a34a', bg: '#f0fdf4', Icon: CheckCircle2 },
};

function gradeTone(grade: NameDiagnosis['grade']): { color: string; bg: string } {
  switch (grade) {
    case 'S': return { color: '#16a34a', bg: '#f0fdf4' };
    case 'A': return { color: '#2563eb', bg: '#eff6ff' };
    case 'B': return { color: '#d97706', bg: '#fffbeb' };
    default:  return { color: '#dc2626', bg: '#fef2f2' };
  }
}

// ── NAME-DIAG-2: keyword-competition (롱테일 추천) helpers ──────────────────────
const BAND_STYLE: Record<CompetitionBand, { color: string; bg: string; label: string }> = {
  low:  { color: '#16a34a', bg: '#f0fdf4', label: '여유' },
  mid:  { color: '#2563eb', bg: '#eff6ff', label: '적정' },
  high: { color: '#dc2626', bg: '#fef2f2', label: '주의' },
};

function fmtCount(n: number | null): string {
  if (n == null) return '—';
  if (n >= 10000) return `${Math.round(n / 10000 * 10) / 10}만`;
  if (n >= 1000) return `${Math.round(n / 100) / 10}천`;
  return n.toLocaleString();
}

interface CompetitionResult {
  main: KeywordCompetition;
  candidates: (KeywordCompetition & { recommended?: boolean })[];
}

// 꼬띠 한줄 코멘트 — grade별 친근한 안내.
function kkottiComment(d: NameDiagnosis): string {
  const fails = d.checks.filter(c => c.status === 'fail').length;
  switch (d.grade) {
    case 'S': return '상품명이 아주 좋아요! 이대로도 검색에 잘 노출돼요.';
    case 'A': return '거의 완벽해요. 노란불 한두 개만 다듬으면 최상이에요.';
    case 'B': return `괜찮지만 빨간불 ${fails}개를 고치면 노출이 더 좋아져요.`;
    default:  return `지금은 검색 노출에 불리해요. 빨간불 ${fails}개부터 고쳐볼까요?`;
  }
}

export default function ProductNameDiagnostics({ name, ctx, onApplyFix }: Props) {
  // Debounce the name (250ms) so we diagnose on a settled value, not every key.
  const [debounced, setDebounced] = useState(name);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(name), 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [name]);

  // Memoize on the debounced name + the ctx fields the engine actually reads.
  const ctxKey = `${ctx.categoryPath ?? ''}|${(ctx.keywords ?? []).join(',')}|${ctx.brand ?? ''}`;
  const diag = useMemo(
    () => diagnoseProductName(debounced, ctx),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debounced, ctxKey],
  );

  const sortedChecks = useMemo(
    () => [...diag.checks].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
    [diag.checks],
  );

  // NAME-DIAG-2: on-demand keyword-competition (검색량·상품수·경쟁강도). On-demand
  // (not per-keystroke) to be frugal with the Naver API quota.
  const [comp, setComp] = useState<CompetitionResult | null>(null);
  const [compLoading, setCompLoading] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);

  // Reset the (on-demand) competition result when the name changes, so stale
  // longtail data is never shown against a different name.
  useEffect(() => {
    setComp(null);
    setCompError(null);
  }, [name]);

  const runCompetition = useCallback(async () => {
    const target = name.trim();
    if (!target) return;
    setCompLoading(true);
    setCompError(null);
    try {
      // NAME-DIAG-2.1: pass the category-validated golden keywords/tags so the
      // server restricts the head pool to them (avoids cross-category heads).
      const kw = (ctx.keywords ?? []).filter(Boolean).join(',');
      const res = await fetch(
        `/api/naver/keyword-competition?name=${encodeURIComponent(target)}${kw ? `&keywords=${encodeURIComponent(kw)}` : ''}`,
      );
      const data = await res.json();
      if (!data.success) {
        setComp(null);
        setCompError(data.error || '경쟁강도 데이터를 불러올 수 없어요.');
      } else {
        setComp({ main: data.main, candidates: data.candidates ?? [] });
      }
    } catch {
      setComp(null);
      setCompError('경쟁강도 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setCompLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, (ctx.keywords ?? []).join(',')]);

  const applyLongtail = (candidate: string) => {
    if (!comp) return;
    const mainKw = comp.main.keyword;
    const next = name.includes(mainKw) ? name.replace(mainKw, candidate) : `${candidate} ${name}`;
    onApplyFix(next.replace(/\s+/g, ' ').trim());
  };

  if (!debounced.trim()) {
    return (
      <p style={{ fontSize: 12, color: 'var(--text-300, #888)', margin: '6px 2px 0' }}>
        상품명을 입력하면 검색 노출 진단이 시작돼요.
      </p>
    );
  }

  const tone = gradeTone(diag.grade);
  const failCount = diag.checks.filter(c => c.status === 'fail').length;

  return (
    <div style={{ marginTop: 8, border: '1px solid var(--border-neutral)', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      {/* Header: score + grade + 꼬띠 comment */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '1px solid var(--border-neutral)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 56 }}>
          <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, color: tone.color, fontVariantNumeric: 'tabular-nums' }}>
            {diag.score}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-300, #888)', marginTop: 2 }}>/ 100</span>
        </div>
        <div style={{
          fontSize: 13, fontWeight: 800, color: tone.color, background: tone.bg,
          borderRadius: 8, padding: '4px 10px', flexShrink: 0,
        }}>
          {diag.grade}등급
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, minWidth: 0 }}>
          <Sparkles size={14} style={{ color: '#e62310', flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 12, color: 'var(--text-700, #3A3A3A)', margin: 0, lineHeight: 1.4 }}>
            {kkottiComment(diag)}
          </p>
        </div>
      </div>

      {/* Traffic-light checklist (red first) */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sortedChecks.map(c => {
          const st = STATUS_STYLE[c.status];
          const Icon = st.Icon;
          return (
            <li key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 8px', borderRadius: 8, background: c.status === 'pass' ? 'transparent' : st.bg }}>
              <Icon size={15} style={{ color: st.color, flexShrink: 0, marginTop: 1 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-900, #111)' }}>{c.label}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-500, #555)' }}>{c.detail}</span>
                </div>
                {c.status !== 'pass' && c.suggestion && (
                  <p style={{ fontSize: 11.5, color: st.color, margin: '3px 0 0', lineHeight: 1.45 }}>{c.suggestion}</p>
                )}
                {c.fixedName && c.fixedName !== name && (
                  <button
                    type="button"
                    onClick={() => onApplyFix(c.fixedName!)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6,
                      padding: '4px 9px', borderRadius: 7, border: `1px solid ${st.color}33`,
                      background: '#fff', color: st.color, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                    }}
                    title={c.fixedName}
                  >
                    <Wand2 size={12} /> 이렇게 고치기
                    <span style={{ color: 'var(--text-500, #555)', fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.fixedName}
                    </span>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {failCount === 0 && (
        <p style={{ fontSize: 11, color: 'var(--text-300, #888)', margin: 0, padding: '0 14px 10px' }}>
          빨간불 없음 · 노란불은 선택적으로 다듬으세요.
        </p>
      )}

      {/* NAME-DIAG-2: 롱테일 키워드 추천 (경쟁강도 = 상품수 ÷ 검색량, 실측). */}
      <div style={{ borderTop: '1px solid var(--border-neutral)', padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          <TrendingDown size={14} style={{ color: '#e62310', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-900, #111)' }}>롱테일 키워드 추천</span>
          <span style={{ fontSize: 10.5, color: 'var(--text-300, #888)' }}>경쟁강도(상품수÷검색량) 낮은 세부 키워드</span>
        </div>

        {!comp && (
          <button
            type="button"
            onClick={runCompetition}
            disabled={compLoading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
              border: '1px solid var(--border-neutral)', background: '#fff', color: '#e62310',
              fontSize: 12, fontWeight: 700, cursor: compLoading ? 'wait' : 'pointer',
            }}
          >
            {compLoading ? <Loader2 size={13} className="animate-spin" /> : <BarChart3 size={13} />}
            {compLoading ? '네이버 검색량·상품수 조회 중…' : '경쟁강도 분석'}
          </button>
        )}

        {compError && (
          <p style={{ fontSize: 11.5, color: '#dc2626', margin: '4px 2px 0', lineHeight: 1.45 }}>{compError}</p>
        )}

        {comp && (
          <div style={{ marginTop: 4 }}>
            {[{ ...comp.main, _main: true }, ...comp.candidates.map(c => ({ ...c, _main: false }))].map((k) => {
              const b = k.band ? BAND_STYLE[k.band] : null;
              const isMain = k._main;
              const rec = !isMain && (k as { recommended?: boolean }).recommended;
              return (
                <div key={(isMain ? 'main-' : 'cand-') + k.keyword}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: 8,
                    padding: '7px 8px', borderTop: '1px solid var(--border-neutral)',
                    background: rec ? '#f0fdf4' : 'transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: isMain ? 800 : 600, color: 'var(--text-900,#111)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.keyword}</span>
                      {isMain && <span style={{ fontSize: 9, color: 'var(--text-300,#888)', flexShrink: 0 }}>현재</span>}
                      {rec && <span style={{ fontSize: 9, fontWeight: 800, color: '#16a34a', background: '#dcfce7', borderRadius: 99, padding: '1px 6px', flexShrink: 0 }}>추천</span>}
                    </div>
                    <span style={{ fontSize: 10.5, color: 'var(--text-500,#555)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>검색 {fmtCount(k.searchVolume)}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-500,#555)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>상품 {fmtCount(k.productCount)}</span>
                    {b && k.ratio != null ? (
                      <span style={{ fontSize: 10, fontWeight: 800, color: b.color, background: b.bg, borderRadius: 6, padding: '2px 6px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {k.ratio}:1 {b.label}
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--text-300,#888)' }}>데이터 없음</span>
                    )}
                  </div>
                  {rec && (
                    <button type="button" onClick={() => applyLongtail(k.keyword)} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, margin: '3px 0 5px 8px',
                      padding: '3px 8px', borderRadius: 7, border: '1px solid #16a34a55',
                      background: '#fff', color: '#16a34a', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    }}>
                      <ArrowRight size={11} /> 이 키워드로 바꾸기
                    </button>
                  )}
                </div>
              );
            })}
            {/* When the head keyword is already low/mid competition and no longtail
                beats it, that is good news — frame it, don't show an empty list. */}
            {comp.candidates.every(c => !c.recommended) && comp.main.band && comp.main.band !== 'high' && (
              <p style={{ fontSize: 11, color: '#16a34a', margin: '8px 2px 0', lineHeight: 1.45 }}>
                현재 핵심 키워드가 이미 경쟁이 낮아요 — 그대로 써도 좋아요.
              </p>
            )}
            <button type="button" onClick={runCompetition} disabled={compLoading} style={{
              marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 7,
              border: '1px solid var(--border-neutral)', background: '#fff', color: 'var(--text-500,#555)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>
              {compLoading ? <Loader2 size={11} className="animate-spin" /> : <BarChart3 size={11} />} 다시 분석
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
