// src/components/products/SubstituteEditor.tsx
// ============================================================================
// SUBSTITUTE (#210, SUBSTITUTE_STOCKOUT_SPEC) — shared, product-agnostic (#55)
// editor for a product's stock-out safety net (Product.substitute_info). Reused
// on both the linked-product diff panel (/products/link zone 3) and the SEED
// (씨앗심기) flow. Self-contained: loads via GET, persists via PUT. App-side
// input only (no Naver write). Korean strings in the sibling ko.json (#3-1);
// Lucide only, no emoji.
//
// v2 (B11/B13, docs/plan/B11_B13_B15_HANDOFF_SPEC_2026-09-09.md):
//   - substitutes[]   — 우선순위 있는 다중 대체상품 등록 (B11). 폴백 순서.
//   - optionMatches[] — Product.optionValues 각 값별 대체상품 매칭 (B13).
// 타입/정규화는 src/lib/products/substitute-types.ts 단일 권위(#62)를 그대로
// 쓴다 — 이 컴포넌트는 그 shape를 렌더링/편집만 한다.
// ============================================================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import { LifeBuoy, Loader2, Check, Link2, Hash, Bell, AlertTriangle, ClipboardCheck, Search, Sparkles, X, PackageX, Plus, Trash2, ChevronUp, ChevronDown, Tags } from 'lucide-react';
import strings from './SubstituteEditor.strings.ko.json';
import type { SubstituteInfoV2, SubstituteEntry, OptionMatchEntry } from '@/lib/products/substitute-types';

// #211 — research default (재고 10개 or 5일치); a starting value, not hardcoded
// truth (the tooltip + threshold field let the operator adjust it).
const DEFAULT_LOW_STOCK_THRESHOLD = 10;

// ⓐ 앱 상품 선택 / ⓒ 카테고리 자동추천 (#256 P4-5) — substitute-candidates route.
interface CandidateProduct {
  id: string; name: string; salePrice: number; mainImage: string | null;
  naver_status_type: string | null; status: string;
}

const EMPTY: SubstituteInfoV2 = {
  version: 2,
  substitutes: [],
  optionMatches: [],
  lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
};

// #211 — 전환 전 확인 체크리스트 (conservative listing-reuse rules). Client-side
// guidance only; unchecked items surface a ranking-reset / mismatch warning.
const CHECK_KEYS = ['check1', 'check2', 'check3', 'check4'] as const;

// 대체상품 등록/옵션매칭 행에서 공통으로 쓰는 편집 상태(빈 substituteName도
// 허용 — 저장 시 substitute-types.ts의 normalizeSubstituteInfo가 빈 행을 거름).
type SubRow = SubstituteEntry & { _key: string };
type OptionRow = { optionValue: string; substituteName: string; substituteNote: string; substituteProductId: string | null };

let rowKeySeq = 0;
const nextRowKey = () => `row-${++rowKeySeq}`;

// 피커(앱 상품 선택 / 카테고리 추천)가 어느 행을 대상으로 열려 있는지.
type PickerTarget = { kind: 'substitute'; index: number } | { kind: 'option'; index: number } | null;

export default function SubstituteEditor({
  productId,
  isOutOfStock,
  onSaved,
}: {
  productId: string;
  /** #256 P4-5 — 재고 0 순간 빨간 강조 (기회손실 최소화 넛지). */
  isOutOfStock?: boolean;
  onSaved?: (info: SubstituteInfoV2) => void;
}) {
  const [rows, setRows] = useState<SubRow[]>([]);
  const [optionValues, setOptionValues] = useState<string[]>([]);
  const [optionRows, setOptionRows] = useState<Record<string, OptionRow>>({});
  const [threshold, setThreshold] = useState<number | null>(DEFAULT_LOW_STOCK_THRESHOLD);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // #211 — 전환 전 확인 checklist (client-side guidance, not persisted).
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  // 앱 상품 검색/카테고리 추천 피커 — 대체상품 행/옵션매칭 행 공용.
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [pickQuery, setPickQuery] = useState('');
  const [pickResults, setPickResults] = useState<CandidateProduct[]>([]);
  const [pickBusy, setPickBusy] = useState(false);
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
        const info: SubstituteInfoV2 = j.substitute ?? EMPTY;
        setRows((info.substitutes ?? []).map((s) => ({ ...s, _key: nextRowKey() })));
        setThreshold(info.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD);
        const ov: string[] = Array.isArray(j.optionValues) ? j.optionValues : [];
        setOptionValues(ov);
        const matchByValue = new Map<string, OptionMatchEntry>(
          (info.optionMatches ?? []).map((m) => [m.optionValue, m]),
        );
        const initialOptionRows: Record<string, OptionRow> = {};
        for (const v of ov) {
          const m = matchByValue.get(v);
          initialOptionRows[v] = {
            optionValue: v,
            substituteName: m?.substituteName ?? '',
            substituteNote: m?.substituteNote ?? '',
            substituteProductId: m?.substituteProductId ?? null,
          };
        }
        setOptionRows(initialOptionRows);
      })
      .catch(() => { if (alive) setErr(strings.loadFail); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [productId]);

  const markDirty = useCallback(() => setSavedAt(false), []);

  const patchRow = useCallback((key: string, p: Partial<SubRow>) => {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, ...p } : r)));
    markDirty();
  }, [markDirty]);

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      { _key: nextRowKey(), priority: prev.length + 1, substituteName: '', substituteNote: '', sourcingUrl: '', sourcingCode: '', substituteProductId: null },
    ]);
    markDirty();
  }, [markDirty]);

  const removeRow = useCallback((key: string) => {
    setRows((prev) => prev.filter((r) => r._key !== key));
    markDirty();
  }, [markDirty]);

  const moveRow = useCallback((key: string, dir: -1 | 1) => {
    setRows((prev) => {
      const i = prev.findIndex((r) => r._key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    markDirty();
  }, [markDirty]);

  const patchOptionRow = useCallback((optionValue: string, p: Partial<OptionRow>) => {
    setOptionRows((prev) => ({ ...prev, [optionValue]: { ...prev[optionValue], ...p } }));
    markDirty();
  }, [markDirty]);

  // 피커(앱 상품 검색) — pickerTarget에 지정된 행으로 검색 결과를 적용.
  useEffect(() => {
    if (!pickerTarget || pickQuery.trim().length < 2) { setPickResults([]); return; }
    let alive = true;
    const t = setTimeout(() => {
      setPickBusy(true);
      fetch(`/api/products/${productId}/substitute-candidates?mode=search&q=${encodeURIComponent(pickQuery.trim())}`)
        .then((r) => r.json())
        .then((j) => { if (alive && j.success) setPickResults(j.items ?? []); })
        .finally(() => { if (alive) setPickBusy(false); });
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [pickerTarget, pickQuery, productId]);

  const applyCandidate = useCallback((c: CandidateProduct) => {
    if (!pickerTarget) return;
    if (pickerTarget.kind === 'substitute') {
      setRows((prev) => prev.map((r, i) => (i === pickerTarget.index ? { ...r, substituteProductId: c.id, substituteName: c.name } : r)));
    } else {
      const optionValue = optionValues[pickerTarget.index];
      if (optionValue) {
        setOptionRows((prev) => ({
          ...prev,
          [optionValue]: { ...prev[optionValue], substituteProductId: c.id, substituteName: c.name },
        }));
      }
    }
    markDirty();
    setPickerTarget(null);
    setPickQuery('');
    setCategoryPicks(null);
  }, [pickerTarget, optionValues, markDirty]);

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
      const payload: SubstituteInfoV2 = {
        version: 2,
        substitutes: rows.map((r, i) => ({
          priority: i + 1,
          substituteProductId: r.substituteProductId ?? null,
          substituteName: r.substituteName ?? '',
          substituteNote: r.substituteNote ?? null,
          sourcingUrl: r.sourcingUrl ?? null,
          sourcingCode: r.sourcingCode ?? null,
        })),
        optionMatches: Object.values(optionRows)
          .filter((o) => o.substituteName.trim() || o.substituteProductId)
          .map((o) => ({
            optionValue: o.optionValue,
            substituteProductId: o.substituteProductId,
            substituteName: o.substituteName,
            substituteNote: o.substituteNote || null,
          })),
        lowStockThreshold: threshold,
      };
      const r = await fetch(`/api/products/${productId}/substitute`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      const saved: SubstituteInfoV2 = j.substitute ?? EMPTY;
      setRows((saved.substitutes ?? []).map((s) => ({ ...s, _key: nextRowKey() })));
      setSavedAt(true);
      onSaved?.(saved);
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

      {/* B11 — 우선순위가 있는 다중 대체상품 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 10.5, color: '#9ca3af' }} title={strings.priorityHint}>{strings.priorityHint}</span>
      </div>

      {rows.length === 0 && (
        <p style={{ margin: '0 0 8px', fontSize: 11, color: '#9ca3af' }}>{strings.emptySubstitutes}</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((row, i) => (
          <SubstituteRow
            key={row._key}
            row={row}
            index={i}
            total={rows.length}
            pickerOpen={pickerTarget?.kind === 'substitute' && pickerTarget.index === i}
            onOpenPicker={() => { setPickerTarget({ kind: 'substitute', index: i }); setPickQuery(''); setCategoryPicks(null); }}
            onClosePicker={() => setPickerTarget(null)}
            onPatch={(p) => patchRow(row._key, p)}
            onRemove={() => removeRow(row._key)}
            onMoveUp={() => moveRow(row._key, -1)}
            onMoveDown={() => moveRow(row._key, 1)}
            pickQuery={pickQuery}
            setPickQuery={setPickQuery}
            pickResults={pickResults}
            pickBusy={pickBusy}
            categoryPicks={categoryPicks}
            categoryBusy={categoryBusy}
            onLoadCategoryPicks={() => void loadCategoryPicks()}
            onPickCandidate={applyCandidate}
          />
        ))}
      </div>

      <button type="button" onClick={addRow}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: '#b45309', background: '#fff', border: '1px dashed #fbbf24', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', marginTop: 10 }}>
        <Plus size={12} />{strings.addSubstitute}
      </button>

      <Field label={strings.threshold} icon={<Bell size={11} style={{ color: '#6b7280' }} />}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
          <input type="number" min={0} value={threshold ?? ''}
            onChange={(e) => { setThreshold(e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0)); markDirty(); }}
            title={strings.thresholdTip}
            style={{ ...input, width: 70 }} />
          <span style={{ fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap' }} title={strings.thresholdTip}>{strings.thresholdSuffix}</span>
        </div>
      </Field>

      {/* B13 — 옵션값별 대체상품 매칭 (Product.optionValues가 있는 상품만) */}
      {optionValues.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 11, borderTop: '1px dashed #F3D9E2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Tags size={13} style={{ color: '#7e22ce' }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#111827' }}>{strings.optionMatchTitle}</span>
          </div>
          <p style={{ margin: '0 0 8px', fontSize: 10.5, color: '#9ca3af' }}>{strings.optionMatchSubtitle}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {optionValues.map((v, i) => (
              <OptionMatchRow
                key={v}
                optionValue={v}
                row={optionRows[v]}
                pickerOpen={pickerTarget?.kind === 'option' && pickerTarget.index === i}
                onOpenPicker={() => { setPickerTarget({ kind: 'option', index: i }); setPickQuery(''); setCategoryPicks(null); }}
                onClosePicker={() => setPickerTarget(null)}
                onPatch={(p) => patchOptionRow(v, p)}
                pickQuery={pickQuery}
                setPickQuery={setPickQuery}
                pickResults={pickResults}
                pickBusy={pickBusy}
                onPickCandidate={applyCandidate}
              />
            ))}
          </div>
        </div>
      )}

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

// ── B11 — 대체상품 1행 (우선순위 이동/삭제 + 기존 단일폼 UX 재사용) ─────────
function SubstituteRow({
  row, index, total, pickerOpen, onOpenPicker, onClosePicker, onPatch, onRemove, onMoveUp, onMoveDown,
  pickQuery, setPickQuery, pickResults, pickBusy, categoryPicks, categoryBusy, onLoadCategoryPicks, onPickCandidate,
}: {
  row: SubRow; index: number; total: number; pickerOpen: boolean;
  onOpenPicker: () => void; onClosePicker: () => void;
  onPatch: (p: Partial<SubRow>) => void; onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void;
  pickQuery: string; setPickQuery: (v: string) => void; pickResults: CandidateProduct[]; pickBusy: boolean;
  categoryPicks: CandidateProduct[] | null; categoryBusy: boolean;
  onLoadCategoryPicks: () => void; onPickCandidate: (c: CandidateProduct) => void;
}) {
  return (
    <div style={{ padding: 10, background: '#fff', border: '1px solid #fde68a', borderRadius: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#b45309' }}>
          {strings.priorityLabel.replace('{n}', String(index + 1))}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button type="button" onClick={onMoveUp} disabled={index === 0} title={strings.moveUp}
            style={{ background: 'none', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', color: index === 0 ? '#e5e7eb' : '#9ca3af', padding: 2 }}>
            <ChevronUp size={13} />
          </button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1} title={strings.moveDown}
            style={{ background: 'none', border: 'none', cursor: index === total - 1 ? 'not-allowed' : 'pointer', color: index === total - 1 ? '#e5e7eb' : '#9ca3af', padding: 2 }}>
            <ChevronDown size={13} />
          </button>
          <button type="button" onClick={onRemove} title={strings.removeSubstitute}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 2 }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ⓐ 앱 상품 선택 / ⓒ 카테고리 자동추천 (#256 P4-5) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
        {row.substituteProductId ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Check size={12} />{strings.pickSelected}: {row.substituteName}
            </span>
            <button type="button" onClick={() => onPatch({ substituteProductId: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }} title={strings.pickClear}>
              <X size={13} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" onClick={pickerOpen ? onClosePicker : onOpenPicker}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
              <Search size={12} />{strings.pickAppProduct}
            </button>
            <button type="button" onClick={onLoadCategoryPicks} disabled={categoryBusy}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: '#7e22ce', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '6px 10px', cursor: categoryBusy ? 'not-allowed' : 'pointer' }}>
              {categoryBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}{strings.pickCategoryRecommend}
            </button>
          </div>
        )}

        {pickerOpen && !row.substituteProductId && (
          <div style={{ padding: 8, background: '#fff', border: '1px solid #bfdbfe', borderRadius: 8 }}>
            <input value={pickQuery} onChange={(e) => setPickQuery(e.target.value)} placeholder={strings.pickAppProductPlaceholder}
              autoFocus style={{ ...input, marginBottom: pickResults.length > 0 || pickBusy ? 6 : 0 }} />
            {pickBusy && <p style={{ margin: 0, fontSize: 10.5, color: '#9ca3af' }}><Loader2 size={11} className="animate-spin" style={{ display: 'inline', marginRight: 4 }} />...</p>}
            {!pickBusy && pickQuery.trim().length >= 2 && pickResults.length === 0 && (
              <p style={{ margin: 0, fontSize: 10.5, color: '#9ca3af' }}>{strings.pickSearchEmpty}</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {pickResults.map((c) => (
                <CandidateRow key={c.id} c={c} onPick={() => onPickCandidate(c)} />
              ))}
            </div>
          </div>
        )}

        {categoryPicks && !row.substituteProductId && (
          <div style={{ padding: 8, background: '#fff', border: '1px solid #e9d5ff', borderRadius: 8 }}>
            {categoryPicks.length === 0
              ? <p style={{ margin: 0, fontSize: 10.5, color: '#9ca3af' }}>{strings.pickCategoryEmpty}</p>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {categoryPicks.map((c) => (
                    <CandidateRow key={c.id} c={c} onPick={() => onPickCandidate(c)} />
                  ))}
                </div>
              )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Field label={strings.name}>
          <input value={row.substituteName ?? ''} onChange={(e) => onPatch({ substituteName: e.target.value })}
            placeholder={strings.namePlaceholder} style={input} />
        </Field>
        <Field label={strings.note}>
          <input value={row.substituteNote ?? ''} onChange={(e) => onPatch({ substituteNote: e.target.value })}
            placeholder={strings.notePlaceholder} style={input} />
        </Field>
        <Field label={strings.sourcingUrl} icon={<Link2 size={11} style={{ color: '#6b7280' }} />}>
          <input value={row.sourcingUrl ?? ''} onChange={(e) => onPatch({ sourcingUrl: e.target.value })}
            placeholder={strings.sourcingUrlPlaceholder} style={input} />
        </Field>
        <Field label={strings.sourcingCode} icon={<Hash size={11} style={{ color: '#6b7280' }} />}>
          <input value={row.sourcingCode ?? ''} onChange={(e) => onPatch({ sourcingCode: e.target.value })}
            placeholder={strings.sourcingCodePlaceholder} style={input} />
        </Field>
      </div>
    </div>
  );
}

// ── B13 — 옵션값 1개에 대한 대체상품 매칭 행 ────────────────────────────────
function OptionMatchRow({
  optionValue, row, pickerOpen, onOpenPicker, onClosePicker, onPatch,
  pickQuery, setPickQuery, pickResults, pickBusy, onPickCandidate,
}: {
  optionValue: string; row: OptionRow | undefined; pickerOpen: boolean;
  onOpenPicker: () => void; onClosePicker: () => void; onPatch: (p: Partial<OptionRow>) => void;
  pickQuery: string; setPickQuery: (v: string) => void; pickResults: CandidateProduct[]; pickBusy: boolean;
  onPickCandidate: (c: CandidateProduct) => void;
}) {
  const r = row ?? { optionValue, substituteName: '', substituteNote: '', substituteProductId: null };
  return (
    <div style={{ padding: 9, background: '#fff', border: '1px solid #e9d5ff', borderRadius: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#7e22ce', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 6, padding: '2px 7px' }}>
          {optionValue}
        </span>
        {r.substituteProductId && (
          <button type="button" onClick={() => onPatch({ substituteProductId: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', marginLeft: 'auto' }} title={strings.optionMatchClear}>
            <X size={12} />
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        <input value={r.substituteName} onChange={(e) => onPatch({ substituteName: e.target.value })}
          placeholder={strings.optionMatchNamePlaceholder} style={{ ...input, flex: '1 1 160px' }} />
        <button type="button" onClick={pickerOpen ? onClosePicker : onOpenPicker}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '6px 9px', cursor: 'pointer', flexShrink: 0 }}>
          <Search size={11} />{strings.optionMatchPick}
        </button>
      </div>
      <input value={r.substituteNote} onChange={(e) => onPatch({ substituteNote: e.target.value })}
        placeholder={strings.optionMatchNotePlaceholder} style={input} />

      {pickerOpen && (
        <div style={{ marginTop: 6, padding: 8, background: '#fff', border: '1px solid #bfdbfe', borderRadius: 8 }}>
          <input value={pickQuery} onChange={(e) => setPickQuery(e.target.value)} placeholder={strings.pickAppProductPlaceholder}
            autoFocus style={{ ...input, marginBottom: pickResults.length > 0 || pickBusy ? 6 : 0 }} />
          {pickBusy && <p style={{ margin: 0, fontSize: 10.5, color: '#9ca3af' }}><Loader2 size={11} className="animate-spin" style={{ display: 'inline', marginRight: 4 }} />...</p>}
          {!pickBusy && pickQuery.trim().length >= 2 && pickResults.length === 0 && (
            <p style={{ margin: 0, fontSize: 10.5, color: '#9ca3af' }}>{strings.pickSearchEmpty}</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {pickResults.map((c) => (
              <CandidateRow key={c.id} c={c} onPick={() => onPickCandidate(c)} />
            ))}
          </div>
        </div>
      )}
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
