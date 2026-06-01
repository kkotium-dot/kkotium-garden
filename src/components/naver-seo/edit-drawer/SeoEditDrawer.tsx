"use client";

// SeoEditDrawer — right-slide drawer for live SEO editing.
// Replaces the legacy ejection `window.location.href = /products/new?edit=`
// with an in-place experience. Mounts at the page level so the table stays
// underneath; the drawer is the canonical edit affordance going forward.
//
// Phase 2-A-1 scope:
//   - title (naver_title) with live length gauge + duplicate warning
//   - keywords (naver_keywords) free-form CSV input
//   - short description (naver_description)
//
// Phase 2-A-2 will add the search-volume + competition bars (Lane 1
// SearchAd reuse). Phase 2-A-3 will add the publish-readiness gate.
//
// Save uses the existing PATCH /api/products/:id endpoint. Product.name
// (한국 상품명) is intentionally left untouched per Lane 1-D rule.

import { useEffect, useState, useCallback } from "react";
import { X, ExternalLink, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { PopButton, ScallopCard, StickerBadge } from "@/components/shell";
import { seoDrawerCopy } from "@/lib/i18n/seo-drawer";
import TitleLengthGauge from "./TitleLengthGauge";
import DuplicateKeywordWarning from "./DuplicateKeywordWarning";

export interface SeoEditDrawerProduct {
  id: string;
  name: string;
  naver_title: string | null;
  naver_keywords: string | null;
  naver_description: string | null;
  seoScore?: number;
  mainImage?: string | null;
}

export interface SeoEditDrawerProps {
  open: boolean;
  product: SeoEditDrawerProduct | null;
  onClose: () => void;
  /** Called after a successful PATCH so the table can refresh. */
  onSaved?: () => void;
  /** Override soft/hard thresholds (default 50/100). */
  softLimit?: number;
  hardLimit?: number;
}

interface DraftState {
  naver_title: string;
  naver_keywords: string;
  naver_description: string;
}

const EMPTY: DraftState = {
  naver_title: "",
  naver_keywords: "",
  naver_description: "",
};

function toDraft(p: SeoEditDrawerProduct | null): DraftState {
  if (!p) return EMPTY;
  return {
    naver_title: p.naver_title ?? "",
    naver_keywords: p.naver_keywords ?? "",
    naver_description: p.naver_description ?? "",
  };
}

export default function SeoEditDrawer({
  open,
  product,
  onClose,
  onSaved,
  softLimit = 50,
  hardLimit = 100,
}: SeoEditDrawerProps) {
  const c = seoDrawerCopy;
  const [draft, setDraft] = useState<DraftState>(EMPTY);
  const [saving, setSaving] = useState(false);

  // Reset draft when target product changes.
  useEffect(() => {
    setDraft(toDraft(product));
  }, [product?.id]);

  // ESC closes drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, saving]);

  const handleSave = useCallback(async () => {
    if (!product) return;
    setSaving(true);
    const t = toast.loading(c.drawer.saving);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naver_title: draft.naver_title || null,
          naver_keywords: draft.naver_keywords || null,
          naver_description: draft.naver_description || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      toast.dismiss(t);
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error ?? `HTTP ${res.status}`);
      }
      toast.success(c.drawer.saved);
      onSaved?.();
      onClose();
    } catch (err) {
      toast.dismiss(t);
      toast.error(`${c.drawer.saveFailed} — ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setSaving(false);
    }
  }, [product, draft, onClose, onSaved, c.drawer.saving, c.drawer.saved, c.drawer.saveFailed]);

  if (!open || !product) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={c.drawer.title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        justifyContent: "flex-end",
        background: "rgba(26, 26, 26, 0.35)",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <aside
        style={{
          width: "min(560px, 92vw)",
          height: "100vh",
          background: "var(--color-bg)",
          borderLeft: "1px solid var(--color-border-strong)",
          boxShadow: "-12px 0 24px rgba(230, 35, 16, 0.08)",
          display: "flex",
          flexDirection: "column",
          animation: "gpSlideIn 0.18s ease-out",
        }}
      >
        {/* Header */}
        <header
          style={{
            padding: "18px 22px 14px",
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              className="gp-label-serif-italic"
              style={{ fontSize: 12, color: "var(--gp-red-500)", margin: 0 }}
            >
              sow seeds / live edit
            </p>
            <h2
              className="gp-h2"
              style={{ margin: "2px 0 4px", wordBreak: "keep-all" }}
            >
              {c.drawer.title}
            </h2>
            <p className="gp-caption" style={{ margin: 0 }}>
              {c.drawer.subtitle}
            </p>
            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {typeof product.seoScore === "number" && (
                <StickerBadge
                  tone={
                    product.seoScore >= 75
                      ? "green"
                      : product.seoScore >= 45
                        ? "pink"
                        : "red"
                  }
                  size="sm"
                >
                  SEO {product.seoScore}
                </StickerBadge>
              )}
              <Link
                href={`/products/new?edit=${product.id}`}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--gp-ink-500)",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <ExternalLink size={12} />
                {c.drawer.openExternal}
              </Link>
            </div>
          </div>
          {/* Phase 2-A-1b: explicit close PopButton in header. Row clicks
              switch the drawer rather than close it, so this is now the
              primary close affordance alongside the footer Close button. */}
          <PopButton
            variant="secondary"
            onClick={onClose}
            disabled={saving}
            type="button"
            leftIcon={<X size={14} />}
          >
            {c.drawer.close}
          </PopButton>
        </header>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "18px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Original name — read-only context */}
          <ScallopCard tone="subtle" style={{ padding: 16 }}>
            <p
              className="gp-label-serif-italic"
              style={{
                fontSize: 11,
                color: "var(--gp-red-500)",
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              {c.drawer.originalName}
            </p>
            <p
              style={{
                margin: "4px 0 6px",
                fontSize: 15,
                fontWeight: 700,
                wordBreak: "keep-all",
              }}
            >
              {product.name}
            </p>
            <p className="gp-caption" style={{ margin: 0 }}>
              {c.drawer.originalNameNote}
            </p>
          </ScallopCard>

          {/* naver_title with live gauge + duplicate warning */}
          <ScallopCard scallop style={{ padding: 18 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--gp-ink-900)",
                marginBottom: 6,
              }}
            >
              {c.title.label}
            </label>
            <textarea
              value={draft.naver_title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, naver_title: e.target.value }))
              }
              placeholder={c.title.placeholder}
              rows={2}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                lineHeight: 1.5,
                background: "var(--color-surface)",
                border: "1.5px solid var(--color-border)",
                borderRadius: 10,
                color: "var(--color-text)",
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
                wordBreak: "keep-all",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--gp-pink-400)";
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px rgba(255,107,138,0.18)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.boxShadow = "";
              }}
            />
            <TitleLengthGauge
              value={draft.naver_title}
              soft={softLimit}
              hard={hardLimit}
            />
            <DuplicateKeywordWarning text={draft.naver_title} threshold={3} />
          </ScallopCard>

          {/* naver_keywords */}
          <ScallopCard style={{ padding: 18 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--gp-ink-900)",
                marginBottom: 6,
              }}
            >
              {c.keywords.label}
            </label>
            <input
              type="text"
              value={draft.naver_keywords}
              onChange={(e) =>
                setDraft((d) => ({ ...d, naver_keywords: e.target.value }))
              }
              placeholder={c.keywords.placeholder}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                background: "var(--color-surface)",
                border: "1.5px solid var(--color-border)",
                borderRadius: 10,
                color: "var(--color-text)",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--gp-pink-400)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
              }}
            />
            <p className="gp-caption" style={{ marginTop: 6 }}>
              {c.keywords.help}
            </p>
          </ScallopCard>

          {/* naver_description */}
          <ScallopCard style={{ padding: 18 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--gp-ink-900)",
                marginBottom: 6,
              }}
            >
              {c.description.label}
            </label>
            <textarea
              value={draft.naver_description}
              onChange={(e) =>
                setDraft((d) => ({ ...d, naver_description: e.target.value }))
              }
              placeholder={c.description.placeholder}
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                lineHeight: 1.55,
                background: "var(--color-surface)",
                border: "1.5px solid var(--color-border)",
                borderRadius: 10,
                color: "var(--color-text)",
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
                wordBreak: "keep-all",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--gp-pink-400)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
              }}
            />
          </ScallopCard>
        </div>

        {/* Footer */}
        <footer
          style={{
            padding: "14px 22px",
            background: "var(--color-surface)",
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <p
            className="gp-caption"
            style={{ margin: 0, flex: 1, wordBreak: "keep-all" }}
          >
            {c.footer.phaseNote}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <PopButton
              variant="secondary"
              onClick={onClose}
              disabled={saving}
              type="button"
            >
              {c.drawer.close}
            </PopButton>
            <PopButton
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              type="button"
              leftIcon={saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            >
              {saving ? c.drawer.saving : c.drawer.save}
            </PopButton>
          </div>
        </footer>

        <style jsx>{`
          @keyframes gpSlideIn {
            from {
              transform: translateX(24px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}</style>
      </aside>
    </div>
  );
}
