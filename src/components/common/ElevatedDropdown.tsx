// ElevatedDropdown — shared elevated-overlay primitive (#149 / #62 generalized).
// ============================================================================
// Every select/combobox/popover overlay must float ABOVE the layout instead of
// rendering position:static/relative inline — otherwise it gets clipped by an
// ancestor's overflow:hidden (USection cards, the Tower scroll rail) or painted
// behind a sibling. This generalizes the proven D4 OverflowMenu mechanism into
// a reusable shell:
//   - createPortal(document.body) so no ancestor overflow can clip it
//   - position:fixed, rect-synced to an anchor element (width-matched)
//   - z-index 9999, kept in sync on scroll (capture) / resize / panel resize
//   - flips above the anchor when there isn't room below
//   - optional outside-click + Escape close (anchor + panel aware, so clicking
//     an option inside the portaled panel never closes before the click lands)
//
// The CALLER provides the fully-styled panel as children (keeping each
// combobox's existing look); this component only positions + elevates it.
// No product logic (#55). Lucide-only callers (rule 3-1).

"use client";

import { ReactNode, RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ElevatedDropdownProps {
  /** Element the panel is positioned under (bottom edge + width). */
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  children: ReactNode;
  /**
   * Called when the user clicks outside both the anchor and the panel, or
   * presses Escape. Omit for comboboxes that close themselves via input
   * onBlur (those keep onMouseDown preventDefault on their panel).
   */
  onClose?: () => void;
  /** Match the panel width to the anchor width (default true). */
  matchAnchorWidth?: boolean;
  /** Vertical gap between anchor and panel in px (default 4). */
  gap?: number;
  /** Stacking order (default 9999, same as OverflowMenu). */
  zIndex?: number;
}

export default function ElevatedDropdown({
  anchorRef,
  open,
  children,
  onClose,
  matchAnchorWidth = true,
  gap = 4,
  zIndex = 9999,
}: ElevatedDropdownProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: -9999,
    left: 0,
    width: 0,
  });

  // Portal target only exists in the browser.
  useEffect(() => setMounted(true), []);

  const reposition = () => {
    const a = anchorRef.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    const panelH = panelRef.current?.offsetHeight ?? 0;
    let top = r.bottom + gap;
    // Flip above the anchor when the panel would overflow the viewport bottom
    // and there is more room above (e.g. the Tower category search sits low).
    if (panelH > 0 && top + panelH > window.innerHeight - 8) {
      const above = r.top - gap - panelH;
      if (above >= 8) top = above;
      else top = Math.max(8, window.innerHeight - panelH - 8);
    }
    const width = r.width;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    setPos((prev) =>
      Math.abs(prev.top - top) < 0.5 &&
      Math.abs(prev.left - left) < 0.5 &&
      Math.abs(prev.width - width) < 0.5
        ? prev
        : { top, left, width },
    );
  };

  // Place synchronously before paint on open to avoid a flash at -9999.
  useLayoutEffect(() => {
    if (open) reposition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep in sync with scroll (capture: catch nested overflow scrolls), resize,
  // and panel size changes (filtering shrinks/grows the list -> may need flip).
  useEffect(() => {
    if (!open) return;
    const onScrollResize = () => reposition();
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    let ro: ResizeObserver | undefined;
    if (panelRef.current && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => reposition());
      ro.observe(panelRef.current);
    }
    return () => {
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Optional outside-click / Escape close, aware of both anchor and panel so a
  // click on an option (inside the portaled panel) never closes prematurely.
  useEffect(() => {
    if (!open || !onClose) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: matchAnchorWidth ? pos.width : undefined,
        zIndex,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
