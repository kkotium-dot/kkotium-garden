'use client';
// src/components/products/ProductSwapPipeline.tsx
//
// 2026-06-06 — Product-swap (B-plan) workflow UI (Phase 2 task 3). Concept combo
// cards -> 6-stage timeline -> awaiting_human browser-handoff CTA -> before/after
// review slider with approve/reject (rejected -> retry). Reads/writes
// /api/products/[id]/swap-pipeline (DB only — never touches Naver).
//
// No emoji (Lucide). No Korean literals (swap-strings.ko.json, #35).

import { useState } from 'react';
import useSWR from 'swr';
import {
  Scissors, ImagePlus, Layers, Sun, Wand2, Crop, Hand, ExternalLink,
  CheckCircle2, XCircle, Loader2, Clock, MinusCircle, ShieldCheck, ArrowLeft,
} from 'lucide-react';
import s from '@/lib/i18n/swap-strings.ko.json';

type StageKey =
  | 'product_cutout' | 'mood_bg_generate' | 'product_composite'
  | 'harmonize' | 'express_finalize' | 'naver_normalize';

interface Stage {
  key: StageKey;
  jobId: string | null;
  status: string;
  tool?: string | null;
  ipSafe?: boolean | null;
  awaitingHuman?: boolean;
  references?: Array<{ kind: string; urn: string }>;
  outputRefs?: unknown;
  version?: number;
}

interface PipelineResponse {
  success: boolean;
  migrationPending?: boolean;
  productId: string;
  productName: string;
  conceptComboId: string | null;
  stages: Stage[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STAGE_ICON: Record<StageKey, React.ElementType> = {
  product_cutout: Scissors,
  mood_bg_generate: ImagePlus,
  product_composite: Layers,
  harmonize: Sun,
  express_finalize: Wand2,
  naver_normalize: Crop,
};

// Deep links for the browser-handoff (semi-automatic) steps.
const STAGE_DEEP_LINK: Partial<Record<StageKey, string>> = {
  mood_bg_generate: 'https://firefly.adobe.com/generate/images',
  express_finalize: 'https://new.express.adobe.com',
};

const STATUS_STYLE: Record<string, { bg: string; border: string; text: string; icon: React.ElementType }> = {
  done:           { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D', icon: CheckCircle2 },
  in_progress:    { bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8', icon: Loader2 },
  human_done:     { bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8', icon: CheckCircle2 },
  review:         { bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8', icon: Loader2 },
  awaiting_human: { bg: '#F5F3FF', border: '#C4B5FD', text: '#6D28D9', icon: Hand },
  pending:        { bg: '#FEFCE8', border: '#FDE68A', text: '#A16207', icon: Clock },
  ready:          { bg: '#FEFCE8', border: '#FDE68A', text: '#A16207', icon: Clock },
  rejected:       { bg: '#FFF0EF', border: '#FFD6D3', text: '#C2410C', icon: XCircle },
  blocked:        { bg: '#FFF0EF', border: '#FFD6D3', text: '#C2410C', icon: XCircle },
  failed:         { bg: '#FFF0EF', border: '#FFD6D3', text: '#C2410C', icon: XCircle },
  none:           { bg: '#F8FAFC', border: '#E2E8F0', text: '#94A3B8', icon: MinusCircle },
};

function statusStyle(status: string) {
  return STATUS_STYLE[status] ?? STATUS_STYLE.none;
}

function statusLabel(status: string): string {
  return (s.status as Record<string, string>)[status] ?? status;
}

// Defensively pull a usable image URL out of a reference urn / outputRefs blob.
function asUrl(x: unknown): string | null {
  if (typeof x === 'string' && /^https?:\/\//.test(x)) return x;
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    if (typeof o.url === 'string' && /^https?:\/\//.test(o.url)) return o.url;
    if (Array.isArray(o.urls) && typeof o.urls[0] === 'string') return o.urls[0] as string;
  }
  return null;
}

function StatusBadge({ status }: { status: string }) {
  const st = statusStyle(status);
  const Icon = st.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: st.bg, border: `1px solid ${st.border}`, color: st.text }}
    >
      <Icon size={12} className={status === 'in_progress' || status === 'review' ? 'animate-spin' : ''} />
      {statusLabel(status)}
    </span>
  );
}

function BeforeAfter({ before, after }: { before: string | null; after: string | null }) {
  const [pos, setPos] = useState(50);
  if (!before || !after) {
    return <p className="text-xs text-slate-400">{s.review.noImage}</p>;
  }
  return (
    <div>
      <div className="relative w-full overflow-hidden rounded-lg border border-slate-200" style={{ aspectRatio: '1 / 1' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={s.review.before} className="absolute inset-0 h-full w-full object-contain bg-white" />
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={after} alt={s.review.after} className="h-full w-full object-contain bg-white" />
        </div>
        <div className="absolute inset-y-0" style={{ left: `${pos}%`, width: 2, backgroundColor: '#6D28D9' }} />
      </div>
      <input
        type="range" min={0} max={100} value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="mt-2 w-full"
        aria-label={s.review.sliderHint}
      />
      <p className="mt-1 text-[11px] text-slate-400">{s.review.sliderHint}</p>
    </div>
  );
}

const CONCEPTS: Array<{ id: string; label: string }> = [
  { id: 'wood', label: s.concept.wood },
  { id: 'white', label: s.concept.white },
  { id: 'car', label: s.concept.car },
];

export default function ProductSwapPipeline({ productId }: { productId: string }) {
  const { data, error, isLoading, mutate } = useSWR<PipelineResponse>(
    `/api/products/${productId}/swap-pipeline`,
    fetcher,
    { refreshInterval: 8000 },
  );
  const [concept, setConcept] = useState<string>('wood');
  const [busyJob, setBusyJob] = useState<string | null>(null);

  async function transition(jobId: string, toStatus: string, note?: string) {
    setBusyJob(jobId);
    try {
      await fetch(`/api/products/${productId}/swap-pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, toStatus, actor: 'human', note }),
      });
      await mutate();
    } finally {
      setBusyJob(null);
    }
  }

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto max-w-3xl p-4">
      <a href="/products" className="mb-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:underline">
        <ArrowLeft size={12} /> {s.title}
      </a>
      {children}
    </div>
  );

  if (isLoading) return shell(<p className="text-sm text-slate-400">{s.loading}</p>);
  if (error || !data?.success) {
    return shell(
      <div>
        <p className="text-sm text-slate-600">{s.error.title}</p>
        <button onClick={() => mutate()} className="mt-2 text-xs font-medium text-blue-600 hover:underline">{s.error.retry}</button>
      </div>,
    );
  }
  if (data.migrationPending) {
    return shell(
      <div>
        <h2 className="text-base font-semibold text-slate-800">{s.title}</h2>
        <p className="mt-2 text-sm text-slate-600">{s.migrationPending.title}</p>
        <p className="mt-1 text-xs text-slate-400">{s.migrationPending.hint}</p>
      </div>,
    );
  }

  const stages = data.stages ?? [];
  const cutoutStage = stages.find((st) => st.key === 'product_cutout');
  const cutoutUrl = cutoutStage?.references?.map((r) => asUrl(r.urn)).find(Boolean) ?? null;

  return shell(
    <div>
      <header className="mb-4">
        <h2 className="text-base font-semibold text-slate-800">{data.productName}</h2>
        <p className="text-xs text-slate-500">{s.subtitle}</p>
      </header>

      {/* Concept combo cards */}
      <section className="mb-4">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="text-sm font-medium text-slate-700">{s.concept.title}</h3>
        </div>
        <div className="flex gap-2">
          {CONCEPTS.map((c) => (
            <button
              key={c.id}
              onClick={() => setConcept(c.id)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium"
              style={concept === c.id
                ? { backgroundColor: '#F5F3FF', border: '1px solid #C4B5FD', color: '#6D28D9' }
                : { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', color: '#475569' }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-700">
          <ShieldCheck size={12} /> {s.guard.repWhiteOnly}
        </p>
      </section>

      {stages.every((st) => st.status === 'none') ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">{s.empty.title}</p>
          <p className="mt-1 text-xs text-slate-400">{s.empty.hint}</p>
        </div>
      ) : (
        <ol className="space-y-2">
          {stages.map((st, i) => {
            const Icon = STAGE_ICON[st.key];
            const deepLink = STAGE_DEEP_LINK[st.key];
            const busy = busyJob === st.jobId;
            const afterUrl = asUrl(st.outputRefs);
            return (
              <li key={st.key} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{i + 1}</span>
                    <Icon size={16} className="text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">{s.stage[st.key]}</span>
                    <span className="text-[11px] text-slate-400">{s.stageTool[st.key]}</span>
                    {st.ipSafe && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] text-emerald-600">
                        <ShieldCheck size={11} /> {s.ipSafe}
                      </span>
                    )}
                  </div>
                  <StatusBadge status={st.status} />
                </div>

                {/* awaiting_human browser-handoff CTA */}
                {st.status === 'awaiting_human' && st.jobId && (
                  <div className="mt-2 rounded-md p-2" style={{ backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                    <p className="flex items-center gap-1 text-xs font-medium" style={{ color: '#6D28D9' }}>
                      <Hand size={12} /> {s.human.title}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">{s.human.hint}</p>
                    <ul className="mt-1 list-disc pl-4 text-[11px] text-slate-500">
                      <li>{s.human.check1}</li>
                      <li>{s.human.check2}</li>
                      <li>{s.human.check3}</li>
                    </ul>
                    <div className="mt-2 flex gap-2">
                      {deepLink && (
                        <a
                          href={deepLink} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white"
                          style={{ backgroundColor: '#6D28D9' }}
                        >
                          <ExternalLink size={12} /> {s.openBrowser}
                        </a>
                      )}
                      <button
                        disabled={busy}
                        onClick={() => transition(st.jobId!, 'human_done')}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-50"
                      >
                        {busy ? s.human.marking : s.human.markDone}
                      </button>
                    </div>
                  </div>
                )}

                {/* review: before/after + approve/reject */}
                {st.status === 'review' && st.jobId && (
                  <div className="mt-2 rounded-md border border-slate-200 p-2">
                    <p className="mb-1 text-xs font-medium text-slate-700">{s.review.title}</p>
                    <BeforeAfter before={cutoutUrl} after={afterUrl} />
                    <p className="mt-2 text-[11px] text-slate-500">{s.review.labelCheck}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        disabled={busy}
                        onClick={() => transition(st.jobId!, 'done', 'approved in swap UI')}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                        style={{ backgroundColor: '#15803D' }}
                      >
                        <CheckCircle2 size={12} /> {busy ? s.review.working : s.review.approve}
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => transition(st.jobId!, 'rejected', 'rejected in swap UI')}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                        style={{ backgroundColor: '#C2410C' }}
                      >
                        <XCircle size={12} /> {busy ? s.review.working : s.review.reject}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>,
  );
}
