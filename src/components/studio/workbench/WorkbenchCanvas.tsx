// WorkbenchCanvas — Phase 2-B-1 placeholder for the center canvas of the
// 아틀리에 작업벤치. Phase 2-B-2 will fill this with the actual thumbnail
// 4-variant preview / cutout / backdrop pickers and the drag-and-drop
// 5-state slot. For now it shows the selected product's main image as a
// large preview so sellers can verify they're working on the right item.

import { ImageOff, Image as ImageIcon } from "lucide-react";
import { ScallopCard, StickerBadge } from "@/components/shell";
import strings from "@/lib/i18n/studio-strings.ko.json";

export interface WorkbenchCanvasProps {
  mainImage: string | null;
  productName?: string;
  /** Optional next-phase placeholder note shown beneath the image. */
  phaseNote?: string;
}

export default function WorkbenchCanvas({
  mainImage,
  productName,
  phaseNote,
}: WorkbenchCanvasProps) {
  const c = strings.workbench.canvas;
  const note = phaseNote ?? c.phaseNote;

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
        <div>
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
            }}
          >
            {productName ? productName : c.title}
          </h2>
        </div>
        <StickerBadge tone="pink" size="sm">
          {c.previewBadge}
        </StickerBadge>
      </header>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background:
            "repeating-linear-gradient(45deg, var(--gp-pink-50) 0 12px, var(--color-surface) 12px 24px)",
        }}
      >
        {mainImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mainImage}
            alt=""
            style={{
              maxWidth: "100%",
              maxHeight: 520,
              objectFit: "contain",
              borderRadius: 10,
              boxShadow: "0 4px 16px rgba(230, 35, 16, 0.10)",
              background: "var(--color-surface)",
              padding: 8,
            }}
          />
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
            <p style={{ margin: 0, fontSize: 13, wordBreak: "keep-all" }}>
              {c.emptyState}
            </p>
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
