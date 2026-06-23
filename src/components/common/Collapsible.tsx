// Collapsible — UX-v2 shared progressive-disclosure primitive (2026-06-23).
// ============================================================================
// A neutral, style-token disclosure used across /studio, /crawl, /products/new
// to keep secondary content folded by default (#134 점진적 공개). Primary work
// stays open; supporting cards (diagnosis / mood / upload) collapse so the eye
// lands on one focal task at a time.
//
// Uncontrolled (defaultOpen) by default; pass `open` + `onToggle` to control.
// Style-neutral: inline styles over globals.css CSS vars so it renders the same
// inside Tailwind pages (crawl/products-new) and token-styled studio cards.
// Lucide icons only — no emoji (rule 3-1). No product logic (#55).

"use client";

import { ReactNode, useId, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface CollapsibleProps {
  title: ReactNode;
  /** Small muted line under the title. */
  subtitle?: ReactNode;
  /** Leading icon (e.g. a Lucide glyph). */
  icon?: ReactNode;
  /** Right-aligned meta (status pill, count, etc.) shown in the header row. */
  right?: ReactNode;
  /** Visual weight. `secondary` is quieter (used for supporting cards). */
  tone?: "primary" | "secondary";
  defaultOpen?: boolean;
  /** Controlled mode — provide both. */
  open?: boolean;
  onToggle?: (next: boolean) => void;
  children: ReactNode;
  className?: string;
}

export default function Collapsible({
  title,
  subtitle,
  icon,
  right,
  tone = "primary",
  defaultOpen = true,
  open,
  onToggle,
  children,
  className,
}: CollapsibleProps) {
  const [internal, setInternal] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? (open as boolean) : internal;
  const panelId = useId();

  const toggle = () => {
    const next = !isOpen;
    if (!isControlled) setInternal(next);
    onToggle?.(next);
  };

  const secondary = tone === "secondary";

  return (
    <section
      className={className}
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-card, 12px)",
        overflow: "hidden",
        wordBreak: "keep-all",
        opacity: secondary && !isOpen ? 0.92 : 1,
      }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: secondary ? "9px 12px" : "11px 13px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {isOpen ? (
          <ChevronDown size={15} style={{ color: "var(--gp-ink-500, #8a7680)", flexShrink: 0 }} />
        ) : (
          <ChevronRight size={15} style={{ color: "var(--gp-ink-500, #8a7680)", flexShrink: 0 }} />
        )}
        {icon}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: "block",
              fontSize: secondary ? 12.5 : 13.5,
              fontWeight: secondary ? 700 : 800,
              color: "var(--gp-ink-900, #1A1A1A)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </span>
          {subtitle != null && (
            <span style={{ display: "block", fontSize: 10.5, color: "var(--gp-ink-500, #8a7680)" }}>
              {subtitle}
            </span>
          )}
        </span>
        {right != null && <span style={{ flexShrink: 0 }}>{right}</span>}
      </button>
      <div
        id={panelId}
        hidden={!isOpen}
        style={{ display: isOpen ? "block" : "none", padding: secondary ? "0 12px 12px" : "0 13px 13px" }}
      >
        {children}
      </div>
    </section>
  );
}
