// src/components/studio/DiagnosisCard.tsx
//
// Sprint 7-M2 Phase 3-C-1 — Diagnosis (step 1) card extracted from
// src/app/studio/page.tsx. Markup byte-identical to the original.

import { Sparkles, AlertTriangle } from 'lucide-react';
import strings from '@/lib/i18n/studio-strings.ko.json';
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
