// SlotFunnelBoard — image tab "9슬롯 퍼널 보드" (engine L1~L4 view).
// A horizontal funnel: progress bar + a chip strip of the 9 slots; clicking a
// chip expands its slot card (assembled strategy / model route / aspect /
// grounding / linked sections / prompt preview). The 9 slots are a VIEW over the
// existing skeleton/section system — not a re-implementation (#62).
// Presentational; Lucide icons only; no emoji.

'use client';

import { useState } from 'react';
import { Image as ImageIcon, Cpu, Crop, Anchor, Layers, FileText, Monitor, Settings, Copy, Check } from 'lucide-react';
import strings from '@/lib/i18n/studio-strings.ko.json';
import type { EngineSlotView } from './useEngineStrategy';

const c = strings.engine.funnel;
const slotNames = c.slot as Record<string, string>;

export interface SlotFunnelBoardProps {
  slots: EngineSlotView[];
  loading?: boolean;
  degraded?: boolean;
}

export default function SlotFunnelBoard({ slots, loading, degraded }: SlotFunnelBoardProps) {
  const [openSlot, setOpenSlot] = useState<string | null>(null);

  if (degraded) return <Shell><p style={muted}>{strings.engine.dna.degraded}</p></Shell>;
  if (loading) return <Shell><p style={muted}>{c.loading}</p></Shell>;
  if (!slots || slots.length === 0) return <Shell><p style={muted}>{c.empty}</p></Shell>;

  const requiredCount = slots.filter((s) => s.required).length;
  const planned = slots.length;
  const pct = planned > 0 ? Math.round((requiredCount / planned) * 100) : 0;
  const active = openSlot ?? slots[0].slotType;
  const activeSlot = slots.find((s) => s.slotType === active) ?? slots[0];

  return (
    <Shell>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'var(--gp-ink-900)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ImageIcon size={15} color="var(--gp-red-500)" strokeWidth={2.4} />
          {c.title}
        </h3>
        <span style={{ fontSize: 11, color: 'var(--gp-ink-500)' }}>{c.progress} {pct}%</span>
      </header>

      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 999, background: 'var(--gp-pink-50)', overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gp-red-500)', transition: 'width 0.2s' }} />
      </div>

      {/* Chip strip */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 10 }}>
        {slots.map((s, i) => {
          const on = s.slotType === active;
          return (
            <button
              key={s.slotType}
              type="button"
              onClick={() => setOpenSlot(s.slotType)}
              title={s.slotType}
              style={{
                flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
                background: on ? 'var(--gp-red-500)' : 'var(--color-surface)',
                color: on ? '#fff' : 'var(--gp-ink-700)',
                border: `1px solid ${on ? 'var(--gp-red-500)' : 'var(--color-border)'}`,
                fontSize: 10, fontWeight: 700, wordBreak: 'keep-all', minWidth: 60,
              }}
            >
              <span style={{ fontSize: 9, opacity: 0.7 }}>{i + 1}</span>
              <span>{slotNames[s.slotType] ?? s.slotType}</span>
              <span style={{
                fontSize: 8, padding: '0 4px', borderRadius: 999,
                background: on ? 'rgba(255,255,255,0.25)' : (s.required ? '#FEF3C7' : 'var(--gp-pink-50)'),
                color: on ? '#fff' : (s.required ? '#92400E' : 'var(--gp-ink-500)'),
              }}>
                {s.required ? c.required : c.optional}
              </span>
            </button>
          );
        })}
      </div>

      {/* Expanded slot card */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 12, background: 'var(--gp-pink-50)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <strong style={{ fontSize: 13, color: 'var(--gp-ink-900)' }}>{slotNames[activeSlot.slotType] ?? activeSlot.slotType}</strong>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
            background: activeSlot.required ? '#FEF3C7' : 'var(--color-surface)',
            color: activeSlot.required ? '#92400E' : 'var(--gp-ink-500)',
            border: '1px solid var(--color-border)',
          }}>
            {activeSlot.required ? c.required : c.optional}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <Meta icon={<Cpu size={12} />} label={c.model} value={activeSlot.modelRoute} />
          <Meta icon={<Crop size={12} />} label={c.aspect} value={activeSlot.aspect} />
          <Meta icon={<Anchor size={12} />} label={c.grounding} value={activeSlot.grounding ? c.groundingOn : c.groundingOff} />
          <Meta icon={<ImageIcon size={12} />} label={c.lane} value={activeSlot.realismLane === 'photoreal' ? c.lanePhoto : c.laneArt} />
          {activeSlot.resolution && <Meta icon={<Monitor size={12} />} label={c.resolution} value={activeSlot.resolution} />}
        </div>

        {activeSlot.textPolicy === 'text_free' && (
          <div style={{ fontSize: 10, fontWeight: 700, color: '#C2410C', marginBottom: 8 }}>{c.textFree}</div>
        )}

        {activeSlot.sectionIds.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, color: 'var(--gp-ink-700)' }}>
              <Layers size={11} /> {c.sections}
            </span>
            <div style={{ marginTop: 3 }}>
              {activeSlot.sectionIds.map((s) => (
                <span key={s} style={{ display: 'inline-block', padding: '1px 6px', margin: '0 4px 4px 0', borderRadius: 6, background: 'var(--color-surface)', border: '1px solid var(--color-border)', fontSize: 10, color: 'var(--gp-ink-500)' }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, color: 'var(--gp-ink-700)' }}>
              <FileText size={11} /> {c.prompt}
            </span>
            <PromptCopyButton text={activeSlot.resolvedPrompt ?? activeSlot.promptPreview} />
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 11, lineHeight: 1.5, color: 'var(--gp-ink-700)', fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'pre-wrap' }}>
            {activeSlot.resolvedPrompt ?? activeSlot.promptPreview}
          </p>
        </div>

        <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: 'var(--gp-pink-50)', border: '1px solid var(--color-border)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, color: 'var(--gp-ink-700)' }}>
            <Settings size={11} /> {c.settingsCard}
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            <SettingChip label={c.model} value={activeSlot.modelRoute} />
            <SettingChip label={c.grounding} value={activeSlot.grounding ? c.groundingOn : c.groundingOff} />
            <SettingChip label={c.aspect} value={activeSlot.aspect} />
            {activeSlot.resolution && <SettingChip label={c.resolution} value={activeSlot.resolution} />}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 9, color: 'var(--gp-ink-500)' }}>{c.settingsHint}</p>
        </div>

        {activeSlot.variants && activeSlot.variants.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, color: 'var(--gp-ink-700)' }}>
              <Layers size={11} /> {c.variants} ({activeSlot.variants.length})
            </span>
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activeSlot.variants.map((v) => (
                <div key={v.optionValue} style={{ padding: 6, borderRadius: 6, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <strong style={{ fontSize: 11, color: 'var(--gp-ink-900)' }}>{v.optionValue}</strong>
                    <PromptCopyButton text={v.resolvedPrompt} />
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: 10, lineHeight: 1.45, color: 'var(--gp-ink-500)', fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'pre-wrap' }}>
                    {v.resolvedPrompt}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

// E3 (#62) — one-click copy of the full resolved prompt (the natural #56
// intervention: operator copies the engine prompt rather than hand-writing).
function PromptCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked — no-op */ }
  };
  return (
    <button type="button" onClick={copy}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 6, border: '1px solid var(--color-border)', background: copied ? '#F0FDF4' : 'var(--color-surface)', color: copied ? '#15803D' : 'var(--gp-ink-700)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}{copied ? c.copied : c.copyPrompt}
    </button>
  );
}

function SettingChip({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 6, background: 'var(--color-surface)', border: '1px solid var(--color-border)', fontSize: 10, color: 'var(--gp-ink-700)' }}>
      <span style={{ color: 'var(--gp-ink-500)' }}>{label}</span><strong>{value}</strong>
    </span>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, color: 'var(--gp-ink-500)' }}>{icon}{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gp-ink-900)' }}>{value}</span>
    </div>
  );
}

const muted: React.CSSProperties = { fontSize: 12, color: 'var(--gp-ink-500)', margin: 0, padding: '8px 0' };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section style={{ padding: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)' }}>
      {children}
    </section>
  );
}
