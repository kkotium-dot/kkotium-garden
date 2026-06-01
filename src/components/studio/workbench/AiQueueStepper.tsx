// AiQueueStepper — Phase 2-B-3 visual progress bar for the
// "사람 1클릭 HITL" Firefly composite workflow per
// docs/research/MOBILE_NAMING_FIREFLY_2026-06.md §3.
//
// 4 stages:
//   1. prompt   — auto-built prompt is ready (always done once mounted)
//   2. generate — seller is generating in Firefly web (toggled by promptCopied)
//   3. upload   — seller drops the generated image into the AssetDropZone
//                 (inferred from hasUploadedAsset prop, e.g. manualCutoutUrl
//                 or manualBackdropUrl going non-empty)
//   4. canvas   — thumbnail pipeline has rendered the composite into the
//                 canvas grid (inferred from hasThumbnails)
//
// Pure presentation — stage state is computed from props, no internal state.

import { ReactNode } from "react";
import { Clipboard, Sparkles, Upload, ImageIcon, Check } from "lucide-react";
import { StickerBadge } from "@/components/shell";
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
  // Walk left-to-right: each stage is complete only if its trigger fired;
  // first non-complete stage is "active"; rest are pending.
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

const STATE_TONE: Record<StageState, "green" | "red" | "ink"> = {
  complete: "green",
  active: "red",
  pending: "ink",
};

const STATE_BORDER: Record<StageState, string> = {
  complete: "1.5px solid var(--gp-green-500)",
  active: "2px solid var(--gp-red-500)",
  pending: "1.5px dashed var(--gp-ink-300)",
};

const STATE_BG: Record<StageState, string> = {
  complete: "var(--gp-green-50)",
  active: "var(--gp-pink-100)",
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

  return (
    <div
      style={{
        padding: 12,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <Sparkles size={13} color="var(--gp-red-500)" strokeWidth={2.5} />
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gp-ink-900)" }}>
          {c.title}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            color: "var(--gp-ink-500)",
          }}
        >
          {Object.values(states).filter((s) => s === "complete").length}/{STAGES.length}
        </span>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, 1fr))`,
          gap: 6,
          position: "relative",
        }}
      >
        {STAGES.map((s, idx) => {
          const state = states[s.key];
          const tone = STATE_TONE[state];
          return (
            <StageBox
              key={s.key}
              icon={<s.Icon size={14} />}
              label={labels[s.key]}
              hint={hints[s.key]}
              state={state}
              tone={tone}
              stepNumber={idx + 1}
            />
          );
        })}
      </div>
    </div>
  );
}

function StageBox({
  icon,
  label,
  hint,
  state,
  tone,
  stepNumber,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  state: StageState;
  tone: "green" | "red" | "ink";
  stepNumber: number;
}) {
  const isComplete = state === "complete";
  return (
    <div
      style={{
        position: "relative",
        padding: "8px 8px 8px 10px",
        border: STATE_BORDER[state],
        background: STATE_BG[state],
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minHeight: 64,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background:
              tone === "green"
                ? "var(--gp-green-500)"
                : tone === "red"
                  ? "var(--gp-red-500)"
                  : "var(--gp-ink-300)",
            color: "#fff",
            fontSize: 10,
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {isComplete ? <Check size={10} strokeWidth={3} /> : stepNumber}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--gp-ink-900)",
            wordBreak: "keep-all",
          }}
        >
          {label}
        </span>
        <span style={{ marginLeft: "auto", color: "var(--gp-ink-500)" }}>{icon}</span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 10,
          color: "var(--gp-ink-500)",
          lineHeight: 1.4,
          wordBreak: "keep-all",
        }}
      >
        {hint}
      </p>
      <span style={{ position: "absolute", top: 4, right: 4 }}>
        <StickerBadge tone={tone} size="sm">
          {state === "complete"
            ? strings.workbench.stepper.tagComplete
            : state === "active"
              ? strings.workbench.stepper.tagActive
              : strings.workbench.stepper.tagPending}
        </StickerBadge>
      </span>
    </div>
  );
}
