'use client';

// src/components/studio/ThumbnailCard.tsx
//
// Sprint 7-M2 Phase 3-C-1 — Thumbnail variants (step 2) card extracted
// from src/app/studio/page.tsx. Markup byte-identical to the original.

import { useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import strings from '@/lib/i18n/studio-strings.ko.json';
import { Card, PrimaryButton } from './StudioCardShell';
import { THUMB_VARIANTS, type ThumbnailResult, type ThumbVariant } from './types';
import { AssetDropZone, FireflyPromptBuilder, AiQueueStepper } from './workbench';

// Phase 2-B-2: the raw URL text inputs for cutout / backdrop overrides are
// now wrapped inside <AssetDropZone>, which adds a 5-state drag-and-drop
// experience that uploads to /api/upload (Supabase Storage). The text input
// fallback is still part of the drop zone, so legacy "paste a URL" flows
// keep working. Card logic / props surface unchanged.
//
// Phase 2-B-3: AiQueueStepper(4단계) + FireflyPromptBuilder(6요소 합성
// 프롬프트 + 복사 + 외부 링크 + 모델 안내)를 디자이너 소스 패널에 추가.
// promptCopied는 ThumbnailCard 로컬 상태, 상품 전환 시 useEffect로 리셋.
// 런타임 외부 이미지 생성 0(#38) — 프롬프트만, 생성은 셀러가 Firefly 웹에서.

function sourceLabel(source?: string): string {
  if (source === 'manual') return strings.thumbnail.source.manual;
  if (source === 'auto-cache') return strings.thumbnail.source['auto-cache'];
  return strings.thumbnail.source.fallback;
}

export function ThumbnailCard({
  thumbnails, busy, error, onRun, mainVariant, onSelectMain,
  manualCutoutUrl = '', onManualCutoutChange,
  manualBackdropUrl = '', onManualBackdropChange,
  productName, category,
}: {
  thumbnails: ThumbnailResult | null;
  busy: boolean;
  error: string | null;
  onRun: () => void;
  mainVariant: ThumbVariant;
  onSelectMain: (v: ThumbVariant) => void;
  manualCutoutUrl?: string;
  onManualCutoutChange?: (s: string) => void;
  manualBackdropUrl?: string;
  onManualBackdropChange?: (s: string) => void;
  /** Phase 2-B-3 — feeds the Firefly prompt builder. Optional so PLANT
   *  (7th-tab path) keeps compiling without passing these. */
  productName?: string;
  category?: string | null;
}) {
  // Phase 2-B-3: stepper derived state. promptCopied is local — resets
  // when the seller switches product (productName prop change).
  const [promptCopied, setPromptCopied] = useState(false);
  useEffect(() => {
    setPromptCopied(false);
  }, [productName]);
  const hasUploadedAsset = Boolean(manualCutoutUrl) || Boolean(manualBackdropUrl);
  const hasThumbnails = thumbnails != null && thumbnails.outputs.length > 0;
  return (
    <Card
      title={strings.thumbnail.title}
      subtitle={strings.thumbnail.subtitle}
      accent="#C9A66B"
      step={2}
      totalSteps={4}
      done={thumbnails != null}
    >
      {/* G8-ENGINE B-layer designer source overrides — Phase 2-B-2/3 layout:
          stepper (4단계) + Firefly prompt builder (6요소) + drop zones with
          5-state DnD. All composable; no runtime external image generation. */}
      {(onManualCutoutChange || onManualBackdropChange) && (
        <div style={{
          marginBottom: 12, padding: 12, background: '#FFF7FB',
          border: '1px solid #FFE0EC', borderRadius: 10,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
            {strings.thumbnail.manualTitle}
          </p>

          {/* Phase 2-B-3 — 4-stage stepper for the HITL Firefly workflow */}
          <AiQueueStepper
            promptReady={true}
            promptCopied={promptCopied}
            hasUploadedAsset={hasUploadedAsset}
            hasThumbnails={hasThumbnails}
          />

          {/* Phase 2-B-3 — Firefly composite prompt builder (6 elements +
              copy + Firefly link + model guidance). */}
          <FireflyPromptBuilder
            productName={productName}
            category={category ?? undefined}
            onPromptCopied={() => setPromptCopied(true)}
          />

          {/* Phase 2-B-2 — designer source drop zones (5-state DnD + URL fallback) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {onManualCutoutChange && (
              <AssetDropZone
                label={strings.thumbnail.manualCutoutLabel}
                value={manualCutoutUrl}
                onChange={onManualCutoutChange}
                accept="image/png,image/webp"
                hint={strings.workbench.dropzone.hintCutout}
              />
            )}
            {onManualBackdropChange && (
              <AssetDropZone
                label={strings.thumbnail.manualBackdropLabel}
                value={manualBackdropUrl}
                onChange={onManualBackdropChange}
                accept="image/png,image/jpeg,image/webp"
                hint={strings.workbench.dropzone.hintBackdrop}
              />
            )}
          </div>
          <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>
            {strings.thumbnail.manualHint}
          </p>
        </div>
      )}
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
        {thumbnails?.assetSource && (
          <span style={{ fontSize: 11, color: '#7A6873' }}>
            {strings.thumbnail.sourceLabel}: {sourceLabel(thumbnails.assetSource.cutout)}
            {' · '}{sourceLabel(thumbnails.assetSource.backdrop)}
          </span>
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
      {thumbnails?.lowResolution && (
        <div style={{
          padding: 10, marginBottom: 12, background: '#FFFBEB',
          border: '1px solid #FDE68A', borderRadius: 8,
          color: '#92400E', fontSize: 12, fontWeight: 600,
        }}>
          {strings.thumbnail.lowResWarning}
          {' '}({thumbnails.lowResolution.width}×{thumbnails.lowResolution.height})
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
