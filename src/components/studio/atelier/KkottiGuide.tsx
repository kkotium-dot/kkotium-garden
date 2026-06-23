// KkottiGuide — C-STUDIO-UX (2026-06-23). One-line 꼬띠 guide speech bubble
// placed per stepper step in the 온실 아틀리에. Pure presentation; the caller
// supplies the per-step line from studio-strings.ko.json (atelier.kkotti.*).
//
// #73 (a) — intuition-first, no clutter: a single calm sentence, never a wall
// of text. Lucide icon only (no emoji in JSX).

"use client";

import { Sparkles } from "lucide-react";

export interface KkottiGuideProps {
  text: string;
}

export default function KkottiGuide({ text }: KkottiGuideProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "10px 12px",
        background: "var(--gp-pink-50, #FFF5F8)",
        border: "1px solid var(--gp-pink-300, #FFB3CE)",
        borderRadius: 12,
        wordBreak: "keep-all",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: "#fff",
          border: "1px solid var(--gp-pink-300, #FFB3CE)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Sparkles size={13} style={{ color: "var(--gp-red-500, #e62310)" }} />
      </span>
      <p
        style={{
          margin: 0,
          fontSize: 12,
          lineHeight: 1.6,
          fontWeight: 600,
          color: "var(--gp-ink-700, #4A3B42)",
        }}
      >
        {text}
      </p>
    </div>
  );
}
