// src/components/products/NaverPushPanel.tsx
// ============================================================================
// PRODUCT-LINK PL-3 (#46/#196/#197) — price / stock push panel for zone-3's 반영
// tab. Dry-run preview only in the UI (쓰기0); the real PUT is GO-gated at the
// route and driven by the operator. Full-replace GET-merge preserves every other
// field. #197 (updated): stock is a MANUAL, explicit push that overwrites live
// Naver stock — never an auto-sync. Research copy (§2): auto-reflect warning,
// stock 5-step checklist, reverse/low-margin warning, stock-overwrite warning.
// Korean strings in the sibling ko.json (#3-1); Lucide only, no emoji.
// ============================================================================

'use client';

import { useState } from 'react';
import { Tag, Boxes, Loader2, AlertTriangle, ShieldAlert, ChevronRight, Info } from 'lucide-react';
import strings from './NaverPushPanel.strings.ko.json';

interface PushResult {
  field: 'price' | 'stock';
  dryRun: boolean;
  previousSalePrice?: number | null;
  newSalePrice?: number;
  previousStock?: number | null;
  newStock?: number;
  isOptionProduct?: boolean;
  optionCombosSet?: number;
  changedTopLevelFields?: string[];
  preservedFieldCount?: number;
  margin?: { supplierPrice: number | null; marginPct: number | null; reverseMargin: boolean; lowMargin: boolean };
}

const won = (n: number | null | undefined) => (n == null ? '—' : `${n.toLocaleString('ko-KR')}${strings.unit}`);
const CHECK_KEYS = ['check1', 'check2', 'check3', 'check4', 'check5'] as const;

export default function NaverPushPanel({ productId, appSalePrice }: { productId: string; appSalePrice: number }) {
  const [priceVal, setPriceVal] = useState<string>(String(appSalePrice || ''));
  const [stockVal, setStockVal] = useState<string>('');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<'price' | 'stock' | null>(null);
  const [result, setResult] = useState<PushResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function preview(field: 'price' | 'stock') {
    const raw = field === 'price' ? priceVal : stockVal;
    const value = field === 'price' ? Math.round(Number(raw)) : parseInt(raw, 10);
    if (!Number.isFinite(value)) { setErr(strings.previewFail); return; }
    setBusy(field); setErr(null); setResult(null);
    try {
      const r = await fetch(`/api/products/${productId}/naver-push`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value, dryRun: true }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error ?? strings.previewFail);
      setResult(j as PushResult);
    } catch (e) {
      setErr(e instanceof Error ? e.message : strings.previewFail);
    } finally { setBusy(null); }
  }

  const allChecked = CHECK_KEYS.every((k) => checks[k]);

  return (
    <div style={{ marginTop: 24 }}>
      {/* §2.1 — manual-reflect warning (applies to the whole push tab) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '9px 12px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, marginBottom: 16 }}>
        <Info size={14} style={{ color: '#c2410c', flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#9a3412' }}>{strings.autoWarnTitle}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9a3412', lineHeight: 1.5 }}>{strings.autoWarnBody}</p>
        </div>
      </div>

      {/* 가격 반영 */}
      <section style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Tag size={14} style={{ color: '#F63B28' }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{strings.priceTitle}</span>
        </div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 4 }}>{strings.priceLabel}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" min={0} value={priceVal} onChange={(e) => setPriceVal(e.target.value)}
            style={inputStyle} />
          <button onClick={() => void preview('price')} disabled={busy !== null}
            style={primaryBtn(busy === 'price')}>
            {busy === 'price' ? <Loader2 size={13} className="animate-spin" /> : <Tag size={13} />}{strings.pricePreview}
          </button>
        </div>
      </section>

      {/* 재고 반영 — 5-step checklist gates the preview button */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Boxes size={14} style={{ color: '#b45309' }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{strings.stockTitle}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, padding: '7px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 10 }}>
          <ShieldAlert size={13} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11, color: '#991b1b', lineHeight: 1.5 }}>{strings.stockOverwriteWarn}</span>
        </div>

        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#6b7280' }}>{strings.checklistTitle}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
          {CHECK_KEYS.map((k) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: '#374151', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!checks[k]} onChange={(e) => setChecks((c) => ({ ...c, [k]: e.target.checked }))}
                style={{ width: 14, height: 14, flexShrink: 0 }} />
              {(strings as Record<string, string>)[k]}
            </label>
          ))}
        </div>

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 4 }}>{strings.stockLabel}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" min={0} value={stockVal} onChange={(e) => setStockVal(e.target.value)}
            style={inputStyle} />
          <button onClick={() => void preview('stock')} disabled={busy !== null || !allChecked}
            title={allChecked ? undefined : strings.checklistTitle}
            style={primaryBtn(busy === 'stock' || !allChecked, '#b45309')}>
            {busy === 'stock' ? <Loader2 size={13} className="animate-spin" /> : <Boxes size={13} />}{strings.stockPreview}
          </button>
        </div>
      </section>

      {err && <p style={{ margin: '12px 0 0', fontSize: 12, color: '#b91c1c' }}>{err}</p>}

      {/* Dry-run preview */}
      {result && (
        <div style={{ marginTop: 16, border: '1px solid #bfdbfe', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '7px 12px', background: '#eff6ff', fontSize: 11, fontWeight: 800, color: '#1d4ed8' }}>{strings.previewTitle}</div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#111827' }}>
              {result.field === 'price'
                ? <>{won(result.previousSalePrice)}<ChevronRight size={13} style={{ color: '#9ca3af' }} /><span style={{ color: '#F63B28' }}>{won(result.newSalePrice)}</span></>
                : <>{result.previousStock ?? '—'}{strings.stockUnit}<ChevronRight size={13} style={{ color: '#9ca3af' }} /><span style={{ color: '#b45309' }}>{result.newStock}{strings.stockUnit}</span></>}
            </div>

            {result.field === 'stock' && result.isOptionProduct && (result.optionCombosSet ?? 0) > 0 && (
              <p style={{ margin: 0, fontSize: 11, color: '#b45309' }}>{strings.optionSet.replace('{n}', String(result.optionCombosSet))}</p>
            )}

            {/* 역마진 / 저마진 warning (price) */}
            {result.field === 'price' && result.margin?.reverseMargin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#b91c1c' }}>
                <AlertTriangle size={12} />{strings.reverseMargin}
              </div>
            )}
            {result.field === 'price' && result.margin && !result.margin.reverseMargin && result.margin.lowMargin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#b45309' }}>
                <AlertTriangle size={12} />{strings.lowMargin.replace('{n}', String(result.margin.marginPct))}
              </div>
            )}

            <p style={{ margin: 0, fontSize: 12, color: '#15803d', fontWeight: 700 }}>{strings.onlyField}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>
              {strings.changedField}: {(result.changedTopLevelFields ?? []).join(', ') || '—'} · {strings.preserved.replace('{n}', String(result.preservedFieldCount ?? 0))}
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginTop: 4, padding: '7px 10px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8 }}>
              <ShieldAlert size={13} style={{ color: '#c2410c', flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 11, color: '#9a3412', lineHeight: 1.5 }}>{strings.goNote}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1, minWidth: 0, boxSizing: 'border-box', fontSize: 13, padding: '7px 10px',
  border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', background: '#fff',
};
function primaryBtn(disabled: boolean, color = '#F63B28'): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800,
    color: '#fff', background: disabled ? '#f3b8c6' : color, border: 'none', borderRadius: 8,
    padding: '7px 14px', cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
  };
}
