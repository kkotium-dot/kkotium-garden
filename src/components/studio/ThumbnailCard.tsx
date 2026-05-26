'use client';

// src/components/studio/ThumbnailCard.tsx
//
// Sprint 7-M2 Phase 3-C-1 — Thumbnail variants (step 2) card extracted
// from src/app/studio/page.tsx. Markup byte-identical to the original.

import { Image as ImageIcon } from 'lucide-react';
import strings from '@/lib/i18n/studio-strings.ko.json';
import { Card, PrimaryButton } from './StudioCardShell';
import { THUMB_VARIANTS, type ThumbnailResult, type ThumbVariant } from './types';

export function ThumbnailCard({
  thumbnails, busy, error, onRun, mainVariant, onSelectMain,
}: {
  thumbnails: ThumbnailResult | null;
  busy: boolean;
  error: string | null;
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
