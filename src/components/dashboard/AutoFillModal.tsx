'use client';
// AutoFillModal — Phase E+ Sprint 6 / E-15 Block C
// Two-stage workflow: POST preview -> seller approval (checkboxes) -> PATCH apply
// AI-generated values are NEVER applied to DB without explicit checkbox approval.
//
// UI sections:
//   1. Header   — product name + score transition (current -> projected)
//   2. Loading  — Sparkles spin while POST runs
//   3. Auto-fill suggestions — cards with checkbox, before/after diff, confidence badge
//      Product-name modes (4) are grouped as a radio (only one can apply, all overwrite name)
//      Other items (keywords/tags/category) are independent checkboxes
//   4. Manual-only items — non-autofillable items rendered as deep-link cards
//   5. Footer  — cancel + apply (with selected count)
//   6. Done    — score-up toast + auto-close

import { useEffect, useMemo, useState } from 'react';
import {
  Sparkles, X, CheckCircle2, ChevronRight, AlertCircle,
  Image as ImageIcon, Truck, DollarSign, Loader2, ArrowRight, ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

// Mirror backend types (kept inline to avoid pulling backend types into client)
type AutoFillableItemId =
  | 'name_length'
  | 'no_abuse'
  | 'no_repeat'
  | 'keyword_in_front'
  | 'keywords_count'
  | 'tags_count'
  | 'category';

type NonAutoFillableItemId =
  | 'main_image'
  | 'extra_images'
  | 'shipping_template'
  | 'net_margin';

interface AutoFillSuggestion {
  itemId: AutoFillableItemId;
  before: string | string[] | null;
  after: string | string[];
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  provider: string;
}

const PRODUCT_NAME_MODES: AutoFillableItemId[] = [
  'name_length', 'no_abuse', 'no_repeat', 'keyword_in_front',
];

// ── Item label / icon / tab mapping ─────────────────────────────────────────
const ITEM_META: Record<AutoFillableItemId, { label: string; hint: string }> = {
  name_length:      { label: '상품명 길이 25~50자',      hint: '검색 결과 노출 + 모바일 가독성' },
  no_abuse:         { label: '어뷰징 단어 제거',          hint: '네이버 알고리즘 페널티 회피' },
  no_repeat:        { label: '반복 단어 다양화',          hint: '키워드 어뷰징 인식 회피' },
  keyword_in_front: { label: '앞 15자에 핵심 키워드',     hint: '검색 가중치 가장 큰 위치' },
  keywords_count:   { label: '키워드 5개+ 자동 생성',     hint: '검색 유입 다각화' },
  tags_count:       { label: 'SEO 태그 10개+ 자동 생성',  hint: '구매자 언어 기반 노출' },
  category:         { label: '카테고리 자동 매핑',        hint: '4,993개 네이버 카테고리에서 매칭' },
};

const NON_FILL_META: Record<NonAutoFillableItemId, {
  label: string; description: string; tab: string; Icon: React.ElementType;
}> = {
  main_image: {
    label: '대표이미지 업로드',
    description: '셀러가 직접 이미지 파일을 업로드해야 합니다 (AI 자동 생성 불가)',
    tab: 'image',
    Icon: ImageIcon,
  },
  extra_images: {
    label: '추가이미지 3장 이상',
    description: '체류시간을 늘리려면 셀러가 직접 추가 이미지를 업로드해야 합니다',
    tab: 'image',
    Icon: ImageIcon,
  },
  shipping_template: {
    label: '배송 템플릿 연결',
    description: '도구 → 배송 레시피에서 템플릿을 만들고 매핑해야 합니다',
    tab: 'shipping',
    Icon: Truck,
  },
  net_margin: {
    label: '순마진 30% 이상',
    description: '가격 결정권은 셀러에게 있어 AI가 자동으로 가격을 변경하지 않습니다',
    tab: 'basic',
    Icon: DollarSign,
  },
};

// ── Confidence pill style ────────────────────────────────────────────────────
const CONF_STYLE: Record<AutoFillSuggestion['confidence'], { bg: string; color: string; label: string }> = {
  high:   { bg: '#dcfce7', color: '#15803d', label: '확신' },
  medium: { bg: '#fef9c3', color: '#a16207', label: '보통' },
  low:    { bg: '#fee2e2', color: '#b91c1c', label: '주의' },
};

// ── Format before/after for display ──────────────────────────────────────────
function formatValue(v: string | string[] | null): string {
  if (v === null) return '(없음)';
  if (Array.isArray(v)) return v.length === 0 ? '(없음)' : v.join(', ');
  return v;
}

function diffPreview(before: string | string[] | null, after: string | string[]): React.ReactNode {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div>
        <span style={{ fontSize: 10, color: '#B0A0A8', fontWeight: 700, marginRight: 6 }}>이전</span>
        <span style={{ fontSize: 12, color: '#666', textDecoration: 'line-through' }}>
          {formatValue(before)}
        </span>
      </div>
      <div>
        <span style={{ fontSize: 10, color: '#15803d', fontWeight: 700, marginRight: 6 }}>이후</span>
        <span style={{ fontSize: 12, color: '#1A1A1A', fontWeight: 600 }}>
          {formatValue(after)}
        </span>
      </div>
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────
interface AutoFillModalProps {
  productId: string;
  productName: string;
  currentScore: number;
  onClose: () => void;
  onApplied: () => void;  // called after successful PATCH so widget reloads
}

export default function AutoFillModal({
  productId, productName, currentScore, onClose, onApplied,
}: AutoFillModalProps) {
  // Phases: loading -> ready -> applying -> done | error
  const [phase, setPhase] = useState<'loading' | 'ready' | 'applying' | 'done' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [suggestions, setSuggestions] = useState<AutoFillSuggestion[]>([]);
  const [unfillable, setUnfillable] = useState<NonAutoFillableItemId[]>([]);

  // Selection state
  // Product-name modes are radio-style (only one applies — all overwrite the name field)
  const [selectedNameMode, setSelectedNameMode] = useState<AutoFillableItemId | null>(null);
  // Other items (keywords/tags/category) are independent
  const [selectedOthers, setSelectedOthers] = useState<Set<AutoFillableItemId>>(new Set());

  const [newScore, setNewScore] = useState<number | null>(null);
  const [appliedItems, setAppliedItems] = useState<AutoFillableItemId[]>([]);

  // ── Step 1: POST preview on mount ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/upload-readiness/auto-fill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!data.success) {
          setPhase('error');
          setErrorMsg(data.error ?? '자동 채우기 미리보기에 실패했습니다');
          return;
        }
        const sugs: AutoFillSuggestion[] = Array.isArray(data.suggestions) ? data.suggestions : [];
        const unf: NonAutoFillableItemId[] = Array.isArray(data.unfillable) ? data.unfillable : [];
        setSuggestions(sugs);
        setUnfillable(unf);

        // Default selection: first product-name mode + ALL non-name items
        const firstName = sugs.find((s) => PRODUCT_NAME_MODES.includes(s.itemId));
        setSelectedNameMode(firstName ? firstName.itemId : null);
        const others = new Set<AutoFillableItemId>();
        for (const s of sugs) {
          if (!PRODUCT_NAME_MODES.includes(s.itemId)) others.add(s.itemId);
        }
        setSelectedOthers(others);
        setPhase('ready');
      } catch (e) {
        if (cancelled) return;
        setPhase('error');
        setErrorMsg(e instanceof Error ? e.message : '네트워크 오류');
      }
    })();
    return () => { cancelled = true; };
  }, [productId]);

  // ── Derived: split suggestions into name-related (radio) and others ───────
  const nameRelated = useMemo(
    () => suggestions.filter((s) => PRODUCT_NAME_MODES.includes(s.itemId)),
    [suggestions],
  );
  const otherSuggestions = useMemo(
    () => suggestions.filter((s) => !PRODUCT_NAME_MODES.includes(s.itemId)),
    [suggestions],
  );

  const totalSelected =
    (selectedNameMode ? 1 : 0) + selectedOthers.size;

  // ── Step 2: PATCH apply on confirm ────────────────────────────────────────
  async function handleApply() {
    if (totalSelected === 0) return;

    const accepted: { itemId: AutoFillableItemId; value: string | string[] }[] = [];

    if (selectedNameMode) {
      const sug = nameRelated.find((s) => s.itemId === selectedNameMode);
      if (sug) accepted.push({ itemId: sug.itemId, value: sug.after });
    }
    for (const sug of otherSuggestions) {
      if (selectedOthers.has(sug.itemId)) {
        accepted.push({ itemId: sug.itemId, value: sug.after });
      }
    }

    if (accepted.length === 0) return;

    setPhase('applying');
    try {
      const res = await fetch('/api/upload-readiness/auto-fill', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, accepted }),
      });
      const data = await res.json();
      if (!data.success) {
        setPhase('error');
        setErrorMsg(data.error ?? '적용에 실패했습니다');
        return;
      }
      setNewScore(typeof data.newScore === 'number' ? data.newScore : null);
      setAppliedItems(Array.isArray(data.applied) ? data.applied : []);
      setPhase('done');
      // Notify parent to reload widget data
      onApplied();
      // Auto-close after brief success display
      setTimeout(() => onClose(), 1800);
    } catch (e) {
      setPhase('error');
      setErrorMsg(e instanceof Error ? e.message : '네트워크 오류');
    }
  }

  // ── Esc key closes ────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && phase !== 'applying') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, phase]);

  // Projected score: each selected suggestion adds its weight (rough estimate, server is canonical)
  // We don't know weights here — display "선택 N개 적용" instead of fake projection
  const projectedHint = totalSelected > 0
    ? `선택 ${totalSelected}개 적용 시 점수 상승`
    : '선택된 항목이 없습니다';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      onClick={() => phase !== 'applying' && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '40px 20px', overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
          overflow: 'hidden', position: 'relative',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '16px 20px', borderBottom: '1px solid #F8DCE5',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #FFF0F5 0%, #FFE7EE 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 10,
                background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={16} style={{ color: '#fff' }} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
                AI 자동 채우기
              </p>
              <p
                style={{
                  fontSize: 11, color: '#666', margin: '2px 0 0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
                title={productName}
              >
                {productName || '(상품명 없음)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={phase === 'applying'}
            style={{
              background: 'transparent', border: 'none', cursor: phase === 'applying' ? 'not-allowed' : 'pointer',
              padding: 6, borderRadius: 8, color: '#666',
              opacity: phase === 'applying' ? 0.4 : 1,
            }}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Score strip ────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '12px 20px', borderBottom: '1px solid #F8DCE5',
            display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center',
            background: '#fff',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 10, color: '#B0A0A8', fontWeight: 700, margin: 0 }}>현재</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', margin: '2px 0 0', lineHeight: 1 }}>
              {currentScore}
              <span style={{ fontSize: 11, color: '#B0A0A8', fontWeight: 700, marginLeft: 2 }}>점</span>
            </p>
          </div>
          <ArrowRight size={18} style={{ color: '#B0A0A8' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, margin: 0 }}>적용 후</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: '#7c3aed', margin: '2px 0 0', lineHeight: 1 }}>
              {newScore !== null ? newScore : currentScore}
              <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, marginLeft: 2 }}>점</span>
            </p>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div style={{ padding: '16px 20px', maxHeight: '60vh', overflowY: 'auto' }}>

          {/* Loading */}
          {phase === 'loading' && (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <Loader2 size={28} style={{ color: '#7c3aed', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', margin: '0 0 4px' }}>
                AI가 분석 중입니다
              </p>
              <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>
                상품명 · 키워드 · 태그 · 카테고리를 동시에 검토합니다 (15~30초)
              </p>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <AlertCircle size={28} style={{ color: '#b91c1c', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c', margin: '0 0 4px' }}>
                오류가 발생했습니다
              </p>
              <p style={{ fontSize: 11, color: '#666', margin: 0 }}>
                {errorMsg || '잠시 후 다시 시도해주세요'}
              </p>
            </div>
          )}

          {/* Done */}
          {phase === 'done' && (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <CheckCircle2 size={36} style={{ color: '#16a34a', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 15, fontWeight: 800, color: '#15803d', margin: '0 0 6px' }}>
                {appliedItems.length}개 항목 적용 완료
              </p>
              {newScore !== null && (
                <p style={{ fontSize: 13, color: '#1A1A1A', margin: '0 0 4px', fontWeight: 700 }}>
                  점수 {currentScore}점 → <span style={{ color: '#7c3aed' }}>{newScore}점</span>
                  {newScore > currentScore && (
                    <span style={{ color: '#16a34a', marginLeft: 6 }}>(+{newScore - currentScore})</span>
                  )}
                </p>
              )}
              <p style={{ fontSize: 11, color: '#B0A0A8', margin: '8px 0 0' }}>
                잠시 후 자동으로 닫힙니다
              </p>
            </div>
          )}

          {/* Ready — main UI */}
          {phase === 'ready' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Empty state — nothing to autofill */}
              {nameRelated.length === 0 && otherSuggestions.length === 0 && unfillable.length === 0 && (
                <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                  <CheckCircle2 size={28} style={{ color: '#16a34a', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', margin: '0 0 4px' }}>
                    부족한 항목이 없습니다
                  </p>
                  <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>
                    이미 모든 자동 검사를 통과했습니다
                  </p>
                </div>
              )}

              {/* Empty autofill — only manual items remaining */}
              {nameRelated.length === 0 && otherSuggestions.length === 0 && unfillable.length > 0 && (
                <div
                  style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: '#FFFBEB', border: '1px solid #FDE68A',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <AlertCircle size={13} style={{ color: '#a16207' }} />
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#a16207', margin: 0 }}>
                      AI 자동 채우기 가능 항목이 없습니다
                    </p>
                  </div>
                  <p style={{ fontSize: 11, color: '#666', margin: 0 }}>
                    남은 항목은 모두 셀러가 직접 입력해야 하는 영역입니다 (아래 안내 참조)
                  </p>
                </div>
              )}

              {/* Section A: Product-name modes (radio group) */}
              {nameRelated.length > 0 && (
                <section>
                  <p
                    style={{
                      fontSize: 11, fontWeight: 800, color: '#7c3aed', margin: '0 0 8px',
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}
                  >
                    상품명 재작성 (1개 선택)
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {nameRelated.map((s) => (
                      <SuggestionCard
                        key={s.itemId}
                        suggestion={s}
                        selected={selectedNameMode === s.itemId}
                        kind="radio"
                        onToggle={() =>
                          setSelectedNameMode(selectedNameMode === s.itemId ? null : s.itemId)
                        }
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Section B: Other items (independent checkboxes) */}
              {otherSuggestions.length > 0 && (
                <section>
                  <p
                    style={{
                      fontSize: 11, fontWeight: 800, color: '#7c3aed', margin: '0 0 8px',
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}
                  >
                    검색 최적화 항목 ({otherSuggestions.length}개)
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {otherSuggestions.map((s) => (
                      <SuggestionCard
                        key={s.itemId}
                        suggestion={s}
                        selected={selectedOthers.has(s.itemId)}
                        kind="checkbox"
                        onToggle={() => {
                          const next = new Set(selectedOthers);
                          if (next.has(s.itemId)) next.delete(s.itemId);
                          else next.add(s.itemId);
                          setSelectedOthers(next);
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Section C: Manual-only items */}
              {unfillable.length > 0 && (
                <section>
                  <p
                    style={{
                      fontSize: 11, fontWeight: 800, color: '#a16207', margin: '0 0 8px',
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}
                  >
                    셀러 직접 입력 필요 ({unfillable.length}개)
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {unfillable.map((id) => (
                      <ManualItemCard key={id} productId={productId} itemId={id} />
                    ))}
                  </div>
                </section>
              )}

            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        {phase === 'ready' && (
          <div
            style={{
              padding: '12px 20px', borderTop: '1px solid #F8DCE5',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              background: '#FAFAFA',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={12} style={{ color: '#B0A0A8' }} />
              <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>
                {projectedHint}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 14px', borderRadius: 8,
                  background: '#fff', border: '1px solid #E5E7EB',
                  color: '#666', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={handleApply}
                disabled={totalSelected === 0}
                style={{
                  padding: '8px 14px', borderRadius: 8,
                  background: totalSelected === 0 ? '#E5E7EB' : '#7c3aed',
                  color: totalSelected === 0 ? '#9CA3AF' : '#fff',
                  border: 'none', fontSize: 12, fontWeight: 800,
                  cursor: totalSelected === 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}
              >
                <Sparkles size={12} />
                {totalSelected > 0 ? `${totalSelected}개 적용` : '적용할 항목 선택'}
              </button>
            </div>
          </div>
        )}

        {phase === 'applying' && (
          <div
            style={{
              padding: '14px 20px', borderTop: '1px solid #F8DCE5',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#FAFAFA',
            }}
          >
            <Loader2 size={14} style={{ color: '#7c3aed', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', margin: 0 }}>
              DB 적용 중...
            </p>
          </div>
        )}
      </div>

      {/* Spin animation (scoped) */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── Sub-component: single suggestion card ────────────────────────────────────
function SuggestionCard({
  suggestion, selected, kind, onToggle,
}: {
  suggestion: AutoFillSuggestion;
  selected: boolean;
  kind: 'radio' | 'checkbox';
  onToggle: () => void;
}) {
  const meta = ITEM_META[suggestion.itemId];
  const conf = CONF_STYLE[suggestion.confidence];

  return (
    <label
      style={{
        display: 'flex', gap: 10,
        padding: '10px 12px', borderRadius: 10,
        background: selected ? '#F5F3FF' : '#fff',
        border: `1.5px solid ${selected ? '#7c3aed' : '#E5E7EB'}`,
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <input
        type={kind}
        checked={selected}
        onChange={onToggle}
        style={{
          marginTop: 2, accentColor: '#7c3aed',
          width: 14, height: 14, cursor: 'pointer', flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
            {meta.label}
          </p>
          <span
            style={{
              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
              background: conf.bg, color: conf.color,
            }}
          >
            {conf.label}
          </span>
        </div>
        <p style={{ fontSize: 10, color: '#B0A0A8', margin: '0 0 6px' }}>
          {meta.hint}
        </p>
        {/* Diff */}
        <div
          style={{
            padding: '8px 10px', borderRadius: 6,
            background: '#FAFAFA', border: '1px solid #F1F5F9',
            marginBottom: 4,
          }}
        >
          {diffPreview(suggestion.before, suggestion.after)}
        </div>
        {/* Reason */}
        {suggestion.reason && (
          <p style={{ fontSize: 10, color: '#666', margin: 0, lineHeight: 1.4 }}>
            <span style={{ color: '#7c3aed', fontWeight: 700 }}>이유:</span> {suggestion.reason}
          </p>
        )}
      </div>
    </label>
  );
}

// ── Sub-component: manual-only item card with deep-link ──────────────────────
function ManualItemCard({
  productId, itemId,
}: {
  productId: string;
  itemId: NonAutoFillableItemId;
}) {
  const meta = NON_FILL_META[itemId];
  const Icon = meta.Icon;
  const href = `/products/new?edit=${productId}&focus=${meta.tab}`;

  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 10,
        background: '#FFFBEB', border: '1px solid #FDE68A',
        textDecoration: 'none', cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 32, height: 32, borderRadius: 8,
          background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={14} style={{ color: '#a16207' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: '#1A1A1A', margin: '0 0 2px' }}>
          {meta.label}
        </p>
        <p style={{ fontSize: 10, color: '#666', margin: 0, lineHeight: 1.4 }}>
          {meta.description}
        </p>
      </div>
      <ChevronRight size={14} style={{ color: '#a16207', flexShrink: 0 }} />
    </Link>
  );
}
