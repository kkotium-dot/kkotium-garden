// StickerBadge — analog retro sticker feel (subtle shadow + thick pop border).
// Per brief: 평면 플랫 아님. Use for status pills, score badges, nav counts.

import { CSSProperties, ReactNode } from "react";

export type StickerTone = "pink" | "red" | "green" | "ink";

export interface StickerBadgeProps {
  children: ReactNode;
  tone?: StickerTone;
  size?: "sm" | "md";
  className?: string;
  style?: CSSProperties;
}

const TONE_STYLES: Record<StickerTone, { bg: string; fg: string; border: string }> = {
  pink: {
    bg: "var(--gp-pink-100)",
    fg: "var(--gp-red-600)",
    border: "var(--gp-pink-300)",
  },
  red: {
    bg: "var(--gp-red-500)",
    fg: "#FFFFFF",
    border: "var(--gp-red-600)",
  },
  green: {
    bg: "var(--gp-green-100)",
    fg: "var(--gp-green-700)",
    border: "var(--gp-green-500)",
  },
  ink: {
    bg: "var(--gp-ink-100)",
    fg: "var(--gp-ink-900)",
    border: "var(--gp-ink-300)",
  },
};

const SIZE_STYLES: Record<NonNullable<StickerBadgeProps["size"]>, { padding: string; font: number; height: number }> = {
  sm: { padding: "0 8px", font: 11, height: 20 },
  md: { padding: "2px 12px", font: 13, height: 26 },
};

export default function StickerBadge({
  children,
  tone = "pink",
  size = "md",
  className,
  style,
}: StickerBadgeProps) {
  const t = TONE_STYLES[tone];
  const s = SIZE_STYLES[size];
  return (
    <span
      className={["gp-sticker", className].filter(Boolean).join(" ")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: s.padding,
        height: s.height,
        fontSize: s.font,
        fontWeight: 700,
        background: t.bg,
        color: t.fg,
        borderColor: t.border,
        borderRadius: "var(--radius-badge)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
