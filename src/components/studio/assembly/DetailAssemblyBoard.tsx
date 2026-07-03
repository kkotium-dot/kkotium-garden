// src/components/studio/assembly/DetailAssemblyBoard.tsx
// ============================================================================
// SLOT FUNNEL BOARD — SF-1 (read board) + SF-2 (assign + persist).
//
// SF-1: renders the 7 fixed detail-page sections (DETAIL_SECTIONS) and a per-
// product asset tray grouped by storage stage (GET /api/products/{id}/assets —
// storage-direct, same source AssetBrowser uses).
//
// SF-2: click an asset to add it to the ACTIVE section slot; reorder (↑/↓) and
// remove within a slot. On change the 6 assignable sections (notice excluded —
// store_settings pin) are flattened in fixed order (hook→value→spec→usage→trust→
// cta) and AUTOSAVED to Product.detail_images via PUT (C-1 pattern: debounced,
// silent, savingRef-serialized). The "현재 조립됨" strip mirrors the persisted
// detail_images (source of truth).
//
// ★ CONTRACT (#184): Product.detail_images stays a FLAT string[] — buildDetailContent
// and the 씨앗심기 serialize/hydrate are untouched (zero ripple). ★ #185: section
// STRUCTURE is NOT persisted (only the flat order); on reopen the slots start empty
// and the strip restores the saved order. Publish-independent (#46).
//
// Distinct from the engine's image-generation SlotFunnelBoard (components/studio/
// engine). Authority: SF2_SLOT_ASSIGN_SPEC_2026-06-30.md. Lucide only; English comments.
// ============================================================================

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGrid, ImageOff, Sparkles, Pin, ArrowRight, ArrowUp, ArrowDown, X, Plus, Check, Loader, AlertCircle, FileText, Copy } from 'lucide-react';
import { DETAIL_SECTIONS, STAGE_LABELS } from '@/lib/studio/detail-sections';
import { buildSectionCopies } from '@/lib/studio/section-copy';

interface StageFile { name: string; path: string; publicUrl: string }
interface StageGroup { stage: string; count: number; files: StageFile[]; storagePath: string }
interface AssetsResponse { success: boolean; stages?: StageGroup[]; total?: number; error?: string }

// SF-3a — minimal product/store shapes for read-only copy suggestions.
interface ProductMeta {
  name?: string;
  hookPhrase?: string | null;
  seo_hook_text?: string | null;
  keywords?: unknown;
  targetKeywords?: unknown;
  category?: string | null;
  salePrice?: number | null;
  naver_origin?: string | null;
  freeShippingThreshold?: number | null;
  freeShippingMinPrice?: number | null;
  naver_gift_wrapping?: boolean;
}
interface StoreMeta {
  as_phone?: string | null;
  as_guide?: string | null;
  default_return_fee?: number | null;
  default_exchange_fee?: number | null;
  free_shipping_threshold?: number | null;
  notice_top_text?: string | null;
  notice_bottom_text?: string | null;
}

const toStrArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
const categoryWordOf = (cat?: string | null): string | null => {
  if (!cat) return null;
  const seg = cat.split(/[>/]/).map((s) => s.trim()).filter(Boolean).pop();
  return seg || null;
};

// The assignable sections (notice is a pinned store-settings slot — excluded from
// the flatten). Order here IS the detail_images flatten order.
const ASSIGNABLE = DETAIL_SECTIONS.filter((s) => !s.pinned);

export interface DetailAssemblyBoardProps {
  productId: string | null;
  /** #56 — jump to the studio image-generation step for an empty stage. */
  onNavigateToGenerate?: () => void;
}

export default function DetailAssemblyBoard({ productId, onNavigateToGenerate }: DetailAssemblyBoardProps) {
  const [data, setData] = useState<AssetsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SF-2 state. assignments = in-session section→urls (NOT persisted as structure).
  // detailImages = the persisted flat truth (drives the 현재 조립됨 strip).
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [detailImages, setDetailImages] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const savingRef = useRef(false);
  const lastSavedRef = useRef<string>('[]'); // JSON of the last-persisted flat array

  // SF-3a — read-only per-section copy suggestions (no persistence).
  const [product, setProduct] = useState<ProductMeta | null>(null);
  const [store, setStore] = useState<StoreMeta | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!productId) { setData(null); return; }
    setLoading(true); setError(null);
    // Fresh board for a new product — section assignments don't persist (#185).
    setAssignments({}); setActiveSection(null); setDirty(false); setSaveState('idle');
    try {
      const [assetsRes, prodRes, storeRes] = await Promise.all([
        fetch(`/api/products/${productId}/assets`, { cache: 'no-store' }).then((r) => r.json()),
        fetch(`/api/products/${productId}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
        fetch(`/api/store-settings`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      ]);
      if ((assetsRes as AssetsResponse).success) setData(assetsRes as AssetsResponse);
      else setError((assetsRes as AssetsResponse).error || '자산을 불러오지 못했습니다');
      // Persisted detail_images = source of truth for the 현재 조립됨 strip.
      const di = prodRes?.product?.detail_images;
      const arr = Array.isArray(di) ? di.filter((x: unknown): x is string => typeof x === 'string') : [];
      setDetailImages(arr);
      lastSavedRef.current = JSON.stringify(arr);
      // SF-3a sources (copy suggestions are derived read-only; #82-safe).
      setProduct((prodRes?.product as ProductMeta) ?? null);
      setStore((storeRes?.settings as StoreMeta) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '자산을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { void load(); }, [load]);

  // Flatten the assignable sections in fixed order → the detail_images shape.
  const flattened = useMemo(
    () => ASSIGNABLE.flatMap((s) => assignments[s.key] ?? []),
    [assignments],
  );

  // SF-3a — PURE per-section copy suggestions from product + store data (#155/#82).
  const sectionCopies = useMemo(
    () => buildSectionCopies({
      name: product?.name?.trim() || '상품',
      hookPhrase: product?.hookPhrase,
      seoHookText: product?.seo_hook_text,
      keywords: toStrArr(product?.keywords),
      goldenKeywords: toStrArr(product?.targetKeywords),
      categoryWord: categoryWordOf(product?.category),
      categoryPath: product?.category ?? null,
      price: product?.salePrice ?? null,
      origin: product?.naver_origin ?? null,
      freeShippingThreshold: product?.freeShippingThreshold ?? product?.freeShippingMinPrice ?? null,
      giftWrapping: Boolean(product?.naver_gift_wrapping),
      store: store ? {
        asPhone: store.as_phone, asGuide: store.as_guide,
        returnFee: store.default_return_fee, exchangeFee: store.default_exchange_fee,
        freeShippingThreshold: store.free_shipping_threshold,
        noticeTopText: store.notice_top_text, noticeBottomText: store.notice_bottom_text,
      } : undefined,
    }),
    [product, store],
  );

  // SF-2 autosave (C-1 pattern). Only fires AFTER a user assignment (dirty) so the
  // initial empty board never wipes an existing detail_images. Debounced + serialized.
  useEffect(() => {
    if (!productId || !dirty) return;
    const payload = JSON.stringify(flattened);
    if (payload === lastSavedRef.current) return;
    if (savingRef.current) return; // re-runs when saveState flips back
    const handle = setTimeout(async () => {
      savingRef.current = true;
      setSaveState('saving');
      try {
        const res = await fetch('/api/products', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: productId, detail_images: flattened }),
        });
        const d = await res.json();
        if (!d.success) throw new Error(d.error || '저장 실패');
        lastSavedRef.current = payload;
        setDetailImages(flattened); // strip reflects the new persisted truth
        setSaveState('saved');
      } catch {
        setSaveState('error');
      } finally {
        savingRef.current = false;
      }
    }, 1500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flattened, dirty, productId, saveState]);

  // ── assignment handlers ────────────────────────────────────────────────────
  const addToActive = useCallback((url: string) => {
    if (!activeSection) return;
    setAssignments((prev) => {
      const cur = prev[activeSection] ?? [];
      if (cur.includes(url)) return prev; // no exact dup within a section
      return { ...prev, [activeSection]: [...cur, url] };
    });
    setDirty(true);
  }, [activeSection]);

  const removeAt = useCallback((secKey: string, idx: number) => {
    setAssignments((prev) => ({ ...prev, [secKey]: (prev[secKey] ?? []).filter((_, i) => i !== idx) }));
    setDirty(true);
  }, []);

  const moveAt = useCallback((secKey: string, idx: number, dir: -1 | 1) => {
    setAssignments((prev) => {
      const cur = [...(prev[secKey] ?? [])];
      const j = idx + dir;
      if (j < 0 || j >= cur.length) return prev;
      [cur[idx], cur[j]] = [cur[j], cur[idx]];
      return { ...prev, [secKey]: cur };
    });
    setDirty(true);
  }, []);

  // SF-3a — copy a section's suggestion to the clipboard (UI feedback only, no persist).
  const copySection = useCallback((secKey: string, text: string) => {
    if (!text) return;
    void navigator.clipboard?.writeText(text);
    setCopiedKey(secKey);
    window.setTimeout(() => setCopiedKey((k) => (k === secKey ? null : k)), 1500);
  }, []);

  if (!productId) {
    return <Shell><p style={muted}>상품을 선택하면 상세 조립 보드가 표시됩니다.</p></Shell>;
  }
  if (loading) {
    return <Shell><p style={muted}>자산을 불러오는 중…</p></Shell>;
  }
  if (error) {
    return <Shell><p style={{ ...muted, color: 'var(--gp-red-500)' }}>{error}</p></Shell>;
  }

  const stages = data?.stages ?? [];
  const nonEmpty = stages.filter((s) => s.count > 0);
  const emptyStages = stages.filter((s) => s.count === 0 && STAGE_LABELS[s.stage]);
  const activeLabel = ASSIGNABLE.find((s) => s.key === activeSection)?.label ?? null;

  return (
    <Shell>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'var(--gp-ink-900)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <LayoutGrid size={15} color="var(--gp-red-500)" strokeWidth={2.4} /> 상세 조립 보드
        </h3>
        {/* SF-2 autosave chip */}
        <span style={{ fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {saveState === 'saving' ? (
            <span style={{ color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Loader size={11} className="animate-spin" /> 저장 중…</span>
          ) : saveState === 'error' ? (
            <span style={{ color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: 4 }}><AlertCircle size={11} /> 저장 실패</span>
          ) : saveState === 'saved' ? (
            <span style={{ color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={11} /> 저장됨</span>
          ) : (
            <span style={{ color: 'var(--gp-ink-500)' }}>배정·자동저장 · 7섹션</span>
          )}
        </span>
      </header>

      {/* 현재 조립됨 — persisted detail_images (source of truth) */}
      <div style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--gp-pink-50)', border: '1px solid var(--color-border)' }}>
        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, color: 'var(--gp-ink-700)' }}>
          현재 조립됨 (저장된 상세 이미지 {detailImages.length})
        </p>
        {detailImages.length === 0 ? (
          <p style={{ margin: 0, fontSize: 10.5, color: 'var(--gp-ink-500)' }}>아직 저장된 상세 이미지가 없습니다. 아래에서 섹션에 자산을 배정하면 자동 저장됩니다.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {detailImages.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`${url}-${i}`} src={url} alt={`detail-${i + 1}`} title={`${i + 1}`}
                style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--color-border)' }} />
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(260px, 1.3fr)', gap: 14, alignItems: 'start' }}>
        {/* ── Asset tray (left) — click a thumb to add it to the active section ── */}
        <div>
          <p style={trayHead}>
            자산 트레이 (총 {data?.total ?? 0})
            {activeLabel
              ? <span style={{ color: 'var(--gp-red-500)', fontWeight: 800 }}> · 클릭→「{activeLabel}」에 추가</span>
              : <span style={{ color: 'var(--gp-ink-500)', fontWeight: 600 }}> · 먼저 섹션을 선택하세요</span>}
          </p>
          {nonEmpty.length === 0 ? (
            <div style={emptyCard}>
              <ImageOff size={18} color="var(--gp-ink-500)" />
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--gp-ink-700)', fontWeight: 700 }}>가공 자산이 아직 없습니다</p>
              {onNavigateToGenerate && (
                <button type="button" onClick={onNavigateToGenerate} style={genBtn}>
                  <Sparkles size={12} /> 이미지 생성으로 이동
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {nonEmpty.map((g) => (
                <div key={g.stage}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--gp-ink-900)' }}>{STAGE_LABELS[g.stage] ?? g.stage}</span>
                    <span style={stageCount}>{g.count}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {g.files.map((f) => (
                      <button
                        key={f.path}
                        type="button"
                        onClick={() => addToActive(f.publicUrl)}
                        disabled={!activeSection}
                        title={activeSection ? `「${activeLabel}」에 추가` : '섹션을 먼저 선택하세요'}
                        style={{
                          position: 'relative', padding: 0, border: '1px solid var(--color-border)', borderRadius: 8,
                          background: 'var(--gp-pink-50)', cursor: activeSection ? 'pointer' : 'not-allowed',
                          opacity: activeSection ? 1 : 0.7, lineHeight: 0,
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.publicUrl} alt={f.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 7, display: 'block' }} />
                        {activeSection && (
                          <span style={{ position: 'absolute', right: -4, bottom: -4, width: 16, height: 16, borderRadius: 999, background: 'var(--gp-red-500)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Plus size={10} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {emptyStages.length > 0 && (
            <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--gp-pink-50)', border: '1px dashed var(--color-border)' }}>
              <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: 'var(--gp-ink-700)' }}>생성 필요 단계</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                {emptyStages.map((g) => (
                  <span key={g.stage} style={emptyStageChip}>{STAGE_LABELS[g.stage] ?? g.stage}</span>
                ))}
              </div>
              {onNavigateToGenerate && (
                <button type="button" onClick={onNavigateToGenerate} style={{ ...genBtn, marginTop: 6 }}>
                  <Sparkles size={12} /> 이미지 생성으로 이동
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Section slots (right) — click to activate; assign / reorder / remove ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DETAIL_SECTIONS.map((sec, i) => {
            const assigned = assignments[sec.key] ?? [];
            const isActive = activeSection === sec.key;
            return (
              <div
                key={sec.key}
                onClick={() => { if (!sec.pinned) setActiveSection(sec.key); }}
                style={{
                  border: `1.5px ${sec.pinned ? 'solid' : isActive ? 'solid' : 'dashed'} ${isActive ? 'var(--gp-red-500)' : 'var(--color-border)'}`,
                  borderRadius: 10, padding: '10px 12px',
                  background: sec.pinned ? 'var(--gp-pink-50)' : isActive ? '#FFF7FA' : 'var(--color-surface)',
                  cursor: sec.pinned ? 'default' : 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={secNum}>{i + 1}</span>
                  <strong style={{ fontSize: 12.5, color: 'var(--gp-ink-900)' }}>{sec.label}</strong>
                  {sec.pinned ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'var(--gp-ink-500)' }}>
                      <Pin size={10} /> 고정
                    </span>
                  ) : (
                    <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, color: isActive ? 'var(--gp-red-500)' : 'var(--gp-ink-500)' }}>
                      {isActive ? '추가 대상' : assigned.length > 0 ? `${assigned.length}개` : '비어 있음'}
                    </span>
                  )}
                </div>

                {assigned.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {assigned.map((url, idx) => (
                      <div key={`${url}-${idx}`} style={{ position: 'relative', border: '1px solid var(--color-border)', borderRadius: 7, background: 'var(--gp-pink-50)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`${sec.key}-${idx}`} style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
                        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 2, marginTop: 2, justifyContent: 'center' }}>
                          <CtlBtn disabled={idx === 0} onClick={() => moveAt(sec.key, idx, -1)} title="위로"><ArrowUp size={11} /></CtlBtn>
                          <CtlBtn disabled={idx === assigned.length - 1} onClick={() => moveAt(sec.key, idx, 1)} title="아래로"><ArrowDown size={11} /></CtlBtn>
                          <CtlBtn onClick={() => removeAt(sec.key, idx)} title="제거" danger><X size={11} /></CtlBtn>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--gp-ink-500)', lineHeight: 1.45 }}>{sec.guide}</p>
                )}

                {!sec.pinned && sec.suggestedStages.length > 0 && assigned.length === 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    <span style={{ fontSize: 9.5, color: 'var(--gp-ink-500)', alignSelf: 'center' }}>추천 자산</span>
                    {sec.suggestedStages.map((st) => {
                      const has = nonEmpty.some((g) => g.stage === st);
                      return (
                        <span key={st} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', borderRadius: 999,
                          fontSize: 10, fontWeight: 700,
                          background: has ? '#DCFCE7' : 'var(--gp-pink-50)',
                          color: has ? '#15803D' : 'var(--gp-ink-500)',
                          border: `1px solid ${has ? '#86EFAC' : 'var(--color-border)'}`,
                        }}>
                          {has && <ArrowRight size={9} />}{STAGE_LABELS[st] ?? st}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* SF-3a — read-only copy suggestion (template/rule/data-direct, no persist) */}
                {(() => {
                  const cp = sectionCopies[sec.key];
                  if (!cp) return null;
                  const copyText = [cp.headline, cp.body].filter(Boolean).join('\n');
                  return (
                    <div onClick={(e) => e.stopPropagation()} style={copyBox}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                        <span style={copySrc}><FileText size={10} /> 카피 제안 · {cp.sourceLabel}</span>
                        {cp.available && copyText && (
                          <button type="button" onClick={() => copySection(sec.key, copyText)} style={copyBtn} title="카피 복사">
                            {copiedKey === sec.key ? (<><Check size={10} /> 복사됨</>) : (<><Copy size={10} /> 복사</>)}
                          </button>
                        )}
                      </div>
                      {cp.available ? (
                        <>
                          {cp.headline && <p style={copyHl}>{cp.headline}</p>}
                          {cp.body && <p style={copyBd}>{cp.body}</p>}
                        </>
                      ) : (
                        <p style={copyEmpty}>소스 데이터가 없어요 · 생성 필요</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
          <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--gp-ink-500)', lineHeight: 1.5 }}>
            섹션 순서대로 평탄화되어 상세 이미지로 자동 저장됩니다(공통 안내 제외). 섹션 구성은 저장되지 않고 순서만 유지됩니다.
          </p>
        </div>
      </div>
    </Shell>
  );
}

function CtlBtn({ children, onClick, disabled, title, danger }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; title: string; danger?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16,
        borderRadius: 4, border: '1px solid var(--color-border)',
        background: 'var(--color-surface)', color: danger ? '#dc2626' : 'var(--gp-ink-700)',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, padding: 0,
      }}
    >
      {children}
    </button>
  );
}

const muted: React.CSSProperties = { fontSize: 12, color: 'var(--gp-ink-500)', margin: 0, padding: '8px 0' };
const trayHead: React.CSSProperties = { margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: 'var(--gp-ink-700)' };
const stageCount: React.CSSProperties = { fontSize: 10, fontWeight: 800, padding: '0 6px', borderRadius: 999, background: 'var(--gp-pink-50)', color: 'var(--gp-red-500)', border: '1px solid var(--color-border)' };
const secNum: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 999, background: 'var(--gp-red-500)', color: '#fff', fontSize: 10, fontWeight: 800, flexShrink: 0 };
const emptyCard: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '18px 12px', borderRadius: 10, border: '1px dashed var(--color-border)', background: 'var(--gp-pink-50)' };
const emptyStageChip: React.CSSProperties = { padding: '1px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'var(--color-surface)', color: 'var(--gp-ink-500)', border: '1px solid var(--color-border)' };
const genBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--gp-red-500)', background: 'var(--color-surface)', color: 'var(--gp-red-500)', fontSize: 11, fontWeight: 800, cursor: 'pointer' };
// SF-3a copy-suggestion styles
const copyBox: React.CSSProperties = { marginTop: 8, padding: '7px 9px', borderRadius: 8, background: 'var(--gp-pink-50)', border: '1px dashed var(--color-border)' };
const copySrc: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 700, color: 'var(--gp-ink-500)' };
const copyBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--gp-ink-700)', fontSize: 10, fontWeight: 700, cursor: 'pointer' };
const copyHl: React.CSSProperties = { margin: '0 0 2px', fontSize: 11.5, fontWeight: 800, color: 'var(--gp-ink-900)', lineHeight: 1.4 };
const copyBd: React.CSSProperties = { margin: 0, fontSize: 11, color: 'var(--gp-ink-700)', lineHeight: 1.5 };
const copyEmpty: React.CSSProperties = { margin: 0, fontSize: 10.5, fontWeight: 700, color: 'var(--gp-ink-500)' };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section style={{ padding: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)' }}>
      {children}
    </section>
  );
}
