// WorkbenchCanvas — Phase 2-B-2 expanded center canvas.
//
// Render priority (top → bottom of canvas):
//   1. When thumbnails != null: 4-variant grid (Clean/Price/Badge/Lifestyle)
//      with click-to-select main + active main badge. Plus a before/after
//      toggle so the seller can compare the picked thumbnail against the
//      raw product mainImage.
//   2. Designer source slots (cutout / backdrop) — render whenever the
//      caller provides URLs, regardless of thumbnail state.
//   3. When nothing is generated yet: fall back to the original mainImage
//      preview with an empty-state hint (the Phase 2-B-1 behaviour).
//
// All Korean strings via studio-strings.ko.json (#35). No external image
// generation at runtime (#38) — every image is either a base64 result the
// thumbnail pipeline produced, a Supabase URL the seller supplied, or the
// original DB-stored mainImage.

"use client";

import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, ImageOff, Check, Eye, EyeOff } from "lucide-react";
import { ScallopCard, StickerBadge, PopButton } from "@/components/shell";
import strings from "@/lib/i18n/studio-strings.ko.json";
import type { ThumbnailResult, ThumbVariant } from "@/components/studio/types";

export interface WorkbenchCanvasProps {
  mainImage: string | null;
  productName?: string;
  /** Phase 2-B-2 — generated thumbnails (base64 outputs). */
  thumbnails?: ThumbnailResult | null;
  /** Currently selected main variant — clicking a tile updates this. */
  mainVariant?: ThumbVariant;
  onSelectMain?: (v: ThumbVariant) => void;
  /** Designer-supplied source URLs. Optional — slot only renders when set. */
  cutoutUrl?: string;
  backdropUrl?: string;
  /** Optional phase note shown at the footer. */
  phaseNote?: string;
}

const VARIANT_ORDER: ThumbVariant[] = ["clean", "price", "badge", "lifestyle"];

export default function WorkbenchCanvas({
  mainImage,
  productName,
  thumbnails,
  mainVariant,
  onSelectMain,
  cutoutUrl,
  backdropUrl,
  phaseNote,
}: WorkbenchCanvasProps) {
  const c = strings.workbench.canvas;
  const variantLabels = strings.thumbnail.variants;
  const note = phaseNote ?? c.phaseNote;

  const variantMap = useMemo(() => {
    const m = new Map<ThumbVariant, { base64: string; mime: string }>();
    if (thumbnails?.outputs) {
      for (const o of thumbnails.outputs) m.set(o.variant, { base64: o.base64, mime: o.mimeType });
    }
    return m;
  }, [thumbnails]);

  const hasThumbnails = variantMap.size > 0;
  const hasDesignerAssets = Boolean(cutoutUrl) || Boolean(backdropUrl);

  // Before/after toggle — defaults to "after" (showing thumbnails) when
  // they exist, "before" otherwise. Reset on thumbnail set change so the
  // seller sees the fresh result first.
  const [showBefore, setShowBefore] = useState<boolean>(!hasThumbnails);
  useEffect(() => {
    setShowBefore(!hasThumbnails);
  }, [hasThumbnails]);

  return (
    <ScallopCard
      scallop
      style={{
        padding: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 420,
      }}
    >
      <header
        style={{
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            className="gp-label-serif-italic"
            style={{ fontSize: 11, color: "var(--gp-red-500)", margin: 0 }}
          >
            atelier / canvas
          </p>
          <h2
            className="gp-h2"
            style={{
              margin: "2px 0 0",
              wordBreak: "keep-all",
              fontSize: 18,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {productName ? productName : c.title}
          </h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {hasThumbnails && (
            <PopButton
              variant="secondary"
              type="button"
              onClick={() => setShowBefore((v) => !v)}
              leftIcon={showBefore ? <Eye size={12} /> : <EyeOff size={12} />}
            >
              {showBefore ? c.toggleAfter : c.toggleBefore}
            </PopButton>
          )}
          <StickerBadge tone="pink" size="sm">
            {hasThumbnails ? c.previewAfterBadge : c.previewBadge}
          </StickerBadge>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          padding: 18,
          background:
            "repeating-linear-gradient(45deg, var(--gp-pink-50) 0 12px, var(--color-surface) 12px 24px)",
        }}
      >
        {/* Variant grid OR before-state preview */}
        {hasThumbnails && !showBefore ? (
          <VariantGrid
            variantMap={variantMap}
            mainVariant={mainVariant}
            onSelectMain={onSelectMain}
            labels={variantLabels}
            selectedLabel={strings.thumbnail.selected}
            selectLabel={strings.thumbnail.select}
          />
        ) : (
          <SingleImagePreview
            src={mainImage}
            emptyText={hasDesignerAssets ? c.beforeFromOriginal : c.emptyState}
            note={showBefore && hasThumbnails ? c.beforeOriginalNote : undefined}
          />
        )}

        {/* Designer source slots */}
        {hasDesignerAssets && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginTop: 4,
            }}
          >
            {cutoutUrl && (
              <DesignerSlot
                label={c.cutoutSlot}
                url={cutoutUrl}
                badge={c.designerBadge}
              />
            )}
            {backdropUrl && (
              <DesignerSlot
                label={c.backdropSlot}
                url={backdropUrl}
                badge={c.designerBadge}
              />
            )}
          </div>
        )}
      </div>

      <footer
        style={{
          padding: "10px 18px",
          background: "var(--color-surface)",
          borderTop: "1px dashed var(--color-border-strong)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          color: "var(--gp-ink-500)",
          lineHeight: 1.45,
          wordBreak: "keep-all",
        }}
      >
        <ImageIcon size={12} color="var(--gp-pink-300)" strokeWidth={2.5} />
        <span>{note}</span>
      </footer>
    </ScallopCard>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────

function SingleImagePreview({
  src,
  emptyText,
  note,
}: {
  src: string | null;
  emptyText: string;
  note?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 320,
      }}
    >
      {src ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            style={{
              maxWidth: "100%",
              maxHeight: 480,
              objectFit: "contain",
              borderRadius: 10,
              boxShadow: "0 4px 16px rgba(230, 35, 16, 0.10)",
              background: "var(--color-surface)",
              padding: 8,
            }}
          />
          {note && (
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: "var(--gp-ink-500)",
                wordBreak: "keep-all",
              }}
            >
              {note}
            </p>
          )}
        </>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            color: "var(--gp-ink-500)",
          }}
        >
          <ImageOff size={36} color="var(--gp-pink-300)" strokeWidth={2} />
          <p style={{ margin: 0, fontSize: 13, wordBreak: "keep-all" }}>{emptyText}</p>
        </div>
      )}
    </div>
  );
}

function VariantGrid({
  variantMap,
  mainVariant,
  onSelectMain,
  labels,
  selectedLabel,
  selectLabel,
}: {
  variantMap: Map<ThumbVariant, { base64: string; mime: string }>;
  mainVariant?: ThumbVariant;
  onSelectMain?: (v: ThumbVariant) => void;
  labels: Record<ThumbVariant, string>;
  selectedLabel: string;
  selectLabel: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 14,
        flex: 1,
      }}
    >
      {VARIANT_ORDER.map((variant) => {
        const out = variantMap.get(variant);
        const isMain = mainVariant === variant;
        return (
          <div
            key={variant}
            style={{
              position: "relative",
              borderRadius: 12,
              overflow: "hidden",
              background: "var(--color-surface)",
              border: isMain ? "2px solid var(--gp-red-500)" : "1.5px solid var(--color-border)",
              boxShadow: isMain
                ? "0 4px 14px rgba(230, 35, 16, 0.22)"
                : "0 1px 4px rgba(230, 35, 16, 0.06)",
              transition: "border-color 0.12s, box-shadow 0.12s",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                position: "relative",
                background: "var(--gp-pink-50)",
                aspectRatio: "1 / 1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {out ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:${out.mime};base64,${out.base64}`}
                  alt={labels[variant]}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <ImageOff size={24} color="var(--gp-pink-300)" />
              )}
              {isMain && (
                <span style={{ position: "absolute", top: 8, left: 8 }}>
                  <StickerBadge tone="red" size="sm">
                    <Check size={10} strokeWidth={3} /> {selectedLabel}
                  </StickerBadge>
                </span>
              )}
            </div>
            <div
              style={{
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--gp-ink-900)",
                  wordBreak: "keep-all",
                }}
              >
                {labels[variant]}
              </span>
              {out && onSelectMain && !isMain && (
                <button
                  type="button"
                  onClick={() => onSelectMain(variant)}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    background: "var(--gp-pink-100)",
                    color: "var(--gp-red-600)",
                    border: "1.5px solid var(--gp-pink-200)",
                    borderRadius: 999,
                    cursor: "pointer",
                  }}
                >
                  {selectLabel}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DesignerSlot({
  label,
  url,
  badge,
}: {
  label: string;
  url: string;
  badge: string;
}) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1.5px solid var(--gp-pink-200)",
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          aspectRatio: "1 / 1",
          background:
            "repeating-linear-gradient(45deg, var(--gp-pink-50) 0 8px, var(--color-surface) 8px 16px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={label}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
        <span style={{ position: "absolute", top: 6, left: 6 }}>
          <StickerBadge tone="ink" size="sm">
            {badge}
          </StickerBadge>
        </span>
      </div>
      <div
        style={{
          padding: "6px 10px",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--gp-ink-900)",
          background: "var(--gp-pink-50)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        {label}
      </div>
    </div>
  );
}
