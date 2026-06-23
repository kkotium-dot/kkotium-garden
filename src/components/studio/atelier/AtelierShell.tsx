// AtelierShell — C-STUDIO-UX (2026-06-23) · Stage2 S2-A (2026-06-24).
// Premium container for the 온실 아틀리에 (/studio).
//
// Desktop (lg+): a viewport-bounded shell that does NOT scroll as a whole — the
// region below the header/stepper is a flex row whose children scroll
// independently. Height is flex-fill (height:100% of the global <main>, which is
// now a bounded scroll container — layout.tsx #141), NOT calc(100vh - 매직넘버):
// no magic number to drift when the header/footer height changes.
//   - Left  — 이중 사이드바 (S2-A 골격): w-16 아이콘 탭(창고/배양실/일지) +
//             w-96 동적 패널. The active icon picks the panel; clicking the
//             active icon collapses the panel so the 작업대 gets the width.
//   - Center — 개화 작업대 (device toggle + live preview + step cards)
//   - Right — 검색 생장 관제탑 (ControlTower)
// The stepper spans the full width above the row.
//
// Mobile (<lg): the fixed-height split is dropped — the page scrolls normally,
// the sidebar tabs collapse to a horizontal selector, and the regions stack
// (stepper -> sidebar -> workspace -> tower).
//
// S2-A responsive hardening (#144): every flex/grid child carries minWidth:0,
// text truncates/breaks, grid tracks use minmax(0,…); responsive show/hide uses
// Tailwind classes only — never an inline `display` that would defeat lg:* (#140).

"use client";

import { ReactNode, useState } from "react";

export interface AtelierSidebarTab {
  /** Stable key (English) used for selection state. */
  key: string;
  /** Korean surface label shown under the icon (창고 / 배양실 / 일지). */
  label: string;
  /** Lucide icon element (no emoji — #3-1). */
  icon: ReactNode;
  /** Panel body for this tab. */
  content: ReactNode;
}

export interface AtelierShellProps {
  /** Optional page header rendered INSIDE the bounded container, above the
   *  stepper, so it stays within the viewport budget (an outside header pushed
   *  the columns below the fold and broke the per-column scroll). */
  header?: ReactNode;
  /** Full-width stepper rendered above the row. */
  stepper: ReactNode;
  /** Left dual-sidebar tabs (창고/배양실/일지). The first tab is active initially. */
  sidebarTabs: AtelierSidebarTab[];
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

export default function AtelierShell({ header, stepper, sidebarTabs, workspace, tower }: AtelierShellProps) {
  const firstKey = sidebarTabs[0]?.key ?? "";
  const [activeKey, setActiveKey] = useState(firstKey);
  // Collapsible w-96 panel — clicking the active icon folds it so the 작업대
  // gets the width back; clicking another icon opens that tab. On narrow desktop
  // the seller can keep it folded (the icon rail stays as the affordance).
  const [panelOpen, setPanelOpen] = useState(true);

  const activeTab = sidebarTabs.find((t) => t.key === activeKey) ?? sidebarTabs[0];

  const onIconClick = (key: string) => {
    if (key === activeKey) {
      setPanelOpen((v) => !v);
    } else {
      setActiveKey(key);
      setPanelOpen(true);
    }
  };

  // Shared icon-rail button. `active` = the selected tab; `open` reflects whether
  // its panel is showing (so the active+folded state reads as a toggle).
  const RailButton = ({ tab }: { tab: AtelierSidebarTab }) => {
    const active = tab.key === activeKey;
    const showing = active && panelOpen;
    return (
      <button
        type="button"
        onClick={() => onIconClick(tab.key)}
        title={tab.label}
        aria-label={tab.label}
        aria-pressed={showing}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          width: "100%",
          padding: "8px 2px",
          border: "none",
          borderRadius: 10,
          cursor: "pointer",
          background: showing ? "var(--pink-soft)" : "transparent",
          color: active ? "var(--brand-red)" : "var(--gp-ink-500)",
          fontSize: 9,
          fontWeight: 700,
          lineHeight: 1.2,
          transition: "background 0.15s, color 0.15s",
          minWidth: 0,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {tab.icon}
        </span>
        <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {tab.label}
        </span>
      </button>
    );
  };

  return (
    <div style={{ wordBreak: "keep-all" }}>
      {/* ── Desktop (lg+): viewport-bounded independent-scroll row ─────────── */}
      <div
        className="hidden lg:flex lg:flex-col"
        style={{ height: "100%", overflow: "hidden", padding: "12px 16px 0" }}
      >
        {header && <div style={{ flexShrink: 0, minWidth: 0, marginBottom: 8 }}>{header}</div>}
        <div style={{ flexShrink: 0, minWidth: 0, marginBottom: 12 }}>{stepper}</div>

        <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex", gap: 14, paddingBottom: 12 }}>
          {/* 이중 사이드바: w-16 아이콘 레일 + w-96 동적 패널 */}
          <nav
            aria-label="아틀리에 도구 탭"
            style={{
              ...PANEL_STYLE,
              width: 64,
              flexShrink: 0,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              background: "var(--cream)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "8px 6px",
            }}
          >
            {sidebarTabs.map((tab) => (
              <RailButton key={tab.key} tab={tab} />
            ))}
          </nav>

          {panelOpen && activeTab && (
            <aside
              style={{
                ...PANEL_STYLE,
                width: 384,
                flexShrink: 0,
                minWidth: 0,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                overscrollBehavior: "contain",
                padding: 14,
              }}
            >
              {activeTab.content}
            </aside>
          )}

          {/* 개화 작업대 — 남는 폭 전부 차지 */}
          <section
            style={{
              flex: 1,
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

          {/* 검색 생장 관제탑 */}
          <aside
            style={{
              ...PANEL_STYLE,
              width: "clamp(280px, 24%, 360px)",
              flexShrink: 0,
              minWidth: 0,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              overscrollBehavior: "contain",
              padding: 14,
            }}
          >
            {tower}
          </aside>
        </div>
      </div>

      {/* ── Mobile (<lg): normal-flow stacked regions ─────────────────────── */}
      <div className="flex flex-col gap-3 lg:hidden" style={{ padding: "12px 12px 32px" }}>
        {header}
        {stepper}

        {/* Sidebar tabs collapse to a horizontal selector + active panel. */}
        <section style={{ ...PANEL_STYLE, padding: 12, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, minWidth: 0 }}>
            {sidebarTabs.map((tab) => {
              const active = tab.key === activeKey;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveKey(tab.key)}
                  aria-pressed={active}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    padding: "8px 6px",
                    border: "none",
                    borderRadius: 10,
                    cursor: "pointer",
                    background: active ? "var(--pink-soft)" : "var(--cream)",
                    color: active ? "var(--brand-red)" : "var(--gp-ink-500)",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <span style={{ flexShrink: 0, display: "flex" }}>{tab.icon}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ minWidth: 0, maxHeight: 320, overflowY: "auto" }}>{activeTab?.content}</div>
        </section>

        <section style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {workspace}
        </section>
        <section style={{ ...PANEL_STYLE, padding: 12, minWidth: 0 }}>{tower}</section>
      </div>
    </div>
  );
}
