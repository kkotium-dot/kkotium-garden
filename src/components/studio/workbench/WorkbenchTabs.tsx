// WorkbenchTabs — Phase 2-B-1 right-rail container that reorganises the four
// existing Studio action cards (Diagnosis / Thumbnail / Detail / Actions)
// into a tabbed layout instead of a vertical stack. Card logic is owned by
// the caller — this is pure layout. Tab content stays mounted so each
// card's internal state (busy / error / etc.) survives tab switches.

"use client";

import { ReactNode, useState } from "react";
import { Activity, Layers, ScrollText, Send, FolderOpen } from "lucide-react";
import { ScallopCard } from "@/components/shell";
import strings from "@/lib/i18n/studio-strings.ko.json";

export type WorkbenchTabKey = "diagnosis" | "thumbnail" | "detail" | "actions" | "assets";

export interface WorkbenchTabsProps {
  diagnosis: ReactNode;
  thumbnail: ReactNode;
  detail: ReactNode;
  actions: ReactNode;
  /** Optional 5th tab (asset browser). Only rendered when provided, so other
   *  callers (e.g. PLANT) keep the original 4-tab layout. */
  assets?: ReactNode;
  /** Optional initial tab — defaults to 'diagnosis'. */
  defaultTab?: WorkbenchTabKey;
  /** External control: when set, becomes a controlled component. */
  activeTab?: WorkbenchTabKey;
  onTabChange?: (tab: WorkbenchTabKey) => void;
  /** Badges per tab (e.g. status indicators). */
  badges?: Partial<Record<WorkbenchTabKey, ReactNode>>;
}

const TAB_ICONS: Record<WorkbenchTabKey, typeof Activity> = {
  diagnosis: Activity,
  thumbnail: Layers,
  detail: ScrollText,
  actions: Send,
  assets: FolderOpen,
};

export default function WorkbenchTabs({
  diagnosis,
  thumbnail,
  detail,
  actions,
  assets,
  defaultTab = "diagnosis",
  activeTab,
  onTabChange,
  badges,
}: WorkbenchTabsProps) {
  const c = strings.workbench.tabs;
  const [internalTab, setInternalTab] = useState<WorkbenchTabKey>(defaultTab);
  const tab = activeTab ?? internalTab;

  const handleSelect = (next: WorkbenchTabKey) => {
    if (!activeTab) setInternalTab(next);
    onTabChange?.(next);
  };

  // The 'assets' tab is appended only when its content is provided, so existing
  // 4-tab callers are unaffected.
  const tabOrder: WorkbenchTabKey[] = [
    "diagnosis",
    "thumbnail",
    "detail",
    "actions",
    ...(assets != null ? (["assets"] as WorkbenchTabKey[]) : []),
  ];

  const tabLabel: Record<WorkbenchTabKey, string> = {
    diagnosis: c.diagnosis,
    thumbnail: c.thumbnail,
    detail: c.detail,
    actions: c.actions,
    assets: c.assets,
  };

  const contents: Record<WorkbenchTabKey, ReactNode> = {
    diagnosis,
    thumbnail,
    detail,
    actions,
    assets,
  };

  return (
    // overflow visible + no flex:1 so the card grows with its panel content and
    // the right-rail aside (independent scroll) can reach the last button.
    <ScallopCard style={{ padding: 0, overflow: "visible" }}>
      {/* Tab bar */}
      <div
        role="tablist"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${tabOrder.length}, minmax(0, 1fr))`,
          background: "var(--gp-pink-50)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {tabOrder.map((key) => {
          const Icon = TAB_ICONS[key];
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleSelect(key)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "10px 6px 8px",
                background: active ? "var(--color-surface)" : "transparent",
                border: "none",
                borderBottom: active
                  ? "2px solid var(--gp-red-500)"
                  : "2px solid transparent",
                color: active ? "var(--gp-red-600)" : "var(--gp-ink-500)",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                transition: "background 0.12s, color 0.12s, border-color 0.12s",
                wordBreak: "keep-all",
                position: "relative",
              }}
            >
              <Icon
                size={16}
                strokeWidth={2.4}
                color={active ? "var(--gp-red-500)" : "var(--gp-ink-500)"}
              />
              <span>{tabLabel[key]}</span>
              {badges?.[key] && (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 8,
                  }}
                >
                  {badges[key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab panels — all mounted to preserve state, only active is visible */}
      <div style={{ padding: 14 }}>
        {tabOrder.map((key) => (
          <div
            key={key}
            role="tabpanel"
            hidden={tab !== key}
            style={{ display: tab === key ? "block" : "none" }}
          >
            {contents[key]}
          </div>
        ))}
      </div>
    </ScallopCard>
  );
}
