// WorkbenchShell — Phase 2-B-1 layout-only 3-column container for the
// 온실 아틀리에 workbench. Replaces the prior 4-card vertical stack with the
// canonical creative-tool layout (left list / center canvas / right controls)
// per UIUX_INTEGRATED_DESIGN_SYSTEM §6 (P0 아틀리에 "작업벤치").
//
// This is a pure layout shell. The 4 step components (Diagnosis / Thumbnail /
// Detail / Actions) and the product list pane are still owned by the page
// and passed in as render slots — their logic is unchanged.
//
// Responsive guard:
//   - min-width 1180 so 3 columns never collapse
//   - center column uses minmax(0, 1fr) to prevent horizontal overflow
//   - body inherits word-break: keep-all from globals.css for Korean

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
      style={{
        minWidth: 1180,
        minHeight: "calc(100vh - 60px)",
        background: "var(--color-bg)",
        wordBreak: "keep-all",
      }}
    >
      {header && (
        <div
          style={{
            padding: "16px 20px 0",
            background: "transparent",
          }}
        >
          {header}
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 320px) minmax(0, 1fr) minmax(320px, 360px)",
          gap: "var(--space-4)",
          padding: "16px 20px 32px",
          alignItems: "stretch",
          minHeight: "calc(100vh - 60px)",
        }}
      >
        <aside
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-card)",
            padding: 14,
            overflowY: "auto",
            maxHeight: "calc(100vh - 120px)",
            position: "sticky",
            top: 16,
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
          style={{
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
            position: "sticky",
            top: 16,
            alignSelf: "flex-start",
            maxHeight: "calc(100vh - 120px)",
            overflowY: "auto",
          }}
        >
          {controls}
        </aside>
      </div>
    </div>
  );
}
