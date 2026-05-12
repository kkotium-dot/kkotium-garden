// src/components/automation/AutomationRow.tsx
// Phase 1: single row showing an automation's status + metadata.
// Click row to reveal inline description (no modal in Phase 1 — keep simple).

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import strings from '@/lib/i18n/automation-strings.ko.json';
import type { AutomationStatus } from '@/lib/automation-registry';

export interface AutomationRowData {
  id: string;
  group: string;
  nameKey: string;
  code?: string;
  frequency: string;
  schedule?: string;
  status: AutomationStatus;
  activationCondition?: string;
  targetPhase?: string;
  togglable: boolean;
  descriptionKey?: string;
  lastRun: string | null;
  envOk: boolean;
}

function relativeTime(iso: string | null): string {
  if (!iso) return strings.row.neverRun;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return strings.row.neverRun;
  const diffMin = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}일 전`;
}

function getName(nameKey: string): string {
  const names = strings.name as Record<string, string>;
  return names[nameKey] ?? nameKey;
}

function getDescription(descriptionKey: string | undefined): string {
  if (!descriptionKey) return '';
  const desc = strings.description as Record<string, string>;
  return desc[descriptionKey] ?? '';
}

function getFrequencyLabel(frequency: string): string {
  const freq = strings.frequency as Record<string, string>;
  return freq[frequency] ?? frequency;
}

function getActivationLabel(cond: string | undefined): string {
  if (!cond) return '';
  const activation = strings.activation as Record<string, string>;
  return activation[cond] ?? cond;
}

export default function AutomationRow({ data }: { data: AutomationRowData }) {
  const [expanded, setExpanded] = useState(false);
  const Chevron = expanded ? ChevronDown : ChevronRight;
  const description = getDescription(data.descriptionKey);
  const showEnvWarn = !data.envOk;

  return (
    <div
      style={{
        borderBottom: '1px solid #F8DCE5',
        background: '#fff',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '20px minmax(160px, 1.5fr) 80px minmax(110px, 0.9fr) minmax(110px, 0.9fr) 60px',
          gap: 12,
          alignItems: 'center',
          padding: '12px 18px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff5f8'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <Chevron size={14} style={{ color: '#B0A0A8' }} />

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>
              {getName(data.nameKey)}
            </span>
            {data.code && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#B0A0A8',
                background: '#F8DCE5', padding: '2px 6px', borderRadius: 4,
                lineHeight: 1,
              }}>
                {data.code}
              </span>
            )}
            {showEnvWarn && (
              <AlertCircle size={12} style={{ color: '#f97316' }} aria-label="env-missing" />
            )}
          </div>
          {data.activationCondition && data.status !== 'active' && (
            <p style={{ fontSize: 11, color: '#B0A0A8', margin: '3px 0 0' }}>
              {getActivationLabel(data.activationCondition)}
            </p>
          )}
        </div>

        <StatusBadge status={data.status} size="sm" />

        <span style={{ fontSize: 11, color: '#666' }}>
          {getFrequencyLabel(data.frequency)}
          {data.schedule && <span style={{ color: '#B0A0A8', marginLeft: 4 }}>({data.schedule})</span>}
        </span>

        <span style={{ fontSize: 11, color: '#666' }}>
          {data.lastRun ? `${strings.row.lastRun} ${relativeTime(data.lastRun)}` : (data.frequency === 'on-event' || data.frequency === 'on-register' || data.frequency === 'on-order' ? strings.row.noSchedule : strings.row.neverRun)}
        </span>

        <span style={{ fontSize: 11, fontWeight: 600, color: '#B0A0A8', textAlign: 'right' }}>
          {strings.row.detail}
        </span>
      </button>

      {expanded && (
        <div
          style={{
            padding: '10px 18px 16px 50px',
            background: '#fffafc',
            borderTop: '1px solid #F8DCE5',
            fontSize: 12,
            color: '#444',
            lineHeight: 1.6,
          }}
        >
          {description && <p style={{ margin: '0 0 8px' }}>{description}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 11, color: '#B0A0A8' }}>
            {data.targetPhase && (
              <span><b style={{ color: '#666' }}>{strings.row.phase}:</b> {data.targetPhase}</span>
            )}
            {data.lastRun && (
              <span><b style={{ color: '#666' }}>{strings.row.lastRun}:</b> {new Date(data.lastRun).toLocaleString('ko-KR')}</span>
            )}
            {showEnvWarn && (
              <span style={{ color: '#f97316' }}>
                {strings.envWarn.discordMissing}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
