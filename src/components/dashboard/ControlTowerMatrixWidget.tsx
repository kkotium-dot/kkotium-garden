'use client';
// src/components/dashboard/ControlTowerMatrixWidget.tsx
//
// 2026-06-06 — Control Tower Matrix (Phase 1). Product x track board over
// asset_jobs: image / publish / line / ops + overall. Blocked rows pin to the
// top (API-sorted), a WIP counter warns past the limit, and a "next action" chip
// surfaces missing steps (image done but publish not started). Read-only.
//
// No emoji (Lucide icons). No Korean literals (control-tower-strings.ko.json, #35).

import useSWR from 'swr';
import {
  CheckCircle2, Loader2, Clock, XCircle, MinusCircle, ArrowRight, LayoutGrid, AlertTriangle, Hand,
} from 'lucide-react';
import strings from '@/lib/i18n/control-tower-strings.ko.json';

type TrackStatus = 'done' | 'in_progress' | 'pending' | 'blocked' | 'awaiting_human' | 'none';
type Overall = 'risk' | 'attention' | 'caution' | 'ok' | 'none';

interface MatrixRow {
  productId: string;
  name: string;
  tracks: { image: TrackStatus; publish: TrackStatus; line: TrackStatus; ops: TrackStatus };
  overall: Overall;
  nextAction: string | null;
}

interface MatrixResponse {
  success: boolean;
  migrationPending?: boolean;
  rows?: MatrixRow[];
  wip?: { count: number; limit: number; over: boolean };
  counts?: { risk: number; caution: number; ok: number; none: number };
}

const m = strings.matrix;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_STYLE: Record<TrackStatus, { bg: string; border: string; text: string; icon: React.ElementType }> = {
  done:           { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D', icon: CheckCircle2 },
  in_progress:    { bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8', icon: Loader2 },
  awaiting_human: { bg: '#F5F3FF', border: '#C4B5FD', text: '#6D28D9', icon: Hand },
  pending:        { bg: '#FEFCE8', border: '#FDE68A', text: '#A16207', icon: Clock },
  blocked:        { bg: '#FFF0EF', border: '#FFD6D3', text: '#C2410C', icon: XCircle },
  none:           { bg: '#F8FAFC', border: '#E2E8F0', text: '#94A3B8', icon: MinusCircle },
};

const OVERALL_STYLE: Record<Overall, { bg: string; border: string; text: string }> = {
  risk:      { bg: '#FFF0EF', border: '#FFD6D3', text: '#C2410C' },
  attention: { bg: '#F5F3FF', border: '#C4B5FD', text: '#6D28D9' },
  caution:   { bg: '#FEFCE8', border: '#FDE68A', text: '#A16207' },
  ok:        { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D' },
  none:      { bg: '#F8FAFC', border: '#E2E8F0', text: '#94A3B8' },
};

const TRACK_KEYS = ['image', 'publish', 'line', 'ops'] as const;

function StatusPill({ status }: { status: TrackStatus }) {
  const s = STATUS_STYLE[status];
  const Icon = s.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.text }}
    >
      <Icon size={12} className={status === 'in_progress' ? 'animate-spin' : ''} />
      {m.status[status]}
    </span>
  );
}

export default function ControlTowerMatrixWidget() {
  const { data, error, isLoading, mutate } = useSWR<MatrixResponse>(
    '/api/products/asset-jobs-matrix',
    fetcher,
  );

  const header = (
    <div className="flex items-center gap-2 mb-3">
      <LayoutGrid size={18} className="text-slate-500" />
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{m.title}</h3>
        <p className="text-xs text-slate-500">{m.subtitle}</p>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {header}
        <p className="text-xs text-slate-400">{m.loading}</p>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {header}
        <p className="text-sm text-slate-600">{m.error.title}</p>
        <button onClick={() => mutate()} className="mt-2 text-xs font-medium text-blue-600 hover:underline">
          {m.error.retry}
        </button>
      </div>
    );
  }

  if (data.migrationPending) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {header}
        <p className="text-sm text-slate-600">{m.migrationPending.title}</p>
        <p className="mt-1 text-xs text-slate-400">{m.migrationPending.hint}</p>
      </div>
    );
  }

  const rows = data.rows ?? [];
  const wip = data.wip ?? { count: 0, limit: 3, over: false };

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {header}
        <p className="text-sm text-slate-600">{m.empty.title}</p>
        <p className="mt-1 text-xs text-slate-400">{m.empty.hint}</p>
      </div>
    );
  }

  const hasBlocked = rows.some((r) => r.overall === 'risk');

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between">
        {header}
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
          style={
            wip.over
              ? { backgroundColor: '#FEFCE8', border: '1px solid #FDE68A', color: '#A16207' }
              : { backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#475569' }
          }
        >
          {wip.over && <AlertTriangle size={12} />}
          {wip.over
            ? m.wip.over.replace('{count}', String(wip.count)).replace('{limit}', String(wip.limit))
            : m.wip.ok.replace('{count}', String(wip.count))}
        </span>
      </div>

      {hasBlocked && (
        <div
          className="mb-2 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
          style={{ backgroundColor: '#FFF0EF', border: '1px solid #FFD6D3', color: '#C2410C' }}
        >
          <XCircle size={12} />
          {m.blockedPinned}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400">
              <th className="py-1 pr-2 font-medium">{m.header.product}</th>
              {TRACK_KEYS.map((t) => (
                <th key={t} className="px-2 py-1 font-medium">{m.track[t]}</th>
              ))}
              <th className="px-2 py-1 font-medium">{m.header.overall}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const ov = OVERALL_STYLE[row.overall];
              return (
                <tr key={row.productId} className="border-t border-slate-100 align-middle">
                  <td className="py-1.5 pr-2">
                    <div className="font-medium text-slate-700">{row.name}</div>
                    {row.nextAction === 'publish' && (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600">
                        <ArrowRight size={11} />
                        {m.nextAction.publish}
                      </span>
                    )}
                  </td>
                  {TRACK_KEYS.map((t) => (
                    <td key={t} className="px-2 py-1.5">
                      <StatusPill status={row.tracks[t]} />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: ov.bg, border: `1px solid ${ov.border}`, color: ov.text }}
                    >
                      {m.overall[row.overall]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
