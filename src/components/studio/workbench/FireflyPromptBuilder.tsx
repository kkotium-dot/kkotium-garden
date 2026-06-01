"use client";

// FireflyPromptBuilder — Phase 2-B-3 helper that turns a product into a
// composite-friendly prompt for Adobe Firefly (or whichever model the
// seller picks in the Firefly web UI). 6 elements per
// docs/research/MOBILE_NAMING_FIREFLY_2026-06.md §3:
//   1. Light direction          (광원 방향)
//   2. Colour temperature       (색온도)
//   3. Contact shadow + AO      (접지 그림자 + ambient occlusion)
//   4. Cast shadow              (캐스트 그림자)
//   5. Grounding wording        (접지감 / no floating)
//   6. Perspective + reflection (원근 + 반사)
//
// ★ Runtime external image generation = 0 (#38). This component only
// composes a text prompt and copies it to the clipboard. The seller pastes
// it into the Firefly web UI themselves; no API call leaves the browser.

import { useMemo, useState } from "react";
import { Sparkles, Clipboard, Check, ExternalLink, Info } from "lucide-react";
import { PopButton, ScallopCard, StickerBadge } from "@/components/shell";
import strings from "@/lib/i18n/studio-strings.ko.json";

export interface FireflyPromptBuilderProps {
  productName?: string;
  category?: string | null;
  /** Optional override for the 6 prompt elements (advanced users). */
  overrides?: Partial<FireflyPromptElements>;
  /** Called when the prompt is copied — parent can advance the stepper. */
  onPromptCopied?: (prompt: string) => void;
  /** External Firefly URL (default: edit view). */
  fireflyUrl?: string;
}

export interface FireflyPromptElements {
  surface: string;
  lightDirection: string;
  colorTemperature: string;
  contactShadow: string;
  castShadow: string;
  groundingPhrase: string;
  perspectiveReflection: string;
  faceFreeClause: string;
}

const DEFAULT_ELEMENTS: FireflyPromptElements = {
  surface: "a neutral matte tabletop",
  lightDirection: "soft diffused window light from the upper left at 45 degrees",
  colorTemperature: "warm 5400K daylight",
  contactShadow:
    "realistic contact shadow directly beneath where the product touches the surface, ambient occlusion",
  castShadow: "soft cast shadow falling gently to the lower right",
  groundingPhrase: "natural grounding, no floating, the product sits firmly on the surface",
  perspectiveReflection:
    "matched perspective at eye level, subtle reflection on the surface, photorealistic e-commerce product photo",
  faceFreeClause:
    "do not generate any human faces; if a person is included show only hands or partial torso, never facial features",
};

const FIREFLY_URL_DEFAULT = "https://firefly.adobe.com/generate/image?view=edit";

function buildPrompt(productName: string, els: FireflyPromptElements): string {
  const subject = productName?.trim() || "the product";
  return [
    `${subject} resting on ${els.surface},`,
    `${els.lightDirection},`,
    `${els.colorTemperature},`,
    `${els.contactShadow},`,
    `${els.castShadow},`,
    `${els.perspectiveReflection},`,
    `${els.groundingPhrase}.`,
    `Constraint: ${els.faceFreeClause}.`,
  ].join(" ");
}

export default function FireflyPromptBuilder({
  productName,
  category,
  overrides,
  onPromptCopied,
  fireflyUrl = FIREFLY_URL_DEFAULT,
}: FireflyPromptBuilderProps) {
  const c = strings.workbench.firefly;
  const elements = useMemo<FireflyPromptElements>(
    () => ({ ...DEFAULT_ELEMENTS, ...overrides }),
    [overrides],
  );
  const prompt = useMemo(
    () => buildPrompt(productName ?? "", elements),
    [productName, elements],
  );

  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const handleCopy = async () => {
    setCopyError(null);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(prompt);
      } else {
        throw new Error("clipboard API unavailable");
      }
      setCopied(true);
      onPromptCopied?.(prompt);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : "copy failed");
    }
  };

  return (
    <ScallopCard scallop style={{ padding: 16 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            className="gp-label-serif-italic"
            style={{ fontSize: 11, color: "var(--gp-red-500)", margin: 0 }}
          >
            firefly / composite prompt
          </p>
          <h3
            className="gp-h3"
            style={{
              margin: "2px 0 0",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Sparkles size={14} color="var(--gp-red-500)" strokeWidth={2.5} />
            {c.title}
          </h3>
        </div>
        <StickerBadge tone="pink" size="sm">
          {c.elementsBadge}
        </StickerBadge>
      </header>

      {/* 6-element checklist (read-only summary so seller understands what's
          embedded in the prompt). */}
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 6,
          marginBottom: 12,
        }}
      >
        {[
          { k: 1, label: c.elements.light },
          { k: 2, label: c.elements.temperature },
          { k: 3, label: c.elements.contactShadow },
          { k: 4, label: c.elements.castShadow },
          { k: 5, label: c.elements.grounding },
          { k: 6, label: c.elements.perspective },
        ].map((e) => (
          <li
            key={e.k}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "var(--gp-ink-700)",
              padding: "5px 8px",
              background: "var(--gp-pink-50)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              wordBreak: "keep-all",
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "var(--gp-red-500)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {e.k}
            </span>
            <span>{e.label}</span>
          </li>
        ))}
      </ul>

      <div
        style={{
          padding: "10px 12px",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 10,
          fontSize: 12,
          lineHeight: 1.55,
          color: "var(--gp-ink-700)",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          maxHeight: 140,
          overflowY: "auto",
          marginBottom: 10,
          wordBreak: "break-word",
        }}
      >
        {prompt}
      </div>

      <p
        style={{
          margin: "0 0 10px",
          fontSize: 11,
          color: "var(--gp-red-600)",
          background: "var(--gp-pink-50)",
          border: "1px dashed var(--gp-pink-300)",
          borderRadius: 8,
          padding: "6px 10px",
          display: "flex",
          alignItems: "flex-start",
          gap: 6,
          wordBreak: "keep-all",
        }}
      >
        <Info size={12} style={{ marginTop: 2, flexShrink: 0 }} />
        <span>{c.faceFreeNote}</span>
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <PopButton
          variant="primary"
          type="button"
          onClick={handleCopy}
          leftIcon={copied ? <Check size={14} /> : <Clipboard size={14} />}
        >
          {copied ? c.copiedBtn : c.copyBtn}
        </PopButton>
        <a
          href={fireflyUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none" }}
        >
          <PopButton
            variant="secondary"
            type="button"
            leftIcon={<ExternalLink size={14} />}
          >
            {c.openFireflyBtn}
          </PopButton>
        </a>
        {category && (
          <span
            style={{
              fontSize: 11,
              color: "var(--gp-ink-500)",
              alignSelf: "center",
              wordBreak: "keep-all",
            }}
          >
            {c.categoryHint}: {category}
          </span>
        )}
      </div>

      {copyError && (
        <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--gp-red-600)" }}>
          {c.copyError}: {copyError}
        </p>
      )}

      {/* Model selection guidance — 전 모델 자유 사용 (SD-03 정정) */}
      <details style={{ marginTop: 12 }}>
        <summary
          style={{
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--gp-ink-900)",
            padding: "6px 10px",
            background: "var(--gp-pink-50)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
          }}
        >
          {c.modelGuideTitle}
        </summary>
        <ul
          style={{
            margin: "8px 0 0",
            padding: "0 0 0 18px",
            fontSize: 11,
            lineHeight: 1.7,
            color: "var(--gp-ink-700)",
            wordBreak: "keep-all",
          }}
        >
          <li>
            <strong style={{ color: "var(--gp-red-600)" }}>{c.modelFirefly}:</strong> {c.modelFireflyDesc}
          </li>
          <li>
            <strong style={{ color: "var(--gp-green-700)" }}>{c.modelGemini}:</strong> {c.modelGeminiDesc}
          </li>
          <li>
            <strong style={{ color: "var(--gp-ink-900)" }}>{c.modelFlux}:</strong> {c.modelFluxDesc}
          </li>
        </ul>
        <p style={{ margin: "8px 0 0", fontSize: 10, color: "var(--gp-ink-500)" }}>
          {c.modelFreeChoice}
        </p>
      </details>
    </ScallopCard>
  );
}
