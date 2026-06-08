'use client';
// src/components/studio/workbench/JobLifecyclePanel.tsx
// ============================================================================
// Workbench job lifecycle panel (2026-06-08). Surfaces this product's asset_jobs
// in the right rail with operator controls: cancel/abort (중단), retry, and
// reopen (step-back a finished step). Polls GET /jobs; POSTs the control action.
//
// Red is reserved for the publish GO and the main-designate CTA only — cancel is
// neutral, recovery actions are outline. No emoji (Lucide). No Korean literals.
// ============================================================================

import useSWR from 'swr';
import { Activity, Ban, RotateCcw, Undo2, Loader2, CheckCircle2, XCircle, Clock, Hand } from 'lucide-react';
import { useState } from 'react';
import strings from '@/lib/i18n/studio-strings.ko.json';

interface Job {
  id: string;
  jobType: string;
  lane: string;
  tool: string;
  status: string;
  blockedReason: string | null;
  retryCount: number;
  maxRetries: number;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

// Status → chip color + icon. No red (semantic green/amber/violet/neutral).
const STATUS_STYLE: Record<string, { bg: string; border: string; text: string; Icon: typeof Activity }> = {
  done:              { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D', Icon: CheckCircle2 },
  in_progress:       { bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8', Icon: Loader2 },
  awaiting_human:    { bg: '#F5F3FF', border: '#C4B5FD', text: '#6D28D9', Icon: Hand },
  awaiting_approval: { bg: '#F5F3FF', border: '#C4B5FD', text: '#6D28D9', Icon: Hand },
  human_done:        { bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8', Icon: Activity },
  review:            { bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8', Icon: Activity },
  ready:             { bg: '#FEFCE8', border: '#FDE68A', text: '#A16207', Icon: Clock },
  pending:           { bg: '#FEFCE8', border: '#FDE68A', text: '#A16207', Icon: Clock },
  blocked:           { bg: '#FEF3F2', border: '#FED7AA', text: '#9A3412', Icon: XCircle },
  failed:            { bg: '#FEF3F2', border: '#FED7AA', text: '#9A3412', Icon: XCircle },
  rejected:          { bg: '#FEF3F2', border: '#FED7AA', text: '#9A3412', Icon: XCircle },
  cancelled:         { bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B', Icon: Ban },
};
const FALLBACK_STYLE = { bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B', Icon: Activity };

const CANCELLABLE = new Set([
  'pending', 'ready', 'in_progress', 'blocked', 'awaiting_approval', 'awaiting_human', 'human_done', 'review', 'rejected', 'failed',
]);
const RETRYABLE = new Set(['failed', 'rejected', 'blocked']);
const REOPENABLE = new Set(['done', 'cancelled']);

export default function JobLifecyclePanel({ productId }: { productId: string }) {
  const c = strings.workbench.jobs;
  const { data, mutate } = useSWR<{ success: boolean; jobs?: Job[] }>(
    productId ? `/api/products/${productId}/jobs` : null,
    fetcher,
    { refreshInterval: 8000 },
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const jobs = data?.jobs ?? [];
  if (jobs.length === 0) return null; // nothing to control — stay out of the way

  async function control(jobId: string, action: 'cancel' | 'retry' | 'reopen') {
    setBusyId(jobId);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) setError(j.error ?? `${res.status}`);
      await mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Activity size={14} color="var(--gp-ink-500)" strokeWidth={2.4} />
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--gp-ink-900)' }}>{c.title}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--gp-ink-500)' }}>{jobs.length}</span>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {jobs.map((job) => {
          const s = STATUS_STYLE[job.status] ?? FALLBACK_STYLE;
          const Icon = s.Icon;
          const busy = busyId === job.id;
          return (
            <li
              key={job.id}
              style={{
                border: '1px solid var(--color-border)', borderRadius: 10, padding: '8px 10px',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gp-ink-900)', wordBreak: 'keep-all' }}>
                  {job.jobType}
                </span>
                <span style={{ fontSize: 10, color: 'var(--gp-ink-500)' }}>· {job.tool}</span>
                <span
                  style={{
                    marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3,
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                    background: s.bg, border: `1px solid ${s.border}`, color: s.text, whiteSpace: 'nowrap',
                  }}
                >
                  <Icon size={10} className={job.status === 'in_progress' ? 'animate-spin' : ''} />
                  {(c.status as Record<string, string>)[job.status] ?? job.status}
                </span>
              </div>

              {job.blockedReason && (
                <p style={{ margin: 0, fontSize: 10, color: '#9A3412' }}>{job.blockedReason}</p>
              )}

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CANCELLABLE.has(job.status) && (
                  <CtrlButton busy={busy} onClick={() => control(job.id, 'cancel')} icon={<Ban size={12} />} variant="neutral">
                    {c.cancel}
                  </CtrlButton>
                )}
                {RETRYABLE.has(job.status) && (
                  <CtrlButton busy={busy} onClick={() => control(job.id, 'retry')} icon={<RotateCcw size={12} />} variant="outline">
                    {c.retry}
                  </CtrlButton>
                )}
                {REOPENABLE.has(job.status) && (
                  <CtrlButton busy={busy} onClick={() => control(job.id, 'reopen')} icon={<Undo2 size={12} />} variant="outline">
                    {c.reopen}
                  </CtrlButton>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {error && <p style={{ margin: '8px 0 0', fontSize: 11, color: '#9A3412' }}>{c.error}: {error}</p>}
    </div>
  );
}

function CtrlButton({
  busy, onClick, icon, variant, children,
}: {
  busy: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  variant: 'neutral' | 'outline';
  children: React.ReactNode;
}) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 8,
    cursor: busy ? 'not-allowed' : 'pointer',
  } as const;
  const style = variant === 'neutral'
    ? { ...base, background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#475569' }
    : { ...base, background: 'transparent', border: '1.5px solid #CBD5E1', color: '#475569' };
  return (
    <button type="button" disabled={busy} onClick={onClick} style={style}>
      {busy ? <Loader2 size={12} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
