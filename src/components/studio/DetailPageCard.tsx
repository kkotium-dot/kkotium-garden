'use client';

// src/components/studio/DetailPageCard.tsx
//
// Sprint 7-M2 Phase 3-C-1 — Detail page composite (step 3) card extracted
// from src/app/studio/page.tsx. Markup byte-identical to the original.

import { FileImage } from 'lucide-react';
import strings from '@/lib/i18n/studio-strings.ko.json';
import { Card, Pill, PrimaryButton } from './StudioCardShell';
import { SKELETON_IDS, type DetailResult, type SkeletonIdLiteral } from './types';

export function DetailPageCard({
  detail, busy, error, onRun,
  overrideSkeletonId, onOverrideChange,
}: {
  detail: DetailResult | null;
  busy: boolean;
  error: string | null;
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
