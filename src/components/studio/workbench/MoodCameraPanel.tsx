// MoodCameraPanel — Mood-Camera Spec System workbench UI (2026-06-16, session8).
// Three steps inside the grouped 이미지 tab (authority §3/§5):
//   1) 무드 선택      — pick a mood axis (recommended = top-rated for the category)
//   2) 조립 미리보기  — variable product/palette knobs -> assembled English prompt
//   3) 생성           — copy the prompt, confirm the two runtime guards, then
//                       capture the result into the learning library (rating /
//                       favorite, the only learning signal — UX stays 3 steps).
//
// The mood library (spec-data / decision-table / prompt-assembler / guards) is
// pure, so assembly + guards run client-side; only library learning hits the DB.
// No per-product hardcoding (#55): product / palette are operator inputs.
// Lucide icons only, English comments, no Korean type literals, no JSX emoji.

"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, Sparkles, Copy, Check, Star, Heart, Save, Loader2, Award } from "lucide-react";
import strings from "@/lib/i18n/studio-strings.ko.json";
import { MOOD_AXES, MOOD_CODES } from "@/lib/mood/spec-data";
import { assemblePrompt } from "@/lib/mood/prompt-assembler";
import { evaluateGuards } from "@/lib/mood/guards";
import type { MoodCode } from "@/lib/mood/types";

interface BestEntry {
  id: string;
  moodCode: string;
  rating: number | null;
  isFavorite: boolean;
  productCategoryTags: string[];
}

export interface MoodCameraPanelProps {
  productName?: string | null;
  category?: string | null;
}

// House default mood (authority §1: M4 cozy + M2/M6 trendy).
const DEFAULT_MOOD: MoodCode = "M4";

export default function MoodCameraPanel({ productName, category }: MoodCameraPanelProps) {
  const t = strings.workbench.moodCamera;

  const [moodCode, setMoodCode] = useState<MoodCode>(DEFAULT_MOOD);
  const [product, setProduct] = useState<string>(productName ?? "");
  const [palette, setPalette] = useState<string>("");
  const [bestByMood, setBestByMood] = useState<Record<string, BestEntry>>({});

  // Runtime guards the operator confirms manually (edit-mode contamination /
  // generation settings). Auto-derived guards come from the assembly itself.
  const [referenceCleared, setReferenceCleared] = useState(false);
  const [settingsVerified, setSettingsVerified] = useState(false);

  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync the product field when the selected product changes.
  useEffect(() => {
    setProduct(productName ?? "");
    setSavedId(null);
  }, [productName]);

  // Fetch the recommended (top-rated) entry per mood for this category.
  useEffect(() => {
    let alive = true;
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    fetch(`/api/mood/library${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.success && d.bestByMood) setBestByMood(d.bestByMood);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [category]);

  const axis = MOOD_AXES[moodCode];
  const assembled = useMemo(
    () => assemblePrompt({ moodCode, product, palette, categoryTags: category ? [category] : [] }),
    [moodCode, product, palette, category],
  );

  const guards = useMemo(
    () => evaluateGuards({ batch: [assembled], referenceCleared, settingsVerified }),
    [assembled, referenceCleared, settingsVerified],
  );

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(assembled.prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/mood/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moodCode,
          product,
          palette: palette || undefined,
          productCategoryTags: category ? [category] : [],
          productName: product || undefined,
          rating: rating > 0 ? rating : undefined,
          isFavorite,
        }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.success) setSavedId(d.id);
      else setSaveError(d?.error ?? t.saveError);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const guardRows: Array<[string, boolean]> = [
    [t.guardCameraVariety, guards.cameraVarietyApplied],
    [t.guardReferenceCleared, guards.referenceCleared],
    [t.guardSettingsVerified, guards.settingsVerified],
    [t.guardExclusionsPresent, guards.exclusionsPresent],
    [t.guardBenchmarkDnaSet, guards.benchmarkDnaSet],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, wordBreak: "keep-all" }}>
      <p style={{ margin: 0, fontSize: 12, color: "var(--gp-ink-500)" }}>{t.lead}</p>

      {/* ── Step 1 — mood picker ─────────────────────────────────────── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <StepTitle index={1} label={t.step1} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 6 }}>
          {MOOD_CODES.map((code) => {
            const m = MOOD_AXES[code];
            const active = code === moodCode;
            const best = bestByMood[code];
            return (
              <button
                key={code}
                type="button"
                onClick={() => setMoodCode(code)}
                aria-pressed={active}
                style={{
                  position: "relative",
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: active ? "1.5px solid var(--gp-red-500)" : "1px solid var(--color-border)",
                  background: active ? "var(--gp-pink-50)" : "var(--color-surface)",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "block", fontSize: 12, fontWeight: 800, color: "var(--gp-ink-700)" }}>
                  {m.nameKo}
                </span>
                <span style={{ display: "block", fontSize: 10, color: "var(--gp-ink-500)", marginTop: 2 }}>
                  {m.conversionJob}
                </span>
                {best && (best.isFavorite || (best.rating ?? 0) >= 4) && (
                  <span
                    title={t.recommendedHint}
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 2,
                      fontSize: 9,
                      fontWeight: 700,
                      color: "var(--gp-red-600)",
                    }}
                  >
                    <Award size={10} strokeWidth={2.6} />
                    {t.recommended}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Step 2 — assembly preview ────────────────────────────────── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <StepTitle index={2} label={t.step2} />

        <Field label={t.productLabel}>
          <input
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder={t.productPlaceholder}
            style={inputStyle}
          />
        </Field>
        <Field label={t.paletteLabel}>
          <input
            value={palette}
            onChange={(e) => setPalette(e.target.value)}
            placeholder={t.palettePlaceholder}
            style={inputStyle}
          />
        </Field>

        {/* Camera spec + benchmark (Layer 1 lookup, read-only) */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11, color: "var(--gp-ink-600)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Camera size={12} strokeWidth={2.4} style={{ color: "var(--gp-red-500)" }} />
            {t.cameraLabel}: {axis.camera.cameraArchetype}, {axis.camera.lens} {axis.camera.aperture} · {axis.camera.resolution}/{axis.camera.aspectRatio}
          </span>
          <span style={{ color: "var(--gp-ink-500)" }}>
            {t.benchmarkLabel}: {axis.benchmarkDna.join(", ")}
          </span>
        </div>

        {/* Assembled prompt */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gp-ink-600)" }}>{t.promptLabel}</span>
            <button type="button" onClick={copyPrompt} style={copyBtnStyle}>
              {copied ? <Check size={11} style={{ color: "var(--gp-green-600, #15803D)" }} /> : <Copy size={11} />}
              {copied ? t.copied : t.copyPrompt}
            </button>
          </div>
          <textarea
            readOnly
            value={assembled.prompt}
            rows={6}
            style={{
              ...inputStyle,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10.5,
              lineHeight: 1.45,
              resize: "vertical",
            }}
          />
        </div>

        {/* Guards checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gp-ink-600)" }}>{t.guardsTitle}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px" }}>
            {guardRows.map(([label, ok]) => (
              <span
                key={label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 10.5,
                  color: ok ? "var(--gp-green-600, #15803D)" : "var(--gp-ink-400, #94a3b8)",
                }}
              >
                {ok ? <Check size={11} strokeWidth={2.6} /> : <span style={{ width: 11 }} />}
                {label}
              </span>
            ))}
          </div>
          <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--gp-ink-400, #94a3b8)" }}>{t.varietyNote}</p>
        </div>
      </section>

      {/* ── Step 3 — generate + capture ──────────────────────────────── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <StepTitle index={3} label={t.step3} />

        {/* Runtime guard confirmations (operator) */}
        <label style={toggleStyle}>
          <input type="checkbox" checked={referenceCleared} onChange={(e) => setReferenceCleared(e.target.checked)} />
          {t.guardReferenceCleared} — {t.refNote}
        </label>
        <label style={toggleStyle}>
          <input type="checkbox" checked={settingsVerified} onChange={(e) => setSettingsVerified(e.target.checked)} />
          {t.guardSettingsVerified}
        </label>

        {/* Rating + favorite capture */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--gp-ink-600)" }}>
            {t.ratingLabel}
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n === rating ? 0 : n)}
                aria-label={`${t.ratingLabel} ${n}`}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0 }}
              >
                <Star
                  size={15}
                  strokeWidth={2}
                  style={{ color: n <= rating ? "var(--gp-red-500)" : "var(--gp-ink-300, #cbd5e1)" }}
                  fill={n <= rating ? "var(--gp-red-500)" : "none"}
                />
              </button>
            ))}
          </span>
          <button
            type="button"
            onClick={() => setIsFavorite((v) => !v)}
            aria-pressed={isFavorite}
            style={{ ...copyBtnStyle, color: isFavorite ? "var(--gp-red-600)" : "var(--gp-ink-500)" }}
          >
            <Heart size={12} fill={isFavorite ? "var(--gp-red-500)" : "none"} />
            {t.favoriteLabel}
          </button>
        </div>

        <button type="button" onClick={save} disabled={saving} style={saveBtnStyle}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : savedId ? <Check size={13} /> : <Save size={13} />}
          {savedId ? t.saved : t.saveLabel}
        </button>
        {saveError && (
          <p style={{ margin: 0, fontSize: 10.5, color: "var(--gp-red-600)" }}>{saveError}</p>
        )}
      </section>
    </div>
  );
}

// ── Small presentational helpers ──────────────────────────────────────────

function StepTitle({ index, label }: { index: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          borderRadius: 999,
          background: "var(--gp-red-500)",
          color: "#fff",
          fontSize: 10,
          fontWeight: 800,
        }}
      >
        {index}
      </span>
      <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gp-ink-700)" }}>{label}</span>
      {index === 1 && <Sparkles size={12} style={{ color: "var(--gp-red-400, #f87171)" }} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--gp-ink-600)" }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 9px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  fontSize: 12,
  color: "var(--gp-ink-700)",
};

const copyBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 8px",
  borderRadius: 7,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--gp-ink-600)",
  cursor: "pointer",
};

const toggleStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 6,
  fontSize: 11,
  color: "var(--gp-ink-600)",
  cursor: "pointer",
  lineHeight: 1.4,
};

const saveBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "9px 12px",
  borderRadius: 9,
  border: "none",
  background: "var(--gp-red-500)",
  color: "#fff",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
};
