'use client';

// src/components/studio/DiagnosisCard.tsx
//
// Sprint 7-M2 Phase 3-C-1 — Diagnosis (step 1) card extracted from
// src/app/studio/page.tsx. Markup byte-identical to the original.

import { Sparkles, AlertTriangle } from 'lucide-react';
import strings from '@/lib/i18n/studio-strings.ko.json';
import {
  formatSkeletonId,
  formatGrade,
  formatPersona,
  formatEmotionalTone,
  formatScoreOutOf100,
} from '@/lib/i18n/diagnosis-labels';
import { Card, Pill, PrimaryButton, pickGradePalette } from './StudioCardShell';
import type { DiagnosisResult } from './types';

export function DiagnosisCard({
  diagnosis, busy, error, onRun,
}: {
  diagnosis: DiagnosisResult | null;
  busy: boolean;
  error: string | null;
  onRun: () => void;
}) {
  const gradePalette = pickGradePalette(diagnosis?.grade);
  return (
    <Card
      title={strings.diagnosis.title}
      subtitle={strings.diagnosis.subtitle}
      accent="#F63B28"
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
          <Pill
            label={strings.diagnosis.skeleton}
            value={formatSkeletonId(diagnosis.skeletonId)}
            tooltip={strings.diagnosis.skeletonTip}
          />
          <Pill
            label={strings.diagnosis.grade}
            value={formatGrade(diagnosis.grade)}
            palette={gradePalette}
            tooltip={strings.diagnosis.gradeTip}
          />
          <Pill
            label={strings.diagnosis.confidence}
            value={formatScoreOutOf100(diagnosis.inferenceConfidence)}
            tooltip={strings.diagnosis.confidenceTip}
          />
          <Pill
            label={strings.diagnosis.qualityScore}
            value={formatScoreOutOf100(diagnosis.qualityScore)}
            tooltip={strings.diagnosis.qualityScoreTip}
          />
          {diagnosis.conceptTone.persona && (
            <Pill
              label={strings.diagnosis.concept}
              value={formatPersona(String(diagnosis.conceptTone.persona))}
              tooltip={strings.diagnosis.conceptTip}
            />
          )}
          {diagnosis.conceptTone.emotionalTone && (
            <Pill
              label={strings.diagnosis.tone}
              value={formatEmotionalTone(String(diagnosis.conceptTone.emotionalTone))}
              tooltip={strings.diagnosis.toneTip}
            />
          )}
        </div>
      )}
    </Card>
  );
}
