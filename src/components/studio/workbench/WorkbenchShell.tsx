// WorkbenchShell — Phase 2-B-1 + 2-MOBILE-1: 3-column container for the
// 온실 아틀리에 workbench (lg+), single-column stack on mobile (<lg).
//
// Per UIUX_INTEGRATED_DESIGN_SYSTEM §6 + MOBILE_NAMING_FIREFLY 주제1:
//   - lg+ (≥1024px): left list (280-320) / center canvas / right controls (320-360)
//   - md (768-1023): same 3-col but the right rail can wrap below
//   - <md: single column — list above, canvas, controls below
//
// All section logic stays with the page; this file only arranges slots.

import { ReactNode } from "react";

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

export default function WorkbenchShell({
  list,
  canvas,
  controls,
  header,
}: WorkbenchShellProps) {
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
      <div
        className={[
          // 1-col mobile, 3-col lg+. lg uses fixed left/right widths so the
          // center canvas absorbs all extra horizontal space.
          "grid gap-4 px-4 pb-8 pt-4 lg:px-5 lg:pb-8 lg:pt-4",
          "grid-cols-1 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)_minmax(320px,360px)]",
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
    </div>
  );
}
