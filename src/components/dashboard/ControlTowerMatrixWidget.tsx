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
  ChevronDown, Copy, Check, Wrench,
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
  sourceStrategy?: 'A' | 'A_EXTRACT' | 'MIXED' | 'B' | 'unknown';
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
  // C-9 precise intervention (asset_jobs.intervention_type/payload).
  interventionType?: string;
  payload?: unknown;
}

// C-9 payload shapes (pass-through from src/lib/jobs/intervention.ts).
interface FireflyDropPayload {
  dropkitPath?: string;
  promptTrack1?: string;
  promptTrack2?: string;
  model?: string;
  ratio?: string;
  generateModeConfirmed?: boolean; // firefly_auto generate-mode gate (#77)
  // firefly_auto generation-settings sub-check (#77, SCENT_MOOD §2-3).
  settingsVerified?: { ratio?: boolean; resolution?: boolean; grounding?: boolean; reference?: boolean };
  // firefly_auto mood-camera guards (#84/#86, MOOD_CAMERA_SPEC_SYSTEM §4).
  moodGuards?: {
    cameraVarietyApplied?: boolean;
    referenceCleared?: boolean;
    settingsVerified?: boolean;
    exclusionsPresent?: boolean;
    benchmarkDnaSet?: boolean;
  };
}
interface HeroCropPayload {
  minEdge?: number;
  longestEdge?: number;
  textDetected?: boolean;
}
interface SourceRequestPayload {
  supplierUrl?: string | null;
}
interface FidelityCheckPayload {
  mountType?: string | null;
  mountMechanic?: string | null;
  components?: string[];
  forbidden?: string[];
  staticChecks?: string[];
  sourceRef?: string | null;
}
interface MountCheckPayload {
  mountType?: string | null;
  mountMechanic?: string | null;
  mountChecks?: string[];
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
  // #62 — additional intervention cards (never mask one with another, #56).
  extraQueue?: ActionQueueItem[];
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

// Phase 2c step3 (#227 §3): control-tower STATUS/OVERALL → master hues.
// bg=-bg · text=-tx · border=-fg (#226; the pill's Icon inherits currentColor
// = text = -tx). States stay distinct.
const STATUS_STYLE: Record<TrackStatus, { bg: string; border: string; text: string; icon: React.ElementType }> = {
  done:           { bg: 'var(--m-mint-bg)',   border: 'var(--m-mint-fg)',   text: 'var(--m-mint-tx)',   icon: CheckCircle2 }, // mint
  in_progress:    { bg: 'var(--m-sky-bg)',    border: 'var(--m-sky-fg)',    text: 'var(--m-sky-tx)',    icon: Loader2 },      // sky
  awaiting_human: { bg: 'var(--m-violet-bg)', border: 'var(--m-violet-fg)', text: 'var(--m-violet-tx)', icon: Hand },        // violet
  pending:        { bg: 'var(--m-amber-bg)',  border: 'var(--m-amber-fg)',  text: 'var(--m-amber-tx)',  icon: Clock },       // amber
  blocked:        { bg: 'var(--m-coral-bg)',  border: 'var(--m-coral-fg)',  text: 'var(--m-coral-tx)',  icon: XCircle },     // coral
  none:           { bg: 'var(--m-gray-bg)',   border: 'var(--m-gray-fg)',   text: 'var(--m-gray-tx)',   icon: MinusCircle }, // gray
};

const OVERALL_STYLE: Record<Overall, { bg: string; border: string; text: string }> = {
  risk:      { bg: 'var(--m-coral-bg)',  border: 'var(--m-coral-fg)',  text: 'var(--m-coral-tx)' },  // coral
  attention: { bg: 'var(--m-orange-bg)', border: 'var(--m-orange-fg)', text: 'var(--m-orange-tx)' }, // orange
  caution:   { bg: 'var(--m-amber-bg)',  border: 'var(--m-amber-fg)',  text: 'var(--m-amber-tx)' },  // amber
  ok:        { bg: 'var(--m-mint-bg)',   border: 'var(--m-mint-fg)',   text: 'var(--m-mint-tx)' },   // mint
  none:      { bg: 'var(--m-gray-bg)',   border: 'var(--m-gray-fg)',   text: 'var(--m-gray-tx)' },   // gray
};

const TRACK_KEYS = ['image', 'publish', 'line', 'ops'] as const;

const MODE_ORDER: ProductMode[] = ['SIMPLE', 'ENHANCE', 'NEW'];

const MODE_STYLE: Record<ProductMode, { bg: string; border: string; text: string }> = {
  SIMPLE:  { bg: 'var(--m-amber-bg)',  border: 'var(--m-amber-fg)',  text: 'var(--m-amber-tx)' },  // §3 MODE amber
  ENHANCE: { bg: 'var(--m-sky-bg)',    border: 'var(--m-sky-fg)',    text: 'var(--m-sky-tx)' },    // sky
  NEW:     { bg: 'var(--m-violet-bg)', border: 'var(--m-violet-fg)', text: 'var(--m-violet-tx)' }, // violet
};

const LINE_ORDER: ProductLine[] = ['A', 'B'];

const LINE_STYLE: Record<ProductLine, { bg: string; border: string; text: string }> = {
  A: { bg: 'var(--m-sky-bg)',  border: 'var(--m-sky-fg)',  text: 'var(--m-sky-tx)' },   // §3 LINE sky
  B: { bg: 'var(--m-gray-bg)', border: 'var(--m-gray-fg)', text: 'var(--m-gray-tx)' },  // gray
};

// nextAction severity → chip color (item 2). blocker red, action blue, review slate.
const SEVERITY_STYLE: Record<NextAction['severity'], { bg: string; border: string; text: string }> = {
  blocker: { bg: 'var(--m-coral-bg)', border: 'var(--m-coral-fg)', text: 'var(--m-coral-tx)' }, // coral
  action:  { bg: 'var(--m-sky-bg)',   border: 'var(--m-sky-fg)',   text: 'var(--m-sky-tx)' },   // sky
  review:  { bg: 'var(--m-gray-bg)',  border: 'var(--m-gray-fg)',  text: 'var(--m-gray-tx)' },  // gray
};

// Readiness grade → badge color (publish track SoT).
function gradeColor(grade: string): { bg: string; border: string; text: string } {
  if (grade === 'S' || grade === 'A') return { bg: 'var(--m-mint-bg)',  border: 'var(--m-mint-fg)',  text: 'var(--m-mint-tx)' };
  if (grade === 'B') return { bg: 'var(--m-amber-bg)', border: 'var(--m-amber-fg)', text: 'var(--m-amber-tx)' };
  return { bg: 'var(--m-coral-bg)', border: 'var(--m-coral-fg)', text: 'var(--m-coral-tx)' }; // C/D
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
  T0: { bg: 'var(--m-grape-bg)',  border: 'var(--m-grape-fg)',  text: 'var(--m-grape-tx)' },  // §3 TIER grape/violet/sky/gray
  T1: { bg: 'var(--m-violet-bg)', border: 'var(--m-violet-fg)', text: 'var(--m-violet-tx)' },
  T2: { bg: 'var(--m-sky-bg)',    border: 'var(--m-sky-fg)',    text: 'var(--m-sky-tx)' },
  T3: { bg: 'var(--m-gray-bg)',   border: 'var(--m-gray-fg)',   text: 'var(--m-gray-tx)' },
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
  live:    { bg: 'var(--m-mint-bg)',  border: 'var(--m-mint-fg)',  text: 'var(--m-mint-tx)',  dashed: false }, // mint
  curated: { bg: 'var(--m-mint-bg)',  border: 'var(--m-mint-fg)',  text: 'var(--m-mint-tx)',  dashed: false },
  db:      { bg: 'var(--m-gray-bg)',  border: 'var(--m-gray-fg)',  text: 'var(--m-gray-tx)',  dashed: false }, // gray
  default: { bg: 'var(--m-amber-bg)', border: 'var(--m-amber-fg)', text: 'var(--m-amber-tx)', dashed: false }, // amber (attention, not red)
  drift:   { bg: 'var(--m-amber-bg)', border: 'var(--m-amber-fg)', text: 'var(--m-amber-tx)', dashed: false },
  none:    { bg: 'transparent',       border: 'var(--m-gray-fg)',  text: 'var(--m-gray-tx)',  dashed: true },
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
      {status.sourceStrategy && status.sourceStrategy !== 'unknown' && (
        <span
          title={a.sourceA}
          style={{
            display: 'inline-flex', alignItems: 'center',
            fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 999,
            background: 'var(--m-sky-bg)', border: '1px solid var(--m-sky-fg)', color: 'var(--m-sky-tx)', whiteSpace: 'nowrap',
          }}
        >
          {(a.sourceStrategy as Record<string, string>)[status.sourceStrategy] ?? status.sourceStrategy}
        </span>
      )}
    </div>
  );
}

// Operator action queue (#56) — single cross-product surface for "what needs
// the operator, on which product, why". Red is reserved for GO_PENDING only.
const CATEGORY_STYLE: Record<ActionCategory, { bg: string; border: string; text: string }> = {
  GO_PENDING:     { bg: 'var(--m-coral-bg)',  border: 'var(--m-coral-fg)',  text: 'var(--m-coral-tx)' },  // coral — irreversible GO only
  AUTH:           { bg: 'var(--m-violet-bg)', border: 'var(--m-violet-fg)', text: 'var(--m-violet-tx)' }, // violet — paused / external auth
  INPUT_DECISION: { bg: 'var(--m-amber-bg)',  border: 'var(--m-amber-fg)',  text: 'var(--m-amber-tx)' },  // amber — decide / input
  AUTO:           { bg: 'var(--m-mint-bg)',   border: 'var(--m-mint-fg)',   text: 'var(--m-mint-tx)' },   // mint — autonomous
};
// Most urgent first (GO), then paused auth, then decisions, then autonomous.
const CATEGORY_ORDER: ActionCategory[] = ['GO_PENDING', 'AUTH', 'INPUT_DECISION', 'AUTO'];

// C-9 intervention label map (stable type key → Korean one-liner). Falls back
// to the generic category labels when the item carries no intervention.
const IV = m.intervention as {
  expand: string; collapse: string; copy: string; copied: string;
  firefly_drop: { label: string; lead: string; dropkit: string; prompt1: string; prompt2: string; model: string; ratio: string };
  firefly_auto: { label: string; lead: string; dropkit: string; prompt1: string; prompt2: string; model: string; ratio: string; generateMode: string; confirmed: string; pending: string; settingsCheck: string; partial: string; resolution: string; grounding: string; reference: string; moodCheck: string; cameraVariety: string; refCleared: string; settingsOk: string; exclusions: string; benchmarkDna: string };
  hero_crop_request: { label: string; lead: string; minEdge: string; longestEdge: string; textFlag: string };
  source_request: { label: string; lead: string; url: string };
  fidelity_check: { label: string; lead: string; components: string; forbidden: string; checks: string; mount: string; source: string };
  mount_check: { label: string; lead: string; mechanic: string; checks: string };
  asset_integrity: { label: string; lead: string; depth2: string; dead: string; ratio: string; samples: string; fixable: string; fix: string; fixing: string; fixConfirm: string; fixDone: string; fixFail: string; clean: string };
  dna_confirm: { label: string; lead: string; category: string; version: string; reasonStale: string; reasonNew: string };
  variant_select: { label: string; lead: string; slot: string; candidates: string; recommended: string };
  category_dna_unseeded: { label: string; lead: string; category: string };
  registry_drift: {
    label: string; lead: string; storageOnly: string; registryOnly: string; undefinedStages: string; samples: string; hint: string;
    review: string; register: string; archive: string; clear: string; registerAll: string; archiveAll: string; clearAll: string;
    working: string; done: string; fail: string; confirmArchive: string; none: string; storageGroup: string; registryGroup: string;
  };
  variant_composite: { label: string; lead: string; coverage: string; missing: string; covered: string; hint: string };
  detail_assembly: { label: string; lead: string; action: string; missingImages: string; missingCopy: string; missingBoth: string };
  sync_drift: {
    label: string; lead: string; fields: string; statusMismatch: string; action: string;
    fieldName: string; fieldPrice: string; fieldImage: string;
  };
  substitute_ready: {
    label: string; labelNudge: string; leadOos: string; leadLow: string;
    substitute: string; note: string; sourcing: string; action: string;
    noSubstitute: string; registerHint: string;
    stepsTitle: string; step1: string; step2: string; step3: string; step4: string;
    penalty: string; penaltyLink: string; storeCenterUrl: string;
  };
};

function interventionLabel(type: string | undefined): string | null {
  if (type === 'firefly_drop') return IV.firefly_drop.label;
  if (type === 'firefly_auto') return IV.firefly_auto.label;
  if (type === 'hero_crop_request') return IV.hero_crop_request.label;
  if (type === 'source_request') return IV.source_request.label;
  if (type === 'fidelity_check') return IV.fidelity_check.label;
  if (type === 'mount_check') return IV.mount_check.label;
  if (type === 'asset_integrity') return IV.asset_integrity.label;
  if (type === 'dna_confirm') return IV.dna_confirm.label;
  if (type === 'variant_select') return IV.variant_select.label;
  if (type === 'category_dna_unseeded') return IV.category_dna_unseeded.label;
  if (type === 'registry_drift') return IV.registry_drift.label;
  if (type === 'variant_composite') return IV.variant_composite.label;
  if (type === 'detail_assembly') return IV.detail_assembly.label;
  if (type === 'sync_drift') return IV.sync_drift.label;
  if (type === 'substitute_ready') return IV.substitute_ready.label;
  return null;
}

function actionLabel(item: ActionQueueItem): string {
  const aq = m.actionQueue;
  // C-9 — a precise intervention names itself; prefer it over the generic label.
  const iv = interventionLabel(item.interventionType);
  if (iv) {
    // variant_composite carries a coverage count: "변형별 대표 컷 (N/M)".
    if (item.interventionType === 'variant_composite') {
      const vc = item.payload as { active?: string[]; covered?: string[] } | undefined;
      if (vc?.active) return `${iv} (${(vc.covered ?? []).length}/${vc.active.length})`;
    }
    // sync_drift carries the drifting app-SoR field count: "동기화 필요 (N필드)".
    if (item.interventionType === 'sync_drift') {
      const sd = item.payload as { driftFields?: string[] } | undefined;
      const n = (sd?.driftFields ?? []).length;
      if (n > 0) return `${iv} (${n}${IV.sync_drift.fields})`;
    }
    // substitute_ready: name the substitute when one exists, else the register nudge.
    if (item.interventionType === 'substitute_ready') {
      const sr = item.payload as { hasSubstitute?: boolean; substituteName?: string | null } | undefined;
      if (!sr?.hasSubstitute) return IV.substitute_ready.labelNudge;
      if (sr.substituteName) return `${iv}: ${sr.substituteName}`;
    }
    return iv;
  }
  if (item.category === 'AUTH') return aq.authImage;
  if (item.category === 'AUTO') return item.stage === 'processing' ? aq.processing : aq.monitor;
  // INPUT_DECISION / GO_PENDING reuse the nextAction one-line labels.
  const base = (m.nextAction as Record<string, string>)[item.stage] ?? item.stage;
  return item.detail ? `${base} (${item.detail})` : base;
}

// Inline copy-to-clipboard button (no forced modal — #56).
function CopyText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }).catch(() => { /* insecure context — ignore */ });
      }}
      className="inline-flex items-center gap-1 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-50"
    >
      {copied ? <Check size={10} className="text-green-600" /> : <Copy size={10} />}
      {copied ? IV.copied : IV.copy}
    </button>
  );
}

// 1-click asset-integrity remediation button (confirm-gated, #46). Posts to the
// per-product route, then refreshes the matrix so the card clears on success.
function AssetIntegrityFix({ productId, onRefresh }: { productId: string; onRefresh?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const run = async () => {
    if (!window.confirm(IV.asset_integrity.fixConfirm)) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/products/${productId}/asset-integrity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fix', confirm: true }),
      }).then((r) => r.json());
      if (res.success) {
        setMsg(IV.asset_integrity.fixDone);
        setTimeout(() => onRefresh?.(), 600);
      } else {
        setMsg(IV.asset_integrity.fixFail);
      }
    } catch {
      setMsg(IV.asset_integrity.fixFail);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
      >
        {busy ? <Clock size={11} className="animate-spin" /> : <Wrench size={11} />}
        {busy ? IV.asset_integrity.fixing : IV.asset_integrity.fix}
      </button>
      {msg && <span className="text-[10px] text-slate-500">{msg}</span>}
    </div>
  );
}

// REGISTRY<->STORAGE per-orphan reconcile (#62 P2). Loads the full drift on
// demand, then lets the operator decide register-vs-archive per storage-only
// orphan (or clear a registry-only orphan). Posts to the reconcile route
// (confirm-gated, #46), then refreshes so the card clears once reconciled.
function RegistryDriftReconcile({ productId, onRefresh }: { productId: string; onRefresh?: () => void }) {
  const t = IV.registry_drift;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [storageOnly, setStorageOnly] = useState<string[]>([]);
  const [registryOnly, setRegistryOnly] = useState<string[]>([]);

  const load = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/products/${productId}/asset-integrity`).then((r) => r.json());
      const d = res?.report?.registryDrift;
      setStorageOnly((d?.storageOnly ?? []).map((o: { path: string }) => o.path));
      setRegistryOnly((d?.registryOnly ?? []).map((o: { path: string }) => o.path));
      setOpen(true);
    } catch { setMsg(t.fail); } finally { setBusy(false); }
  };

  const reconcile = async (decisions: { register?: string[]; archive?: string[]; clearRegistry?: string[] }, confirmArchive = false) => {
    if (confirmArchive && !window.confirm(t.confirmArchive)) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/products/${productId}/asset-integrity`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reconcile', confirm: true, decisions }),
      }).then((r) => r.json());
      if (res.success) {
        const d = res?.result?.after?.registryDrift;
        setStorageOnly((d?.storageOnly ?? []).map((o: { path: string }) => o.path));
        setRegistryOnly((d?.registryOnly ?? []).map((o: { path: string }) => o.path));
        setMsg(t.done);
        setTimeout(() => onRefresh?.(), 600);
      } else { setMsg(t.fail); }
    } catch { setMsg(t.fail); } finally { setBusy(false); }
  };

  const base = (p: string) => p.split('/').pop() ?? p;

  if (!open) {
    return (
      <button type="button" disabled={busy} onClick={load}
        className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-slate-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
        {busy ? <Clock size={11} className="animate-spin" /> : <Wrench size={11} />}{t.review}
      </button>
    );
  }

  return (
    <div className="mt-1.5 space-y-2">
      {storageOnly.length === 0 && registryOnly.length === 0 && <p className="text-[10px] text-slate-400">{t.none}</p>}

      {storageOnly.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold text-slate-500">{t.storageGroup} ({storageOnly.length})</span>
            <div className="flex gap-1">
              <button type="button" disabled={busy} onClick={() => reconcile({ register: storageOnly })}
                className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{t.registerAll}</button>
              <button type="button" disabled={busy} onClick={() => reconcile({ archive: storageOnly }, true)}
                className="rounded bg-amber-600 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-amber-700 disabled:opacity-60">{t.archiveAll}</button>
            </div>
          </div>
          <ul className="max-h-40 space-y-0.5 overflow-y-auto">
            {storageOnly.map((p) => (
              <li key={p} className="flex items-center justify-between gap-2 rounded bg-slate-50 px-1.5 py-0.5">
                <code className="truncate text-[10px] text-slate-600">{base(p)}</code>
                <div className="flex shrink-0 gap-1">
                  <button type="button" disabled={busy} onClick={() => reconcile({ register: [p] })}
                    className="rounded px-1 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">{t.register}</button>
                  <button type="button" disabled={busy} onClick={() => reconcile({ archive: [p] }, true)}
                    className="rounded px-1 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60">{t.archive}</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {registryOnly.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold text-slate-500">{t.registryGroup} ({registryOnly.length})</span>
            <button type="button" disabled={busy} onClick={() => reconcile({ clearRegistry: registryOnly })}
              className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{t.clearAll}</button>
          </div>
          <ul className="max-h-32 space-y-0.5 overflow-y-auto">
            {registryOnly.map((p) => (
              <li key={p} className="flex items-center justify-between gap-2 rounded bg-slate-50 px-1.5 py-0.5">
                <code className="truncate text-[10px] text-slate-600">{base(p)}</code>
                <button type="button" disabled={busy} onClick={() => reconcile({ clearRegistry: [p] })}
                  className="rounded px-1 py-0.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">{t.clear}</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(busy || msg) && <span className="text-[10px] text-slate-500">{busy ? t.working : msg}</span>}
    </div>
  );
}

// C-9 intervention detail — rendered inline (expandable, never a forced modal).
function InterventionDetail({ type, payload, productId, onRefresh }: { type: string; payload: unknown; productId?: string; onRefresh?: () => void }) {
  const p = (payload ?? {}) as FireflyDropPayload & HeroCropPayload & SourceRequestPayload & FidelityCheckPayload & MountCheckPayload;
  if (type === 'firefly_drop' || type === 'firefly_auto') {
    // Same dropkit/prompt payload; firefly_auto only swaps the labels (the tab
    // is open so the result is drained automatically via the ingest endpoint).
    const t = type === 'firefly_auto' ? IV.firefly_auto : IV.firefly_drop;
    return (
      <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
        <p className="text-slate-500">{t.lead}</p>
        {p.dropkitPath && (
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 text-slate-400">{t.dropkit}:</span>
            <code className="truncate rounded bg-slate-50 px-1 py-0.5 text-[10px] text-slate-600">{p.dropkitPath}</code>
            <CopyText text={p.dropkitPath} />
          </div>
        )}
        {p.promptTrack1 && (
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">{t.prompt1}</span>
              <CopyText text={p.promptTrack1} />
            </div>
            <p className="mt-0.5 rounded bg-slate-50 px-1.5 py-1 text-[10px] leading-snug text-slate-600">{p.promptTrack1}</p>
          </div>
        )}
        {p.promptTrack2 && (
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">{t.prompt2}</span>
              <CopyText text={p.promptTrack2} />
            </div>
            <p className="mt-0.5 rounded bg-slate-50 px-1.5 py-1 text-[10px] leading-snug text-slate-600">{p.promptTrack2}</p>
          </div>
        )}
        <div className="flex gap-3 text-[10px] text-slate-400">
          {p.model && <span>{t.model}: {p.model}</span>}
          {p.ratio && <span>{t.ratio}: {p.ratio}</span>}
        </div>
        {type === 'firefly_auto' && (
          // Generate-mode gate (#77) — one-line checklist label + state.
          <div className="flex items-center gap-1.5 text-[10px]">
            {p.generateModeConfirmed
              ? <Check size={10} className="text-green-600" />
              : <Clock size={10} className="text-amber-500" />}
            <span className="text-slate-500">{IV.firefly_auto.generateMode}</span>
            <span className={p.generateModeConfirmed ? 'text-green-600' : 'text-amber-600'}>
              {p.generateModeConfirmed ? IV.firefly_auto.confirmed : IV.firefly_auto.pending}
            </span>
          </div>
        )}
        {type === 'firefly_auto' && (() => {
          // Generation-settings sub-check (#77, SCENT_MOOD §2-3) — one line.
          // Color-coded sub-labels (green=verified, slate=pending); no symbols.
          const sv = p.settingsVerified ?? {};
          const flags: Array<[string, boolean]> = [
            [IV.firefly_auto.ratio, sv.ratio === true],
            [IV.firefly_auto.resolution, sv.resolution === true],
            [IV.firefly_auto.grounding, sv.grounding === true],
            [IV.firefly_auto.reference, sv.reference === true],
          ];
          const okCount = flags.filter(([, v]) => v).length;
          const allOk = okCount === 4;
          const stateWord = allOk ? IV.firefly_auto.confirmed : okCount > 0 ? IV.firefly_auto.partial : IV.firefly_auto.pending;
          return (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
              {allOk ? <Check size={10} className="text-green-600" /> : <Clock size={10} className="text-amber-500" />}
              <span className="text-slate-500">{IV.firefly_auto.settingsCheck}</span>
              <span className={allOk ? 'text-green-600' : 'text-amber-600'}>{stateWord} ({okCount}/4)</span>
              {flags.map(([label, v]) => (
                <span key={label} className={v ? 'text-green-600' : 'text-slate-400'}>{label}</span>
              ))}
            </div>
          );
        })()}
        {type === 'firefly_auto' && p.moodGuards && (() => {
          // Mood-camera guards (#84/#86, MOOD_CAMERA_SPEC_SYSTEM §4) — one line,
          // five subchecks. Same color-coded pattern as the settings check.
          const g = p.moodGuards ?? {};
          const flags: Array<[string, boolean]> = [
            [IV.firefly_auto.cameraVariety, g.cameraVarietyApplied === true],
            [IV.firefly_auto.refCleared, g.referenceCleared === true],
            [IV.firefly_auto.settingsOk, g.settingsVerified === true],
            [IV.firefly_auto.exclusions, g.exclusionsPresent === true],
            [IV.firefly_auto.benchmarkDna, g.benchmarkDnaSet === true],
          ];
          const okCount = flags.filter(([, v]) => v).length;
          const allOk = okCount === flags.length;
          const stateWord = allOk ? IV.firefly_auto.confirmed : okCount > 0 ? IV.firefly_auto.partial : IV.firefly_auto.pending;
          return (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
              {allOk ? <Check size={10} className="text-green-600" /> : <Clock size={10} className="text-amber-500" />}
              <span className="text-slate-500">{IV.firefly_auto.moodCheck}</span>
              <span className={allOk ? 'text-green-600' : 'text-amber-600'}>{stateWord} ({okCount}/{flags.length})</span>
              {flags.map(([label, v]) => (
                <span key={label} className={v ? 'text-green-600' : 'text-slate-400'}>{label}</span>
              ))}
            </div>
          );
        })()}
      </div>
    );
  }
  if (type === 'hero_crop_request') {
    return (
      <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
        <p className="text-slate-500">{IV.hero_crop_request.lead}</p>
        <div className="flex gap-3 text-[10px] text-slate-400">
          {p.minEdge != null && <span>{IV.hero_crop_request.minEdge}: {p.minEdge}</span>}
          {p.longestEdge != null && <span>{IV.hero_crop_request.longestEdge}: {p.longestEdge}</span>}
        </div>
        {p.textDetected && <p className="text-[10px] text-amber-600">{IV.hero_crop_request.textFlag}</p>}
      </div>
    );
  }
  if (type === 'source_request') {
    return (
      <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
        <p className="text-slate-500">{IV.source_request.lead}</p>
        {p.supplierUrl && (
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 text-slate-400">{IV.source_request.url}:</span>
            <code className="truncate rounded bg-slate-50 px-1 py-0.5 text-[10px] text-slate-600">{p.supplierUrl}</code>
          </div>
        )}
      </div>
    );
  }
  if (type === 'fidelity_check') {
    return (
      <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
        <p className="text-slate-500">{IV.fidelity_check.lead}</p>
        {p.mountType && (
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 text-slate-400">{IV.fidelity_check.mount}:</span>
            <code className="rounded bg-slate-50 px-1 py-0.5 text-[10px] text-slate-600">{p.mountType}</code>
          </div>
        )}
        {p.components && p.components.length > 0 && (
          <div>
            <span className="text-slate-400">{IV.fidelity_check.components}:</span>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {p.components.map((c) => (
                <span key={c} className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600">{c}</span>
              ))}
            </div>
          </div>
        )}
        {p.forbidden && p.forbidden.length > 0 && (
          <div>
            <span className="text-rose-400">{IV.fidelity_check.forbidden}:</span>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {p.forbidden.map((c) => (
                <span key={c} className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] text-rose-600">{c}</span>
              ))}
            </div>
          </div>
        )}
        {p.staticChecks && p.staticChecks.length > 0 && (
          <p className="text-[10px] text-slate-400">
            {IV.fidelity_check.checks}: {p.staticChecks.join(', ')}
          </p>
        )}
      </div>
    );
  }
  if (type === 'mount_check') {
    return (
      <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
        <p className="text-slate-500">{IV.mount_check.lead}</p>
        {p.mountMechanic && (
          <div>
            <span className="text-slate-400">{IV.mount_check.mechanic}:</span>
            <p className="mt-0.5 rounded bg-slate-50 px-1.5 py-1 text-[10px] leading-snug text-slate-600">{p.mountMechanic}</p>
          </div>
        )}
        {p.mountChecks && p.mountChecks.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {p.mountChecks.map((c) => (
              <span key={c} className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">{c}</span>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (type === 'asset_integrity') {
    const ai = payload as {
      depth2Count?: number; deadCount?: number; ratioCount?: number;
      fixableDepth2?: number; fixableDeadRefs?: number; sampleFiles?: string[];
    } | null;
    const t = IV.asset_integrity;
    const depth2 = ai?.depth2Count ?? 0;
    const dead = ai?.deadCount ?? 0;
    const ratio = ai?.ratioCount ?? 0;
    const fixable = (ai?.fixableDepth2 ?? 0) + (ai?.fixableDeadRefs ?? 0);
    return (
      <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
        <p className="text-slate-500">{t.lead}</p>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          <span className={`rounded px-1.5 py-0.5 ${depth2 > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>{t.depth2}: {depth2}</span>
          <span className={`rounded px-1.5 py-0.5 ${dead > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>{t.dead}: {dead}</span>
          {ratio > 0 && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">{t.ratio}: {ratio}</span>}
          <span className="rounded bg-slate-50 px-1.5 py-0.5 text-slate-400">{t.fixable}: {fixable}</span>
        </div>
        {ai?.sampleFiles && ai.sampleFiles.length > 0 && (
          <p className="truncate text-[10px] text-slate-400">{t.samples}: {ai.sampleFiles.join(', ')}</p>
        )}
        {productId && fixable > 0 && <AssetIntegrityFix productId={productId} onRefresh={onRefresh} />}
      </div>
    );
  }
  if (type === 'category_dna_unseeded') {
    const u = payload as { categoryCode?: string; categoryName?: string } | null;
    const t = IV.category_dna_unseeded;
    return (
      <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
        <p className="text-slate-500">{t.lead}</p>
        {(u?.categoryCode || u?.categoryName) && (
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 text-slate-400">{t.category}:</span>
            <code className="rounded bg-slate-50 px-1 py-0.5 text-[10px] text-slate-600">{u?.categoryName || u?.categoryCode}</code>
          </div>
        )}
      </div>
    );
  }
  if (type === 'registry_drift') {
    const rd = payload as {
      storageOnlyCount?: number; registryOnlyCount?: number;
      undefinedStages?: string[]; sampleFiles?: string[];
    } | null;
    const t = IV.registry_drift;
    const storageOnly = rd?.storageOnlyCount ?? 0;
    const registryOnly = rd?.registryOnlyCount ?? 0;
    const undef = rd?.undefinedStages ?? [];
    return (
      <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
        <p className="text-slate-500">{t.lead}</p>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          <span className={`rounded px-1.5 py-0.5 ${storageOnly > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-400'}`}>{t.storageOnly}: {storageOnly}</span>
          <span className={`rounded px-1.5 py-0.5 ${registryOnly > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>{t.registryOnly}: {registryOnly}</span>
          {undef.length > 0 && <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-600">{t.undefinedStages}: {undef.join(', ')}</span>}
        </div>
        {rd?.sampleFiles && rd.sampleFiles.length > 0 && (
          <p className="truncate text-[10px] text-slate-400">{t.samples}: {rd.sampleFiles.join(', ')}</p>
        )}
        {productId
          ? <RegistryDriftReconcile productId={productId} onRefresh={onRefresh} />
          : <p className="text-[10px] text-slate-400">{t.hint}</p>}
      </div>
    );
  }
  if (type === 'variant_composite') {
    const vc = payload as { active?: string[]; covered?: string[]; missing?: string[]; ratio?: number } | null;
    const t = IV.variant_composite;
    const active = vc?.active ?? [];
    const covered = vc?.covered ?? [];
    const missing = vc?.missing ?? [];
    return (
      <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
        <p className="text-slate-500">{t.lead}</p>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          <span className={`rounded px-1.5 py-0.5 ${missing.length > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{t.coverage}: {covered.length}/{active.length}</span>
        </div>
        {missing.length > 0 && (
          <p className="text-[10px] text-slate-500">{t.missing}: {missing.join(', ')}</p>
        )}
        <p className="text-[10px] text-slate-400">{t.hint}</p>
      </div>
    );
  }
  if (type === 'detail_assembly') {
    const da = payload as { missingImages?: boolean; missingCopy?: boolean } | null;
    const t = IV.detail_assembly;
    const mi = da?.missingImages ?? false;
    const mc = da?.missingCopy ?? false;
    const branch = mi && mc ? t.missingBoth : mi ? t.missingImages : t.missingCopy;
    return (
      <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
        <p className="text-slate-500">{t.lead}</p>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">{branch}</span>
        </div>
        <p className="text-[10px] text-slate-400">{t.action}</p>
      </div>
    );
  }
  if (type === 'sync_drift') {
    const sd = payload as { driftFields?: string[]; statusMismatch?: boolean } | null;
    const t = IV.sync_drift;
    const fields = sd?.driftFields ?? [];
    const statusMismatch = sd?.statusMismatch ?? false;
    return (
      <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
        <p className="text-slate-500">{t.lead}</p>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          {fields.length > 0 && (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">{fields.map(driftFieldLabel).join(', ')}</span>
          )}
          {statusMismatch && (
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">{t.statusMismatch}</span>
          )}
        </div>
        <p className="text-[10px] text-slate-400">{t.action}</p>
      </div>
    );
  }
  if (type === 'substitute_ready') {
    const sr = payload as {
      outOfStock?: boolean; lowStock?: boolean; hasSubstitute?: boolean;
      substituteName?: string | null; substituteNote?: string | null; sourcingUrl?: string | null;
    } | null;
    const t = IV.substitute_ready;
    const has = sr?.hasSubstitute ?? false;
    return (
      <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
        <p className="text-slate-500">{sr?.lowStock && !sr?.outOfStock ? t.leadLow : t.leadOos}</p>
        {has ? (
          <div className="space-y-1">
            {sr?.substituteName && (
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 text-slate-400">{t.substitute}:</span>
                <span className="font-semibold text-amber-700">{sr.substituteName}</span>
              </div>
            )}
            {sr?.substituteNote && <p className="text-[10px] text-slate-500">{t.note}: {sr.substituteNote}</p>}
            {sr?.sourcingUrl && (
              <a href={sr.sourcingUrl} target="_blank" rel="noreferrer" className="inline-block text-[10px] text-blue-600 underline">
                {t.sourcing}
              </a>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">{t.noSubstitute}</span>
            <span className="text-slate-400">{t.registerHint}</span>
          </div>
        )}

        {/* #211 — stock-out response order (least ranking impact first) */}
        <div className="mt-1 border-t border-slate-100 pt-1.5">
          <p className="text-[10px] font-semibold text-slate-500">{t.stepsTitle}</p>
          <ol className="mt-1 space-y-0.5 text-[10px] text-slate-600" style={{ listStyle: 'decimal', paddingLeft: 16 }}>
            <li>{t.step1}</li>
            <li>{t.step2}</li>
            <li>{t.step3}</li>
            <li>{t.step4}</li>
          </ol>
        </div>

        {/* #211 — penalty guidance (numbers are defaults, not hardcoded truth) + latest-check link */}
        <div className="mt-1 rounded bg-rose-50 px-2 py-1.5 text-[10px] text-rose-700">
          {t.penalty}
          <a href={t.storeCenterUrl} target="_blank" rel="noreferrer" className="ml-1 underline">{t.penaltyLink}</a>
        </div>

        <p className="text-[10px] text-slate-400">{t.action}</p>
      </div>
    );
  }
  return null;
}

// PL-5a — humanize the drifting app-SoR field names for the drift card.
function driftFieldLabel(field: string): string {
  const map: Record<string, string> = {
    name: IV.sync_drift.fieldName,
    salePrice: IV.sync_drift.fieldPrice,
    representativeImageUrl: IV.sync_drift.fieldImage,
  };
  return map[field] ?? field;
}

function ActionQueueCard({ item, onRefresh }: { item: ActionQueueItem; onRefresh?: () => void }) {
  const [open, setOpen] = useState(false);
  const s = CATEGORY_STYLE[item.category];
  const hasIntervention = Boolean(item.interventionType);
  return (
    <div className="block rounded-lg border bg-white p-2.5" style={{ borderColor: s.border }}>
      <a href={item.deepLink} className="block no-underline hover:opacity-90">
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.text }}
        >
          {aqCategory(item.category)}
        </span>
        <p className="mt-1 truncate text-xs font-semibold text-slate-700" title={item.productName}>
          {item.productName}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
          <ArrowRight size={11} className="shrink-0" />
          <span className="truncate">{actionLabel(item)}</span>
        </p>
      </a>
      {hasIntervention && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-slate-600"
          >
            <ChevronDown size={10} className={open ? 'rotate-180 transition' : 'transition'} />
            {open ? IV.collapse : IV.expand}
          </button>
          {open && <InterventionDetail type={item.interventionType as string} payload={item.payload} productId={item.productId} onRefresh={onRefresh} />}
        </>
      )}
    </div>
  );
}

function aqCategory(c: ActionCategory): string {
  return m.actionQueue.category[c];
}

function OperatorActionQueue({ items, onRefresh }: { items: ActionQueueItem[]; onRefresh?: () => void }) {
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
        {sorted.map((item) => (
          <ActionQueueCard key={`${item.productId}-${item.interventionType ?? item.stage}`} item={item} onRefresh={onRefresh} />
        ))}
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
              ? { backgroundColor: 'var(--m-amber-bg)', border: '1px solid var(--m-amber-fg)', color: 'var(--m-amber-tx)' }
              : { backgroundColor: 'var(--m-gray-bg)', border: '1px solid var(--m-gray-fg)', color: 'var(--m-gray-tx)' }
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
          style={{ backgroundColor: 'var(--m-coral-bg)', border: '1px solid var(--m-coral-fg)', color: 'var(--m-coral-tx)' }}
        >
          <XCircle size={12} />
          {m.blockedPinned}
        </div>
      )}

      <OperatorActionQueue
        items={rows
          .flatMap((r) => [r.actionQueue, ...(r.extraQueue ?? [])])
          .filter((a): a is ActionQueueItem => Boolean(a))}
        onRefresh={() => mutate()}
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
