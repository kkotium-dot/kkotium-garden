// CategoryDnaCard — analyze tab "이 상품의 시장 DNA" (engine L0 + 개입#1).
// Presentational: renders the engine DNA card (season curve, buyers, title
// conventions, price band, mandatory slots, tone). Korean labels from i18n;
// Lucide icons only; no emoji.

'use client';

import { ReactNode } from 'react';
import { Activity, CalendarRange, Users, Tag, Type, ShieldCheck, Layers, Palette } from 'lucide-react';
import strings from '@/lib/i18n/studio-strings.ko.json';
import type { EngineDnaView } from './useEngineStrategy';

const c = strings.engine.dna;
const slotNames = strings.engine.funnel.slot as Record<string, string>;

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: 'var(--gp-ink-700)' }}>
        {icon}
        {label}
      </span>
      <div style={{ fontSize: 12, color: 'var(--gp-ink-700)', lineHeight: 1.5, wordBreak: 'keep-all' }}>{children}</div>
    </div>
  );
}

function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'lead' | 'warn' }) {
  const palette =
    tone === 'lead'
      ? { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' }
      : tone === 'warn'
        ? { bg: '#FFF0EF', border: '#FFD6D3', text: '#C2410C' }
        : { bg: 'var(--gp-pink-50)', border: 'var(--color-border)', text: 'var(--gp-ink-700)' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', margin: '0 4px 4px 0', borderRadius: 999,
      background: palette.bg, border: `1px solid ${palette.border}`, color: palette.text,
      fontSize: 11, fontWeight: 700, wordBreak: 'keep-all',
    }}>
      {children}
    </span>
  );
}

export interface CategoryDnaCardProps {
  dna: EngineDnaView | null;
  source?: 'db' | 'seed' | 'none';
  loading?: boolean;
  degraded?: boolean;
}

export default function CategoryDnaCard({ dna, source, loading, degraded }: CategoryDnaCardProps) {
  if (degraded) return <Shell><p style={muted}>{c.degraded}</p></Shell>;
  if (loading) return <Shell><p style={muted}>{c.loading}</p></Shell>;
  if (!dna) return <Shell><p style={muted}>{c.empty}</p></Shell>;

  const srcLabel = source === 'db' ? c.source_db : source === 'seed' ? c.source_seed : c.source_none;
  const srcTone: 'lead' | 'neutral' | 'warn' = source === 'db' ? 'lead' : source === 'seed' ? 'neutral' : 'warn';
  const peak = (dna.seasonality.peakMonths ?? []).join('·');

  return (
    <Shell>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'var(--gp-ink-900)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Activity size={15} color="var(--gp-red-500)" strokeWidth={2.4} />
            {c.title}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--gp-ink-500)' }}>{c.subtitle}</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <Chip tone={srcTone}>{srcLabel}</Chip>
          <div style={{ fontSize: 10, color: 'var(--gp-ink-500)' }}>
            {c.version} {dna.version} · {c.confidence} {Math.round(dna.confidence * 100)}%
          </div>
        </div>
      </header>

      <div style={{ fontSize: 11, color: 'var(--gp-ink-500)', marginBottom: 6, wordBreak: 'keep-all' }}>
        {dna.categoryName} <span style={{ opacity: 0.6 }}>({dna.categoryCode})</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Row icon={<CalendarRange size={13} />} label={c.season}>
          {peak && <Chip tone="lead">{c.seasonPeak} {peak}{c.monthSuffix}</Chip>}
          {dna.seasonality.troughMonth && <Chip>{c.seasonTrough} {dna.seasonality.troughMonth}{c.monthSuffix}</Chip>}
          {dna.seasonality.recoveryMonth && <Chip tone="warn">{c.seasonPrep} {dna.seasonality.recoveryMonth}{c.monthSuffix}</Chip>}
          {dna.seasonality.implication && <div style={{ marginTop: 2 }}>{dna.seasonality.implication}</div>}
        </Row>

        <Row icon={<Users size={13} />} label={c.buyers}>
          {(dna.demographics.ageCore ?? []).map((a) => (
            <Chip key={a} tone={a === dna.demographics.ageLead ? 'lead' : 'neutral'}>
              {a}{c.ageSuffix}{a === dna.demographics.ageLead ? ` (${c.lead})` : ''}
            </Chip>
          ))}
        </Row>

        {(dna.priceTiers.midPremium || dna.priceTiers.budget) && (
          <Row icon={<Tag size={13} />} label={c.priceBand}>
            {dna.priceTiers.budget && <div>· {dna.priceTiers.budget}</div>}
            {dna.priceTiers.midPremium && <div>· {dna.priceTiers.midPremium}</div>}
          </Row>
        )}

        {(dna.titleConventions.highFreqTokens ?? []).length > 0 && (
          <Row icon={<Type size={13} />} label={c.titleTokens}>
            {(dna.titleConventions.highFreqTokens ?? []).map((t) => <Chip key={t}>{t}</Chip>)}
          </Row>
        )}

        {dna.trustSignals.length > 0 && (
          <Row icon={<ShieldCheck size={13} />} label={c.trust}>
            {dna.trustSignals.map((t) => <Chip key={t}>{t}</Chip>)}
          </Row>
        )}

        {dna.mandatorySlots.length > 0 && (
          <Row icon={<Layers size={13} />} label={c.mandatory}>
            {dna.mandatorySlots.map((s) => <Chip key={s} tone="lead">{slotNames[s] ?? s}</Chip>)}
          </Row>
        )}

        {(dna.toneManner.palette || dna.toneManner.mood) && (
          <Row icon={<Palette size={13} />} label={c.tone}>
            {dna.toneManner.palette && <div>· {dna.toneManner.palette}</div>}
            {dna.toneManner.mood && <div>· {dna.toneManner.mood}</div>}
          </Row>
        )}

        {dna.thumbnailConventions.rule && (
          <Row icon={<ShieldCheck size={13} />} label={c.thumbRule}>
            <div style={{ fontSize: 11, color: 'var(--gp-ink-500)' }}>{dna.thumbnailConventions.rule}</div>
          </Row>
        )}
      </div>
    </Shell>
  );
}

const muted: React.CSSProperties = { fontSize: 12, color: 'var(--gp-ink-500)', margin: 0, padding: '8px 0' };

function Shell({ children }: { children: ReactNode }) {
  return (
    <section style={{
      padding: 12, background: 'var(--color-surface)',
      border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)',
    }}>
      {children}
    </section>
  );
}
