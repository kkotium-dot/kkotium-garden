// WorkbenchShell — Phase 2-B-1 + 2-MOBILE-1 + 2-MOBILE-2: 3-column container
// for the 온실 아틀리에 workbench (lg+), mobile reorg on <lg.
//
// Per UIUX_INTEGRATED_DESIGN_SYSTEM §6 + MOBILE_NAMING_FIREFLY 주제1:
//   - lg+ (>=1024px): left list (280-320) / center canvas / right controls
//     (320-360). DESKTOP REGRESSION 0 — markup unchanged inside the lg branch.
//   - <lg: canvas is the main viewport; the product list collapses to a
//     compact top strip (max-height capped) so the seller can still browse;
//     the right-rail controls slide into a bottom sheet docked above the
//     MobileTabBar with two snap heights (peek / expanded).
//
// All section logic stays with the page; this file only arranges slots.
// Bottom sheet snap behaviour is intentionally tap-toggle (vs continuous
// drag) so it stays accessible without touch-handler fragility on iOS.

"use client";

import { ReactNode, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import strings from "@/lib/i18n/studio-strings.ko.json";

export interface WorkbenchShellProps {
  /** Left rail — product list. Caller controls width via its own container. */
  list: ReactNode;
  /** Center pane — large canvas preview slot. */
  canvas: ReactNode;
  /** Right rail — tabbed controls (Diagnosis / Thumbnail / Detail / Actions). */
  controls: ReactNode;
  /** Optional header rendered above the 3 panes (selected product summary). */
  header?: ReactNode;
}

// Bottom-sheet peek height (handle + tab row visible) and expanded height.
// MobileTabBar is ~60px + iOS safe-area; we dock above it.
const SHEET_BOTTOM_OFFSET = 60; // matches MobileTabBar minHeight
const SHEET_PEEK_HEIGHT = 108;  // handle (~44) + tab-bar peek (~64)
const SHEET_EXPANDED_VH = 88;   // 88vh when expanded — leaves 12vh canvas hint

export default function WorkbenchShell({
  list,
  canvas,
  controls,
  header,
}: WorkbenchShellProps) {
  const m = strings.workbench.mobile;
  const [sheetExpanded, setSheetExpanded] = useState(false);

  return (
    <div
      className="lg:min-w-[1180px]"
      style={{
        minHeight: "calc(100vh - 60px)",
        background: "var(--color-bg)",
        wordBreak: "keep-all",
      }}
    >
      {header && (
        <div className="px-4 pt-4 lg:px-5 lg:pt-4">{header}</div>
      )}

      {/* ── Desktop (lg+): unchanged 3-col grid ──────────────────────── */}
      <div
        className={[
          "hidden lg:grid gap-4 px-5 pb-8 pt-4",
          "lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)_minmax(320px,360px)]",
          "items-stretch",
        ].join(" ")}
        style={{ minHeight: "calc(100vh - 60px)" }}
      >
        <aside
          className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-card)",
            padding: 14,
          }}
        >
          {list}
        </aside>
        <section
          style={{
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          {canvas}
        </section>
        <aside
          className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto"
          style={{
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
            alignSelf: "flex-start",
          }}
        >
          {controls}
        </aside>
      </div>

      {/* ── Mobile (<lg): canvas-first reorg ─────────────────────────── */}
      <div
        className="lg:hidden"
        style={{
          // Pad bottom so canvas content does not get hidden behind the
          // collapsed bottom sheet (peek) or the MobileTabBar.
          paddingBottom: SHEET_BOTTOM_OFFSET + SHEET_PEEK_HEIGHT + 16,
        }}
      >
        {/* List strip — capped height; user can still browse, canvas keeps focus */}
        <section
          aria-label={m.listStripLabel}
          style={{
            margin: "12px 12px 0",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-card)",
            padding: 10,
            maxHeight: 168,
            overflowY: "auto",
          }}
        >
          {list}
        </section>

        {/* Canvas — main mobile real estate */}
        <section
          style={{
            margin: "12px 12px 0",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          {canvas}
        </section>

        {/* Bottom sheet — docked above MobileTabBar, tap handle to expand */}
        <div
          role="region"
          aria-label={m.sheetHandleAria}
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: `calc(${SHEET_BOTTOM_OFFSET}px + env(safe-area-inset-bottom, 0px))`,
            zIndex: 55,
            background: "var(--color-surface)",
            borderTop: "1px solid var(--color-border-strong)",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            boxShadow: "0 -8px 24px rgba(230, 35, 16, 0.10)",
            display: "flex",
            flexDirection: "column",
            height: sheetExpanded ? `${SHEET_EXPANDED_VH}vh` : SHEET_PEEK_HEIGHT,
            maxHeight: `${SHEET_EXPANDED_VH}vh`,
            transition: "height 0.22s ease",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => setSheetExpanded((v) => !v)}
            aria-expanded={sheetExpanded}
            aria-label={sheetExpanded ? m.sheetCollapse : m.sheetExpand}
            style={{
              // 44x44 hit area via padding (target = WCAG 2.5.5).
              minHeight: 44,
              padding: "8px 12px 4px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              color: "var(--gp-ink-500)",
            }}
          >
            <span
              style={{
                display: "block",
                width: 40,
                height: 4,
                borderRadius: 999,
                background: "var(--gp-pink-300)",
                marginBottom: 4,
              }}
            />
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
                color: "var(--gp-ink-700)",
              }}
            >
              {sheetExpanded ? (
                <ChevronDown size={12} strokeWidth={2.6} />
              ) : (
                <ChevronUp size={12} strokeWidth={2.6} />
              )}
              {sheetExpanded ? m.sheetCollapse : m.sheetExpand}
            </span>
          </button>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: sheetExpanded ? "auto" : "hidden",
              padding: "0 12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            {controls}
          </div>
        </div>
      </div>
    </div>
  );
}
