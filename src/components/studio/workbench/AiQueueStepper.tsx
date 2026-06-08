// AiQueueStepper — Phase 2-B-3 progress for the "사람 1클릭 HITL" Firefly
// composite workflow (docs/research/MOBILE_NAMING_FIREFLY_2026-06.md §3).
//
// 2026-06-08 redesign (STUDIO_ATELIER_UX_REDESIGN P1/P3/P4): the old 4-column
// grid crushed each card to ~54px (title truncation + status-chip overlap,
// overflow=true). Replaced with a VERTICAL step list — each row has a Lucide
// status icon, a non-truncating title (wrap allowed), a one-line hint, and a
// status chip in its OWN column (zero overlap). Status color is semantic
// (complete=green, active=pink accent, pending=neutral); NO red (red is
// reserved for the "메인 지정" CTA only, 75/15/10).
//
// 4 stages: prompt → generate → upload → canvas. Pure presentation — stage
// state is computed from props, no internal state.

import { CheckCircle2, Loader2, Circle, Clipboard, Sparkles, Upload, Image as ImageIcon } from "lucide-react";
import strings from "@/lib/i18n/studio-strings.ko.json";

export interface AiQueueStepperProps {
  /** Stage 1 — prompt is ready (always true once builder is mounted). */
  promptReady: boolean;
  /** Stage 2 — seller copied the prompt and (we assume) is in Firefly. */
  promptCopied: boolean;
  /** Stage 3 — seller uploaded the generated asset back via drop zone. */
  hasUploadedAsset: boolean;
  /** Stage 4 — thumbnail pipeline produced canvas-ready variants. */
  hasThumbnails: boolean;
}

type StageKey = "prompt" | "generate" | "upload" | "canvas";
type StageState = "pending" | "active" | "complete";

interface StageDef {
  key: StageKey;
  Icon: typeof Clipboard;
}

const STAGES: StageDef[] = [
  { key: "prompt", Icon: Clipboard },
  { key: "generate", Icon: Sparkles },
  { key: "upload", Icon: Upload },
  { key: "canvas", Icon: ImageIcon },
];

function deriveStates({
  promptReady,
  promptCopied,
  hasUploadedAsset,
  hasThumbnails,
}: AiQueueStepperProps): Record<StageKey, StageState> {
  const completed: Record<StageKey, boolean> = {
    prompt: promptReady,
    generate: promptCopied,
    upload: hasUploadedAsset,
    canvas: hasThumbnails,
  };
  let activeAssigned = false;
  const out: Record<StageKey, StageState> = {
    prompt: "pending",
    generate: "pending",
    upload: "pending",
    canvas: "pending",
  };
  for (const s of STAGES) {
    if (completed[s.key]) {
      out[s.key] = "complete";
    } else if (!activeAssigned) {
      out[s.key] = "active";
      activeAssigned = true;
    }
  }
  return out;
}

// Semantic accent per state — NO red. complete=green, active=pink, pending=neutral.
const ACCENT: Record<StageState, string> = {
  complete: "var(--gp-green-500)",
  active: "var(--gp-pink-300)",
  pending: "transparent",
};
const ROW_BG: Record<StageState, string> = {
  complete: "var(--gp-green-50)",
  active: "var(--gp-pink-50)",
  pending: "var(--color-surface)",
};

export default function AiQueueStepper(props: AiQueueStepperProps) {
  const c = strings.workbench.stepper;
  const states = deriveStates(props);
  const labels: Record<StageKey, string> = {
    prompt: c.stagePrompt,
    generate: c.stageGenerate,
    upload: c.stageUpload,
    canvas: c.stageCanvas,
  };
  const hints: Record<StageKey, string> = {
    prompt: c.hintPrompt,
    generate: c.hintGenerate,
    upload: c.hintUpload,
    canvas: c.hintCanvas,
  };
  const doneCount = Object.values(states).filter((s) => s === "complete").length;

  return (
    <div
      style={{
        padding: 12,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Sparkles size={13} color="var(--gp-pink-300)" strokeWidth={2.5} />
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gp-ink-900)" }}>{c.title}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--gp-ink-500)" }}>
          {doneCount}/{STAGES.length}
        </span>
      </header>

      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {STAGES.map((s) => (
          <StepRow
            key={s.key}
            state={states[s.key]}
            label={labels[s.key]}
            hint={hints[s.key]}
            chip={
              states[s.key] === "complete"
                ? c.tagComplete
                : states[s.key] === "active"
                  ? c.tagActive
                  : c.tagPending
            }
          />
        ))}
      </ol>
    </div>
  );
}

function StepRow({
  state,
  label,
  hint,
  chip,
}: {
  state: StageState;
  label: string;
  hint: string;
  chip: string;
}) {
  const StatusIcon = state === "complete" ? CheckCircle2 : state === "active" ? Loader2 : Circle;
  const iconColor =
    state === "complete"
      ? "var(--gp-green-500)"
      : state === "active"
        ? "var(--gp-pink-300)"
        : "var(--gp-ink-300)";
  const chipColor =
    state === "complete"
      ? { bg: "var(--gp-green-50)", text: "var(--gp-green-700)" }
      : state === "active"
        ? { bg: "var(--gp-pink-100)", text: "var(--gp-ink-900)" }
        : { bg: "var(--color-surface)", text: "var(--gp-ink-500)" };

  return (
    <li
      style={{
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 12px 10px 14px",
        background: ROW_BG[state],
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {/* Left 4px accent bar — status by accent, not by border color. */}
      <span
        aria-hidden
        style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: ACCENT[state] }}
      />
      <StatusIcon
        size={18}
        color={iconColor}
        strokeWidth={2.4}
        className={state === "active" ? "animate-spin" : undefined}
        style={{ flexShrink: 0, marginTop: 1 }}
      />
      {/* Title + hint — own column, title wraps (no truncation). */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: "var(--gp-ink-900)",
            lineHeight: 1.35,
            wordBreak: "keep-all",
          }}
        >
          {label}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--gp-ink-500)", lineHeight: 1.4, wordBreak: "keep-all" }}>
          {hint}
        </p>
      </div>
      {/* Status chip — separate column, never overlaps the title. */}
      <span
        style={{
          flexShrink: 0,
          alignSelf: "center",
          fontSize: 10,
          fontWeight: 700,
          padding: "3px 8px",
          borderRadius: 999,
          background: chipColor.bg,
          color: chipColor.text,
          whiteSpace: "nowrap",
        }}
      >
        {chip}
      </span>
    </li>
  );
}
