// ControlTower — C-STUDIO-UX (2026-06-23). Right rail of the 온실 아틀리에:
// "검색 생장 관제탑". Seller-language + traffic-light readout of publish
// readiness.
//
// #132 (extends #129) — this is PURE SURFACING of already-verified backend
// state. Every number here is DERIVED from data the studio already fetched:
//   - 개화도 gauge        = visualization of the existing publish gate
//                           (EngineGateView booleans). NOT a new score engine.
//   - 썸네일 가시성        = gate.thumbnail* + diagnosis.qualityScore.
//   - SEO 매칭율           = gate.seo* + dna.titleConventions.highFreqTokens.
//   - ROI·후킹             = gate.authentic / hardComplete + dna.trustSignals.
// No new fetch, no new scoring math beyond counting existing pass/fail flags.
//
// Lucide icons only (no emoji). All Korean copy from atelier.controlTower.*.

"use client";

import { ReactNode, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Flower2 } from "lucide-react";
import strings from "@/lib/i18n/studio-strings.ko.json";
import type {
  EngineGateView,
  EngineDnaView,
} from "@/components/studio/engine/useEngineStrategy";
import type { DiagnosisResult } from "@/components/studio/types";

export interface ControlTowerProps {
  gate: EngineGateView | null;
  dna: EngineDnaView | null;
  diagnosis: DiagnosisResult | null;
  loading: boolean;
  degraded: boolean;
  hasProduct: boolean;
}

type Light = "green" | "yellow" | "red";

const LIGHT_COLOR: Record<Light, { dot: string; bg: string; border: string; text: string }> = {
  green: { dot: "#16a34a", bg: "#F0FDF4", border: "#86efac", text: "#15803d" },
  yellow: { dot: "#d97706", bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
  red: { dot: "#dc2626", bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" },
};

// 개화도 gauge — count passed gates among a fixed checklist of EXISTING gate
// booleans. This is a visualization, not a new score engine (#132).
function bloomScore(gate: EngineGateView | null): number {
  if (!gate) return 0;
  const checks = [
    gate.hardComplete,
    gate.seoComplete,
    gate.authentic,
    gate.naverPayloadComplete,
    gate.thumbnailPass,
  ];
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

function gradeLabel(score: number, t: typeof strings.atelier.controlTower): string {
  if (score >= 90) return t.gradeReady;
  if (score >= 60) return t.gradeAlmost;
  return t.gradeMore;
}

function TrafficDot({ light }: { light: Light }) {
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 999,
        background: LIGHT_COLOR[light].dot,
        flexShrink: 0,
        display: "inline-block",
      }}
    />
  );
}

function ScoreBar({ value, light }: { value: number; light: Light }) {
  return (
    <div
      style={{
        height: 8,
        borderRadius: 999,
        background: "var(--gp-pink-50, #FFF5F8)",
        overflow: "hidden",
        border: "1px solid var(--color-border)",
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: "100%",
          background: LIGHT_COLOR[light].dot,
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}

function Accordion({
  title,
  hint,
  light,
  lightLabel,
  defaultOpen,
  children,
}: {
  title: string;
  hint: string;
  light: Light;
  lightLabel: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const c = LIGHT_COLOR[light];
  return (
    <section
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <TrafficDot light={light} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: "block",
              fontSize: 12.5,
              fontWeight: 800,
              color: "var(--gp-ink-900, #1A1A1A)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </span>
          <span style={{ display: "block", fontSize: 10.5, color: "var(--gp-ink-500)" }}>
            {hint}
          </span>
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: c.text,
            background: c.bg,
            border: `1px solid ${c.border}`,
            borderRadius: 999,
            padding: "2px 8px",
            whiteSpace: "nowrap",
          }}
        >
          {lightLabel}
        </span>
        {open ? (
          <ChevronUp size={14} color="var(--gp-ink-500)" />
        ) : (
          <ChevronDown size={14} color="var(--gp-ink-500)" />
        )}
      </button>
      {open && (
        <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
          {children}
        </div>
      )}
    </section>
  );
}

export default function ControlTower({
  gate,
  dna,
  diagnosis,
  loading,
  degraded,
  hasProduct,
}: ControlTowerProps) {
  const t = strings.atelier.controlTower;
  const [overlay, setOverlay] = useState(false);

  // ── Empty / loading / degraded states ──────────────────────────────────
  if (!hasProduct) {
    return <ShellMsg text={t.empty} />;
  }
  if (loading) {
    return <ShellMsg text={t.loading} />;
  }
  if (degraded) {
    return <ShellMsg text={t.preparing} />;
  }

  const score = bloomScore(gate);

  // Section 1 — 썸네일 가시성. Derived from the existing thumbnail gate.
  const s1Light: Light = !gate?.thumbnailAssessed
    ? "yellow"
    : gate.thumbnailPass
      ? "green"
      : "red";
  const s1LightLabel = s1Light === "green" ? t.lightGreen : s1Light === "yellow" ? t.lightYellow : t.lightRed;
  const quality = diagnosis?.qualityScore ?? 0;

  // Section 2 — SEO 매칭율. Derived from the existing SEO gate.
  const seoMissingCount = gate?.seoFieldsMissing?.length ?? 0;
  const seoScore = gate?.seoComplete ? 100 : Math.max(0, 100 - seoMissingCount * 20);
  const s2Light: Light = gate?.seoComplete ? "green" : seoMissingCount <= 2 ? "yellow" : "red";
  const s2LightLabel = s2Light === "green" ? t.lightGreen : s2Light === "yellow" ? t.lightYellow : t.lightRed;
  const keywordTokens = dna?.titleConventions?.highFreqTokens ?? [];

  // Section 3 — ROI·후킹. Three-point checklist over existing gate + DNA.
  const roi = {
    review: (dna?.trustSignals?.length ?? 0) > 0 || !!gate?.authentic,
    benefit: !!gate?.hardComplete,
    diff: !!dna,
  };
  const roiPassed = [roi.review, roi.benefit, roi.diff].filter(Boolean).length;
  const s3Light: Light = roiPassed >= 3 ? "green" : roiPassed >= 1 ? "yellow" : "red";
  const s3LightLabel = s3Light === "green" ? t.lightGreen : s3Light === "yellow" ? t.lightYellow : t.lightRed;

  const gaugeLight: Light = score >= 90 ? "green" : score >= 60 ? "yellow" : "red";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, wordBreak: "keep-all" }}>
      {/* Header */}
      <header>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: "var(--gp-ink-900)" }}>
          {t.title}
        </h2>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--gp-ink-500)" }}>{t.subtitle}</p>
      </header>

      {/* 개화도 gauge */}
      <div
        style={{
          padding: "14px 14px 16px",
          background: "var(--gp-pink-50, #FFF5F8)",
          border: "1px solid var(--gp-pink-300, #FFB3CE)",
          borderRadius: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Flower2 size={15} style={{ color: "var(--gp-red-500, #e62310)" }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gp-ink-900)" }}>{t.gaugeLabel}</span>
          <span style={{ marginLeft: "auto", fontSize: 22, fontWeight: 900, color: LIGHT_COLOR[gaugeLight].dot }}>
            {score}
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gp-ink-500)" }}> / 100</span>
          </span>
        </div>
        <ScoreBar value={score} light={gaugeLight} />
        <p style={{ margin: "8px 0 0", fontSize: 11.5, fontWeight: 700, color: LIGHT_COLOR[gaugeLight].text }}>
          {gate ? gradeLabel(score, t) : t.gaugePreparing}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 10, color: "var(--gp-ink-500)", lineHeight: 1.5 }}>
          {t.gaugeHint}
        </p>
      </div>

      {/* Section 1 — 썸네일 가시성 진단 */}
      <Accordion title={t.s1Title} hint={t.s1Hint} light={s1Light} lightLabel={s1LightLabel} defaultOpen>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "var(--gp-ink-700)" }}>
          <span>{t.s1QualityLabel}</span>
          <span>{gate?.thumbnailAssessed ? `${quality}/100` : t.s1NotAssessed}</span>
        </div>
        <ScoreBar value={quality} light={quality >= 70 ? "green" : quality >= 40 ? "yellow" : "red"} />
        <button
          type="button"
          onClick={() => setOverlay((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
            padding: "5px 10px",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: overlay ? "var(--gp-pink-50, #FFF5F8)" : "#fff",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--gp-ink-700)",
            cursor: "pointer",
          }}
        >
          {overlay ? <EyeOff size={12} /> : <Eye size={12} />}
          {t.s1Overlay}
        </button>
        {overlay && (
          <p style={{ margin: 0, fontSize: 11, color: "var(--gp-ink-700)", lineHeight: 1.6 }}>
            {dna?.thumbnailConventions?.rule ?? t.preparing}
          </p>
        )}
      </Accordion>

      {/* Section 2 — 네이버 쇼핑 SEO 매칭율 */}
      <Accordion title={t.s2Title} hint={t.s2Hint} light={s2Light} lightLabel={s2LightLabel}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "var(--gp-ink-700)" }}>
          <span>{t.s2AltLabel}</span>
          <span style={{ color: gate?.seoComplete ? "#15803d" : "#92400e" }}>
            {gate?.seoComplete ? t.lightGreen : t.lightYellow}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "var(--gp-ink-700)" }}>
          <span>{t.s2KeywordLabel}</span>
          <span>{seoScore}/100</span>
        </div>
        <ScoreBar value={seoScore} light={s2Light} />
        {keywordTokens.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {keywordTokens.slice(0, 8).map((kw, i) => (
              <span
                key={`${kw}-${i}`}
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "var(--gp-pink-50, #FFF5F8)",
                  border: "1px solid var(--gp-pink-300, #FFB3CE)",
                  color: "var(--gp-red-600, #c81e0f)",
                }}
              >
                {kw}
              </span>
            ))}
          </div>
        )}
        {!gate?.seoComplete && (gate?.seoFieldsMissing?.length ?? 0) > 0 && (
          <p style={{ margin: 0, fontSize: 10.5, color: "#92400e", lineHeight: 1.5 }}>
            {t.s2Missing}: {gate?.seoFieldsMissing.join(", ")}
          </p>
        )}
      </Accordion>

      {/* Section 3 — 예상 ROI·후킹 검수 */}
      <Accordion title={t.s3Title} hint={t.s3Hint} light={s3Light} lightLabel={s3LightLabel}>
        <RoiRow label={t.s3Review} ok={roi.review} />
        <RoiRow label={t.s3Benefit} ok={roi.benefit} />
        <RoiRow label={t.s3Diff} ok={roi.diff} />
      </Accordion>
    </div>
  );
}

function RoiRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <TrafficDot light={ok ? "green" : "yellow"} />
      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--gp-ink-700)" }}>{label}</span>
    </div>
  );
}

function ShellMsg({ text }: { text: string }) {
  const t = strings.atelier.controlTower;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: "var(--gp-ink-900)" }}>{t.title}</h2>
      <p style={{ margin: 0, fontSize: 12, color: "var(--gp-ink-500)", lineHeight: 1.6 }}>{text}</p>
    </div>
  );
}
