// ScallopCard — v6 retro pop card with optional scalloped top edge.
// Uses tokens from globals.css (.gp-card / .gp-scallop-top). Mood source:
// docs/research/GARDEN_DESIGN_BRIEF_2026-06.md (단순 직사각형 지양 — scallop variant).

import { CSSProperties, ReactNode } from "react";

export interface ScallopCardProps {
  children: ReactNode;
  scallop?: boolean;
  tone?: "default" | "subtle" | "accent";
  className?: string;
  style?: CSSProperties;
}

const TONE_BG: Record<NonNullable<ScallopCardProps["tone"]>, string> = {
  default: "var(--color-surface)",
  subtle: "var(--color-surface-subtle)",
  accent: "var(--color-surface-accent)",
};

export default function ScallopCard({
  children,
  scallop = false,
  tone = "default",
  className,
  style,
}: ScallopCardProps) {
  return (
    <div
      className={["gp-card", scallop ? "gp-scallop-top" : "", className]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: TONE_BG[tone],
        ...style,
      }}
    >
      {children}
    </div>
  );
}
