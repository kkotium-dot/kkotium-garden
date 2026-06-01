// DuplicateKeywordWarning — flags tokens repeated `threshold` times or more.
// Per UIUX research §5: "동일 단어 3~4회 이상 반복 시 SEO 로직 위반".
// Threshold default = 3 (the lower bound), but pageable via props.
//
// Tokenization is intentionally lenient: split on whitespace, then strip
// trailing Korean particles / punctuation from each token so "캠핑은" and
// "캠핑" count as one. This is approximate — the research is clear the
// exact algorithm is unpublished. We surface counts only.

import { useMemo, ReactNode } from "react";
import { StickerBadge } from "@/components/shell";
import { seoDrawerCopy } from "@/lib/i18n/seo-drawer";

export interface DuplicateKeywordWarningProps {
  text: string;
  /** Minimum occurrences to surface as a warning. */
  threshold?: number;
}

// Strip simple Korean particles + punctuation from token edges.
const PARTICLE_RE = /(은|는|이|가|을|를|의|에|와|과|로|으로|도|만)$/;
const TRIM_RE = /[\p{P}\p{S}]+/gu;

function normalizeToken(t: string): string {
  let s = t.normalize("NFC").replace(TRIM_RE, "").trim();
  s = s.replace(PARTICLE_RE, "");
  return s.toLowerCase();
}

interface Counted {
  word: string;
  count: number;
}

function countTokens(text: string, threshold: number): Counted[] {
  if (!text.trim()) return [];
  const map = new Map<string, number>();
  for (const raw of text.split(/\s+/)) {
    const norm = normalizeToken(raw);
    if (norm.length < 2) continue; // skip 1-char noise
    map.set(norm, (map.get(norm) ?? 0) + 1);
  }
  return [...map.entries()]
    .filter(([, n]) => n >= threshold)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
}

function highlightDuplicates(text: string, hits: Set<string>): ReactNode {
  if (hits.size === 0 || !text) return text;
  const parts = text.split(/(\s+)/);
  return parts.map((seg, i) => {
    if (/^\s+$/.test(seg) || !seg) return seg;
    const norm = normalizeToken(seg);
    if (hits.has(norm)) {
      return (
        <mark
          key={i}
          style={{
            background: "var(--gp-pink-200)",
            color: "var(--gp-red-600)",
            padding: "0 3px",
            borderRadius: 4,
            fontWeight: 700,
          }}
        >
          {seg}
        </mark>
      );
    }
    return seg;
  });
}

export default function DuplicateKeywordWarning({
  text,
  threshold = 3,
}: DuplicateKeywordWarningProps) {
  const c = seoDrawerCopy.duplicate;
  const duplicates = useMemo(() => countTokens(text, threshold), [text, threshold]);
  const hitSet = useMemo(() => new Set(duplicates.map((d) => d.word)), [duplicates]);

  if (duplicates.length === 0) {
    return (
      <p
        style={{
          fontSize: 12,
          color: "var(--gp-green-700)",
          margin: "8px 0 0",
          fontWeight: 600,
        }}
      >
        {c.ok}
      </p>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <StickerBadge tone="red" size="sm">
          {c.warningBadge}
        </StickerBadge>
        {duplicates.map((d) => (
          <span
            key={d.word}
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--gp-red-600)",
              background: "var(--gp-pink-100)",
              border: "1.5px solid var(--gp-pink-200)",
              borderRadius: 999,
              padding: "2px 10px",
              boxShadow: "var(--sticker-shadow)",
            }}
          >
            {d.word}
            <span style={{ color: "var(--gp-ink-500)", marginLeft: 4, fontWeight: 500 }}>
              {c.warningPrefix} {d.count}
              {c.warningSuffix}
            </span>
          </span>
        ))}
      </div>
      <div
        style={{
          marginTop: 8,
          padding: "10px 12px",
          background: "var(--gp-pink-50)",
          border: "1px dashed var(--gp-pink-300)",
          borderRadius: 10,
          fontSize: 13,
          lineHeight: 1.6,
          color: "var(--gp-ink-700)",
          wordBreak: "keep-all",
        }}
      >
        {highlightDuplicates(text, hitSet)}
      </div>
    </div>
  );
}
