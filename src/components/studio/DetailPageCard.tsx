'use client';

// src/components/studio/DetailPageCard.tsx
//
// Sprint 7-M2 Phase 3-C-1 — Detail page composite (step 3) card.
// STEP 4 (detail-builder-hybrid): adds a mood-backdrop URL input and an
// image(PNG)/HTML output toggle for the hybrid output paths.

import { useState } from 'react';
import { FileImage, Code2 } from 'lucide-react';
import strings from '@/lib/i18n/studio-strings.ko.json';
import { formatSkeletonId } from '@/lib/i18n/diagnosis-labels';
import { Card, Pill, PrimaryButton } from './StudioCardShell';
import { SKELETON_IDS, type DetailResult, type SkeletonIdLiteral } from './types';

export function DetailPageCard({
  detail, busy, error, onRun,
  overrideSkeletonId, onOverrideChange,
  lifestyleAssetUrl, onLifestyleChange,
}: {
  detail: DetailResult | null;
  busy: boolean;
  error: string | null;
  onRun: () => void;
  overrideSkeletonId: SkeletonIdLiteral | '';
  onOverrideChange: (s: SkeletonIdLiteral | '') => void;
  /** Optional — the mood backdrop input renders only when a handler is given. */
  lifestyleAssetUrl?: string;
  onLifestyleChange?: (s: string) => void;
}) {
  const [viewMode, setViewMode] = useState<'image' | 'html'>('image');
  const hasHtml = Boolean(detail?.detailHtml);
  const showHtml = viewMode === 'html' && hasHtml;

  const toggleButtonStyle = (active: boolean) => ({
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
    border: active ? '1.5px solid #84A98C' : '1.5px solid #E5E0E2',
    background: active ? '#EAF1EC' : '#fff',
    color: active ? '#3F5A47' : '#7A6873',
    cursor: 'pointer',
  });

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
      {onLifestyleChange && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7A6873', marginBottom: 12 }}>
          {strings.detail.moodBackdropLabel}:
          <input
            type="text"
            value={lifestyleAssetUrl ?? ''}
            onChange={(e) => onLifestyleChange(e.target.value)}
            placeholder={strings.detail.moodBackdropPlaceholder}
            style={{
              flex: 1, minWidth: 200, padding: '6px 10px', border: '1.5px solid #FFB3CE',
              borderRadius: 8, fontSize: 12, color: '#1A1A1A', background: '#fff',
            }}
          />
        </label>
      )}
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <Pill
              label={strings.diagnosis.skeleton}
              value={formatSkeletonId(detail.skeletonId)}
              tooltip={strings.diagnosis.skeletonTip}
            />
            <Pill
              label={strings.detail.matchScore.replace('{score}', '')}
              value={`${detail.matchScore.toFixed(0)}`}
            />
            <Pill label="" value={strings.detail.sectionCount.replace('{n}', String(detail.sections.length))} />
            <Pill label="" value={strings.detail.elapsedMs.replace('{ms}', String(detail.elapsedMs))} />
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              <button type="button" onClick={() => setViewMode('image')} style={toggleButtonStyle(viewMode === 'image')}>
                <FileImage size={13} /> {strings.detail.outputImage}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('html')}
                disabled={!hasHtml}
                title={hasHtml ? undefined : strings.detail.htmlUnavailable}
                style={{ ...toggleButtonStyle(viewMode === 'html'), opacity: hasHtml ? 1 : 0.5, cursor: hasHtml ? 'pointer' : 'not-allowed' }}
              >
                <Code2 size={13} /> {strings.detail.outputHtml}
              </button>
            </div>
          </div>
          <div
            style={{
              border: '1.5px solid #FFB3CE', borderRadius: 12,
              padding: showHtml ? 0 : 8, background: '#FAFAFA',
              maxHeight: 640, overflow: 'auto',
            }}
          >
            {showHtml ? (
              // Preview of our own serializer output (copy is HTML-escaped in
              // the serializer); rendered for the operator to inspect the HTML
              // mode before choosing it for SmartEditor upload.
              <div dangerouslySetInnerHTML={{ __html: detail.detailHtml as string }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${detail.detailBase64}`}
                alt="detail page preview"
                style={{ width: '100%', display: 'block' }}
              />
            )}
          </div>
        </>
      )}
    </Card>
  );
}
