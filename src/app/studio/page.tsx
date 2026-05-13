'use client';

// src/app/studio/page.tsx
//
// Sprint 7-M2 Phase 3-B — 온실 아틀리에 (Studio)
//
// Surfaces Sprint 7-M2's three big primitives as a single co-author flow:
//   1. AI Diagnose (POST /api/diagnose)         — concept/tone + skeleton
//   2. Thumbnail 4 variants (POST /api/thumbnail/[sku])
//   3. 5-section detail page composite (POST /api/products/[id]/generate-detail)
//   4. Save assets to Supabase Storage (POST /api/products/[id]/save-assets)
//
// Designer override paths:
//   - Skeleton 1-click swap: override dropdown reruns generate-detail with
//     overrideSkeletonId, bypassing the matcher.
//
// Phase 3-C will add /products/new "비주얼 자동화" tab + /products per-row
// quick action that deep-links here as /studio?product=ID.

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Palette, Loader2, RefreshCw, Sparkles, Image as ImageIcon, FileImage, Save, AlertTriangle, CheckCircle2, Send } from 'lucide-react';
import strings from '@/lib/i18n/studio-strings.ko.json';

// ── Types ─────────────────────────────────────────────────────────────────

type SkeletonIdLiteral =
  | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6'
  | 'S7' | 'S8' | 'S9' | 'S10' | 'S11' | 'S12';

const SKELETON_IDS: SkeletonIdLiteral[] = [
  'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12',
];

const THUMB_VARIANTS = ['clean', 'price', 'badge', 'lifestyle'] as const;
type ThumbVariant = (typeof THUMB_VARIANTS)[number];

interface ProductRow {
  id: string;
  name: string;
  mainImage: string | null;
  category: string | null;
  brand: string | null;
  supplierPrice: number | null;
  aiScore: number | null;
  status: string;
  naverProductId: string | null;
}

interface PublishResult {
  ok: boolean;
  naverProductId: string;
  patched: { thumbnail: boolean; detail: boolean };
  publishedAt: string;
}

interface DiagnosisResult {
  grade: string;
  confidenceLevel: string;
  inferenceConfidence: number;
  qualityScore: number;
  skeletonId: string;
  conceptTone: Record<string, string>;
  persisted?: boolean;
}

interface ThumbnailOutput {
  variant: ThumbVariant;
  base64: string;
  mimeType: string;
  copy?: Record<string, string>;
}

interface ThumbnailResult {
  productId: string;
  skeletonId: string;
  matchScore: number;
  matchAmbiguous: boolean;
  elapsedMs: number;
  outputs: ThumbnailOutput[];
}

interface DetailResult {
  ok: boolean;
  skeletonId: string;
  matchScore: number;
  matchAmbiguous: boolean;
  detailBase64: string;
  detailWidth: number;
  detailHeight: number;
  elapsedMs: number;
  sections: Array<{
    sectionId: string;
    dedicated: boolean;
    height: number;
    offsetY: number;
    copyFiltered: boolean;
  }>;
}

interface SaveResult {
  ok: boolean;
  thumbUrl: string | null;
  detailUrl: string | null;
  savedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function pickGradePalette(grade: string | null | undefined): { bg: string; color: string; border: string } {
  switch (grade) {
    case 'L1': return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
    case 'L2': return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    case 'L3': return { bg: '#fefce8', color: '#a16207', border: '#fde68a' };
    case 'L4': return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
    default:   return { bg: '#f3f4f6', color: '#4b5563', border: '#d1d5db' };
  }
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return strings.header.noPrice;
  return `${n.toLocaleString('ko-KR')}${strings.header.wonSuffix}`;
}

// ── Subcomponents ─────────────────────────────────────────────────────────

function Card({
  title, subtitle, children, accent,
  step, totalSteps, done,
}: {
  title: string; subtitle?: string; children: React.ReactNode; accent?: string;
  step?: number; totalSteps?: number; done?: boolean;
}) {
  return (
    <section
      className="kk-card"
      style={{
        padding: 20,
        marginBottom: 16,
        borderLeft: `4px solid ${accent ?? '#FFB3CE'}`,
      }}
    >
      <header style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        {step != null && totalSteps != null && (
          <div
            style={{
              flexShrink: 0,
              width: 34, height: 34,
              borderRadius: 17,
              background: done ? '#15803d' : (accent ?? '#FFB3CE'),
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 900,
              fontFamily: "'Arial Black', Impact, sans-serif",
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            }}
            aria-label={done ? strings.workflow.stepDone : `${strings.workflow.stepLabel} ${step}/${totalSteps}`}
          >
            {done ? '✓' : step}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>{title}</h3>
          {subtitle && <p style={{ fontSize: 12, color: '#7A6873', margin: '4px 0 0' }}>{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Pill({ label, value, palette }: { label: string; value: string; palette?: { bg: string; color: string; border: string } }) {
  const p = palette ?? { bg: '#fff0f5', color: '#e62310', border: '#FFB3CE' };
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column',
      padding: '6px 12px', background: p.bg,
      border: `1px solid ${p.border}`, borderRadius: 10,
      minWidth: 64,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: p.color, opacity: 0.7 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 900, color: p.color, marginTop: 2 }}>{value}</span>
    </div>
  );
}

function PrimaryButton({
  onClick, disabled, busy, icon, children,
}: {
  onClick: () => void; disabled?: boolean; busy?: boolean;
  icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '10px 18px',
        background: disabled || busy ? '#FFD9E5' : '#e62310',
        color: '#fff',
        border: 'none', borderRadius: 10,
        fontSize: 14, fontWeight: 800,
        cursor: disabled || busy ? 'not-allowed' : 'pointer',
        transition: 'background 0.12s',
      }}
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

function SecondaryButton({
  onClick, disabled, children,
}: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 12px',
        background: '#fff', color: '#e62310',
        border: '1.5px solid #FFB3CE', borderRadius: 8,
        fontSize: 12, fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

// ── Product list pane ─────────────────────────────────────────────────────

function ProductListPane({
  products, selectedId, onSelect, loading,
}: {
  products: ProductRow[]; selectedId: string | null;
  onSelect: (id: string) => void; loading: boolean;
}) {
  if (loading) {
    return (
      <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 8, color: '#7A6873', fontSize: 13 }}>
        <Loader2 size={16} className="animate-spin" />
        {strings.productList.loading}
      </div>
    );
  }
  if (products.length === 0) {
    return (
      <div style={{ padding: 20, fontSize: 13, color: '#7A6873' }}>
        {strings.productList.noProducts}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <p style={{ fontSize: 11, color: '#B0A0A8', padding: '6px 12px', margin: 0, fontWeight: 700 }}>
        {strings.productList.count.replace('{n}', String(products.length))}
      </p>
      {products.map((p) => {
        const active = p.id === selectedId;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: 10, border: 'none',
              borderRadius: 10,
              background: active ? '#FFF0F5' : 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {p.mainImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.mainImage}
                alt=""
                width={44}
                height={44}
                style={{
                  width: 44, height: 44, borderRadius: 8,
                  objectFit: 'cover', flexShrink: 0,
                  border: '1px solid #FFB3CE',
                }}
              />
            ) : (
              <div style={{
                width: 44, height: 44, borderRadius: 8,
                background: '#F5F0F2', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ImageIcon size={18} style={{ color: '#B0A0A8' }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 13, fontWeight: 700, color: active ? '#e62310' : '#1A1A1A',
                margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {p.name}
              </p>
              <p style={{ fontSize: 11, color: '#7A6873', margin: '2px 0 0' }}>
                {p.category ?? strings.header.noCategory} · {fmtPrice(p.supplierPrice)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Diagnosis card ────────────────────────────────────────────────────────

function DiagnosisCard({
  product, diagnosis, busy, error, onRun,
}: {
  product: ProductRow; diagnosis: DiagnosisResult | null;
  busy: boolean; error: string | null; onRun: () => void;
}) {
  const gradePalette = pickGradePalette(diagnosis?.grade);
  return (
    <Card
      title={strings.diagnosis.title}
      subtitle={strings.diagnosis.subtitle}
      accent="#e62310"
      step={1}
      totalSteps={4}
      done={diagnosis != null}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <PrimaryButton
          onClick={onRun}
          busy={busy}
          icon={<Sparkles size={16} />}
        >
          {busy ? strings.diagnosis.running : (diagnosis ? strings.diagnosis.rerunButton : strings.diagnosis.runButton)}
        </PrimaryButton>
        {!diagnosis && !busy && !error && (
          <span style={{ fontSize: 12, color: '#7A6873' }}>{strings.diagnosis.notRun}</span>
        )}
      </div>
      {error && (
        <div style={{
          padding: 10, background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 8, color: '#b91c1c', fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertTriangle size={14} /> {strings.diagnosis.error} {error}
        </div>
      )}
      {diagnosis && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Pill label={strings.diagnosis.skeleton} value={diagnosis.skeletonId} />
          <Pill label={strings.diagnosis.grade} value={diagnosis.grade} palette={gradePalette} />
          <Pill label={strings.diagnosis.confidence} value={`${diagnosis.inferenceConfidence.toFixed(0)}`} />
          <Pill label={strings.diagnosis.qualityScore} value={`${diagnosis.qualityScore.toFixed(0)}`} />
          {diagnosis.conceptTone.persona && <Pill label={strings.diagnosis.concept} value={String(diagnosis.conceptTone.persona ?? '-')} />}
          {diagnosis.conceptTone.emotionalTone && <Pill label={strings.diagnosis.tone} value={String(diagnosis.conceptTone.emotionalTone ?? '-')} />}
        </div>
      )}
    </Card>
  );
}

// ── Thumbnail card ────────────────────────────────────────────────────────

function ThumbnailCard({
  thumbnails, busy, error, onRun, mainVariant, onSelectMain,
}: {
  thumbnails: ThumbnailResult | null;
  busy: boolean; error: string | null;
  onRun: () => void;
  mainVariant: ThumbVariant;
  onSelectMain: (v: ThumbVariant) => void;
}) {
  return (
    <Card
      title={strings.thumbnail.title}
      subtitle={strings.thumbnail.subtitle}
      accent="#C9A66B"
      step={2}
      totalSteps={4}
      done={thumbnails != null}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <PrimaryButton
          onClick={onRun}
          busy={busy}
          icon={<ImageIcon size={16} />}
        >
          {busy ? strings.thumbnail.running : (thumbnails ? strings.thumbnail.regenerateButton : strings.thumbnail.generateButton)}
        </PrimaryButton>
        {!thumbnails && !busy && !error && (
          <span style={{ fontSize: 12, color: '#7A6873' }}>{strings.thumbnail.notRun}</span>
        )}
      </div>
      {error && (
        <div style={{
          padding: 10, background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 8, color: '#b91c1c', fontSize: 12, fontWeight: 600,
        }}>
          {strings.thumbnail.error} {error}
        </div>
      )}
      {thumbnails && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {THUMB_VARIANTS.map((v) => {
            const output = thumbnails.outputs.find((o) => o.variant === v);
            const b64 = output?.base64 ?? '';
            const mime = output?.mimeType ?? 'image/jpeg';
            const isMain = mainVariant === v;
            return (
              <div
                key={v}
                style={{
                  border: isMain ? '2.5px solid #e62310' : '1.5px solid #FFB3CE',
                  borderRadius: 12, overflow: 'hidden', background: '#fff',
                }}
              >
                {b64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:${mime};base64,${b64}`}
                    alt={v}
                    style={{ width: '100%', display: 'block', aspectRatio: '1', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ aspectRatio: '1', background: '#F5F0F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon size={28} style={{ color: '#B0A0A8' }} />
                  </div>
                )}
                <div style={{ padding: '8px 10px', background: isMain ? '#FFF0F5' : '#fff' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
                    {strings.thumbnail.variants[v]}
                  </p>
                  <button
                    onClick={() => onSelectMain(v)}
                    style={{
                      marginTop: 6, padding: '4px 10px',
                      background: isMain ? '#e62310' : '#fff',
                      color: isMain ? '#fff' : '#e62310',
                      border: '1.5px solid #e62310', borderRadius: 6,
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    {isMain ? strings.thumbnail.selected : strings.thumbnail.select}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Detail page card ──────────────────────────────────────────────────────

function DetailPageCard({
  detail, busy, error, onRun,
  overrideSkeletonId, onOverrideChange,
}: {
  detail: DetailResult | null;
  busy: boolean; error: string | null;
  onRun: () => void;
  overrideSkeletonId: SkeletonIdLiteral | '';
  onOverrideChange: (s: SkeletonIdLiteral | '') => void;
}) {
  return (
    <Card
      title={strings.detail.title}
      subtitle={strings.detail.subtitle}
      accent="#84A98C"
      step={3}
      totalSteps={4}
      done={detail != null}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <PrimaryButton
          onClick={onRun}
          busy={busy}
          icon={<FileImage size={16} />}
        >
          {busy ? strings.detail.running : (detail ? strings.detail.regenerateButton : strings.detail.generateButton)}
        </PrimaryButton>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7A6873' }}>
          {strings.detail.skeletonOverride}:
          <select
            value={overrideSkeletonId}
            onChange={(e) => onOverrideChange(e.target.value as SkeletonIdLiteral | '')}
            style={{
              padding: '6px 10px', border: '1.5px solid #FFB3CE',
              borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#1A1A1A',
              background: '#fff',
            }}
          >
            <option value="">{strings.detail.skeletonAuto}</option>
            {SKELETON_IDS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        {!detail && !busy && !error && (
          <span style={{ fontSize: 12, color: '#7A6873' }}>{strings.detail.notRun}</span>
        )}
      </div>
      {error && (
        <div style={{
          padding: 10, background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 8, color: '#b91c1c', fontSize: 12, fontWeight: 600,
        }}>
          {strings.detail.error} {error}
        </div>
      )}
      {detail && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <Pill label={strings.diagnosis.skeleton} value={detail.skeletonId} />
            <Pill
              label={strings.detail.matchScore.replace('{score}', '')}
              value={`${detail.matchScore.toFixed(0)}`}
            />
            <Pill label="" value={strings.detail.sectionCount.replace('{n}', String(detail.sections.length))} />
            <Pill label="" value={strings.detail.elapsedMs.replace('{ms}', String(detail.elapsedMs))} />
          </div>
          <div
            style={{
              border: '1.5px solid #FFB3CE', borderRadius: 12,
              padding: 8, background: '#FAFAFA',
              maxHeight: 520, overflow: 'auto',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${detail.detailBase64}`}
              alt="detail page preview"
              style={{ width: '100%', display: 'block' }}
            />
          </div>
        </>
      )}
    </Card>
  );
}

// ── Actions card ──────────────────────────────────────────────────────────

function ActionsCard({
  canSave, saveBusy, save, saveError, onSave,
  canPublish, publishBusy, publish, publishError, onPublish,
  hasSavedAsset, hasNaverId,
}: {
  canSave: boolean; saveBusy: boolean; save: SaveResult | null; saveError: string | null;
  onSave: () => void;
  canPublish: boolean; publishBusy: boolean; publish: PublishResult | null; publishError: string | null;
  onPublish: () => void;
  hasSavedAsset: boolean; hasNaverId: boolean;
}) {
  const showSaveHint = !canSave && !saveBusy && save == null;
  const showPublishNeedSaveHint = !hasSavedAsset && !publishBusy && publish == null;
  const showPublishNeedNaverHint = hasSavedAsset && !hasNaverId && !publishBusy && publish == null;

  return (
    <Card
      title={strings.actions.title}
      accent="#1F2937"
      step={4}
      totalSteps={4}
      done={save != null || publish != null}
    >
      {/* ── Save row ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <PrimaryButton
          onClick={onSave}
          disabled={!canSave}
          busy={saveBusy}
          icon={<Save size={16} />}
        >
          {saveBusy ? strings.actions.saving : strings.actions.saveButton}
        </PrimaryButton>
        {showSaveHint && (
          <span style={{
            fontSize: 12, color: '#a16207', fontWeight: 600,
            background: '#fefce8', border: '1px solid #fde68a',
            borderRadius: 6, padding: '6px 10px',
          }}>
            ⓘ {strings.actions.saveHint}
          </span>
        )}
      </div>

      {/* ── Publish row ───────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <PrimaryButton
          onClick={onPublish}
          disabled={!canPublish}
          busy={publishBusy}
          icon={<Send size={16} />}
        >
          {publishBusy ? strings.actions.publishing : strings.actions.publishButton}
        </PrimaryButton>
        {showPublishNeedSaveHint && (
          <span style={{
            fontSize: 12, color: '#7A6873', fontWeight: 600,
            background: '#F5F0F2', border: '1px solid #FFE0EC',
            borderRadius: 6, padding: '6px 10px',
          }}>
            ⓘ {strings.actions.publishHintNeedSave}
          </span>
        )}
        {showPublishNeedNaverHint && (
          <span style={{
            fontSize: 12, color: '#a16207', fontWeight: 600,
            background: '#fefce8', border: '1px solid #fde68a',
            borderRadius: 6, padding: '6px 10px',
          }}>
            ⚠ {strings.actions.publishHintNeedNaverId}
          </span>
        )}
      </div>

      {/* ── Save error ───────────────────────────────────────── */}
      {saveError && (
        <div style={{
          padding: 10, background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 8, color: '#b91c1c', fontSize: 12, fontWeight: 600,
          marginBottom: 8,
        }}>
          {strings.actions.saveError} {saveError}
        </div>
      )}

      {/* ── Save success ─────────────────────────────────────── */}
      {save && (
        <div style={{
          padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#15803d',
          marginBottom: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 700 }}>
            <CheckCircle2 size={14} /> {strings.actions.saved}
          </div>
          {save.thumbUrl && (
            <p style={{ margin: '4px 0', wordBreak: 'break-all' }}>
              <b>{strings.actions.savedThumb}</b>{' '}
              <a href={save.thumbUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#15803d' }}>{save.thumbUrl}</a>
            </p>
          )}
          {save.detailUrl && (
            <p style={{ margin: '4px 0', wordBreak: 'break-all' }}>
              <b>{strings.actions.savedDetail}</b>{' '}
              <a href={save.detailUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#15803d' }}>{save.detailUrl}</a>
            </p>
          )}
        </div>
      )}

      {/* ── Publish error ────────────────────────────────────── */}
      {publishError && (
        <div style={{
          padding: 10, background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 8, color: '#b91c1c', fontSize: 12, fontWeight: 600,
          marginBottom: 8,
        }}>
          {strings.actions.publishError} {publishError}
        </div>
      )}

      {/* ── Publish success ─────────────────────────────────── */}
      {publish && (
        <div style={{
          padding: 12, background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#1d4ed8',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <CheckCircle2 size={14} /> {strings.actions.publishSuccess}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 11 }}>
            naverProductId: <code style={{ background: '#dbeafe', padding: '1px 6px', borderRadius: 4 }}>{publish.naverProductId}</code>
            {' · '}patched: {publish.patched.thumbnail ? '썸네일 ✓' : ''}{publish.patched.thumbnail && publish.patched.detail ? ' / ' : ''}{publish.patched.detail ? '상세 ✓' : ''}
          </p>
        </div>
      )}
    </Card>
  );
}

// ── Main inner ────────────────────────────────────────────────────────────

function StudioInner() {
  const searchParams = useSearchParams();
  const initialProductId = searchParams.get('product');

  // Product list state
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialProductId);

  // Per-product action state (resets when selectedId changes)
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [diagBusy, setDiagBusy] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);

  const [thumbnails, setThumbnails] = useState<ThumbnailResult | null>(null);
  const [thumbBusy, setThumbBusy] = useState(false);
  const [thumbError, setThumbError] = useState<string | null>(null);
  const [mainVariant, setMainVariant] = useState<ThumbVariant>('clean');

  const [detail, setDetail] = useState<DetailResult | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [overrideSkeletonId, setOverrideSkeletonId] = useState<SkeletonIdLiteral | ''>('');

  const [save, setSave] = useState<SaveResult | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [publish, setPublish] = useState<PublishResult | null>(null);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // ── Fetch product list on mount ──────────────────────────────────────────
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products?sortBy=createdAt&sortOrder=desc', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list: ProductRow[] = (json.products ?? json ?? []).map((p: ProductRow) => ({
          id: p.id, name: p.name,
          mainImage: p.mainImage ?? null,
          category: p.category ?? null,
          brand: p.brand ?? null,
          supplierPrice: p.supplierPrice ?? null,
          aiScore: p.aiScore ?? null,
          status: p.status,
          naverProductId: p.naverProductId ?? null,
        }));
        setProducts(list);
        // Auto-select first product if URL didn't specify and list non-empty
        if (!selectedId && list.length > 0) setSelectedId(list[0].id);
      } catch (err) {
        setProductsError(err instanceof Error ? err.message : String(err));
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reset action state when product changes ──────────────────────────────
  useEffect(() => {
    setDiagnosis(null);
    setDiagError(null);
    setThumbnails(null);
    setThumbError(null);
    setDetail(null);
    setDetailError(null);
    setOverrideSkeletonId('');
    setSave(null);
    setSaveError(null);
    setPublish(null);
    setPublishError(null);
  }, [selectedId]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedId) ?? null,
    [products, selectedId],
  );

  // ── Action handlers ─────────────────────────────────────────────────────
  async function runDiagnose() {
    if (!selectedProduct) return;
    setDiagBusy(true);
    setDiagError(null);
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct.id, persist: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setDiagnosis(json as DiagnosisResult);
    } catch (err) {
      setDiagError(err instanceof Error ? err.message : String(err));
    } finally {
      setDiagBusy(false);
    }
  }

  async function runThumbnail() {
    if (!selectedProduct) return;
    setThumbBusy(true);
    setThumbError(null);
    try {
      const res = await fetch(`/api/thumbnail/${selectedProduct.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setThumbnails(json as ThumbnailResult);
    } catch (err) {
      setThumbError(err instanceof Error ? err.message : String(err));
    } finally {
      setThumbBusy(false);
    }
  }

  async function runDetail() {
    if (!selectedProduct) return;
    setDetailBusy(true);
    setDetailError(null);
    try {
      const body: Record<string, string> = {};
      if (overrideSkeletonId) body.overrideSkeletonId = overrideSkeletonId;
      const res = await fetch(`/api/products/${selectedProduct.id}/generate-detail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setDetail(json as DetailResult);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetailBusy(false);
    }
  }

  async function runSave() {
    if (!selectedProduct) return;
    setSaveBusy(true);
    setSaveError(null);
    try {
      const body: Record<string, string> = {};
      if (thumbnails) {
        const mainOutput = thumbnails.outputs.find((o) => o.variant === mainVariant);
        if (mainOutput) {
          body.thumbBase64 = mainOutput.base64;
          body.thumbVariant = mainVariant;
        }
      }
      if (detail) {
        body.detailBase64 = detail.detailBase64;
        body.skeletonId = detail.skeletonId;
      }
      const res = await fetch(`/api/products/${selectedProduct.id}/save-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setSave(json as SaveResult);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaveBusy(false);
    }
  }

  const canSave = (thumbnails != null || detail != null) && !saveBusy;

  async function runPublish() {
    if (!selectedProduct || !save) return;
    setPublishBusy(true);
    setPublishError(null);
    try {
      const body: Record<string, string> = {};
      if (save.thumbUrl) body.thumbUrl = save.thumbUrl;
      if (save.detailUrl) body.detailUrl = save.detailUrl;
      const res = await fetch(`/api/products/${selectedProduct.id}/publish-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setPublish(json as PublishResult);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : String(err));
    } finally {
      setPublishBusy(false);
    }
  }

  const hasSavedAsset = !!(save && (save.thumbUrl || save.detailUrl));
  const hasNaverId = !!selectedProduct?.naverProductId;
  const canPublish = hasSavedAsset && hasNaverId && !publishBusy;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 0px)' }}>
      {/* ── Left product list ───────────────────────────────────────────── */}
      <aside
        style={{
          width: 320, flexShrink: 0,
          background: '#fff', borderRight: '1px solid #FFE0EC',
          overflowY: 'auto', padding: '20px 12px',
        }}
      >
        <header style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>
            상품 목록
          </h2>
        </header>
        {productsError ? (
          <div style={{ padding: 14, fontSize: 12, color: '#b91c1c' }}>
            {strings.productList.error}: {productsError}
            <button
              onClick={() => { setProductsLoading(true); setProductsError(null); window.location.reload(); }}
              style={{
                marginTop: 8, padding: '6px 12px',
                background: '#e62310', color: '#fff', border: 'none', borderRadius: 6,
                cursor: 'pointer', fontSize: 11, fontWeight: 700,
              }}
            >
              {strings.productList.retry}
            </button>
          </div>
        ) : (
          <ProductListPane
            products={products}
            selectedId={selectedId}
            onSelect={setSelectedId}
            loading={productsLoading}
          />
        )}
      </aside>

      {/* ── Right detail pane ─────────────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 60px', maxWidth: 1100 }}>
        {/* Page header */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: '#fff0f5', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Palette size={22} style={{ color: '#e62310' }} strokeWidth={2.4} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>
              {strings.page.title}
            </h1>
            <p style={{ fontSize: 12, color: '#B0A0A8', margin: '3px 0 0' }}>
              {strings.page.subtitle}
            </p>
          </div>
        </header>

        {!selectedProduct ? (
          <div style={{
            padding: 40, fontSize: 14, color: '#7A6873',
            background: '#fff', borderRadius: 16, textAlign: 'center',
          }}>
            {strings.productList.selectPrompt}
          </div>
        ) : (
          <>
            {/* Selected product header */}
            <section
              className="kk-card"
              style={{ padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}
            >
              {selectedProduct.mainImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedProduct.mainImage}
                  alt=""
                  width={64}
                  height={64}
                  style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: 64, height: 64, borderRadius: 10,
                  background: '#F5F0F2', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <ImageIcon size={26} style={{ color: '#B0A0A8' }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontSize: 16, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>
                  {selectedProduct.name}
                </h2>
                <p style={{ fontSize: 12, color: '#7A6873', margin: '4px 0 0' }}>
                  {strings.header.category}: {selectedProduct.category ?? strings.header.noCategory} ·
                  {' '}{strings.header.brand}: {selectedProduct.brand ?? '-'} ·
                  {' '}{strings.header.price}: {fmtPrice(selectedProduct.supplierPrice)}
                </p>
              </div>
            </section>

            {/* Action cards */}
            <DiagnosisCard
              product={selectedProduct}
              diagnosis={diagnosis}
              busy={diagBusy}
              error={diagError}
              onRun={runDiagnose}
            />
            <ThumbnailCard
              thumbnails={thumbnails}
              busy={thumbBusy}
              error={thumbError}
              onRun={runThumbnail}
              mainVariant={mainVariant}
              onSelectMain={setMainVariant}
            />
            <DetailPageCard
              detail={detail}
              busy={detailBusy}
              error={detailError}
              onRun={runDetail}
              overrideSkeletonId={overrideSkeletonId}
              onOverrideChange={setOverrideSkeletonId}
            />
            <ActionsCard
              canSave={canSave}
              saveBusy={saveBusy}
              save={save}
              saveError={saveError}
              onSave={runSave}
              canPublish={canPublish}
              publishBusy={publishBusy}
              publish={publish}
              publishError={publishError}
              onPublish={runPublish}
              hasSavedAsset={hasSavedAsset}
              hasNaverId={hasNaverId}
            />
          </>
        )}
      </main>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────

export default function StudioPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Loader2 size={20} className="animate-spin" style={{ color: '#e62310' }} />
        <span style={{ fontSize: 14, color: '#666' }}>{strings.productList.loading}</span>
      </div>
    }>
      <StudioInner />
    </Suspense>
  );
}
