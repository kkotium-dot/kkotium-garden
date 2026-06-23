// OverflowMenu — UX-v2 shared secondary-action menu (2026-06-23).
// ============================================================================
// A kebab (•••) dropdown that demotes secondary CTAs out of the primary action
// row (#134 시각위계: one loud primary, the rest quiet). Used in /studio
// (AssetBrowser header), /crawl (per-row secondary actions), /products/new
// (Naver publish actions) so the dominant action stays visually singular.
//
// Closes on outside click + Escape. Style-neutral inline styles over CSS vars.
// Lucide icons only — no emoji (rule 3-1). No product logic (#55).

"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

export interface OverflowMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface OverflowMenuProps {
  items: OverflowMenuItem[];
  /** Accessible label for the trigger. */
  ariaLabel?: string;
  /** Dropdown alignment relative to the trigger. */
  align?: "left" | "right";
  /** Optional custom trigger size (px). */
  size?: number;
}

export default function OverflowMenu({
  items,
  ariaLabel = "더보기",
  align = "right",
  size = 32,
}: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={rootRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: open ? "var(--gp-pink-50, #FFF5F8)" : "transparent",
          border: "1px solid var(--color-border)",
          borderRadius: 9,
          cursor: "pointer",
          color: "var(--gp-ink-500, #8a7680)",
        }}
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            [align]: 0,
            minWidth: 152,
            background: "#fff",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: 4,
            zIndex: 60,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "8px 10px",
                borderRadius: 7,
                border: "none",
                background: "transparent",
                cursor: it.disabled ? "not-allowed" : "pointer",
                opacity: it.disabled ? 0.45 : 1,
                fontSize: 12.5,
                fontWeight: 700,
                color: it.danger ? "#dc2626" : "var(--gp-ink-700, #4A3B42)",
                textAlign: "left",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!it.disabled) e.currentTarget.style.background = "var(--gp-pink-50, #FFF5F8)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
