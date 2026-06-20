// PrePublishGatePanel — publish tab "발행 전 정책 게이트" (engine §8 hard gates).
// Four gates: thumbnail policy (hard), fidelity compare (existing intervention),
// 9-slot fill, publish readiness. Each shows pass / block / pending. The
// irreversible GO itself stays in the existing ActionsCard (개입#3) — this panel
// is the pre-flight readout that explains WHY publish is/ isn't allowed.
// Presentational; Lucide icons only; no emoji.

'use client';

import { ReactNode, useState } from 'react';
import { ShieldCheck, ShieldAlert, ScanLine, ListChecks, Send, CheckCircle2, XCircle, MinusCircle, Globe } from 'lucide-react';
import strings from '@/lib/i18n/studio-strings.ko.json';
import type { EngineGateView, EngineSlotView } from './useEngineStrategy';

const c = strings.engine.gate;

type GateState = 'pass' | 'block' | 'pending' | 'na';

function stateChip(state: GateState) {
  const map: Record<GateState, { bg: string; border: string; text: string; label: string; icon: ReactNode }> = {
    pass: { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D', label: c.pass, icon: <CheckCircle2 size={13} /> },
    block: { bg: '#FFF0EF', border: '#FFD6D3', text: '#C2410C', label: c.block, icon: <XCircle size={13} /> },
    pending: { bg: '#FEFCE8', border: '#FDE68A', text: '#A16207', label: c.pending, icon: <MinusCircle size={13} /> },
    na: { bg: 'var(--gp-pink-50)', border: 'var(--color-border)', text: 'var(--gp-ink-500)', label: c.notAssessed, icon: <MinusCircle size={13} /> },
  };
  const p = map[state];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: p.bg, border: `1px solid ${p.border}`, color: p.text, fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
      {p.icon}{p.label}
    </span>
  );
}

function GateRow({ icon, title, hint, state, detail, action }: { icon: ReactNode; title: string; hint?: string; state: GateState; detail?: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: 'var(--gp-ink-900)' }}>{icon}{title}</span>
        {stateChip(state)}
      </div>
      {hint && <span style={{ fontSize: 10, color: 'var(--gp-ink-500)' }}>{hint}</span>}
      {detail && <div style={{ fontSize: 11, color: 'var(--gp-ink-700)' }}>{detail}</div>}
      {action && <div style={{ marginTop: 2 }}>{action}</div>}
    </div>
  );
}

// C19b (#56): operator attestation control for the representative image. When the
// thumbnail is not yet assessed, the operator approves it here (POST), flipping
// the gate; once assessed, a small re-assess link clears it (DELETE). Both refetch.
function ThumbAssessControl({ productId, assessed, onAssessed }: { productId: string; assessed: boolean; onAssessed?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function call(method: 'POST' | 'DELETE') {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/products/${productId}/thumbnail-assess`, { method });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j?.error ?? `HTTP ${res.status}`);
        return;
      }
      onAssessed?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (assessed) {
    return (
      <button type="button" disabled={busy} onClick={() => call('DELETE')}
        style={{ fontSize: 10, fontWeight: 700, color: 'var(--gp-ink-500)', background: 'none', border: 'none', padding: 0, cursor: busy ? 'default' : 'pointer', textDecoration: 'underline' }}>
        {busy ? c.thumbAssessing : c.thumbAssessClear}
      </button>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <button type="button" disabled={busy} onClick={() => call('POST')}
        style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#fff', background: 'var(--gp-red-500)', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
        <CheckCircle2 size={12} />{busy ? c.thumbAssessing : c.thumbAssessCta}
      </button>
      <span style={{ fontSize: 10, color: 'var(--gp-ink-500)' }}>{c.thumbAssessHint}</span>
      {err && <span style={{ fontSize: 10, color: '#C2410C' }}>{c.thumbAssessError}: {err}</span>}
    </div>
  );
}

export interface PrePublishGatePanelProps {
  gate: EngineGateView | null;
  slots: EngineSlotView[];
  loading?: boolean;
  degraded?: boolean;
  // C19b (#56): product id + refetch enable the inline representative-image
  // assessment control. Omitted → the panel stays read-only (back-compat).
  productId?: string | null;
  onAssessed?: () => void;
}

export default function PrePublishGatePanel({ gate, slots, loading, degraded, productId, onAssessed }: PrePublishGatePanelProps) {
  if (degraded) return <Shell><p style={muted}>{strings.engine.dna.degraded}</p></Shell>;
  if (loading) return <Shell><p style={muted}>{c.loading}</p></Shell>;
  if (!gate) return <Shell><p style={muted}>{c.empty}</p></Shell>;

  // Thumbnail policy gate.
  const thumbState: GateState = !gate.thumbnailAssessed ? 'na' : gate.thumbnailPass ? 'pass' : 'block';
  const thumbDetail = gate.thumbnailViolations.length > 0
    ? <span>{c.violations}: {gate.thumbnailViolations.map((v) => v.code ?? v.reason).filter(Boolean).join(', ')}</span>
    : undefined;

  // Fidelity gate — surfaced via the existing fidelity_check intervention; here
  // we show pending (operator compares against the fidelity card pre-publish).
  const fidelityState: GateState = 'pending';

  // 9-slot fill gate — all required slots present in the plan.
  const requiredSlots = slots.filter((s) => s.required);
  const slotState: GateState = requiredSlots.length > 0 ? 'pass' : 'pending';
  const slotDetail = <span>{requiredSlots.length} {c.pass} / {slots.length}</span>;

  // Origin-truth gate (#95) — legal-risk hard gate. heal = pending(warn).
  const ot = gate.originTruth;
  const originState: GateState = !ot ? 'na' : ot.state === 'pass' ? 'pass' : ot.state === 'heal' ? 'pending' : 'block';
  const originDetail = ot && ot.state !== 'pass'
    ? <span>{ot.state === 'heal' ? c.originHeal : ot.message}{ot.code ? ` (${ot.code})` : ''}</span>
    : ot?.code ? <span>{ot.code}</span> : undefined;

  // Readiness gate.
  const readyState: GateState = gate.publishReady ? 'pass' : 'block';
  const readyDetailParts: ReactNode[] = [];
  if (gate.hardFieldsMissing.length > 0) readyDetailParts.push(<div key="h">{c.hardMissing}: {gate.hardFieldsMissing.join(', ')}</div>);
  if (gate.seoFieldsMissing.length > 0) readyDetailParts.push(<div key="s">{c.seoMissing}: {gate.seoFieldsMissing.join(', ')}</div>);
  if (gate.naverPayloadMissing.length > 0) readyDetailParts.push(<div key="n">{gate.naverPayloadMissing.join(', ')}</div>);

  return (
    <Shell>
      <header style={{ marginBottom: 4 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'var(--gp-ink-900)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Send size={15} color="var(--gp-red-500)" strokeWidth={2.4} />
          {c.title}
        </h3>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--gp-ink-500)' }}>{c.subtitle}</p>
      </header>

      <GateRow
        icon={thumbState === 'block' ? <ShieldAlert size={14} color="#C2410C" /> : <ScanLine size={14} />}
        title={c.thumbPolicy} hint={c.thumbPolicyHint} state={thumbState} detail={thumbDetail}
        action={productId ? <ThumbAssessControl productId={productId} assessed={gate.thumbnailAssessed} onAssessed={onAssessed} /> : undefined}
      />
      <GateRow
        icon={originState === 'block' ? <ShieldAlert size={14} color="#C2410C" /> : <Globe size={14} />}
        title={c.origin} hint={c.originHint} state={originState} detail={originDetail}
      />
      <GateRow icon={<ShieldCheck size={14} />} title={c.fidelity} state={fidelityState} />
      <GateRow icon={<ListChecks size={14} />} title={c.slotFill} state={slotState} detail={slotDetail} />
      <GateRow
        icon={readyState === 'pass' ? <CheckCircle2 size={14} color="#15803D" /> : <XCircle size={14} color="#C2410C" />}
        title={c.readiness} state={readyState}
        detail={readyDetailParts.length > 0 ? <>{readyDetailParts}</> : undefined}
      />
    </Shell>
  );
}

const muted: React.CSSProperties = { fontSize: 12, color: 'var(--gp-ink-500)', margin: 0, padding: '8px 0' };

function Shell({ children }: { children: ReactNode }) {
  return (
    <section style={{ padding: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)' }}>
      {children}
    </section>
  );
}
