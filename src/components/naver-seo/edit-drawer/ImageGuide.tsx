// ImageGuide — "올린 N장 → +M점 가능" execution coach for the publish gate.
// Heuristic: SEO image score caps at 20pt; each additional image up to the
// recommendedCount yields roughly (20 / recommendedCount) pts. We surface
// this as guidance, not as a promise — the actual scoring formula lives in
// the SEO scoring pipeline and may shift, so thresholds are props.

import { Camera, Plus } from "lucide-react";
import { StickerBadge, ScallopCard } from "@/components/shell";
import { seoDrawerCopy } from "@/lib/i18n/seo-drawer";

export interface ImageGuideProps {
  imageCount: number;
  /** Current image score (0–maxImageScore). Optional — when omitted the
   *  guide just shows the upload count vs the recommendation. */
  imageScore?: number;
  /** Recommended target image count. Default 20 — matches the SEO score
   *  bucket size. Tunable per Caveat (research §5 unpublished). */
  recommendedCount?: number;
  /** Max points the image axis can contribute. Default 20. */
  maxImageScore?: number;
}

export default function ImageGuide({
  imageCount,
  imageScore,
  recommendedCount = 20,
  maxImageScore = 20,
}: ImageGuideProps) {
  const c = seoDrawerCopy.imageGuide;
  const safeCount = Math.max(0, imageCount);
  const safeScore = typeof imageScore === "number" ? Math.max(0, Math.min(maxImageScore, imageScore)) : null;

  const remainingImages = Math.max(0, recommendedCount - safeCount);
  // Heuristic: each image contributes maxImageScore / recommendedCount up to
  // the cap. If the actual imageScore is provided, cap potential gain by the
  // remaining headroom.
  const perImagePts = maxImageScore / recommendedCount;
  const headroom = safeScore !== null ? Math.max(0, maxImageScore - safeScore) : maxImageScore;
  const potentialGain = Math.min(headroom, Math.round(remainingImages * perImagePts));

  const fillPct = Math.min(100, (safeCount / recommendedCount) * 100);
  const tone: "green" | "pink" = remainingImages === 0 ? "green" : "pink";

  return (
    <ScallopCard tone="default" style={{ padding: 14, marginTop: 4 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <Camera size={14} color="var(--gp-red-500)" strokeWidth={2.5} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>{c.title}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--gp-ink-500)" }}>
          <span style={{ fontWeight: 800, color: "var(--gp-ink-900)", fontVariantNumeric: "tabular-nums" }}>
            {safeCount}
          </span>
          <span> / {recommendedCount}{c.unit}</span>
        </span>
      </header>

      <div
        style={{
          height: 8,
          background: "var(--gp-pink-100)",
          borderRadius: 99,
          overflow: "hidden",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${fillPct}%`,
            background: remainingImages === 0 ? "var(--gp-green-500)" : "var(--gp-pink-400)",
            borderRadius: 99,
            transition: "width 0.25s ease",
          }}
        />
      </div>

      {remainingImages === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: "var(--gp-green-700)", fontWeight: 600 }}>
          {c.complete}
        </p>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <StickerBadge tone={tone} size="sm">
            <Plus size={10} strokeWidth={3} />
            {remainingImages}{c.unit}
          </StickerBadge>
          <span style={{ fontSize: 12, color: "var(--gp-ink-700)" }}>
            {c.prescriptionPrefix}
            <strong style={{ color: "var(--gp-red-600)", margin: "0 4px" }}>
              +{potentialGain}
            </strong>
            {c.prescriptionSuffix}
          </span>
        </div>
      )}

      <p style={{ margin: "8px 0 0", fontSize: 10, color: "var(--gp-ink-500)", lineHeight: 1.4 }}>
        {c.note}
      </p>
    </ScallopCard>
  );
}
