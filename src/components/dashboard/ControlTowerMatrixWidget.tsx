'use client';
// src/components/dashboard/ControlTowerMatrixWidget.tsx
//
// 2026-06-06 — Control Tower Matrix (Phase 1). Product x track board over
// asset_jobs: image / publish / line / ops + overall. Blocked rows pin to the
// top (API-sorted), a WIP counter warns past the limit, and a "next action" chip
// surfaces missing steps (image done but publish not started). Read-only.
//
// No emoji (Lucide icons). No Korean literals (control-tower-strings.ko.json, #35).

import { useState } from 'react';
import useSWR from 'swr';
import {
  CheckCircle2, Loader2, Clock, XCircle, MinusCircle, ArrowRight, LayoutGrid, AlertTriangle, Hand,
  ChevronDown,
} from 'lucide-react';
import strings from '@/lib/i18n/control-tower-strings.ko.json';


type TrackStatus = 'done' | 'in_progress' | 'pending' | 'blocked' | 'awaiting_human' | 'none';
type Overall = 'risk' | 'attention' | 'caution' | 'ok' | 'none';
type ProductMode = 'SIMPLE' | 'ENHANCE' | 'NEW';
type ProductLine = 'A' | 'B';

interface ModeInfo { recommended: ProductMode | null; score: number | null; source: 'auto' | 'operator' | null }
interface LineInfo { value: ProductLine; source: 'auto' | 'operator' }

type NextActionKey =
  | 'add_main_image' | 'fill_attributes' | 'resolve_validation'
  | 'prepare_image' | 'crop_pick' | 'build_image'
  | 'apply_curated_main' | 'build_detail' | 'resolve_suspension'
  | 'publish' | 'verify_certification' | 'verify_publish';

interface NextAction {
  key: NextActionKey;
  severity: 'blocker' | 'action' | 'review';
  href: string;
  detail?: string;
}

interface PublishInfo {
  status: TrackStatus;
  registered: boolean;
  canRegister: boolean;
  readinessGrade: string;
  readinessScore: number;
  attributeGrade: string;
  attributeScore: number;
  missingRequired: string[];
  errorCount: number;
}

type ImageTier = 'T0' | 'T1' | 'T2' | 'T3';

interface ImageInfo {
  status: TrackStatus;
  hasMain: boolean;
  hasDetail: boolean;
  tier: ImageTier | null;
}

// Apply-status indicator (#54). NO red. Images distinguish curated vs default.
type ApplyState = 'LIVE' | 'DB' | 'none';
type ImageApplyState = 'none' | 'default' | 'curated';
interface ApplyStatus {
  attributesApplied: ApplyState;
  mainImageApplied: ImageApplyState;
  detailApplied: ImageApplyState;
  publishState: ApplyState;
  publishDrift?: boolean;
  sourceStrategy?: 'A' | 'unknown';
}

// Operator action queue (#56). Red only for GO_PENDING.
type ActionCategory = 'AUTO' | 'INPUT_DECISION' | 'GO_PENDING' | 'AUTH';
interface ActionQueueItem {
  productId: string;
  productName: string;
  category: ActionCategory;
  stage: string;
  deepLink: string;
  detail?: string;
}

interface MatrixRow {
  productId: string;
  name: string;
  tracks: { image: TrackStatus; publish: TrackStatus; line: TrackStatus; ops: TrackStatus };
  publish: PublishInfo;
  image: ImageInfo;
  line: LineInfo;
  applyStatus?: ApplyStatus;
  actionQueue?: ActionQueueItem;
  mode: ModeInfo;
  overall: Overall;
  nextAction: NextAction | null;
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

const MODE_ORDER: ProductMode[] = ['SIMPLE', 'ENHANCE', 'NEW'];

const MODE_STYLE: Record<ProductMode, { bg: string; border: string; text: string }> = {
  SIMPLE:  { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D' }, // SIMPLE — green
  ENHANCE: { bg: '#FEFCE8', border: '#FDE68A', text: '#A16207' }, // ENHANCE — amber
  NEW:     { bg: '#F5F3FF', border: '#C4B5FD', text: '#6D28D9' }, // NEW — purple
};

const LINE_ORDER: ProductLine[] = ['A', 'B'];

const LINE_STYLE: Record<ProductLine, { bg: string; border: string; text: string }> = {
  A: { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D' }, // A crop/as-is — green
  B: { bg: '#F5F3FF', border: '#C4B5FD', text: '#6D28D9' }, // B build — purple
};

// nextAction severity → chip color (item 2). blocker red, action blue, review slate.
const SEVERITY_STYLE: Record<NextAction['severity'], { bg: string; border: string; text: string }> = {
  blocker: { bg: '#FFF0EF', border: '#FFD6D3', text: '#C2410C' },
  action:  { bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8' },
  review:  { bg: '#F1F5F9', border: '#E2E8F0', text: '#475569' },
};

// Readiness grade → badge color (publish track SoT).
function gradeColor(grade: string): { bg: string; border: string; text: string } {
  if (grade === 'S' || grade === 'A') return { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D' };
  if (grade === 'B') return { bg: '#FEFCE8', border: '#FDE68A', text: '#A16207' };
  return { bg: '#FFF0EF', border: '#FFD6D3', text: '#C2410C' }; // C/D
}

// Readiness badge — publish-readiness grade/score from validateForRegistration SoT.
function ReadinessBadge({ publish }: { publish: PublishInfo }) {
  const c = gradeColor(publish.readinessGrade);
  const label = m.publishDetail.gradeLabel
    .replace('{grade}', publish.readinessGrade)
    .replace('{score}', String(publish.readinessScore));
  return (
    <span
      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.text }}
    >
      {label}
    </span>
  );
}

// Image strategy tier → badge color (item 3). T0 cheapest (green) → T3 (purple).
const TIER_STYLE: Record<ImageTier, { bg: string; border: string; text: string }> = {
  T0: { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D' },
  T1: { bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8' },
  T2: { bg: '#FEFCE8', border: '#FDE68A', text: '#A16207' },
  T3: { bg: '#F5F3FF', border: '#C4B5FD', text: '#6D28D9' },
};

function TierBadge({ tier }: { tier: ImageTier }) {
  const c = TIER_STYLE[tier];
  return (
    <span
      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.text }}
      title={m.tier.label}
    >
      {tier} {m.tier[tier]}
    </span>
  );
}

// nextAction chip — 1-click link to the operator's single most-important step.
function NextActionChip({ action }: { action: NextAction }) {
  const s = SEVERITY_STYLE[action.severity];
  const base = m.nextAction[action.key];
  const label = action.detail ? `${base} (${action.detail})` : base;
  return (
    <a
      href={action.href}
      className="mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium hover:opacity-80"
      style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.text }}
      title={`${m.nextAction.prefix}: ${label}`}
    >
      <ArrowRight size={11} />
      {label}
    </a>
  );
}

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

// Adaptive 3-mode badge + 1-click change. Clicking the badge reveals the three
// modes; picking one POSTs the operator override and refreshes the matrix.
function ModeCell({ productId, mode, onChanged }: {
  productId: string;
  mode: ModeInfo;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pick(next: ProductMode) {
    setOpen(false);
    if (next === mode.recommended) return;
    setBusy(true);
    try {
      await fetch(`/api/products/${productId}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: next }),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  const recommended = mode.recommended;
  const badge = recommended
    ? MODE_STYLE[recommended]
    : { bg: '#F8FAFC', border: '#E2E8F0', text: '#94A3B8' };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold disabled:opacity-60"
        style={{ backgroundColor: badge.bg, border: `1px solid ${badge.border}`, color: badge.text }}
        title={m.mode.hint}
      >
        {busy
          ? m.mode.changing
          : recommended
            ? m.mode[recommended]
            : m.mode.unassessed}
        {recommended && mode.score != null && (
          <span className="font-normal opacity-70">
            {m.mode.scoreLabel.replace('{score}', String(mode.score))}
          </span>
        )}
        {!busy && <ChevronDown size={11} className="opacity-70" />}
      </button>
      {recommended && mode.source && (
        <div className="mt-0.5 text-[10px] text-slate-400">
          {mode.source === 'operator' ? m.mode.sourceOperator : m.mode.sourceAuto}
        </div>
      )}
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-24 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {MODE_ORDER.map((opt) => {
            const s = MODE_STYLE[opt];
            const active = opt === recommended;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => pick(opt)}
                className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs hover:bg-slate-50"
                style={{ color: s.text, fontWeight: active ? 600 : 400 }}
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.border }} />
                {m.mode[opt]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Workflow line badge (A crop / B build) + 1-click operator override. The
// operator's pick POSTs /line and wins over the auto classifier (handoff §4).
function LineCell({ productId, line, onChanged }: {
  productId: string;
  line: LineInfo;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pick(next: ProductLine) {
    setOpen(false);
    if (next === line.value) return;
    setBusy(true);
    try {
      await fetch(`/api/products/${productId}/line`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line: next }),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  const badge = LINE_STYLE[line.value];
  return (
    <div className="relative inline-block">
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold disabled:opacity-60"
        style={{ backgroundColor: badge.bg, border: `1px solid ${badge.border}`, color: badge.text }}
        title={m.line.hint}
      >
        {busy ? m.line.changing : m.line[line.value]}
        {!busy && <ChevronDown size={11} className="opacity-70" />}
      </button>
      <div className="mt-0.5 text-[10px] text-slate-400">
        {line.source === 'operator' ? m.line.sourceOperator : m.line.sourceAuto}
      </div>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-28 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {LINE_ORDER.map((opt) => {
            const s = LINE_STYLE[opt];
            const active = opt === line.value;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => pick(opt)}
                className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs hover:bg-slate-50"
                style={{ color: s.text, fontWeight: active ? 600 : 400 }}
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.border }} />
                {m.line[opt]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Apply-status indicator (#54) — green=live/curated, neutral=db, amber=default/
// drift(주의), dotted=미적용. NO red (75/15/10).
type ChipTone = 'live' | 'curated' | 'db' | 'default' | 'drift' | 'none';
const CHIP_STYLE: Record<ChipTone, { bg: string; border: string; text: string; dashed: boolean }> = {
  live:    { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D', dashed: false },
  curated: { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D', dashed: false },
  db:      { bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B', dashed: false },
  default: { bg: '#FEFCE8', border: '#FDE68A', text: '#A16207', dashed: false }, // attention, not red
  drift:   { bg: '#FEFCE8', border: '#FDE68A', text: '#A16207', dashed: false },
  none:    { bg: 'transparent', border: '#CBD5E1', text: '#94A3B8', dashed: true },
};

function ApplyStatusIndicator({ status }: { status: ApplyStatus }) {
  const a = strings.matrix.applyStatus;
  const st = a.states as Record<ChipTone, string>;
  const imageTone = (s: ImageApplyState): ChipTone => (s === 'curated' ? 'curated' : s === 'default' ? 'default' : 'none');
  const stateTone = (s: ApplyState): ChipTone => (s === 'LIVE' ? 'live' : s === 'DB' ? 'db' : 'none');
  const publishTone: ChipTone = status.publishDrift ? 'drift' : stateTone(status.publishState);
  const fields: Array<[ChipTone, string]> = [
    [stateTone(status.attributesApplied), a.attributes],
    [imageTone(status.mainImageApplied), a.mainImage],
    [imageTone(status.detailApplied), a.detail],
    [publishTone, a.publish],
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
      {fields.map(([tone, label], i) => {
        const s = CHIP_STYLE[tone];
        return (
          <span
            key={i}
            title={`${label}: ${st[tone]}`}
            style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 999,
              background: s.bg, border: `1px ${s.dashed ? 'dashed' : 'solid'} ${s.border}`,
              color: s.text, whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
        );
      })}
      {status.sourceStrategy === 'A' && (
        <span
          title={a.sourceA}
          style={{
            display: 'inline-flex', alignItems: 'center',
            fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 999,
            background: '#EFF6FF', border: '1px solid #93C5FD', color: '#1D4ED8', whiteSpace: 'nowrap',
          }}
        >
          {a.sourceALabel}
        </span>
      )}
    </div>
  );
}

// Operator action queue (#56) — single cross-product surface for "what needs
// the operator, on which product, why". Red is reserved for GO_PENDING only.
const CATEGORY_STYLE: Record<ActionCategory, { bg: string; border: string; text: string }> = {
  GO_PENDING:     { bg: '#FFF0EF', border: '#FFD6D3', text: '#C2410C' }, // red — irreversible GO only
  AUTH:           { bg: '#F5F3FF', border: '#C4B5FD', text: '#6D28D9' }, // paused / external auth
  INPUT_DECISION: { bg: '#FEFCE8', border: '#FDE68A', text: '#A16207' }, // amber — decide / input
  AUTO:           { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D' }, // green — autonomous
};
// Most urgent first (GO), then paused auth, then decisions, then autonomous.
const CATEGORY_ORDER: ActionCategory[] = ['GO_PENDING', 'AUTH', 'INPUT_DECISION', 'AUTO'];

function actionLabel(item: ActionQueueItem): string {
  const aq = m.actionQueue;
  if (item.category === 'AUTH') return aq.authImage;
  if (item.category === 'AUTO') return item.stage === 'processing' ? aq.processing : aq.monitor;
  // INPUT_DECISION / GO_PENDING reuse the nextAction one-line labels.
  const base = (m.nextAction as Record<string, string>)[item.stage] ?? item.stage;
  return item.detail ? `${base} (${item.detail})` : base;
}

function OperatorActionQueue({ items }: { items: ActionQueueItem[] }) {
  const aq = m.actionQueue;
  const sorted = [...items].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
  );
  return (
    <div className="mb-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Hand size={14} className="text-slate-500" />
        <span className="text-sm font-semibold text-slate-700">{aq.title}</span>
        <span className="text-[11px] text-slate-400">{aq.subtitle}</span>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {sorted.map((item) => {
          const s = CATEGORY_STYLE[item.category];
          return (
            <a
              key={item.productId}
              href={item.deepLink}
              className="block rounded-lg border bg-white p-2.5 no-underline hover:opacity-90"
              style={{ borderColor: s.border }}
            >
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.text }}
              >
                {aq.category[item.category]}
              </span>
              <p className="mt-1 truncate text-xs font-semibold text-slate-700" title={item.productName}>
                {item.productName}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                <ArrowRight size={11} className="shrink-0" />
                <span className="truncate">{actionLabel(item)}</span>
              </p>
            </a>
          );
        })}
      </div>
    </div>
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

      <OperatorActionQueue
        items={rows.map((r) => r.actionQueue).filter((a): a is ActionQueueItem => Boolean(a))}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400">
              <th className="py-1 pr-2 font-medium">{m.header.product}</th>
              <th className="px-2 py-1 font-medium">{m.header.mode}</th>
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
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-700">{row.name}</span>
                      <ReadinessBadge publish={row.publish} />
                      {row.image.tier && <TierBadge tier={row.image.tier} />}
                    </div>
                    {row.nextAction && (
                      <div>
                        <NextActionChip action={row.nextAction} />
                      </div>
                    )}
                    {row.applyStatus && <ApplyStatusIndicator status={row.applyStatus} />}
                  </td>
                  <td className="px-2 py-1.5">
                    <ModeCell productId={row.productId} mode={row.mode} onChanged={() => mutate()} />
                  </td>
                  {TRACK_KEYS.map((t) => (
                    <td key={t} className="px-2 py-1.5">
                      {t === 'line'
                        ? <LineCell productId={row.productId} line={row.line} onChanged={() => mutate()} />
                        : <StatusPill status={row.tracks[t]} />}
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
