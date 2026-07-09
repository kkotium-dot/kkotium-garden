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
// Phase 2-A-2 added:
//   - KeywordVolumeChart fed by /api/naver/keyword-stats (existing endpoint,
//     12h server cache). Debounced 800ms on keyword edit. Click a keyword
//     row to append it to naver_title.
//
// Phase 2-A-3 added:
//   - PublishGate fed by GET /api/products/:id/publish-readiness (existing
//     endpoint reused). 4-axis checklist + completeness ring + image guide.
//     Publish PopButton opens a *confirmation* modal only — no Naver API
//     call from the drawer (★비가역 0 / #46).
//   - Unsaved-draft protection: header dirty badge + confirm on close +
//     best-effort warning when the parent switches product underneath us.
//
// Save uses the existing PATCH /api/products/:id endpoint. Product.name
// (한국 상품명) is intentionally left untouched per Lane 1-D rule.

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { X, ExternalLink, Save, Loader2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { PopButton, ScallopCard, StickerBadge } from "@/components/shell";
import { seoDrawerCopy } from "@/lib/i18n/seo-drawer";
import type { KeywordStat } from "@/lib/naver/keyword-api";
import TitleLengthGauge from "./TitleLengthGauge";
import DuplicateKeywordWarning from "./DuplicateKeywordWarning";
import KeywordVolumeChart from "./KeywordVolumeChart";
import PublishGate from "./PublishGate";

export interface SeoEditDrawerProduct {
  id: string;
  name: string;
  naver_title: string | null;
  naver_keywords: string | null;
  naver_description: string | null;
  seoScore?: number;
  mainImage?: string | null;
  /** Phase 2-A-3 image guide inputs. Optional so legacy callers compile. */
  imageCount?: number;
  imageScore?: number;
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
  /** Phase 2-A-3d — lifted state so the page can guard row clicks before
   *  the parent commits a product switch. Fires on every isDirty change
   *  (also on mount with the initial value). The drawer keeps its own
   *  close-path guard for X / ESC / backdrop / footer Close. */
  onDirtyChange?: (dirty: boolean) => void;
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

// Phase 2-A-2: derive up to 5 keywords from CSV input + product fallback.
// Source priority:
//   1. draft.naver_keywords (user edit)
//   2. (no fallback to product.keywords[] here — we only have what the
//      caller passes through props; the SeoEditDrawerProduct shape exposes
//      only naver_keywords which already reflects the persisted value).
function extractKeywordsForVolume(csv: string): string[] {
  return csv
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 5);
}

// Tokenise the current title so KeywordVolumeChart can disable already-
// inserted keyword rows (case-insensitive substring match).
function tokensInTitle(title: string): Set<string> {
  const out = new Set<string>();
  for (const t of title.toLowerCase().split(/\s+/)) {
    const clean = t.replace(/[\p{P}\p{S}]+/gu, "");
    if (clean.length >= 1) out.add(clean);
  }
  return out;
}

// Case-insensitive substring presence test against the raw title — used
// for click-to-insert "already present" detection (more accurate than
// the tokenised set when the keyword is multi-word).
function titleContains(title: string, keyword: string): boolean {
  return title.toLowerCase().includes(keyword.toLowerCase());
}

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
  onDirtyChange,
}: SeoEditDrawerProps) {
  const c = seoDrawerCopy;
  const [draft, setDraft] = useState<DraftState>(EMPTY);
  const [saving, setSaving] = useState(false);

  // Phase 2-MOBILE-2: switch to full-screen modal on <lg viewports. NN/g
  // — bottom sheets are designed for ephemeral context and degrade for the
  // long, multi-section SEO edit flow. SSR-safe: default false, set after
  // mount (component only renders when open=true, both interactive). Resync
  // on resize so the layout adapts mid-session (e.g. orientation change).
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 1023px)");
    const apply = () => setIsMobile(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  // Phase 2-A-2: keyword volume cache + fetch state. Keyed by the comma-
  // sorted keyword set so re-renders with the same 5 keywords skip the
  // network round-trip. Server already has a 12h cache layer; this is the
  // client-side echo to avoid loop fetches while the user types.
  const [volumeStats, setVolumeStats] = useState<KeywordStat[] | null>(null);
  const [volumeLoading, setVolumeLoading] = useState(false);
  const [volumeError, setVolumeError] = useState<string | null>(null);
  const lastKeyRef = useRef<string>("");

  // Phase 2-A-3: snapshot original so we can detect unsaved edits.
  const originalRef = useRef<DraftState>(EMPTY);
  const prevProductIdRef = useRef<string | null>(null);

  // Phase 2-A-3: bump on save success so PublishGate re-fetches readiness.
  const [gateRefreshKey, setGateRefreshKey] = useState(0);

  // Phase 2-A-3: confirm modal state (publish intent — not a real API call).
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  const isDirty = useMemo(() => {
    return (
      draft.naver_title !== originalRef.current.naver_title ||
      draft.naver_keywords !== originalRef.current.naver_keywords ||
      draft.naver_description !== originalRef.current.naver_description
    );
  }, [draft]);

  // Reset draft + clear cached volume when target product changes. As of
  // Phase 2-A-3d the parent (naver-seo/page.tsx) is the source of truth for
  // dirty-guarded switches via onDirtyChange + dirtyRef + window.confirm in
  // its row-click handler; this effect simply syncs to whatever the parent
  // committed. Note: prevProductIdRef is retained for any future per-switch
  // side effects without re-introducing the duplicate-confirm path.
  useEffect(() => {
    const next = toDraft(product);
    originalRef.current = next;
    setDraft(next);
    setVolumeStats(null);
    setVolumeError(null);
    lastKeyRef.current = "";
    prevProductIdRef.current = product?.id ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // Phase 2-A-3d: report isDirty to the parent on every change (incl. mount
  // with the initial false value) so its row-click guard reads a fresh ref.
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Derive the fetchable keyword list from the current draft.
  const sourceKeywords = useMemo(
    () => extractKeywordsForVolume(draft.naver_keywords),
    [draft.naver_keywords],
  );

  // Debounced fetch from /api/naver/keyword-stats. 800ms after last edit.
  useEffect(() => {
    if (!open) return;
    if (sourceKeywords.length === 0) {
      setVolumeStats(null);
      setVolumeError(null);
      setVolumeLoading(false);
      lastKeyRef.current = "";
      return;
    }
    const sortedKey = [...sourceKeywords]
      .map((k) => k.toLowerCase())
      .sort()
      .join(",");
    if (sortedKey === lastKeyRef.current) return; // same set, skip
    let cancelled = false;
    const handle = setTimeout(async () => {
      setVolumeLoading(true);
      setVolumeError(null);
      try {
        const res = await fetch(
          `/api/naver/keyword-stats?keywords=${encodeURIComponent(
            sourceKeywords.join(","),
          )}`,
        );
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || json?.success === false) {
          setVolumeError(json?.error ?? `HTTP ${res.status}`);
          setVolumeStats(null);
        } else {
          setVolumeStats(json.keywords ?? []);
          lastKeyRef.current = sortedKey;
        }
      } catch (err) {
        if (cancelled) return;
        setVolumeError(err instanceof Error ? err.message : "network");
        setVolumeStats(null);
      } finally {
        if (!cancelled) setVolumeLoading(false);
      }
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [open, sourceKeywords]);

  // Click-to-insert: append keyword to naver_title if not already present.
  const handleKeywordPick = useCallback(
    (keyword: string) => {
      setDraft((d) => {
        if (titleContains(d.naver_title, keyword)) return d;
        const sep = d.naver_title.length > 0 && !d.naver_title.endsWith(" ") ? " " : "";
        return { ...d, naver_title: `${d.naver_title}${sep}${keyword}` };
      });
      toast.success(c.volume.insertedToast, { duration: 1500 });
    },
    [c.volume.insertedToast],
  );

  const inTitleSet = useMemo(
    () => tokensInTitle(draft.naver_title),
    [draft.naver_title],
  );

  // Close with dirty-guard. If the draft has unsaved edits we ask before
  // discarding; the guard is also reused by the X / footer Close / backdrop.
  const handleCloseGuarded = useCallback(() => {
    if (saving) return;
    if (isDirty) {
      const ok = window.confirm(seoDrawerCopy.dirty.confirmDiscard);
      if (!ok) return;
    }
    onClose();
  }, [saving, isDirty, onClose]);

  // ESC closes drawer (with dirty-guard).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCloseGuarded();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleCloseGuarded]);

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
      // Sync original snapshot so isDirty resets without closing the drawer.
      originalRef.current = { ...draft };
      setGateRefreshKey((k) => k + 1);
      toast.success(c.drawer.saved);
      onSaved?.();
      // Phase 2-A-3: keep the drawer open after save so the seller can verify
      // the publish gate refresh; previous behaviour auto-closed which hid
      // the readiness state change.
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
        justifyContent: isMobile ? "center" : "flex-end",
        background: "rgba(26, 26, 26, 0.35)",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCloseGuarded();
      }}
    >
      <aside
        style={{
          width: isMobile ? "100vw" : "min(560px, 92vw)",
          height: "100vh",
          background: "var(--color-bg)",
          borderLeft: isMobile ? "none" : "1px solid var(--color-border-strong)",
          boxShadow: isMobile ? "none" : "-12px 0 24px rgba(246, 59, 40, 0.08)",
          display: "flex",
          flexDirection: "column",
          animation: isMobile
            ? "gpSlideUp 0.20s ease-out"
            : "gpSlideIn 0.18s ease-out",
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
              {isDirty && (
                <StickerBadge tone="red" size="sm">
                  <AlertTriangle size={10} strokeWidth={3} />
                  {c.dirty.badge}
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
              primary close affordance alongside the footer Close button.
              Phase 2-A-3d: routed through handleCloseGuarded which asks
              before discarding unsaved edits. */}
          <PopButton
            variant="secondary"
            onClick={handleCloseGuarded}
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

          {/* Phase 2-A-2 — keyword volume + competition bars (Lane 1 reuse) */}
          <KeywordVolumeChart
            sourceKeywords={sourceKeywords}
            stats={volumeStats}
            loading={volumeLoading}
            error={volumeError}
            onKeywordPick={handleKeywordPick}
            inTitleSet={inTitleSet}
          />

          {/* Phase 2-A-3 — publish-readiness gate + image execution guide.
              Mount only when we have a product id (drawer guards above
              ensure that). Refresh on every successful save via gateRefreshKey. */}
          <PublishGate
            productId={product.id}
            imageCount={product.imageCount}
            imageScore={product.imageScore}
            refreshKey={gateRefreshKey}
            onPublishIntent={() => setShowPublishConfirm(true)}
          />

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
              onClick={handleCloseGuarded}
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
          @keyframes gpSlideUp {
            from {
              transform: translateY(24px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}</style>
      </aside>

      {/* Phase 2-A-3: publish confirmation modal — explicitly NOT calling
          the Naver commerce API (★비가역 0). It's a hard stop the seller
          acknowledges before the real publish flow is wired in a later
          turn under direct approval. */}
      {showPublishConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9100,
            background: "rgba(26,26,26,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPublishConfirm(false);
          }}
        >
          <div
            className="gp-card"
            style={{
              maxWidth: 420,
              width: "100%",
              padding: 22,
              background: "var(--color-surface)",
              borderRadius: 14,
              boxShadow: "0 18px 40px rgba(230,35,16,0.18)",
            }}
          >
            <p
              className="gp-label-serif-italic"
              style={{ margin: 0, fontSize: 11, color: "var(--gp-red-500)" }}
            >
              naver publish · confirm
            </p>
            <h3 className="gp-h3" style={{ margin: "2px 0 10px" }}>
              {c.publish.confirmTitle}
            </h3>
            <p
              className="gp-body"
              style={{ margin: "0 0 16px", color: "var(--gp-ink-700)", wordBreak: "keep-all" }}
            >
              {c.publish.confirmBody}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <PopButton
                variant="secondary"
                type="button"
                onClick={() => setShowPublishConfirm(false)}
              >
                {c.publish.confirmCancel}
              </PopButton>
              <PopButton
                variant="primary"
                type="button"
                onClick={() => setShowPublishConfirm(false)}
              >
                {c.publish.confirmAck}
              </PopButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
