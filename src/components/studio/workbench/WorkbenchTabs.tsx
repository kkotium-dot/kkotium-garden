// WorkbenchTabs — right-rail tabbed container for the Studio action cards.
//
// Two layouts:
//   - DEFAULT (grouped=false/undefined): the original 4/5-tab layout
//     (Diagnosis / Thumbnail / Detail / Actions [+ Assets]). Unchanged — any
//     caller that does not opt in keeps the legacy behavior (regression 0).
//   - GROUPED (grouped=true): the registration-journey IA (authority §8 / task2)
//     collapses the five cards into THREE journey tabs:
//        1) 상품 분석   = diagnosis
//        2) 이미지      = thumbnail + detail + assets, stacked as 3 sub-areas
//        3) 발행        = actions
//     Card logic is owned by the caller — this is pure layout, so the existing
//     card components move into sub-areas with their state and behavior intact.
//
// Tab content stays mounted (display toggle) so each card's internal state
// survives tab switches.

"use client";

import { ReactNode, useState } from "react";
import { Activity, Layers, ScrollText, Send, FolderOpen, ImageIcon } from "lucide-react";
import { ScallopCard } from "@/components/shell";
import strings from "@/lib/i18n/studio-strings.ko.json";

export type WorkbenchTabKey =
  | "diagnosis" | "thumbnail" | "detail" | "actions" | "assets" // legacy 5-tab
  | "analyze" | "image" | "publish"; // grouped 3-tab

export interface WorkbenchTabsProps {
  diagnosis: ReactNode;
  thumbnail: ReactNode;
  detail: ReactNode;
  actions: ReactNode;
  /** Optional asset browser. In the default layout it becomes a 5th tab; in the
   *  grouped layout it becomes the third sub-area of the 이미지 tab. */
  assets?: ReactNode;
  /** Optional Mood-Camera panel (session8). In the grouped layout it becomes the
   *  FIRST sub-area of the 이미지 tab (mood -> assemble -> generate). Ignored in
   *  the legacy layout. */
  moodCamera?: ReactNode;
  /** Engine Stage 1 panels (session8, grouped layout only — additive). Rendered
   *  at the TOP of their tab, above the existing cards (regression 0):
   *    dnaCard     -> analyze tab (시장 DNA, 개입#1)
   *    slotFunnel  -> image tab   (9슬롯 퍼널 보드)
   *    publishGate -> publish tab (발행 전 정책 게이트) */
  dnaCard?: ReactNode;
  slotFunnel?: ReactNode;
  publishGate?: ReactNode;
  /** Opt in to the 3-tab registration-journey IA (task2). */
  grouped?: boolean;
  /** Optional initial tab — defaults to the first tab of the active layout. */
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
  analyze: Activity,
  image: ImageIcon,
  publish: Send,
};

// A labeled sub-area inside the grouped 이미지 tab.
function SubArea({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h3
        style={{
          margin: 0,
          fontSize: 12,
          fontWeight: 800,
          color: "var(--gp-ink-700)",
          letterSpacing: "0.01em",
          paddingBottom: 6,
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function WorkbenchTabs({
  diagnosis,
  thumbnail,
  detail,
  actions,
  assets,
  moodCamera,
  dnaCard,
  slotFunnel,
  publishGate,
  grouped = false,
  defaultTab,
  activeTab,
  onTabChange,
  badges,
}: WorkbenchTabsProps) {
  const c = strings.workbench.tabs;
  const c3 = strings.workbench.tabs3;

  const tabOrder: WorkbenchTabKey[] = grouped
    ? ["analyze", "image", "publish"]
    : [
        "diagnosis",
        "thumbnail",
        "detail",
        "actions",
        ...(assets != null ? (["assets"] as WorkbenchTabKey[]) : []),
      ];

  const [internalTab, setInternalTab] = useState<WorkbenchTabKey>(defaultTab ?? tabOrder[0]);
  const tab = activeTab ?? internalTab;

  const handleSelect = (next: WorkbenchTabKey) => {
    if (!activeTab) setInternalTab(next);
    onTabChange?.(next);
  };

  const tabLabel: Partial<Record<WorkbenchTabKey, string>> = {
    diagnosis: c.diagnosis,
    thumbnail: c.thumbnail,
    detail: c.detail,
    actions: c.actions,
    assets: c.assets,
    analyze: c3.analyze,
    image: c3.image,
    publish: c3.publish,
  };

  // The grouped 이미지 tab stacks the three image cards as labeled sub-areas.
  // The engine slot-funnel board (when supplied) sits at the very top.
  const imagePanel = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {slotFunnel != null && slotFunnel}
      {moodCamera != null && <SubArea title={c3.imageMood}>{moodCamera}</SubArea>}
      <SubArea title={c3.imageMain}>{thumbnail}</SubArea>
      <SubArea title={c3.imageDetail}>{detail}</SubArea>
      {assets != null && <SubArea title={c3.imageAssets}>{assets}</SubArea>}
    </div>
  );

  // Engine DNA card tops the analyze tab; the publish gate tops the publish tab.
  const analyzePanel = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {dnaCard != null && dnaCard}
      {diagnosis}
    </div>
  );
  const publishPanel = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {publishGate != null && publishGate}
      {actions}
    </div>
  );

  const contents: Partial<Record<WorkbenchTabKey, ReactNode>> = grouped
    ? { analyze: analyzePanel, image: imagePanel, publish: publishPanel }
    : { diagnosis, thumbnail, detail, actions, assets };

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
