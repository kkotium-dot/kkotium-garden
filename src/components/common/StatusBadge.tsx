// StatusBadge — S2-A.2 (2026-06-24). Shared status pill with SEMANTIC tones,
// so meaning maps to color consistently across every screen (#142).
//
// Why a component (not raw Tailwind gray classes): the global gray->pink sweep
// in globals.css (.bg-gray-* / .text-gray-* overrides) recolors ANY gray class
// to brand pink. A '미적용'/'비활성' badge built from `bg-gray-100 text-gray-400`
// therefore turned PINK and read as "applied/active" — the exact opposite of
// its meaning. The `neutral` tone here uses dedicated --status-neutral-* tokens
// that the sweep never touches, so inactive states stay visibly inactive (#146).
//
// Signal tones (success/warning/danger) keep their literal semantic colors
// (emerald/amber/red), never tokenized into the pink palette (#142).

"use client";

import type { ReactNode } from "react";

export type StatusTone = "neutral" | "brand" | "success" | "warning" | "danger";

export interface StatusBadgeProps {
  /** Semantic tone — drives the color, not the wording. */
  tone: StatusTone;
  children: ReactNode;
  /** Optional leading icon (Lucide element). Stays flex-shrink-0. */
  icon?: ReactNode;
  /** Extra className appended (layout only — color comes from the tone). */
  className?: string;
}

const TONE_STYLE: Record<StatusTone, { background: string; color: string }> = {
  // Inactive / not-applied — deliberately muted, excluded from the pink sweep.
  neutral: { background: "var(--status-neutral-bg)", color: "var(--status-neutral-fg)" },
  // Applied / done — brand.
  brand: { background: "var(--pink-soft)", color: "var(--brand-red)" },
  // Signal colors — literal semantics (#142).
  success: { background: "var(--gp-green-50, #E8F5E6)", color: "var(--gp-green-700, #2E7D32)" },
  warning: { background: "#FEF3C7", color: "#B45309" },
  danger: { background: "var(--gp-red-50, #FFF0EF)", color: "var(--gp-red-600, #C41A0B)" },
};

export default function StatusBadge({ tone, children, icon, className }: StatusBadgeProps) {
  const s = TONE_STYLE[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full text-xs font-medium px-2 py-0.5${
        className ? ` ${className}` : ""
      }`}
      style={{ background: s.background, color: s.color, flexShrink: 0, maxWidth: "100%" }}
    >
      {icon && <span style={{ display: "flex", flexShrink: 0 }}>{icon}</span>}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {children}
      </span>
    </span>
  );
}
