'use client';
// src/components/products/CropStudioPanel.tsx
// ============================================================================
// Crop studio (T1) — operator intervention point inside the publish-preview
// screen. Lets the operator:
//   1) pick a source image (detail page / current rep),
//   2) drag a region box (mapped to natural px; applied as a 1:1 square),
//   3) generate auto crop candidates (sharp attention / entropy saliency),
//   4) apply a chosen cut as the representative image (reversible DB), and
//   5) seed creative-MCP edit jobs (text-remove / 1:1 expand / bg-clean).
//
// Crop preview/apply uses the existing /thumb-crop route (dry-run for candidates,
// confirm:true to set mainImage). Edits POST /asset-edit-job (stores the box in
// input_refs; the operator runs the connector). No emoji (Lucide). No Korean
// literals (publish-preview-strings.ko.json).
// ============================================================================

import { useRef, useState } from 'react';
import {
  Crop, Wand2, Maximize2, Eraser, Loader2, Check, AlertTriangle, ImageOff,
} from 'lucide-react';
import strings from '@/lib/i18n/publish-preview-strings.ko.json';

const t = strings.cropStudio;

interface Box { x: number; y: number; width: number; height: number; }
interface CropWarning { code: string; severity: 'block' | 'warn'; message: string; remediation?: string; }
interface Candidate {
  key: string;
  label: string;
  preview: string;
  cropSidePx: number;
  warnings: CropWarning[];
  cautions: CropWarning[];
  box?: Box | null;
  strategy?: 'attention' | 'entropy';
}

interface Props {
  productId: string;
  repUrl: string | null;
  detailUrl: string | null;
  onApplied: () => void;
}

type SourceKey = 'detail' | 'rep';

export default function CropStudioPanel({ productId, repUrl, detailUrl, onApplied }: Props) {
  const [source, setSource] = useState<SourceKey>(detailUrl ? 'detail' : 'rep');
  const sourceUrl = source === 'detail' ? detailUrl : repUrl;

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  // Drag state — display px for rendering, natural px for the API.
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [displayBox, setDisplayBox] = useState<Box | null>(null);
  const [naturalBox, setNaturalBox] = useState<Box | null>(null);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'warn' | 'err'; text: string } | null>(null);

  const selected = candidates.find(c => c.key === selectedKey) ?? null;

  function resetBox() {
    setDisplayBox(null);
    setNaturalBox(null);
    startRef.current = null;
  }

  function onSourceChange(next: SourceKey) {
    setSource(next);
    setCandidates([]);
    setSelectedKey(null);
    setMessage(null);
    resetBox();
  }

  // ── Region drag → natural-px box ───────────────────────────────────────────
  function pointFromEvent(e: React.MouseEvent): { x: number; y: number; rectW: number; rectH: number } | null {
    const el = imgRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    return { x, y, rectW: rect.width, rectH: rect.height };
  }

  function onMouseDown(e: React.MouseEvent) {
    if (!natural) return;
    const p = pointFromEvent(e);
    if (!p) return;
    startRef.current = { x: p.x, y: p.y };
    setDragging(true);
    setDisplayBox({ x: p.x, y: p.y, width: 0, height: 0 });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging || !startRef.current) return;
    const p = pointFromEvent(e);
    if (!p) return;
    const s = startRef.current;
    setDisplayBox({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      width: Math.abs(p.x - s.x),
      height: Math.abs(p.y - s.y),
    });
  }

  function onMouseUp(e: React.MouseEvent) {
    if (!dragging || !startRef.current || !natural) { setDragging(false); return; }
    const p = pointFromEvent(e);
    setDragging(false);
    if (!p || p.rectW === 0 || p.rectH === 0) return;
    const s = startRef.current;
    const db: Box = {
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      width: Math.abs(p.x - s.x),
      height: Math.abs(p.y - s.y),
    };
    if (db.width < 6 || db.height < 6) { resetBox(); return; }
    setDisplayBox(db);
    const sx = natural.w / p.rectW;
    const sy = natural.h / p.rectH;
    setNaturalBox({
      x: Math.round(db.x * sx),
      y: Math.round(db.y * sy),
      width: Math.round(db.width * sx),
      height: Math.round(db.height * sy),
    });
  }

  // ── thumb-crop calls (dry-run candidates + confirm apply) ──────────────────
  async function cropRequest(payload: Record<string, unknown>) {
    const res = await fetch(`/api/products/${productId}/thumb-crop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: sourceUrl, ...payload }),
    });
    return res.json();
  }

  async function runAuto() {
    if (!sourceUrl) return;
    setBusy('auto'); setMessage(null);
    try {
      const strategies: Array<'attention' | 'entropy'> = ['attention', 'entropy'];
      const next: Candidate[] = [];
      for (const strategy of strategies) {
        const j = await cropRequest({ strategy });
        if (j?.success && j.preview) {
          next.push({
            key: `auto-${strategy}`,
            label: strategy === 'attention' ? t.candidateAttention : t.candidateEntropy,
            preview: j.preview, cropSidePx: j.cropSidePx ?? 0,
            warnings: j.warnings ?? [], cautions: j.cautions ?? [], strategy,
          });
        }
      }
      setCandidates(prev => [...prev.filter(c => !c.key.startsWith('auto-')), ...next]);
      if (next.length === 0) setMessage({ kind: 'err', text: t.error });
    } catch { setMessage({ kind: 'err', text: t.error }); }
    finally { setBusy(null); }
  }

  async function previewBox() {
    if (!sourceUrl || !naturalBox) return;
    setBusy('box'); setMessage(null);
    try {
      const j = await cropRequest({ box: naturalBox });
      if (j?.success && j.preview) {
        const cand: Candidate = {
          key: 'box', label: t.candidateBox, preview: j.preview, cropSidePx: j.cropSidePx ?? 0,
          warnings: j.warnings ?? [], cautions: j.cautions ?? [], box: naturalBox,
        };
        setCandidates(prev => [cand, ...prev.filter(c => c.key !== 'box')]);
        setSelectedKey('box');
      } else setMessage({ kind: 'err', text: t.error });
    } catch { setMessage({ kind: 'err', text: t.error }); }
    finally { setBusy(null); }
  }

  async function applySelected() {
    if (!sourceUrl || !selected) { setMessage({ kind: 'warn', text: t.selectFirst }); return; }
    setBusy('apply'); setMessage(null);
    try {
      const payload: Record<string, unknown> = { confirm: true };
      if (selected.box) payload.box = selected.box;
      else if (selected.strategy) payload.strategy = selected.strategy;
      const j = await cropRequest(payload);
      if (j?.applied) {
        setMessage({ kind: 'ok', text: t.applied });
        onApplied();
      } else if (j?.blocked) {
        setMessage({ kind: 'err', text: t.blocked });
      } else {
        setMessage({ kind: 'err', text: t.error });
      }
    } catch { setMessage({ kind: 'err', text: t.error }); }
    finally { setBusy(null); }
  }

  // ── Creative-MCP edit jobs (text-remove / 1:1 expand / bg-clean) ───────────
  async function seedEdit(jobType: 'text_remove' | 'canvas_expand' | 'bg_clean') {
    if (!sourceUrl) return;
    setBusy(jobType); setMessage(null);
    try {
      const res = await fetch(`/api/products/${productId}/asset-edit-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobType, sourceUrl, box: selected?.box ?? naturalBox ?? undefined }),
      });
      const j = await res.json();
      if (j?.success) setMessage({ kind: 'ok', text: j.reused ? t.editReused : t.editSeeded });
      else setMessage({ kind: 'err', text: t.error });
    } catch { setMessage({ kind: 'err', text: t.error }); }
    finally { setBusy(null); }
  }

  // Square guide reflecting the server's min-side squaring (from top-left).
  const guide = displayBox
    ? { x: displayBox.x, y: displayBox.y, side: Math.min(displayBox.width, displayBox.height) }
    : null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <Crop size={15} className="text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-700">{t.title}</h2>
      </div>
      <p className="mb-3 text-xs text-slate-500">{t.subtitle}</p>

      {/* Source picker */}
      <div className="mb-3 flex gap-1.5">
        {([['detail', t.sourceDetail, detailUrl], ['rep', t.sourceRep, repUrl]] as Array<[SourceKey, string, string | null]>)
          .filter(([, , url]) => !!url)
          .map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onSourceChange(key)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                source === key ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
      </div>

      {!sourceUrl ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-300">
          <ImageOff size={26} /> <span className="ml-2 text-xs text-slate-400">{t.noSource}</span>
        </div>
      ) : (
        <>
          {/* Draggable source */}
          <p className="mb-1.5 text-[11px] text-slate-400">{t.drawHint}</p>
          <div className="relative inline-block max-w-full select-none overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
            <img
              ref={imgRef}
              src={sourceUrl}
              alt="crop-source"
              draggable={false}
              onLoad={e => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              className="block max-h-[360px] w-auto max-w-full cursor-crosshair"
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            />
            {displayBox && (
              <div
                className="pointer-events-none absolute border-2 border-blue-400/80 bg-blue-400/10"
                style={{ left: displayBox.x, top: displayBox.y, width: displayBox.width, height: displayBox.height }}
              />
            )}
            {guide && guide.side > 0 && (
              <div
                className="pointer-events-none absolute border-2 border-emerald-400"
                style={{ left: guide.x, top: guide.y, width: guide.side, height: guide.side }}
              />
            )}
          </div>

          {/* Actions */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button" disabled={busy !== null}
              onClick={runAuto}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
            >
              {busy === 'auto' ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />} {t.runAuto}
            </button>
            <button
              type="button" disabled={busy !== null || !naturalBox}
              onClick={previewBox}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
            >
              {busy === 'box' ? <Loader2 size={13} className="animate-spin" /> : <Crop size={13} />} {t.previewBox}
            </button>
          </div>

          {/* Candidate gallery */}
          {candidates.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-slate-600">{t.autoTitle}</p>
              <div className="flex flex-wrap gap-2">
                {candidates.map(c => {
                  const blocked = c.warnings.some(w => w.severity === 'block');
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setSelectedKey(c.key)}
                      className={`group relative w-24 overflow-hidden rounded-lg border-2 text-left ${
                        selectedKey === c.key ? 'border-emerald-500' : 'border-transparent'
                      }`}
                    >
                      <img src={c.preview} alt={c.label} className="h-24 w-24 object-cover" />
                      <span className="block truncate px-1 py-0.5 text-[10px] text-slate-600">{c.label}</span>
                      <span className="block px-1 pb-0.5 text-[10px] text-slate-400">{t.side} {c.cropSidePx}px</span>
                      {blocked && (
                        <span className="absolute right-1 top-1 rounded-full bg-red-600 p-0.5 text-white">
                          <AlertTriangle size={10} />
                        </span>
                      )}
                      {!blocked && c.cautions.length > 0 && (
                        <span className="absolute right-1 top-1 rounded-full bg-amber-500 p-0.5 text-white">
                          <AlertTriangle size={10} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {selected && (selected.cautions.length > 0 || selected.warnings.length > 0) && (
                <ul className="mt-2 space-y-1">
                  {[...selected.warnings, ...selected.cautions].map((w, i) => (
                    <li
                      key={`${w.code}-${i}`}
                      className={`flex items-start gap-1.5 text-[11px] ${w.severity === 'block' ? 'text-red-700' : 'text-amber-700'}`}
                    >
                      <AlertTriangle size={12} className="mt-0.5 shrink-0" /> <span>{w.message}</span>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                disabled={busy !== null || !selected}
                onClick={applySelected}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {busy === 'apply' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {busy === 'apply' ? t.applying : t.apply}
              </button>
            </div>
          )}

          {/* Creative-MCP edits */}
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="mb-1 text-xs font-medium text-slate-600">{t.editTitle}</p>
            <p className="mb-2 text-[11px] text-slate-400">{t.editHint}</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button" disabled={busy !== null}
                onClick={() => seedEdit('text_remove')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
              >
                {busy === 'text_remove' ? <Loader2 size={13} className="animate-spin" /> : <Eraser size={13} />} {t.editTextRemove}
              </button>
              <button
                type="button" disabled={busy !== null}
                onClick={() => seedEdit('canvas_expand')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
              >
                {busy === 'canvas_expand' ? <Loader2 size={13} className="animate-spin" /> : <Maximize2 size={13} />} {t.editCanvasExpand}
              </button>
              <button
                type="button" disabled={busy !== null}
                onClick={() => seedEdit('bg_clean')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
              >
                {busy === 'bg_clean' ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />} {t.editBgClean}
              </button>
            </div>
          </div>

          {message && (
            <p className={`mt-3 text-xs font-medium ${
              message.kind === 'ok' ? 'text-emerald-700' : message.kind === 'warn' ? 'text-amber-700' : 'text-red-700'
            }`}>
              {message.text}
            </p>
          )}
        </>
      )}
    </section>
  );
}
