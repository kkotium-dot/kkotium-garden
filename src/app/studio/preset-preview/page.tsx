'use client';

// src/app/studio/preset-preview/page.tsx
//
// Verification surface for the concept-preset detail renderer (Phase B-1).
// Renders the 3 assigned products (myeonghwa aroma/L3, dalhangari tradition/L3,
// icetray kitchen/L1) and lets the operator toggle preset/intensity live to
// confirm re-skinning. Sample copy lives in samples.ko.json (data, not code).
//
// Internal verify tool — no Korean string literals in this file (CLAUDE.md
// §3-1); product names come from the JSON fixtures.

import { useState } from 'react';
import { DetailPresetArticle } from '@/components/detail/preset';
import type { DetailContent } from '@/components/detail/preset';
import {
  CONCEPT_PRESETS, PRESET_INTENSITIES,
  type ConceptPreset, type PresetIntensity,
} from '@/lib/design/concept-presets';
import samplesRaw from '@/components/detail/preset/samples.ko.json';

interface Sample {
  id: string;
  label: string;
  preset: ConceptPreset;
  intensity: PresetIntensity;
  content: DetailContent;
}

const SAMPLES = samplesRaw as unknown as Sample[];

const btn = (active: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  borderRadius: 8,
  border: active ? '1px solid #E62310' : '1px solid #E2E2E2',
  background: active ? '#E62310' : '#FFFFFF',
  color: active ? '#FFFFFF' : '#3A3A3A',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
});

export default function PresetPreviewPage() {
  const [selectedId, setSelectedId] = useState(SAMPLES[0].id);
  const [presetOverride, setPresetOverride] = useState<ConceptPreset | null>(null);
  const [intensityOverride, setIntensityOverride] = useState<PresetIntensity | null>(null);

  const sample = SAMPLES.find((s) => s.id === selectedId) ?? SAMPLES[0];
  const preset = presetOverride ?? sample.preset;
  const intensity = intensityOverride ?? sample.intensity;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 10, background: '#FFFFFF',
          border: '1px solid #F0C4D4', borderRadius: 12, padding: 16,
          marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <strong style={{ fontSize: 14, color: '#111' }}>Preset detail renderer — verify</strong>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#888', width: 70 }}>Product</span>
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              type="button"
              style={btn(s.id === selectedId)}
              onClick={() => { setSelectedId(s.id); setPresetOverride(null); setIntensityOverride(null); }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#888', width: 70 }}>Preset</span>
          {CONCEPT_PRESETS.map((p) => (
            <button key={p} type="button" style={btn(p === preset)} onClick={() => setPresetOverride(p)}>
              {p}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#888', width: 70 }}>Intensity</span>
          {PRESET_INTENSITIES.map((it) => (
            <button key={it} type="button" style={btn(it === intensity)} onClick={() => setIntensityOverride(it)}>
              {it}
            </button>
          ))}
          <span style={{ fontSize: 11, color: '#A8A8A8', marginLeft: 8 }}>
            assigned: {sample.preset} / {sample.intensity}
          </span>
        </div>
      </div>

      <div style={{ background: '#CFC7B6', padding: '24px 12px', borderRadius: 12 }}>
        <DetailPresetArticle preset={preset} intensity={intensity} content={sample.content} />
      </div>
    </div>
  );
}
