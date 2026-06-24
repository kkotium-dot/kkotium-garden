// OverflowMenu — UX-v2 shared secondary-action menu (2026-06-23).
// ============================================================================
// A kebab (•••) dropdown that demotes secondary CTAs out of the primary action
// row (#134 시각위계: one loud primary, the rest quiet). Used in /studio
// (AssetBrowser header), /crawl (per-row secondary actions), /products/new
// (Naver publish actions) so the dominant action stays visually singular.
//
// D4 / #62 — the dropdown is rendered in a PORTAL on document.body with
// position:fixed, so it is never clipped by an ancestor's overflow:hidden
// (e.g. the /crawl grid card) nor painted behind a sibling row's background
// (z-index). Position is measured from the trigger rect on open and kept in
// sync on scroll/resize. Closes on outside click + Escape.
// Lucide icons only — no emoji (rule 3-1). No product logic (#55).

"use client";

import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

const MENU_WIDTH = 168;

export default function OverflowMenu({
  items,
  ariaLabel = "더보기",
  align = "right",
  size = 32,
}: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Portal target only exists in the browser.
  useEffect(() => setMounted(true), []);

  // Measure the trigger and place the fixed menu just below it, clamped to the
  // viewport so it never overflows the right/bottom edge.
  const reposition = () => {
    const t = triggerRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    let left = align === "right" ? r.right - MENU_WIDTH : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8));
    const top = Math.min(r.bottom + 4, window.innerHeight - 8);
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const tgt = e.target as Node;
      if (triggerRef.current?.contains(tgt)) return;
      if (menuRef.current?.contains(tgt)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScrollResize = () => reposition();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    // capture:true so we also catch scrolls inside nested overflow containers.
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (items.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
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
          flexShrink: 0,
        }}
      >
        <MoreVertical size={15} />
      </button>
      {open && mounted &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: MENU_WIDTH,
              background: "#fff",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
              padding: 4,
              zIndex: 9999,
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
          </div>,
          document.body,
        )}
    </>
  );
}
