// TitleLengthGauge — real-time character count gauge for naver_title.
// Threshold semantics (per UIUX_INTEGRATED_DESIGN_SYSTEM section 5 + Caveats):
//   - <= soft   → green  (recommended)
//   - <  hard   → amber  (penalty zone)
//   - >= hard   → red    (block risk)
// Thresholds come from props (not hardcoded) — the research is explicit that
// Naver's exact numbers are unofficial and may shift. Default values match
// Naver's 2025 docs (50 soft / 100 hard) but pages should treat them as tunable.

import { useMemo } from "react";
import { seoDrawerCopy } from "@/lib/i18n/seo-drawer";

export interface TitleLengthGaugeProps {
  value: string;
  soft?: number;
  hard?: number;
}

type GaugeBand = "good" | "warn" | "block";

interface GaugeState {
  band: GaugeBand;
  trackColor: string;
  fillColor: string;
  helpText: string;
  fillPct: number;
}

function classifyBand(length: number, soft: number, hard: number): GaugeState {
  const c = seoDrawerCopy.title;
  if (length <= soft) {
    return {
      band: "good",
      trackColor: "var(--gp-green-100)",
      fillColor: "var(--gp-green-500)",
      helpText: c.helpRecommendedUnder,
      fillPct: Math.min(100, (length / soft) * 60), // 0–60% range = green
    };
  }
  if (length < hard) {
    const overSoft = length - soft;
    const span = hard - soft;
    return {
      band: "warn",
      trackColor: "#FFF3D6",
      fillColor: "#F59E0B",
      helpText: c.helpRange,
      fillPct: 60 + (overSoft / span) * 30, // 60–90%
    };
  }
  return {
    band: "block",
    trackColor: "var(--gp-red-100)",
    fillColor: "var(--gp-red-500)",
    helpText: c.helpOver,
    fillPct: 100,
  };
}

export default function TitleLengthGauge({
  value,
  soft = 50,
  hard = 100,
}: TitleLengthGaugeProps) {
  const length = value.length;
  const state = useMemo(() => classifyBand(length, soft, hard), [length, soft, hard]);
  const c = seoDrawerCopy.title;

  return (
    <div style={{ marginTop: 6 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: state.fillColor,
            fontWeight: 700,
          }}
        >
          {state.helpText}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: state.fillColor,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {length}
          <span style={{ color: "var(--gp-ink-500)", fontWeight: 500, marginLeft: 2 }}>
            / {soft}
            <span style={{ color: "var(--gp-ink-300)" }}> · {hard}</span>
            <span style={{ marginLeft: 2 }}>{c.countSuffix}</span>
          </span>
        </span>
      </div>
      <div
        style={{
          position: "relative",
          height: 8,
          background: state.trackColor,
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${state.fillPct}%`,
            background: state.fillColor,
            borderRadius: 99,
            transition: "width 0.18s ease, background 0.18s ease",
          }}
        />
        {/* Soft + hard tick marks */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: -2,
            bottom: -2,
            left: "60%",
            width: 1,
            background: "var(--gp-ink-300)",
            opacity: 0.55,
          }}
        />
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: -2,
            bottom: -2,
            left: "90%",
            width: 1,
            background: "var(--gp-ink-300)",
            opacity: 0.55,
          }}
        />
      </div>
    </div>
  );
}
