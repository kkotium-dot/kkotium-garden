'use client';

// src/app/studio/preset-preview/page.tsx
//
// Verification surface for the concept-preset detail engine (Phase B-1 + B-3).
//   - Sample mode: renders the 3 assigned products from samples.ko.json and
//     lets the operator toggle preset/intensity live to confirm re-skinning.
//   - Live mode (B-3): loads a real product via
//     POST /api/products/[id]/generate-detail { presetOnly:true } and renders
//     the engine-assembled presetLayout.content + shows the SEO guard result.
//
// Internal verify tool — no Korean string literals in this file (CLAUDE.md
// §3-1); product copy comes from the JSON fixtures / API.

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

interface SeoCheck { id: string; status: string; detail: string }
interface SeoGuard { ok: boolean; checks: SeoCheck[] }
interface PresetLayout {
  preset: ConceptPreset;
  intensity: PresetIntensity;
  recommendedPreset: ConceptPreset;
  matchesRecommendation: boolean;
  content: DetailContent;
}
interface LiveResult { layout: PresetLayout; seoGuard: SeoGuard }

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

const STATUS_COLOR: Record<string, string> = {
  pass: '#228f18', warn: '#C8860B', fail: '#E62310', manual: '#6B6B6B',
};

export default function PresetPreviewPage() {
  const [selectedId, setSelectedId] = useState(SAMPLES[0].id);
  const [presetOverride, setPresetOverride] = useState<ConceptPreset | null>(null);
  const [intensityOverride, setIntensityOverride] = useState<PresetIntensity | null>(null);

  const [liveId, setLiveId] = useState('');
  const [live, setLive] = useState<LiveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sample = SAMPLES.find((s) => s.id === selectedId) ?? SAMPLES[0];

  const preset = live ? live.layout.preset : (presetOverride ?? sample.preset);
  const intensity = live ? live.layout.intensity : (intensityOverride ?? sample.intensity);
  const content = live ? live.layout.content : sample.content;

  async function loadLive() {
    const id = liveId.trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${id}/generate-detail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetOnly: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setLive({ layout: data.presetLayout, seoGuard: data.seoGuard });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLive(null);
    } finally {
      setLoading(false);
    }
  }

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
          <span style={{ fontSize: 12, color: '#888', width: 70 }}>Sample</span>
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              type="button"
              style={btn(!live && s.id === selectedId)}
              onClick={() => { setLive(null); setSelectedId(s.id); setPresetOverride(null); setIntensityOverride(null); }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#888', width: 70 }}>Live (B-3)</span>
          <input
            value={liveId}
            onChange={(e) => setLiveId(e.target.value)}
            placeholder="product id"
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E2E2', fontSize: 13, minWidth: 240 }}
          />
          <button type="button" style={btn(false)} onClick={loadLive} disabled={loading}>
            {loading ? 'loading…' : 'Load from product'}
          </button>
          {live ? <button type="button" style={btn(false)} onClick={() => setLive(null)}>clear</button> : null}
          {error ? <span style={{ fontSize: 12, color: '#E62310' }}>{error}</span> : null}
        </div>

        {!live ? (
          <>
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
          </>
        ) : (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', fontSize: 12 }}>
            <span style={{ color: '#3A3A3A' }}>
              preset <b>{live.layout.preset}/{live.layout.intensity}</b>
              {live.layout.matchesRecommendation
                ? ' (matches category)'
                : ` (recommended: ${live.layout.recommendedPreset})`}
            </span>
            <span style={{ color: '#888' }}>·</span>
            <span style={{ color: live.seoGuard.ok ? '#228f18' : '#E62310' }}>
              SEO guard {live.seoGuard.ok ? 'ok' : 'fail'}
            </span>
            {live.seoGuard.checks.map((c) => (
              <span key={c.id} style={{ color: STATUS_COLOR[c.status] ?? '#6B6B6B' }}>
                {c.id}:{c.status}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: '#CFC7B6', padding: '24px 12px', borderRadius: 12 }}>
        <DetailPresetArticle preset={preset} intensity={intensity} content={content} />
      </div>
    </div>
  );
}
