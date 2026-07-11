'use client';
// src/components/products/PublishReadinessCard.tsx
//
// 2026-07-10 — Publish-readiness SURFACE (spec: PUBLISH_READINESS_SURFACE_SPEC_
// 2026-07-10, 원칙 #240). Renders the structured 8-item gate verdict from
// /api/products/[id]/publish-checklist as a "발행 준비 X/8" badge + expandable
// checklist (pass 초록 / fail 코랄 / na 회색 + 고치러 가기 link). The publish CTA
// links to the pre-publish review screen and is DISABLED when ready=false, with
// the remaining items named as the reason — the irreversible GO stays on that
// screen (#46 gate unchanged). Read-only.
//
// No emoji (Lucide icons). No Korean literals (publish-readiness-strings.ko.json,
// #35 / #73-b).

import { useState } from 'react';
import useSWR from 'swr';
import {
  ShieldCheck, CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronUp,
  ArrowRight, Loader2,
} from 'lucide-react';
import strings from '@/lib/i18n/publish-readiness-strings.ko.json';

type CheckStatus = 'pass' | 'fail' | 'na';
type CheckKey =
  | 'name' | 'category' | 'mainImage' | 'salePrice'
  | 'address' | 'readiness' | 'unitPrice' | 'origin';

interface ReadinessCheck {
  key: CheckKey;
  label: string;
  status: CheckStatus;
  message: string;
  fixHref: string;
  detail?: string;
  messageKey?: string;
}
interface PublishReadiness {
  ready: boolean;
  passed: number;
  total: number;
  checks: ReadinessCheck[];
}
interface ChecklistResponse {
  success: boolean;
  registered?: boolean;
  readiness?: PublishReadiness;
  error?: string;
}

const c = strings.card;
const CK = strings.checks as Record<CheckKey, { label: string; pass: string; fail: string; na?: string } & Record<string, string>>;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_ICON: Record<CheckStatus, React.ElementType> = {
  pass: CheckCircle2,
  fail: XCircle,
  na: MinusCircle,
};
// pass 초록 · fail 코랄 · na 회색 (spec §2-B-1).
const STATUS_COLOR: Record<CheckStatus, { text: string; bg: string; border: string }> = {
  pass: { text: '#047857', bg: '#ECFDF5', border: '#A7F3D0' },
  fail: { text: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
  na:   { text: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
};

function checkLabel(key: CheckKey): string {
  return CK[key]?.label ?? key;
}
function checkMessage(chk: ReadinessCheck): string {
  const t = CK[chk.key];
  if (!t) return chk.message; // fall back to the lib's self-describing English
  if (chk.status === 'na') return t.na ?? chk.message;
  // A messageKey selects a specific reason variant (e.g. origin 'failMismatch').
  const base =
    (chk.messageKey && t[chk.messageKey]) ??
    (chk.status === 'pass' ? t.pass : t.fail);
  return chk.detail ? `${base} (${chk.detail})` : base;
}
function statusWord(status: CheckStatus): string {
  return status === 'pass' ? c.statusPass : status === 'fail' ? c.statusFail : c.statusNa;
}

export default function PublishReadinessCard({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const { data, error, isLoading } = useSWR<ChecklistResponse>(
    productId ? `/api/products/${productId}/publish-checklist` : null,
    fetcher,
  );

  const header = (
    <div className="flex items-center gap-2">
      <ShieldCheck className="w-5 h-5 text-slate-500" />
      <h2 className="text-lg font-semibold text-gray-800">{c.title}</h2>
    </div>
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {header}
        <p className="mt-3 flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" /> {c.loading}
        </p>
      </div>
    );
  }

  if (error || !data?.success || !data.readiness) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {header}
        <p className="mt-3 text-sm text-gray-600">{c.error}</p>
      </div>
    );
  }

  const { ready, passed, total, checks } = data.readiness;
  const registered = !!data.registered;
  const badge = c.badge.replace('{passed}', String(passed)).replace('{total}', String(total));

  // Remaining (non-na) failing items — the "왜 발행 불가" reason for the operator.
  const remaining = checks.filter((chk) => chk.status === 'fail');
  const reasonText = remaining.map((chk) => checkLabel(chk.key)).join(', ');

  const readyTone = ready
    ? { text: '#047857', bg: '#ECFDF5', border: '#A7F3D0' }
    : { text: '#B45309', bg: '#FFFBEB', border: '#FDE68A' };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        {header}
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ color: readyTone.text, backgroundColor: readyTone.bg, border: `1px solid ${readyTone.border}` }}
        >
          {badge}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ color: readyTone.text, backgroundColor: readyTone.bg, border: `1px solid ${readyTone.border}` }}
        >
          {ready ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          {registered ? c.registered : ready ? c.readyYes : c.readyNo}
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {open ? c.collapse : c.expand}
        </button>
      </div>

      {open && (
        <ul className="mt-4 space-y-2">
          {checks.map((chk) => {
            const Icon = STATUS_ICON[chk.status];
            const col = STATUS_COLOR[chk.status];
            return (
              <li
                key={chk.key}
                className="flex items-start gap-2 rounded-lg px-3 py-2"
                style={{ backgroundColor: col.bg, border: `1px solid ${col.border}` }}
              >
                <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: col.text }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{checkLabel(chk.key)}</span>
                    <span className="text-[11px] font-medium" style={{ color: col.text }}>
                      {statusWord(chk.status)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{checkMessage(chk)}</p>
                </div>
                {chk.status === 'fail' && (
                  <a
                    href={chk.fixHref}
                    className="shrink-0 inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-medium text-pink-600 hover:bg-pink-50"
                  >
                    {c.fix} <ArrowRight className="w-3 h-3" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Publish CTA — links to the pre-publish review screen (irreversible GO
          lives there, #46). Disabled with the remaining items as the reason. */}
      <div className="mt-4">
        {ready ? (
          <a
            href={`/products/${productId}/preview`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <ShieldCheck className="w-4 h-4" /> {c.publishCta}
          </a>
        ) : (
          <div>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-400 cursor-not-allowed"
              title={c.publishDisabledHint}
            >
              <ShieldCheck className="w-4 h-4" /> {c.publishCta}
            </button>
            {reasonText && (
              <p className="mt-1.5 text-xs text-amber-700">
                {c.reasonPrefix}: {reasonText}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
