'use client';

// src/components/studio/StudioCardShell.tsx
//
// Sprint 7-M2 Phase 3-C-1 — Shared presentational primitives for the
// Studio cards. Extracted from src/app/studio/page.tsx. Refactor only —
// markup + props byte-identical to the originals.
//
// Exports:
//   - Card           (section frame + colored left border + numbered step
//                     badge + title/subtitle header)
//   - Pill           (small label/value tag used in result panels)
//   - PrimaryButton  (filled red CTA with optional busy state)
//   - SecondaryButton (outlined CTA used for placeholders/secondary actions)
//   - pickGradePalette (grade → palette colors for L1/L2/L3/L4 pills)
//   - fmtPrice       (₩ number → "20,900원" using i18n suffix)

import { Loader2 } from 'lucide-react';
import strings from '@/lib/i18n/studio-strings.ko.json';

export interface Palette {
  bg: string;
  color: string;
  border: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

export function pickGradePalette(grade: string | null | undefined): Palette {
  switch (grade) {
    case 'L1': return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
    case 'L2': return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    case 'L3': return { bg: '#fefce8', color: '#a16207', border: '#fde68a' };
    case 'L4': return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
    default:   return { bg: '#f3f4f6', color: '#4b5563', border: '#d1d5db' };
  }
}

export function fmtPrice(n: number | null | undefined): string {
  if (n == null) return strings.header.noPrice;
  return `${n.toLocaleString('ko-KR')}${strings.header.wonSuffix}`;
}

// ── Card ──────────────────────────────────────────────────────────────────

export function Card({
  title, subtitle, children, accent,
  step, totalSteps, done,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accent?: string;
  step?: number;
  totalSteps?: number;
  done?: boolean;
}) {
  return (
    <section
      className="kk-card"
      style={{
        padding: 20,
        marginBottom: 16,
        borderLeft: `4px solid ${accent ?? 'var(--gp-pink-300)'}`,
      }}
    >
      <header style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        {step != null && totalSteps != null && (
          <div
            style={{
              flexShrink: 0,
              width: 34, height: 34,
              borderRadius: 17,
              background: done ? '#15803d' : (accent ?? 'var(--gp-pink-300)'),
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 900,
              fontFamily: "'Arial Black', Impact, sans-serif",
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            }}
            aria-label={done ? strings.workflow.stepDone : `${strings.workflow.stepLabel} ${step}/${totalSteps}`}
          >
            {done ? '✓' : step}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>{title}</h3>
          {subtitle && <p style={{ fontSize: 12, color: '#7A6873', margin: '4px 0 0' }}>{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

// ── Pill ──────────────────────────────────────────────────────────────────

export function Pill({
  label, value, palette, tooltip,
}: {
  label: string;
  value: string;
  palette?: Palette;
  tooltip?: string;
}) {
  const p = palette ?? { bg: 'var(--gp-pink-50)', color: '#F63B28', border: 'var(--gp-pink-300)' };
  return (
    <div
      title={tooltip}
      style={{
        display: 'inline-flex', flexDirection: 'column',
        padding: '6px 12px', background: p.bg,
        border: `1px solid ${p.border}`, borderRadius: 10,
        minWidth: 64,
        cursor: tooltip ? 'help' : undefined,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, color: p.color, opacity: 0.7 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 900, color: p.color, marginTop: 2 }}>{value}</span>
    </div>
  );
}

// ── Buttons ───────────────────────────────────────────────────────────────

export function PrimaryButton({
  onClick, disabled, busy, icon, children,
}: {
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '10px 18px',
        background: disabled || busy ? '#FFD9E5' : '#F63B28',
        color: '#fff',
        border: 'none', borderRadius: 10,
        fontSize: 14, fontWeight: 800,
        cursor: disabled || busy ? 'not-allowed' : 'pointer',
        transition: 'background 0.12s',
      }}
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function SecondaryButton({
  onClick, disabled, children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 12px',
        background: '#fff', color: '#F63B28',
        border: '1.5px solid var(--gp-pink-300)', borderRadius: 8,
        fontSize: 12, fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
