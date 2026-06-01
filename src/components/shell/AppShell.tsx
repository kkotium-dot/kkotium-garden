// AppShell — v6 Retro Pop Garden Fantasy common layout.
// Opt-in: pages can wrap themselves in this for the new shell; root layout
// keeps the legacy Sidebar/Header for backward compatibility.
//
// Responsive guard (per docs/research/GARDEN_CONCEPT_ANALYSIS_2026-06.md §4):
//   - min-width 1180 on root (prevents horizontal scroll inside)
//   - 12-col grid with minmax(0, 1fr) so content never overflows
//   - word-break: keep-all inherited from globals.css body
//
// Sidebar / mascot / illustration are render slots so Claude Design assets
// can be swapped without touching this file.

import { CSSProperties, ReactNode } from "react";
import AppSidebar from "./AppSidebar";

export interface AppShellProps {
  children: ReactNode;
  /** Optional override for the sidebar — defaults to <AppSidebar />. Pass null to hide. */
  sidebar?: ReactNode | null;
  /** Mascot slot forwarded into AppSidebar header. */
  mascot?: ReactNode;
  /** Illustration slot forwarded into AppSidebar footer. */
  illustration?: ReactNode;
  /** Optional top header row above content. */
  header?: ReactNode;
  /** When true, content area uses 12-col grid; otherwise free-flow. */
  grid?: boolean;
  contentStyle?: CSSProperties;
}

export default function AppShell({
  children,
  sidebar,
  mascot,
  illustration,
  header,
  grid = false,
  contentStyle,
}: AppShellProps) {
  const sidebarNode =
    sidebar === undefined ? <AppSidebar mascot={mascot} illustration={illustration} /> : sidebar;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        minWidth: "var(--shell-min-w)",
        background: "var(--color-bg)",
        color: "var(--color-text)",
      }}
    >
      {sidebarNode}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {header && (
          <div
            style={{
              padding: "16px 32px",
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            {header}
          </div>
        )}
        <main
          style={{
            flex: 1,
            padding: "var(--shell-content-pad)",
            minWidth: 0,
            overflowX: "hidden",
            ...contentStyle,
          }}
        >
          {grid ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
                gap: "var(--space-6)",
                minWidth: 0,
              }}
            >
              {children}
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
