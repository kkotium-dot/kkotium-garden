// KeywordVolumeChart — horizontal bar visualisation for monthly search volume
// + competition. Bars beat pies for human comparison perception (per UIUX
// research §5 + GARDEN_DESIGN_BRIEF retro-pop colour rule).
//
// Data contract: array of KeywordStat from /api/naver/keyword-stats (existing
// Naver SearchAd endpoint reused; no new API per Phase 2-A-2 scope rule).
//
// Visual mapping:
//   - bar length      = totalMonthly / maxVolume (0..100%)
//   - bar colour      = intent weight (gift words → green pop, deboost words
//                       → muted ink, neutral → pink)
//   - competition pill = low/mid/high with sticker tone (green/amber/red)
//   - competition line = vertical tick at 50% (purely advisory baseline —
//                       Naver's true "1.0 = 수요=공급" line lives in compIdx
//                       not in raw volume, so we render the line as guidance
//                       only and surface the caveat copy below)
//   - golden grade    = badge per row combining volume + competition
//
// Golden thresholds intentionally come from props (defaults set to a
// conservative interpretation of research §5 — exact Naver formula is
// unpublished, must remain tunable per Caveats).

import { ReactNode, useMemo } from "react";
import { StickerBadge, ScallopCard } from "@/components/shell";
import { TrendingUp, Plus, Check } from "lucide-react";
import {
  formatSearchVolume,
  type KeywordStat,
} from "@/lib/naver/keyword-api";
import { seoDrawerCopy } from "@/lib/i18n/seo-drawer";

export interface KeywordVolumeChartProps {
  /** Keywords we asked the API about (drives empty / mismatch detection). */
  sourceKeywords: string[];
  /** API result. null = not loaded yet. */
  stats: KeywordStat[] | null;
  loading: boolean;
  error: string | null;
  /** Click-to-insert handler (drawer wires this to naver_title append). */
  onKeywordPick?: (keyword: string) => void;
  /** Tokens currently present in the title — used to disable picked rows. */
  inTitleSet?: Set<string>;
  /** Threshold props — keep tunable (research Caveats: numbers unpublished). */
  goldenVolumeThreshold?: number;
  okVolumeThreshold?: number;
  /** Gift-intent / deboost vocab for colour mapping. Defaults mirror ai-generate. */
  giftWords?: string[];
  deboostWords?: string[];
}

type IntentTone = "gift" | "deboost" | "neutral";

const DEFAULT_GIFT = ["선물", "집들이", "이사", "개업", "결혼", "신혼"];
const DEFAULT_DEBOOST = ["인테리어", "디자인", "장식"];

function classifyIntent(
  keyword: string,
  gift: string[],
  deboost: string[],
): IntentTone {
  const k = keyword;
  if (gift.some((w) => k.includes(w))) return "gift";
  if (deboost.some((w) => k.includes(w))) return "deboost";
  return "neutral";
}

const INTENT_BAR: Record<IntentTone, { fill: string; track: string }> = {
  gift: { fill: "var(--gp-green-500)", track: "var(--gp-green-100)" },
  deboost: { fill: "var(--gp-ink-500)", track: "var(--gp-ink-100)" },
  neutral: { fill: "var(--gp-pink-400)", track: "var(--gp-pink-100)" },
};

type CompetitionLevel = KeywordStat["competition"];

const COMP_LABELS: Record<CompetitionLevel, string> = {
  low: seoDrawerCopy.volume.competitionLow,
  mid: seoDrawerCopy.volume.competitionMid,
  high: seoDrawerCopy.volume.competitionHigh,
  unknown: seoDrawerCopy.volume.competitionUnknown,
};

const COMP_TONES: Record<CompetitionLevel, "green" | "pink" | "red" | "ink"> = {
  low: "green",
  mid: "pink",
  high: "red",
  unknown: "ink",
};

type GoldenGrade = "premium" | "good" | "normal" | "caution";

const GRADE_TONES: Record<GoldenGrade, "red" | "green" | "pink" | "ink"> = {
  premium: "red", // pop red = action-worthy
  good: "green",
  normal: "pink",
  caution: "ink",
};

function classifyGolden(
  vol: number,
  comp: CompetitionLevel,
  golden: number,
  ok: number,
): GoldenGrade {
  if (vol >= golden && comp === "low") return "premium";
  if (vol >= ok && (comp === "low" || comp === "mid")) return "good";
  if (vol >= ok && comp === "high") return "caution";
  if (vol < ok && comp === "high") return "caution";
  return "normal";
}

interface ChartRow {
  stat: KeywordStat;
  intent: IntentTone;
  grade: GoldenGrade;
  pct: number; // 0–100 against max
  inTitle: boolean;
}

function StateCard({ children }: { children: ReactNode }) {
  return (
    <ScallopCard tone="subtle" style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "var(--gp-ink-500)",
          fontSize: 13,
          wordBreak: "keep-all",
        }}
      >
        {children}
      </div>
    </ScallopCard>
  );
}

export default function KeywordVolumeChart({
  sourceKeywords,
  stats,
  loading,
  error,
  onKeywordPick,
  inTitleSet,
  goldenVolumeThreshold = 10_000,
  okVolumeThreshold = 1_000,
  giftWords = DEFAULT_GIFT,
  deboostWords = DEFAULT_DEBOOST,
}: KeywordVolumeChartProps) {
  const c = seoDrawerCopy.volume;

  const rows = useMemo<ChartRow[]>(() => {
    if (!stats || stats.length === 0) return [];
    const maxVol = Math.max(...stats.map((s) => s.totalMonthly), 1);
    const titleSet = inTitleSet ?? new Set<string>();
    return [...stats]
      .sort((a, b) => b.totalMonthly - a.totalMonthly)
      .map((s) => ({
        stat: s,
        intent: classifyIntent(s.keyword, giftWords, deboostWords),
        grade: classifyGolden(
          s.totalMonthly,
          s.competition,
          goldenVolumeThreshold,
          okVolumeThreshold,
        ),
        pct: Math.max(2, (s.totalMonthly / maxVol) * 100),
        inTitle: titleSet.has(s.keyword.toLowerCase()),
      }));
  }, [
    stats,
    inTitleSet,
    giftWords,
    deboostWords,
    goldenVolumeThreshold,
    okVolumeThreshold,
  ]);

  // Empty / loading / error states share the same shell so the panel never
  // collapses (avoids drawer height jitter as user edits keywords).

  if (sourceKeywords.length === 0) {
    return (
      <ScallopCard style={{ padding: 18 }}>
        <ChartHeader />
        <StateCard>{c.empty}</StateCard>
      </ScallopCard>
    );
  }

  if (loading) {
    return (
      <ScallopCard style={{ padding: 18 }}>
        <ChartHeader />
        <StateCard>
          <span
            style={{
              width: 14,
              height: 14,
              border: "2px solid var(--gp-pink-200)",
              borderTopColor: "var(--gp-red-500)",
              borderRadius: "50%",
              display: "inline-block",
              animation: "gpSpin 0.8s linear infinite",
            }}
          />
          {c.loading}
        </StateCard>
        <style jsx>{`
          @keyframes gpSpin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </ScallopCard>
    );
  }

  if (error) {
    const isCreds = /credentials|API key|configured/i.test(error);
    return (
      <ScallopCard style={{ padding: 18 }}>
        <ChartHeader />
        <StateCard>
          <StickerBadge tone="red" size="sm">
            !
          </StickerBadge>
          <span>{isCreds ? c.errorCredentials : c.errorGeneric}</span>
        </StateCard>
      </ScallopCard>
    );
  }

  if (rows.length === 0) {
    return (
      <ScallopCard style={{ padding: 18 }}>
        <ChartHeader />
        <StateCard>{c.empty}</StateCard>
      </ScallopCard>
    );
  }

  return (
    <ScallopCard style={{ padding: 18 }}>
      <ChartHeader />

      {/* Bars */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          position: "relative",
          marginTop: 10,
        }}
      >
        {/* Advisory baseline (50%) — competition reference line */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: "calc(50% + 4px)", // visual offset since rows have left labels
            top: 4,
            bottom: 4,
            width: 1,
            background: "var(--gp-ink-300)",
            opacity: 0.45,
            pointerEvents: "none",
          }}
        />
        {rows.map((row) => {
          const tone = INTENT_BAR[row.intent];
          const compTone = COMP_TONES[row.stat.competition];
          const compLabel = COMP_LABELS[row.stat.competition];
          const gradeTone = GRADE_TONES[row.grade];
          const gradeLabel = c.goldenGrade[row.grade];
          const clickable = onKeywordPick && !row.inTitle;
          return (
            <div key={row.stat.keyword}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 4,
                }}
              >
                <button
                  type="button"
                  onClick={clickable ? () => onKeywordPick?.(row.stat.keyword) : undefined}
                  disabled={!clickable}
                  title={row.inTitle ? c.alreadyInTitle : clickable ? c.pickToInsert : undefined}
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--gp-ink-900)",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: clickable ? "pointer" : "default",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    wordBreak: "keep-all",
                    textAlign: "left",
                  }}
                >
                  {row.inTitle ? (
                    <Check size={12} color="var(--gp-green-500)" strokeWidth={3} />
                  ) : clickable ? (
                    <Plus size={12} color="var(--gp-red-500)" strokeWidth={3} />
                  ) : null}
                  <span>{row.stat.keyword}</span>
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <StickerBadge tone={compTone} size="sm">
                    {compLabel}
                  </StickerBadge>
                  <StickerBadge tone={gradeTone} size="sm">
                    {gradeLabel}
                  </StickerBadge>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "var(--gp-ink-900)",
                      fontVariantNumeric: "tabular-nums",
                      minWidth: 48,
                      textAlign: "right",
                    }}
                  >
                    {formatSearchVolume(row.stat.totalMonthly)}
                    <span style={{ color: "var(--gp-ink-500)", fontWeight: 500, marginLeft: 2 }}>
                      {c.monthlyLabel}
                    </span>
                  </span>
                </div>
              </div>
              <div
                style={{
                  height: 10,
                  background: tone.track,
                  borderRadius: 99,
                  overflow: "hidden",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${row.pct}%`,
                    background: tone.fill,
                    borderRadius: 99,
                    transition: "width 0.25s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Caveat — must be visible per research §5 + Caveats */}
      <p
        style={{
          margin: "14px 0 0",
          fontSize: 11,
          lineHeight: 1.55,
          color: "var(--gp-ink-500)",
          background: "var(--gp-pink-50)",
          border: "1px dashed var(--gp-pink-200)",
          borderRadius: 8,
          padding: "8px 10px",
          wordBreak: "keep-all",
        }}
      >
        {c.caveat}
      </p>
    </ScallopCard>
  );
}

function ChartHeader() {
  const c = seoDrawerCopy.volume;
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginBottom: 6,
      }}
    >
      <div>
        <p
          className="gp-label-serif-italic"
          style={{ fontSize: 11, color: "var(--gp-red-500)", margin: 0 }}
        >
          keyword volume
        </p>
        <h3
          className="gp-h3"
          style={{ margin: "2px 0 0", display: "flex", alignItems: "center", gap: 6 }}
        >
          <TrendingUp size={14} color="var(--gp-red-500)" strokeWidth={2.5} />
          {c.title}
        </h3>
      </div>
      <span className="gp-caption" style={{ wordBreak: "keep-all" }}>
        {c.subtitle}
      </span>
    </header>
  );
}
