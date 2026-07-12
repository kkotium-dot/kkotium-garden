// src/components/products/SubstituteEditor.tsx
// ============================================================================
// SUBSTITUTE (#210, SUBSTITUTE_STOCKOUT_SPEC) — shared, product-agnostic (#55)
// editor for a product's stock-out safety net (Product.substitute_info). Reused
// on both the linked-product diff panel (/products/link zone 3) and the SEED
// (씨앗심기) flow. Self-contained: loads via GET, persists via PUT. App-side
// input only (no Naver write). Korean strings in the sibling ko.json (#3-1);
// Lucide only, no emoji.
// ============================================================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import { LifeBuoy, Loader2, Check, Link2, Hash, Bell, AlertTriangle, ClipboardCheck, Search, Sparkles, X, PackageX } from 'lucide-react';
import strings from './SubstituteEditor.strings.ko.json';

// #211 — research default (재고 10개 or 5일치); a starting value, not hardcoded
// truth (the tooltip + threshold field let the operator adjust it).
const DEFAULT_LOW_STOCK_THRESHOLD = 10;

interface SubstituteInfo {
  hasSubstitute: boolean;
  substituteProductId?: string | null;
  substituteName?: string | null;
  substituteNote?: string | null;
  sourcingUrl?: string | null;
  sourcingCode?: string | null;
  lowStockThreshold?: number | null;
}

// ⓐ 앱 상품 선택 / ⓒ 카테고리 자동추천 (#256 P4-5) — substitute-candidates route.
interface CandidateProduct {
  id: string; name: string; salePrice: number; mainImage: string | null;
  naver_status_type: string | null; status: string;
}

const EMPTY: SubstituteInfo = {
  hasSubstitute: false,
  substituteName: '', substituteNote: '', sourcingUrl: '', sourcingCode: '',
  lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
};

// #211 — 전환 전 확인 체크리스트 (conservative listing-reuse rules). Client-side
// guidance only; unchecked items surface a ranking-reset / mismatch warning.
const CHECK_KEYS = ['check1', 'check2', 'check3', 'check4'] as const;

export default function SubstituteEditor({
  productId,
  isOutOfStock,
  onSaved,
}: {
  productId: string;
  /** #256 P4-5 — 재고 0 순간 빨간 강조 (기회손실 최소화 넛지). */
  isOutOfStock?: boolean;
  onSaved?: (info: SubstituteInfo) => void;
}) {
  const [info, setInfo] = useState<SubstituteInfo>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // #211 — 전환 전 확인 checklist (client-side guidance, not persisted).
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  // ⓐ 앱 상품 검색 피커
  const [pickQuery, setPickQuery] = useState('');
  const [pickResults, setPickResults] = useState<CandidateProduct[]>([]);
  const [pickBusy, setPickBusy] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  // ⓒ 카테고리 자동추천
  const [categoryPicks, setCategoryPicks] = useState<CandidateProduct[] | null>(null);
  const [categoryBusy, setCategoryBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr(null);
    fetch(`/api/products/${productId}/substitute`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (!j.success) throw new Error(j.error);
        setInfo(j.substitute ? { ...EMPTY, ...j.substitute } : EMPTY);
      })
      .catch(() => { if (alive) setErr(strings.loadFail); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [productId]);

  const patch = useCallback((p: Partial<SubstituteInfo>) => {
    setInfo((prev) => ({ ...prev, ...p }));
    setSavedAt(false);
  }, []);

  // ⓐ 앱 상품 검색 (디바운스)
  useEffect(() => {
    if (!showPicker || pickQuery.trim().length < 2) { setPickResults([]); return; }
    let alive = true;
    const t = setTimeout(() => {
      setPickBusy(true);
      fetch(`/api/products/${productId}/substitute-candidates?mode=search&q=${encodeURIComponent(pickQuery.trim())}`)
        .then((r) => r.json())
        .then((j) => { if (alive && j.success) setPickResults(j.items ?? []); })
        .finally(() => { if (alive) setPickBusy(false); });
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [showPicker, pickQuery, productId]);

  const selectCandidate = useCallback((c: CandidateProduct) => {
    patch({ substituteProductId: c.id, substituteName: c.name });
    setShowPicker(false);
    setPickQuery('');
  }, [patch]);

  const clearCandidate = useCallback(() => {
    patch({ substituteProductId: null });
  }, [patch]);

  // ⓒ 카테고리 자동 추천
  const loadCategoryPicks = useCallback(async () => {
    if (categoryBusy) return;
    setCategoryBusy(true);
    try {
      const r = await fetch(`/api/products/${productId}/substitute-candidates?mode=category`);
      const j = await r.json();
      setCategoryPicks(j.success ? (j.items ?? []) : []);
    } catch {
      setCategoryPicks([]);
    } finally { setCategoryBusy(false); }
  }, [categoryBusy, productId]);

  async function save() {
    if (saving) return;
    setSaving(true); setErr(null);
    try {
      const payload: SubstituteInfo = {
        ...info,
        // Enabling implicitly when any content exists keeps the flag honest.
        hasSubstitute: info.hasSubstitute || !!(info.substituteName || info.substituteNote || info.sourcingUrl || info.sourcingCode),
      };
      const r = await fetch(`/api/products/${productId}/substitute`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      setInfo({ ...EMPTY, ...j.substitute });
      setSavedAt(true);
      onSaved?.(j.substitute);
    } catch {
      setErr(strings.saveFail);
    } finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div style={box}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af', fontSize: 12 }}>
          <Loader2 size={13} className="animate-spin" />{strings.title}
        </div>
      </div>
    );
  }

  return (
    <div style={isOutOfStock ? boxUrgent : box}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
        <LifeBuoy size={15} style={{ color: isOutOfStock ? '#dc2626' : '#b45309' }} />
        <span style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{strings.title}</span>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: 11, color: '#9ca3af' }}>{strings.subtitle}</p>

      {/* #256 P4-5 — 재고 0 순간 빨간 강조 넛지 */}
      {isOutOfStock && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
          <PackageX size={13} style={{ color: '#dc2626', flexShrink: 0 }} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#991b1b' }}>{strings.oosBanner}</span>
        </div>
      )}

      {/* ⓐ 앱 상품 선택 / ⓒ 카테고리 자동추천 (#256 P4-5) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {info.substituteProductId ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 10px', background: '#fff', border: '1px solid #bbf7d0', borderRadius: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Check size={12} />{strings.pickSelected}: {info.substituteName}
            </span>
            <button type="button" onClick={clearCandidate} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }} title={strings.pickClear}>
              <X size={13} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setShowPicker((v) => !v)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
              <Search size={12} />{strings.pickAppProduct}
            </button>
            <button type="button" onClick={() => void loadCategoryPicks()} disabled={categoryBusy}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: '#7e22ce', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '6px 10px', cursor: categoryBusy ? 'not-allowed' : 'pointer' }}>
              {categoryBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}{strings.pickCategoryRecommend}
            </button>
          </div>
        )}

        {showPicker && !info.substituteProductId && (
          <div style={{ padding: 8, background: '#fff', border: '1px solid #bfdbfe', borderRadius: 8 }}>
            <input value={pickQuery} onChange={(e) => setPickQuery(e.target.value)} placeholder={strings.pickAppProductPlaceholder}
              autoFocus style={{ ...input, marginBottom: pickResults.length > 0 || pickBusy ? 6 : 0 }} />
            {pickBusy && <p style={{ margin: 0, fontSize: 10.5, color: '#9ca3af' }}><Loader2 size={11} className="animate-spin" style={{ display: 'inline', marginRight: 4 }} />...</p>}
            {!pickBusy && pickQuery.trim().length >= 2 && pickResults.length === 0 && (
              <p style={{ margin: 0, fontSize: 10.5, color: '#9ca3af' }}>{strings.pickSearchEmpty}</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {pickResults.map((c) => (
                <CandidateRow key={c.id} c={c} onPick={() => selectCandidate(c)} />
              ))}
            </div>
          </div>
        )}

        {categoryPicks && !info.substituteProductId && (
          <div style={{ padding: 8, background: '#fff', border: '1px solid #e9d5ff', borderRadius: 8 }}>
            {categoryPicks.length === 0
              ? <p style={{ margin: 0, fontSize: 10.5, color: '#9ca3af' }}>{strings.pickCategoryEmpty}</p>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {categoryPicks.map((c) => (
                    <CandidateRow key={c.id} c={c} onPick={() => selectCandidate(c)} />
                  ))}
                </div>
              )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Field label={strings.name}>
          <input value={info.substituteName ?? ''} onChange={(e) => patch({ substituteName: e.target.value })}
            placeholder={strings.namePlaceholder} style={input} />
        </Field>
        <Field label={strings.note}>
          <input value={info.substituteNote ?? ''} onChange={(e) => patch({ substituteNote: e.target.value })}
            placeholder={strings.notePlaceholder} style={input} />
        </Field>
        <Field label={strings.sourcingUrl} icon={<Link2 size={11} style={{ color: '#6b7280' }} />}>
          <input value={info.sourcingUrl ?? ''} onChange={(e) => patch({ sourcingUrl: e.target.value })}
            placeholder={strings.sourcingUrlPlaceholder} style={input} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label={strings.sourcingCode} icon={<Hash size={11} style={{ color: '#6b7280' }} />}>
            <input value={info.sourcingCode ?? ''} onChange={(e) => patch({ sourcingCode: e.target.value })}
              placeholder={strings.sourcingCodePlaceholder} style={input} />
          </Field>
          <Field label={strings.threshold} icon={<Bell size={11} style={{ color: '#6b7280' }} />}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <input type="number" min={0} value={info.lowStockThreshold ?? ''}
                onChange={(e) => patch({ lowStockThreshold: e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0) })}
                title={strings.thresholdTip}
                style={{ ...input, width: 70 }} />
              <span style={{ fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap' }} title={strings.thresholdTip}>{strings.thresholdSuffix}</span>
            </div>
          </Field>
        </div>
      </div>

      {/* #211 — 전환 전 확인 체크리스트: conservative listing-reuse guidance */}
      <div style={{ marginTop: 12, paddingTop: 11, borderTop: '1px dashed #F3D9E2' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <ClipboardCheck size={13} style={{ color: '#b45309' }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#111827' }}>{strings.checklistTitle}</span>
        </div>
        <p style={{ margin: '0 0 8px', fontSize: 10.5, color: '#9ca3af' }}>{strings.checklistLead}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {CHECK_KEYS.map((k) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: '#374151', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!checks[k]}
                onChange={(e) => setChecks((c) => ({ ...c, [k]: e.target.checked }))}
                style={{ width: 14, height: 14, flexShrink: 0 }} />
              {(strings as Record<string, string>)[k]}
            </label>
          ))}
        </div>
        {CHECK_KEYS.every((k) => checks[k]) ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 11, fontWeight: 700, color: '#15803d' }}>
            <Check size={12} />{strings.checkOk}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginTop: 8, padding: '7px 9px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
            <AlertTriangle size={12} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 10.5, color: '#991b1b', lineHeight: 1.5 }}>{strings.checkWarn}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11 }}>
        <button onClick={() => void save()} disabled={saving}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800, color: '#fff', background: saving ? '#f3b8c6' : '#F63B28', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {saving ? strings.saving : strings.save}
        </button>
        {savedAt && !saving && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: '#15803d' }}>
            <Check size={12} />{strings.saved}
          </span>
        )}
        {err && <span style={{ fontSize: 11, color: '#b91c1c' }}>{err}</span>}
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 700, color: '#6b7280', marginBottom: 3 }}>
        {icon}{label}
      </span>
      {children}
    </label>
  );
}

// ⓐ 앱 상품 선택 / ⓒ 카테고리 자동추천 결과 행 (#256 P4-5).
function CandidateRow({ c, onPick }: { c: CandidateProduct; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 7px', background: 'none', border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left', width: '100%' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f9fafb'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
      {c.mainImage
        ? <img src={c.mainImage} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: 28, height: 28, borderRadius: 6, background: '#f3f4f6', flexShrink: 0 }} />}
      <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', flexShrink: 0 }}>{(c.salePrice ?? 0).toLocaleString('ko-KR')}원</span>
    </button>
  );
}

const box: React.CSSProperties = {
  background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 12,
};
// #256 P4-5 — 재고 0(품절) 순간 붉은 강조로 전환.
const boxUrgent: React.CSSProperties = {
  background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: 12,
};
const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '6px 9px',
  border: '1px solid #e5e7eb', borderRadius: 7, outline: 'none', background: '#fff',
};
