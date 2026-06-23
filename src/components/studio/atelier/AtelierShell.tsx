// AtelierShell — C-STUDIO-UX (2026-06-23). Premium 3-column container for the
// 온실 아틀리에, replacing the old WorkbenchShell layout for /studio.
//
// Desktop (lg+): a fixed 20 : 55 : 25 grid inside a full-height viewport that
// does NOT scroll as a whole — each of the three columns scrolls
// independently (overflow-y-auto), so the 도구함 / 작업대 / 관제탑 stay aligned.
//   - Left 20%  — 도구함  (AssetBrowser + compact product picker)
//   - Center 55% — 개화 작업대 (device toggle + live preview + step cards)
//   - Right 25% — 검색 생장 관제탑 (ControlTower)
// The stepper spans the full width above the three columns.
//
// Mobile (<lg): the fixed-height split is dropped — the page scrolls normally
// and the three regions stack (stepper -> toolbox -> workspace -> tower) so the
// seller can still reach everything on a phone. No bottom-sheet here (the
// atelier is a desktop-first production surface); the legacy WorkbenchShell
// mobile sheet is untouched for other callers.

"use client";

import { ReactNode } from "react";

export interface AtelierShellProps {
  /** Optional page header rendered INSIDE the fixed-height container, above the
   *  stepper. Keeping it inside the viewport budget (instead of a sibling above
   *  the shell) is what makes the per-column scroll truly fixed-viewport — an
   *  outside header pushed the columns below the fold so col0 grew unbounded. */
  header?: ReactNode;
  /** Full-width stepper rendered above the columns. */
  stepper: ReactNode;
  /** Left rail — 도구함 (asset browser + product picker). */
  toolbox: ReactNode;
  /** Center pane — 개화 작업대 (preview + step cards). */
  workspace: ReactNode;
  /** Right rail — 검색 생장 관제탑 (control tower). */
  tower: ReactNode;
}

const PANEL_STYLE = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-card)",
} as const;

export default function AtelierShell({ header, stepper, toolbox, workspace, tower }: AtelierShellProps) {
  return (
    <div style={{ wordBreak: "keep-all" }}>
      {/* ── Desktop (lg+): full-height independent-scroll 3-col split ──────── */}
      <div
        className="hidden lg:flex lg:flex-col"
        style={{ height: "calc(100vh - 60px)", overflow: "hidden", padding: "12px 16px 0" }}
      >
        {header && <div style={{ flexShrink: 0, marginBottom: 8 }}>{header}</div>}
        <div style={{ flexShrink: 0, marginBottom: 12 }}>{stepper}</div>
        <div
          className="lg:grid"
          style={{
            flex: 1,
            minHeight: 0,
            gap: 14,
            paddingBottom: 12,
            // minmax(0, …) is REQUIRED: a bare `fr` track keeps min-width:auto
            // (= min-content), so a wide child (e.g. the asset grid's 200+ tiles)
            // blows the track out horizontally (observed: 11506px). minmax(0,…)
            // + minWidth:0 + overflowX:hidden on each panel hard-caps the rail
            // width and forces the content to wrap/clip instead.
            gridTemplateColumns: "minmax(0, 20fr) minmax(0, 55fr) minmax(0, 25fr)",
          }}
        >
          <aside style={{ ...PANEL_STYLE, minWidth: 0, minHeight: 0, overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain", padding: 14 }}>
            {toolbox}
          </aside>
          <section
            style={{
              minWidth: 0,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              overscrollBehavior: "contain",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
              paddingRight: 2,
            }}
          >
            {workspace}
          </section>
          <aside style={{ ...PANEL_STYLE, minWidth: 0, minHeight: 0, overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain", padding: 14 }}>
            {tower}
          </aside>
        </div>
      </div>

      {/* ── Mobile (<lg): normal-flow stacked regions ─────────────────────── */}
      <div className="flex flex-col gap-3 lg:hidden" style={{ padding: "12px 12px 32px" }}>
        {header}
        {stepper}
        <section style={{ ...PANEL_STYLE, padding: 12, maxHeight: 240, overflowY: "auto" }}>{toolbox}</section>
        <section style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {workspace}
        </section>
        <section style={{ ...PANEL_STYLE, padding: 12 }}>{tower}</section>
      </div>
    </div>
  );
}
