"use client";

// AssetDropZone — Phase 2-B-2 designer-source upload affordance for the
// Studio thumbnail step. Replaces the bare URL text input with a 5-state
// drop zone (idle / dragging / uploading / complete / error) while keeping
// the text input as a fallback (so legacy paste-URL workflows still work).
//
// Upload path: POST FormData to /api/upload (existing endpoint, no new API
// per Phase 2-B scope rule). Server returns { urls: string[] }; we take the
// first URL and forward via onChange. Runtime external image generation = 0
// (#38) — the user supplies the asset, Supabase Storage just hosts it.

import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";
import { Upload, ImagePlus, Check, AlertTriangle, Loader2, Link as LinkIcon } from "lucide-react";
import { StickerBadge } from "@/components/shell";
import strings from "@/lib/i18n/studio-strings.ko.json";

export type AssetDropZoneState =
  | "idle"
  | "dragging"
  | "uploading"
  | "complete"
  | "error";

export interface AssetDropZoneProps {
  /** Human-readable label (e.g. "누끼 PNG", "배경 이미지"). */
  label: string;
  /** Current URL (controlled). */
  value: string;
  /** Called with the new URL once upload finishes OR text input edits. */
  onChange: (url: string) => void;
  /** Accept attribute for the file picker. Default: image/* */
  accept?: string;
  /** Hint text shown under the drop area (Korean). */
  hint?: string;
}

const ACCEPT_DEFAULT = "image/png,image/jpeg,image/webp";

export default function AssetDropZone({
  label,
  value,
  onChange,
  accept = ACCEPT_DEFAULT,
  hint,
}: AssetDropZoneProps) {
  const c = strings.workbench.dropzone;
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0); // dragEnter/Leave fires nested children; depth counter avoids flicker
  const [state, setState] = useState<AssetDropZoneState>(value ? "complete" : "idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const performUpload = useCallback(
    async (file: File) => {
      setState("uploading");
      setErrorMsg(null);
      try {
        const form = new FormData();
        form.append("images", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.success === false || !Array.isArray(json?.urls) || json.urls.length === 0) {
          throw new Error(json?.error ?? `HTTP ${res.status}`);
        }
        const url = json.urls[0] as string;
        onChange(url);
        setState("complete");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg.slice(0, 120));
        setState("error");
      }
    },
    [onChange],
  );

  const handleDragEnter = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    if (state !== "uploading") setState("dragging");
  };
  const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0 && state === "dragging") {
      setState(value ? "complete" : "idle");
    }
  };
  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };
  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (file) void performUpload(file);
    else setState(value ? "complete" : "idle");
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void performUpload(file);
    // reset so re-picking the same file fires onChange
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    if (!v) setState("idle");
    else if (state !== "uploading") setState("complete");
  };

  // ── Visual mapping ─────────────────────────────────────────────────────
  const VISUAL: Record<
    AssetDropZoneState,
    { border: string; bg: string; tone: "pink" | "green" | "red" | "ink"; label: string; Icon: typeof Upload }
  > = {
    idle: {
      border: "1.5px dashed var(--gp-pink-300)",
      bg: "var(--gp-pink-50)",
      tone: "pink",
      label: c.stateIdle,
      Icon: ImagePlus,
    },
    dragging: {
      border: "2px dashed var(--gp-red-500)",
      bg: "var(--gp-pink-100)",
      tone: "red",
      label: c.stateDragging,
      Icon: Upload,
    },
    uploading: {
      border: "1.5px solid var(--gp-pink-300)",
      bg: "var(--gp-pink-50)",
      tone: "pink",
      label: c.stateUploading,
      Icon: Loader2,
    },
    complete: {
      border: "1.5px solid var(--gp-green-500)",
      bg: "var(--gp-green-50)",
      tone: "green",
      label: c.stateComplete,
      Icon: Check,
    },
    error: {
      border: "1.5px solid var(--gp-red-500)",
      bg: "var(--gp-red-50)",
      tone: "red",
      label: c.stateError,
      Icon: AlertTriangle,
    },
  };
  const v = VISUAL[state];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gp-ink-900)" }}>
          {label}
        </span>
        <StickerBadge tone={v.tone} size="sm">
          {v.label}
        </StickerBadge>
      </div>

      <label
        htmlFor={inputId}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          border: v.border,
          background: v.bg,
          borderRadius: 12,
          cursor: state === "uploading" ? "wait" : "pointer",
          transition: "background 0.12s, border-color 0.12s",
        }}
      >
        <v.Icon
          size={20}
          color={
            v.tone === "green"
              ? "var(--gp-green-700)"
              : v.tone === "red"
                ? "var(--gp-red-600)"
                : "var(--gp-red-500)"
          }
          strokeWidth={2.25}
          className={state === "uploading" ? "animate-spin" : undefined}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              color: "var(--gp-ink-900)",
              wordBreak: "keep-all",
            }}
          >
            {state === "uploading"
              ? c.uploadingMsg
              : state === "complete" && value
                ? c.completeMsg
                : state === "error"
                  ? (errorMsg ?? c.errorMsg)
                  : state === "dragging"
                    ? c.draggingMsg
                    : c.idleMsg}
          </p>
          {hint && (
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--gp-ink-500)" }}>
              {hint}
            </p>
          )}
        </div>
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept={accept}
          onChange={handleFileInput}
          disabled={state === "uploading"}
          style={{ display: "none" }}
        />
      </label>

      {/* Text URL fallback — typing/pasting a URL still works */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 8,
        }}
      >
        <LinkIcon size={12} color="var(--gp-ink-500)" />
        <input
          type="text"
          value={value}
          onChange={handleTextChange}
          placeholder={c.urlPlaceholder}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 12,
            color: "var(--gp-ink-900)",
            fontFamily: "inherit",
          }}
        />
      </div>
    </div>
  );
}
