// src/app/products/link/page.tsx
// ============================================================================
// PRODUCT-LINK PL-1 — "상품 연동" board (3 zones, read-only pull).
//   Zone 1: entry cards (browse store / import by number)
//   Zone 2: linked product list (source + sync badges, filter)
//   Zone 3: right slide panel — Naver vs app field diff
// Naver write 0. Korean strings isolated in strings.ko.json (#3-1). Lucide, 0 emoji.
// ============================================================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Link2, Store, Hash, X, Loader2, CheckCircle2, AlertTriangle,
  ChevronRight, ChevronLeft, RefreshCw, PackageSearch,
} from 'lucide-react';
import strings from './strings.ko.json';

// ─── Types ───────────────────────────────────────────────────────────────────
interface LinkedRow {
  id: string;
  name: string;
  salePrice: number;
  naverProductId: string | null;
  channelProductNo: string | null;
  representativeImageUrl: string | null;
  statusType: string;
  source: 'NATIVE' | 'IMPORTED';
  linkStatus: string;
  syncState: 'SYNCED' | 'PENDING' | 'CONFLICT' | 'FAILED';
  lastSyncedAt: string | null;
}
interface SearchRow {
  channelProductNo: string | null;
  originProductNo: string | null;
  name: string;
  salePrice: number;
  stockQuantity: number;
  statusType: string;
  representativeImageUrl: string | null;
  alreadyLinked: boolean;
}
type Filter = 'all' | 'native' | 'imported' | 'conflict';

// ─── Small helpers ────────────────────────────────────────────────────────────
const won = (n: number) => `${(n ?? 0).toLocaleString('ko-KR')}원`;
const statusLabel = (s: string) => (strings.status as Record<string, string>)[s] ?? s;
function relTime(iso: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.round(h / 24)}일 전`;
}

function SourceBadge({ source }: { source: 'NATIVE' | 'IMPORTED' }) {
  const c = source === 'IMPORTED'
    ? { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', label: strings.zone2.filterImported }
    : { color: '#e62310', bg: '#fff0ef', border: '#ffd6d3', label: strings.zone2.filterNative };
  return (
    <span style={{ fontSize: 11, fontWeight: 800, color: c.color, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  );
}
function SyncChip({ state }: { state: LinkedRow['syncState'] }) {
  const map: Record<string, { color: string; bg: string; border: string; label: string }> = {
    SYNCED:   { color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb', label: 'SYNCED' },
    PENDING:  { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', label: 'PENDING' },
    CONFLICT: { color: '#b45309', bg: '#fffbeb', border: '#fde68a', label: strings.zone2.filterConflict },
    FAILED:   { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', label: 'FAILED' },
  };
  const c = map[state] ?? map.SYNCED;
  return (
    <span style={{ fontSize: 10, fontWeight: 800, color: c.color, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  );
}
function StatusBadge({ status }: { status: string }) {
  const green = ['SALE', 'ACTIVE'].includes(status);
  const amber = ['OUTOFSTOCK', 'OUT_OF_STOCK'].includes(status);
  const c = green ? { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' }
    : amber ? { color: '#b45309', bg: '#fffbeb', border: '#fde68a' }
    : { color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: c.color, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap' }}>
      {statusLabel(status)}
    </span>
  );
}

// ─── Import modal ─────────────────────────────────────────────────────────────
function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/naver/products/search?page=${p}&size=50&status=SALE`);
      const j = await r.json();
      if (!j.success) throw new Error(j.error ?? 'load failed');
      setRows(j.items ?? []);
      setTotalPages(j.totalPages ?? 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
      setRows([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(page); }, [page, load]);

  const toggle = (no: string) => setSelected((s) => {
    const n = new Set(s);
    n.has(no) ? n.delete(no) : n.add(no);
    return n;
  });

  async function doImport() {
    if (selected.size === 0 || importing) return;
    setImporting(true);
    try {
      const items = [...selected].map((no) => ({ originProductNo: no }));
      const r = await fetch('/api/products/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
      await r.json();
      onImported();
      onClose();
    } catch {
      setError('연동 중 오류가 발생했습니다.');
    } finally { setImporting(false); }
  }

  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '86vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid #F8DCE5' }}>
          <Store size={18} style={{ color: '#e62310' }} />
          <p style={{ margin: 0, flex: 1, fontSize: 15, fontWeight: 800, color: '#111827' }}>{strings.modal.title}</p>
          <button onClick={onClose} aria-label={strings.modal.close} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
        </div>
        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', minHeight: 0 }}>
          {loading && <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}><Loader2 size={20} className="animate-spin" style={{ margin: '0 auto' }} /></div>}
          {error && <div style={{ color: '#b91c1c', fontSize: 13, padding: 12 }}>{error}</div>}
          {!loading && !error && rows.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13 }}>{strings.modal.empty}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rows.map((row) => {
              const no = row.originProductNo ?? row.channelProductNo ?? '';
              const checked = selected.has(no);
              return (
                <label key={no} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, border: `1px solid ${checked ? '#bfdbfe' : '#f1f1f1'}`, background: row.alreadyLinked ? '#fafafa' : checked ? '#f5f9ff' : '#fff', cursor: row.alreadyLinked ? 'not-allowed' : 'pointer', opacity: row.alreadyLinked ? 0.65 : 1 }}>
                  <input type="checkbox" checked={checked} disabled={row.alreadyLinked || !no} onChange={() => no && toggle(no)} style={{ width: 16, height: 16, flexShrink: 0 }} />
                  {row.representativeImageUrl
                    ? <img src={row.representativeImageUrl} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f3f4f6', flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>{won(row.salePrice)}</span>
                      <StatusBadge status={row.statusType} />
                      {row.alreadyLinked && <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af' }}>{strings.modal.alreadyLinked}</span>}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
        {/* footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderTop: '1px solid #F8DCE5' }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 700, color: page <= 1 ? '#c4c4c4' : '#374151', background: '#f9fafb', border: '1px solid var(--border-neutral)', borderRadius: 8, padding: '6px 10px', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>
            <ChevronLeft size={13} />{strings.modal.prev}
          </button>
          <span style={{ fontSize: 12, color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
            {strings.modal.pageInfo.replace('{page}', String(page)).replace('{total}', String(totalPages))}
          </span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 700, color: page >= totalPages ? '#c4c4c4' : '#374151', background: '#f9fafb', border: '1px solid var(--border-neutral)', borderRadius: 8, padding: '6px 10px', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>
            {strings.modal.next}<ChevronRight size={13} />
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={() => void doImport()} disabled={selected.size === 0 || importing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: '#fff', background: selected.size === 0 ? '#f3b8c6' : '#e62310', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: selected.size === 0 || importing ? 'not-allowed' : 'pointer' }}>
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            {strings.modal.selectedCount.replace('{n}', String(selected.size))} · {strings.modal.importCta}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Diff slide panel (zone 3) ────────────────────────────────────────────────
interface DiffData { inSync: boolean; diffs: Array<{ field: string; naver: unknown; app: unknown }>; naverSnapshot: Record<string, unknown>; app: Record<string, unknown>; }
function DiffPanel({ product, onClose }: { product: LinkedRow; onClose: () => void }) {
  const [data, setData] = useState<DiffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null); setData(null);
    fetch(`/api/products/${product.id}/naver-sync`)
      .then((r) => r.json())
      .then((j) => { if (!alive) return; if (!j.success) throw new Error(j.error); setData(j); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : '비교 실패'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [product.id]);

  const FIELDS: Array<{ key: string; sor: 'naver' | 'app' }> = [
    { key: 'name', sor: 'app' },
    { key: 'salePrice', sor: 'app' },
    { key: 'stockQuantity', sor: 'naver' },
    { key: 'statusType', sor: 'naver' },
    { key: 'representativeImageUrl', sor: 'app' },
  ];
  const fmt = (k: string, v: unknown) => v == null ? '—' : k === 'salePrice' ? won(Number(v)) : k === 'statusType' ? statusLabel(String(v)) : k === 'representativeImageUrl' ? '이미지' : String(v);

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(440px, 92vw)', zIndex: 55, background: '#fff', borderLeft: '1px solid #F8DCE5', boxShadow: '-8px 0 30px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px', borderBottom: '1px solid #F8DCE5' }}>
        <PackageSearch size={18} style={{ color: '#e62310' }} />
        <p style={{ margin: 0, flex: 1, fontSize: 14, fontWeight: 800, color: '#111827' }}>{strings.zone3.title}</p>
        <button onClick={onClose} aria-label={strings.zone3.close} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</p>
        {loading && <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}><Loader2 size={18} className="animate-spin" style={{ margin: '0 auto 6px' }} /><p style={{ margin: 0, fontSize: 12 }}>{strings.zone3.loading}</p></div>}
        {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}
        {data && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, marginBottom: 12, background: data.inSync ? '#f0fdf4' : '#fffbeb', border: `1px solid ${data.inSync ? '#bbf7d0' : '#fde68a'}`, color: data.inSync ? '#15803d' : '#b45309', fontSize: 12, fontWeight: 700 }}>
              {data.inSync ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {data.inSync ? strings.zone3.inSync : strings.zone3.outOfSync}
            </div>
            <div style={{ border: '1px solid var(--border-neutral)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', fontSize: 11, fontWeight: 800, color: '#6b7280', background: '#faf8f3', borderBottom: '1px solid var(--border-neutral)' }}>
                <div style={{ padding: '8px 10px' }}>{strings.zone3.colField}</div>
                <div style={{ padding: '8px 10px' }}>{strings.zone3.colNaver}</div>
                <div style={{ padding: '8px 10px' }}>{strings.zone3.colApp}</div>
              </div>
              {FIELDS.map((f) => {
                const nv = (data.naverSnapshot as Record<string, unknown>)[f.key];
                const av = (data.app as Record<string, unknown>)[f.key];
                const differ = f.key !== 'stockQuantity' && data.diffs.some((d) => d.field === f.key);
                return (
                  <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', fontSize: 12, borderBottom: '1px solid #f3f0ea', background: differ ? '#fffdf6' : '#fff' }}>
                    <div style={{ padding: '8px 10px', color: '#374151', fontWeight: 600 }}>
                      {(strings.fields as Record<string, string>)[f.key] ?? f.key}
                      <span style={{ marginLeft: 5, fontSize: 9, fontWeight: 800, color: f.sor === 'naver' ? '#1d4ed8' : '#e62310' }}>
                        {f.sor === 'naver' ? strings.sor.naver : strings.sor.app}
                      </span>
                    </div>
                    <div style={{ padding: '8px 10px', color: '#111827', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fmt(f.key, nv)}</div>
                    <div style={{ padding: '8px 10px', color: differ ? '#b45309' : '#111827', fontWeight: differ ? 700 : 400, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.key === 'stockQuantity' ? '—' : fmt(f.key, av)}</div>
                  </div>
                );
              })}
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 11, color: '#6b7280' }}>{strings.zone3.stockNote}</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>{strings.zone3.readOnlyNote}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProductLinkPage() {
  const [rows, setRows] = useState<LinkedRow[]>([]);
  const [counts, setCounts] = useState({ all: 0, native: 0, imported: 0, conflict: 0 });
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<LinkedRow | null>(null);
  const [manual, setManual] = useState('');
  const [manualBusy, setManualBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadLinked = useCallback(async (f: Filter) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/products/linked?filter=${f}`);
      const j = await r.json();
      setRows(j.items ?? []);
      if (j.counts) setCounts(j.counts);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadLinked(filter); }, [filter, loadLinked]);

  async function importManual() {
    const nums = manual.split(/[\s,\n]+/).map((s) => s.trim()).filter(Boolean);
    if (nums.length === 0 || manualBusy) return;
    setManualBusy(true);
    try {
      const items = nums.map((no) => ({ originProductNo: no }));
      const r = await fetch('/api/products/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
      const j = await r.json();
      const im = (j.imported ?? []).length, sk = (j.skipped ?? []).length, fa = (j.failed ?? []).length;
      setToast(`${strings.result.imported.replace('{n}', String(im))} · ${strings.result.skipped.replace('{n}', String(sk))} · ${strings.result.failed.replace('{n}', String(fa))}`);
      setManual('');
      void loadLinked(filter);
    } catch {
      setToast('연동 중 오류가 발생했습니다.');
    } finally { setManualBusy(false); }
  }

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); }, [toast]);

  const FILTERS: Array<{ key: Filter; label: string; n: number }> = [
    { key: 'all', label: strings.zone2.filterAll, n: counts.all },
    { key: 'native', label: strings.zone2.filterNative, n: counts.native },
    { key: 'imported', label: strings.zone2.filterImported, n: counts.imported },
    { key: 'conflict', label: strings.zone2.filterConflict, n: counts.conflict },
  ];

  return (
    <div style={{ minHeight: '100vh', padding: 24, paddingBottom: 56 }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff0ef', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Link2 size={20} style={{ color: '#e62310' }} />
          </div>
          <div>
            <h1 className="font-display" style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>{strings.pageTitle}</h1>
            <p style={{ fontSize: 12.5, color: '#888', margin: '2px 0 0' }}>{strings.pageSubtitle}</p>
          </div>
        </div>
      </div>

      {/* Zone 1 — entry cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 18 }}>
        <div style={{ background: '#fff', border: '1px solid #F8DCE5', borderRadius: 16, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Store size={16} style={{ color: '#e62310' }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#111827' }}>{strings.zone1.browseTitle}</p>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>{strings.zone1.browseDesc}</p>
          <button onClick={() => setShowModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: '#fff', background: '#e62310', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer' }}>
            <Store size={14} />{strings.zone1.browseCta}
          </button>
        </div>
        <div style={{ background: '#fff', border: '1px solid #F8DCE5', borderRadius: 16, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Hash size={16} style={{ color: '#1d4ed8' }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#111827' }}>{strings.zone1.manualTitle}</p>
          </div>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: '#6b7280' }}>{strings.zone1.manualDesc}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder={strings.zone1.manualPlaceholder}
              onKeyDown={(e) => { if (e.key === 'Enter') void importManual(); }}
              style={{ flex: 1, minWidth: 0, fontSize: 13, padding: '8px 10px', border: '1px solid var(--border-neutral)', borderRadius: 8, outline: 'none' }} />
            <button onClick={() => void importManual()} disabled={manualBusy || !manual.trim()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 800, color: '#fff', background: !manual.trim() ? '#9dbdf0' : '#1d4ed8', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: manualBusy || !manual.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
              {manualBusy ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}{strings.zone1.manualCta}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div role="status" style={{ marginBottom: 14, padding: '9px 14px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: 12.5, fontWeight: 700 }}>{toast}</div>
      )}

      {/* Zone 2 — linked list */}
      <div style={{ background: '#fff', border: '1px solid #F8DCE5', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid #F8DCE5', flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#111827' }}>{strings.zone2.title}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ fontSize: 12, fontWeight: 700, color: filter === f.key ? '#fff' : '#6b7280', background: filter === f.key ? '#e62310' : '#f3f4f6', border: 'none', borderRadius: 99, padding: '4px 12px', cursor: 'pointer' }}>
                {f.label} {f.n}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={() => void loadLinked(filter)} aria-label="새로고침" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B0A0A8' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}><Loader2 size={20} className="animate-spin" style={{ margin: '0 auto' }} /></div>}
        {!loading && rows.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>{strings.zone2.empty}</div>}
        {!loading && rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead>
                <tr style={{ fontSize: 11, fontWeight: 800, color: '#6b7280', background: '#faf8f3', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>{strings.zone2.colName}</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>{strings.zone2.colPrice}</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>{strings.zone2.colStatus}</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>{strings.zone2.colSource}</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>{strings.zone2.colSync}</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>{strings.zone2.colLastSync}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} onClick={() => setSelected(r)}
                    style={{ borderTop: '1px solid #f3f0ea', cursor: 'pointer', background: selected?.id === r.id ? '#fff5f8' : '#fff' }}>
                    <td style={{ padding: '10px 14px', maxWidth: 320 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {r.representativeImageUrl
                          ? <img src={r.representativeImageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f3f4f6', flexShrink: 0 }} />}
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#111827', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{won(r.salePrice)}</td>
                    <td style={{ padding: '10px 14px' }}><StatusBadge status={r.statusType} /></td>
                    <td style={{ padding: '10px 14px' }}><SourceBadge source={r.source} /></td>
                    <td style={{ padding: '10px 14px' }}><SyncChip state={r.syncState} /></td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>{relTime(r.lastSyncedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <ImportModal onClose={() => setShowModal(false)} onImported={() => { setToast(strings.zone1.browseTitle + ' 완료'); void loadLinked(filter); }} />}
      {selected && <DiffPanel product={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
