// src/app/automation/page.tsx
// ============================================================================
// Phase 1: 자동화 관제 — single-screen view of all known automations.
// Pulls registry + best-effort live signals from /api/automation/registry.
// No interactivity in Phase 1: read-only display of status, frequency, last run.
// Future phases add per-row drill modal, manual trigger, full execution log.
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { Workflow, Loader2, RefreshCw } from 'lucide-react';
import AutomationGroup from '@/components/automation/AutomationGroup';
import type { AutomationRowData } from '@/components/automation/AutomationRow';
import strings from '@/lib/i18n/automation-strings.ko.json';
import {
  AUTOMATION_GROUP_ORDER,
  type AutomationGroupId,
} from '@/lib/automation-registry';

interface RegistryResponse {
  ok: boolean;
  automations: AutomationRowData[];
  summary: {
    active: number;
    pending: number;
    hold: number;
    preparing: number;
  };
  context: {
    last30DaysOrders: number;
    alimtalkThreshold: number;
    solapiConfigured: boolean;
    discordConfiguredCount: number;
    discordTotalCount: number;
    generatedAt: string;
  };
}

function relativeFromNow(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diffSec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (diffSec < 60) return `${diffSec}초 전`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.round(diffMin / 60);
  return `${diffHr}시간 전`;
}

function SummaryPill({
  label, value, palette,
}: {
  label: string; value: number;
  palette: { bg: string; border: string; color: string };
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 14px',
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 12,
        minWidth: 76,
      }}
    >
      <span style={{ fontSize: 22, fontWeight: 900, color: palette.color, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, color: palette.color, marginTop: 4 }}>
        {label}
      </span>
    </div>
  );
}

export default function AutomationPage() {
  const [data, setData] = useState<RegistryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRegistry = async () => {
    try {
      const res = await fetch('/api/automation/registry', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as RegistryResponse;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Loader2 size={20} className="animate-spin" style={{ color: '#e62310' }} />
        <span style={{ fontSize: 14, color: '#666' }}>불러오는 중…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#b91c1c', fontWeight: 600 }}>오류: {error ?? '알 수 없음'}</p>
        <button
          onClick={() => { setLoading(true); fetchRegistry(); }}
          style={{
            marginTop: 12, padding: '8px 16px',
            background: '#e62310', color: '#fff', border: 'none', borderRadius: 8,
            cursor: 'pointer', fontWeight: 700,
          }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  const { automations, summary, context } = data;
  const groupedRows: Record<AutomationGroupId, AutomationRowData[]> = {
    inventory:    [],
    price:        [],
    competition:  [],
    seo:          [],
    trust:        [],
    notification: [],
    cron:         [],
    private:      [],
    p3:           [],
  };
  for (const row of automations) {
    const g = row.group as AutomationGroupId;
    if (groupedRows[g]) groupedRows[g].push(row);
  }

  return (
    <div style={{ padding: '24px 28px 60px', maxWidth: 1100, margin: '0 auto' }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: '#fff0f5', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Workflow size={22} style={{ color: '#e62310' }} strokeWidth={2.4} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>
              {strings.page.title}
            </h1>
            <p style={{ fontSize: 12, color: '#B0A0A8', margin: '3px 0 0' }}>
              {strings.page.subtitle}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#B0A0A8' }}>
            {strings.page.lastSync} {relativeFromNow(context.generatedAt)}
          </span>
          <button
            onClick={() => { setRefreshing(true); fetchRegistry(); }}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px',
              background: '#fff', color: '#e62310',
              border: '1.5px solid #FFB3CE', borderRadius: 8,
              cursor: refreshing ? 'wait' : 'pointer',
              fontSize: 12, fontWeight: 700,
            }}
          >
            {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {strings.page.refresh}
          </button>
        </div>
      </header>

      {/* ── Summary pills ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <SummaryPill
          label={strings.summary.active}
          value={summary.active}
          palette={{ bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' }}
        />
        <SummaryPill
          label={strings.summary.pending}
          value={summary.pending}
          palette={{ bg: '#f3f4f6', border: '#d1d5db', color: '#4b5563' }}
        />
        <SummaryPill
          label={strings.summary.hold}
          value={summary.hold}
          palette={{ bg: '#fefce8', border: '#fde68a', color: '#a16207' }}
        />
        <SummaryPill
          label={strings.summary.preparing}
          value={summary.preparing}
          palette={{ bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' }}
        />
      </div>

      {/* ── Context line ────────────────────────────────────────────────────── */}
      <div
        className="kk-card"
        style={{
          padding: '12px 18px',
          marginBottom: 20,
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
          fontSize: 12,
          color: '#444',
        }}
      >
        <span>
          <b style={{ color: '#1A1A1A' }}>{strings.summary.discordConfigured}</b>: {context.discordConfiguredCount}{strings.summary.discordOf}{context.discordTotalCount}
        </span>
        <span>
          <b style={{ color: '#1A1A1A' }}>{strings.summary.alimtalkContext}</b>: {context.last30DaysOrders}{strings.summary.alimtalkOrders} ({strings.summary.alimtalkThreshold} {context.alimtalkThreshold}{strings.summary.alimtalkOrders})
        </span>
      </div>

      {/* ── Groups ──────────────────────────────────────────────────────────── */}
      {AUTOMATION_GROUP_ORDER.map((g) => (
        <AutomationGroup key={g} group={g} rows={groupedRows[g]} />
      ))}
    </div>
  );
}
