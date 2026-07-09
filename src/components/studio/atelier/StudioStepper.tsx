// StudioStepper — C-STUDIO-UX (2026-06-23). Top horizontal stepper for the
// 온실 아틀리에 atelier shell, replacing the loose 3-tab feel with a guided
// 4-step journey:
//   썸네일 랩 -> 상세 캔버스 -> SEO 부스터 -> 발행 검토
//
// #131 — sourcing is OUT of Studio scope; assets are already loaded here, so
// the journey starts at thumbnail production, not sourcing.
//
// Controlled component: the page owns the active step. Pure layout — no card
// logic lives here. Lucide icons only (no emoji).

"use client";

import { Layers, ScrollText, Search, Send } from "lucide-react";
import strings from "@/lib/i18n/studio-strings.ko.json";

export type AtelierStepKey = "thumbnail" | "detail" | "seo" | "publish";

export interface StudioStepperProps {
  active: AtelierStepKey;
  onChange: (step: AtelierStepKey) => void;
}

const STEP_ORDER: AtelierStepKey[] = ["thumbnail", "detail", "seo", "publish"];

const STEP_ICON = {
  thumbnail: Layers,
  detail: ScrollText,
  seo: Search,
  publish: Send,
} as const;

export default function StudioStepper({ active, onChange }: StudioStepperProps) {
  const s = strings.atelier.steps;
  const label: Record<AtelierStepKey, string> = {
    thumbnail: s.thumbnail,
    detail: s.detail,
    seo: s.seo,
    publish: s.publish,
  };
  const hint: Record<AtelierStepKey, string> = {
    thumbnail: s.thumbnailHint,
    detail: s.detailHint,
    seo: s.seoHint,
    publish: s.publishHint,
  };

  const activeIndex = STEP_ORDER.indexOf(active);

  return (
    <nav
      aria-label={strings.page.title}
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 8,
        padding: "10px 12px",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-card)",
        overflowX: "auto",
        wordBreak: "keep-all",
      }}
    >
      {STEP_ORDER.map((key, idx) => {
        const Icon = STEP_ICON[key];
        const isActive = key === active;
        const isDone = idx < activeIndex;
        return (
          <button
            key={key}
            type="button"
            aria-current={isActive ? "step" : undefined}
            onClick={() => onChange(key)}
            style={{
              flex: "1 1 0",
              minWidth: 116,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 10,
              cursor: "pointer",
              textAlign: "left",
              background: isActive ? "var(--gp-pink-50, #FFF5F8)" : "transparent",
              border: isActive
                ? "1.5px solid var(--gp-red-500, #F63B28)"
                : "1.5px solid var(--color-border)",
              transition: "background 0.12s, border-color 0.12s",
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                color: isActive || isDone ? "#fff" : "var(--gp-ink-500)",
                background:
                  isActive || isDone
                    ? "var(--gp-red-500, #F63B28)"
                    : "var(--gp-pink-50, #FFF5F8)",
                border:
                  isActive || isDone
                    ? "none"
                    : "1px solid var(--color-border)",
              }}
            >
              <Icon size={14} strokeWidth={2.4} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: 800,
                  color: isActive ? "var(--gp-red-600, #c81e0f)" : "var(--gp-ink-700)",
                  whiteSpace: "nowrap",
                }}
              >
                {idx + 1}. {label[key]}
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: 10.5,
                  color: "var(--gp-ink-500)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {hint[key]}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
