'use client';
// src/components/layout/ShellControls.tsx
// ============================================================================
// DASHBOARD-SHELL Phase 3 (#217) — top-bar view controls.
//
// Two user preferences, written as attributes on <html> so CSS (globals.css)
// re-themes / re-tunes every surface without prop drilling:
//   - data-decor   : 장식강도 (calm | mid | maximal). DEFAULT calm (차분) — the
//                    attribute is REMOVED for calm so the CSS default is calm
//                    (mascot faces hidden, decoration off). ADHD-first (#217).
//   - data-palette : concept palette (brand | garden | sunset | lavender |
//                    strawberry). DEFAULT brand (attribute removed = brand).
//
// Persisted to localStorage; a pre-paint inline script in the root layout
// applies the saved values before first paint (no flash). This component only
// syncs React state ↔ the attributes on user change.
//
// No emoji (Lucide only). Korean labels (#73). No motion added here.
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { SlidersHorizontal, Check, Sparkles, Palette } from 'lucide-react';

type Decor = 'calm' | 'mid' | 'maximal';
type PaletteId = 'brand' | 'garden' | 'sunset' | 'lavender' | 'strawberry';

const DECORS: { id: Decor; label: string; hint: string }[] = [
  { id: 'calm',    label: '차분', hint: '장식·표정 최소 (기본)' },
  { id: 'mid',     label: '중간', hint: '마스코트 표정 표시' },
  { id: 'maximal', label: '화려', hint: '장식 최대' },
];

// Swatch preview = each palette's brand red + pink (matches globals.css).
const PALETTES: { id: PaletteId; label: string; red: string; pink: string }[] = [
  { id: 'brand',      label: '브랜드',      red: '#F63B28', pink: '#FCB4DC' },
  { id: 'garden',     label: '정원의 만개', red: '#E8385A', pink: '#FFB8C8' },
  { id: 'sunset',     label: '노을',        red: '#F25C3D', pink: '#FFC4A0' },
  { id: 'lavender',   label: '라벤더',      red: '#D04E89', pink: '#E2C7E8' },
  { id: 'strawberry', label: '딸기 크림',   red: '#D02642', pink: '#FFA9BA' },
];

// Apply an attribute to <html>, removing it when at the default so the CSS
// default (calm / brand) governs. Persist to localStorage.
function applyAttr(attr: string, value: string, defaultValue: string, storageKey: string) {
  const el = document.documentElement;
  if (value === defaultValue) el.removeAttribute(attr);
  else el.setAttribute(attr, value);
  try { localStorage.setItem(storageKey, value); } catch { /* private mode */ }
}

export default function ShellControls() {
  const [open, setOpen] = useState(false);
  const [decor, setDecor] = useState<Decor>('calm');
  const [palette, setPalette] = useState<PaletteId>('brand');
  const ref = useRef<HTMLDivElement>(null);

  // Sync React state from whatever the pre-paint script already applied.
  useEffect(() => {
    const el = document.documentElement;
    const d = (el.getAttribute('data-decor') as Decor) || 'calm';
    const p = (el.getAttribute('data-palette') as PaletteId) || 'brand';
    setDecor(d);
    setPalette(p);
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pickDecor = useCallback((d: Decor) => {
    setDecor(d);
    applyAttr('data-decor', d, 'calm', 'kk-decor');
  }, []);

  const pickPalette = useCallback((p: PaletteId) => {
    setPalette(p);
    applyAttr('data-palette', p, 'brand', 'kk-palette');
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }} className="hidden sm:block">
      <button
        type="button"
        aria-label="보기 설정 — 장식 강도 · 팔레트"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center transition-all"
        style={{
          width: 34, height: 34, borderRadius: 10,
          border: '1.5px solid #F8DCE5', background: open ? '#FFF0F5' : '#fff',
          color: 'var(--brand-red)', cursor: 'pointer', flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF0F5'; e.currentTarget.style.borderColor = '#FFB3CE'; }}
        onMouseLeave={(e) => { if (!open) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#F8DCE5'; } }}
      >
        <SlidersHorizontal size={16} strokeWidth={2.2} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="보기 설정"
          style={{
            position: 'absolute', top: 42, right: 0, zIndex: 60,
            width: 244, padding: 14, borderRadius: 14,
            background: '#fff', border: '1.5px solid #F8DCE5',
            boxShadow: '0 12px 32px rgba(42,31,26,0.16)',
          }}
        >
          {/* 장식 강도 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Sparkles size={14} style={{ color: 'var(--brand-red)' }} />
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#1A1A1A' }}>장식 강도</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
            {DECORS.map((d) => {
              const active = d.id === decor;
              return (
                <button
                  key={d.id}
                  type="button"
                  title={d.hint}
                  onClick={() => pickDecor(d.id)}
                  style={{
                    padding: '8px 6px', borderRadius: 9, cursor: 'pointer',
                    fontSize: 12, fontWeight: 700,
                    background: active ? 'var(--brand-red)' : '#FFF5F8',
                    color: active ? '#fff' : '#6B5A52',
                    border: `1.5px solid ${active ? 'var(--brand-red)' : '#F8DCE5'}`,
                  }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          {/* 팔레트 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Palette size={14} style={{ color: 'var(--brand-red)' }} />
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#1A1A1A' }}>팔레트</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {PALETTES.map((p) => {
              const active = p.id === palette;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickPalette(p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 8px', borderRadius: 9, cursor: 'pointer',
                    background: active ? '#FFF5F8' : 'transparent',
                    border: `1.5px solid ${active ? '#FFB3CE' : 'transparent'}`,
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'inline-flex', flexShrink: 0, borderRadius: 999, overflow: 'hidden', border: '1px solid rgba(42,31,26,0.12)' }}>
                    <span style={{ width: 14, height: 14, background: p.red }} />
                    <span style={{ width: 14, height: 14, background: p.pink }} />
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#3A3A3A' }}>{p.label}</span>
                  {active && <Check size={14} style={{ color: 'var(--brand-red)', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
