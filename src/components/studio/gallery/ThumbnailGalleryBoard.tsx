// ThumbnailGalleryBoard — Studio Step 1 (썸네일 랩) store-thumbnail board.
//
// Design authority: docs/design/STUDIO_MASTER_PLAN_FINAL_2026-09-24.md §A
// (data authority + Step 1 implementation spec).
//
// Shows the images that will actually be published to Naver:
//   representative = product.mainImage
//   optional (<= 9) = resolveAdditionalImages(product)  (#64 single authority)
// Adaptive layout: Hero slot (flex 2) + Sub grid (flex 3); the Sub grid uses
// 2 columns for 1-4 optional images and 3 columns for 5-9.
// Actions: promote an optional image to representative (swap), reorder
// optional images, then save through the same PUT /api/products path that
// seed-planting uses (no new API). Nothing is sent to Naver from here.
//
// Single-responsibility: this component only reads/writes the gallery of one
// product; it takes productId as its only required input so it can be reused
// outside Studio.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Crown,
  ChevronLeft,
  ChevronRight,
  Save,
  RotateCcw,
  Loader2,
  ImageOff,
  ExternalLink,
  AlertTriangle,
  Check,
} from "lucide-react";
import strings from "@/lib/i18n/studio-strings.ko.json";
import {
  resolveAdditionalImages,
  NAVER_MAX_OPTIONAL_IMAGES,
} from "@/lib/products/gallery-images";
import { broadcastProductMutated } from "@/lib/events/product-mutated";

const s = strings.gallery;
const MAX_TOTAL = NAVER_MAX_OPTIONAL_IMAGES + 1;
const RECOMMENDED_PX = 1000;

interface GalleryState {
  main: string;
  extras: string[];
}

interface ImageMeta {
  w: number;
  h: number;
}

export interface ThumbnailGalleryBoardProps {
  productId: string;
  /** Called after a successful save (e.g. to refresh sibling views). */
  onSaved?: () => void;
}

function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export default function ThumbnailGalleryBoard({ productId, onSaved }: ThumbnailGalleryBoardProps) {
  const [original, setOriginal] = useState<GalleryState | null>(null);
  const [draft, setDraft] = useState<GalleryState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [meta, setMeta] = useState<Record<string, ImageMeta>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const p = json.product ?? json.data ?? json;
      const next: GalleryState = {
        main: typeof p?.mainImage === "string" ? p.mainImage : "",
        extras: resolveAdditionalImages(p),
      };
      setOriginal(next);
      setDraft(next);
      setSaveState("idle");
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    if (!original || !draft) return false;
    return original.main !== draft.main || original.extras.join("\n") !== draft.extras.join("\n");
  }, [original, draft]);

  const total = draft ? (draft.main ? 1 : 0) + draft.extras.length : 0;

  const promote = (index: number) => {
    setDraft((d) => {
      if (!d) return d;
      const picked = d.extras[index];
      const rest = d.extras.filter((_, i) => i !== index);
      // The previous representative moves to the first optional slot so it
      // is never lost by a promote.
      const extras = d.main ? [d.main, ...rest] : rest;
      return { main: picked, extras: extras.slice(0, NAVER_MAX_OPTIONAL_IMAGES) };
    });
    setSaveState("idle");
  };

  const move = (index: number, delta: -1 | 1) => {
    setDraft((d) => {
      if (!d) return d;
      const target = index + delta;
      if (target < 0 || target >= d.extras.length) return d;
      const extras = [...d.extras];
      [extras[index], extras[target]] = [extras[target], extras[index]];
      return { ...d, extras };
    });
    setSaveState("idle");
  };

  const save = async () => {
    if (!draft || !dirty) return;
    setSaving(true);
    setSaveState("idle");
    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId, mainImage: draft.main, images: draft.extras }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "save failed");
      setOriginal(draft);
      setSaveState("saved");
      broadcastProductMutated(productId, "gallery");
      onSaved?.();
    } catch {
      setSaveState("error");
    } finally {
      setSaving(false);
    }
  };

  const recordMeta = (url: string, el: HTMLImageElement) => {
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    if (!w || !h) return;
    setMeta((m) => (m[url] ? m : { ...m, [url]: { w, h } }));
  };

  const subColumns = draft && draft.extras.length > 4 ? 3 : 2;
  const seedHref = `/products/new?edit=${encodeURIComponent(productId)}&focus=image`;

  return (
    <section
      aria-label={s.title}
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 14,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--gp-ink-900)" }}>{s.title}</h3>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--gp-ink-500)", wordBreak: "keep-all" }}>{s.subtitle}</p>
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            padding: "4px 10px",
            borderRadius: 999,
            background: "var(--gp-pink-50)",
            color: "var(--gp-red-600)",
            border: "1px solid var(--gp-pink-200)",
            whiteSpace: "nowrap",
          }}
        >
          {fmt(s.count, { n: total, max: MAX_TOTAL })}
        </span>
      </header>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--gp-ink-500)", fontSize: 13, padding: "24px 0" }}>
          <Loader2 size={16} className="animate-spin" /> {s.loading}
        </div>
      )}

      {!loading && loadError && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--gp-red-600)" }}>
          <AlertTriangle size={16} /> {s.loadError}
        </div>
      )}

      {!loading && !loadError && draft && total === 0 && (
        <div style={{ textAlign: "center", padding: "28px 12px", color: "var(--gp-ink-500)" }}>
          <ImageOff size={32} color="var(--gp-pink-300)" />
          <p style={{ margin: "8px 0 2px", fontSize: 14, fontWeight: 700, color: "var(--gp-ink-700)" }}>{s.empty}</p>
          <p style={{ margin: "0 0 12px", fontSize: 13, wordBreak: "keep-all" }}>{s.emptyHint}</p>
          <SeedLink href={seedHref} />
        </div>
      )}

      {!loading && !loadError && draft && total > 0 && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* Hero slot */}
          <div style={{ flex: "2 1 240px", minWidth: 220 }}>
            {draft.main ? (
              <Tile
                url={draft.main}
                hero
                meta={meta[draft.main]}
                onLoad={recordMeta}
                label={s.hero}
              />
            ) : (
              <EmptyTile text={s.empty} />
            )}
          </div>

          {/* Sub grid */}
          <div style={{ flex: "3 1 300px", minWidth: 260 }}>
            {draft.extras.length === 0 ? (
              <div
                style={{
                  border: "1.5px dashed var(--color-border-strong)",
                  borderRadius: 12,
                  padding: "28px 12px",
                  textAlign: "center",
                  color: "var(--gp-ink-500)",
                  fontSize: 13,
                }}
              >
                <p style={{ margin: "0 0 10px" }}>{s.noExtras}</p>
                <SeedLink href={seedHref} />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${subColumns}, minmax(0, 1fr))`, gap: 10 }}>
                {draft.extras.map((url, i) => (
                  <Tile
                    key={url}
                    url={url}
                    meta={meta[url]}
                    onLoad={recordMeta}
                    label={fmt(s.extra, { n: i + 1 })}
                    actions={
                      <>
                        <IconBtn title={s.moveLeft} disabled={i === 0} onClick={() => move(i, -1)}>
                          <ChevronLeft size={14} />
                        </IconBtn>
                        <button
                          type="button"
                          onClick={() => promote(i)}
                          style={{
                            flex: 1,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                            fontSize: 12,
                            fontWeight: 700,
                            padding: "5px 6px",
                            borderRadius: 8,
                            border: "1px solid var(--gp-pink-200)",
                            background: "var(--gp-pink-50)",
                            color: "var(--gp-red-600)",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Crown size={12} /> {s.setMain}
                        </button>
                        <IconBtn title={s.moveRight} disabled={i === draft.extras.length - 1} onClick={() => move(i, 1)}>
                          <ChevronRight size={14} />
                        </IconBtn>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !loadError && draft && total > 0 && (
        <footer
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            borderTop: "1px solid var(--color-border)",
            paddingTop: 12,
          }}
        >
          <span style={{ fontSize: 13, color: saveState === "error" ? "var(--gp-red-600)" : "var(--gp-ink-500)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            {saveState === "saved" && <><Check size={14} color="var(--color-success, #16a34a)" /> {s.saved}</>}
            {saveState === "error" && <><AlertTriangle size={14} /> {s.saveError}</>}
            {saveState === "idle" && dirty && s.dirty}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={() => { setDraft(original); setSaveState("idle"); }}
              style={secondaryBtn(!dirty || saving)}
            >
              <RotateCcw size={14} /> {s.reset}
            </button>
            <button type="button" disabled={!dirty || saving} onClick={() => void save()} style={primaryBtn(!dirty || saving)}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {saving ? s.saving : s.save}
            </button>
          </div>
        </footer>
      )}
    </section>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────

function Tile({
  url,
  hero,
  meta,
  onLoad,
  label,
  actions,
}: {
  url: string;
  hero?: boolean;
  meta?: ImageMeta;
  onLoad: (url: string, el: HTMLImageElement) => void;
  label: string;
  actions?: React.ReactNode;
}) {
  const notSquare = meta ? Math.abs(meta.w - meta.h) / Math.max(meta.w, meta.h) > 0.02 : false;
  const lowRes = meta ? Math.min(meta.w, meta.h) < RECOMMENDED_PX : false;
  return (
    <div
      style={{
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--color-surface)",
        border: hero ? "2px solid var(--gp-red-500)" : "1px solid var(--color-border)",
        boxShadow: hero ? "0 6px 18px rgba(230, 35, 16, 0.14)" : "0 1px 3px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ position: "relative", aspectRatio: "1 / 1", background: "var(--gp-pink-50)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={label}
          onLoad={(e) => onLoad(url, e.currentTarget)}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
        <span
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: hero ? 12 : 11,
            fontWeight: 800,
            padding: hero ? "4px 9px" : "3px 7px",
            borderRadius: 999,
            background: hero ? "var(--gp-red-500)" : "rgba(26,26,26,0.72)",
            color: "#fff",
          }}
        >
          {hero && <Crown size={12} />} {label}
        </span>
        {(notSquare || lowRes) && (
          <span style={{ position: "absolute", bottom: 6, left: 6, right: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {notSquare && <Warn text={s.notSquare} />}
            {lowRes && meta && <Warn text={fmt(s.lowRes, { w: Math.min(meta.w, meta.h) })} />}
          </span>
        )}
      </div>
      {actions && <div style={{ display: "flex", alignItems: "center", gap: 4, padding: 6 }}>{actions}</div>}
    </div>
  );
}

function Warn({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 6px",
        borderRadius: 6,
        background: "rgba(255, 244, 214, 0.95)",
        color: "#8a5a00",
        border: "1px solid #f3d27a",
      }}
    >
      <AlertTriangle size={10} /> {text}
    </span>
  );
}

function EmptyTile({ text }: { text: string }) {
  return (
    <div
      style={{
        aspectRatio: "1 / 1",
        borderRadius: 12,
        border: "1.5px dashed var(--color-border-strong)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--gp-ink-500)",
        fontSize: 13,
      }}
    >
      {text}
    </div>
  );
}

function IconBtn({ title, disabled, onClick, children }: { title: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        color: "var(--gp-ink-700)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1,
      }}
    >
      {children}
    </button>
  );
}

function SeedLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: 700,
        color: "var(--gp-red-600)",
        textDecoration: "none",
      }}
    >
      <ExternalLink size={13} /> {s.addInSeed}
    </a>
  );
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 800,
    padding: "8px 14px",
    borderRadius: 10,
    border: "none",
    background: disabled ? "var(--color-border)" : "var(--gp-red-500)",
    color: disabled ? "var(--gp-ink-500)" : "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function secondaryBtn(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    color: "var(--gp-ink-700)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}
