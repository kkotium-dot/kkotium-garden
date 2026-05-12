// src/components/automation/AutomationGroup.tsx
// Phase 1: group of automations with header + rows.

'use client';

import AutomationRow, { type AutomationRowData } from './AutomationRow';
import strings from '@/lib/i18n/automation-strings.ko.json';
import type { AutomationGroupId } from '@/lib/automation-registry';

interface Props {
  group: AutomationGroupId;
  rows: AutomationRowData[];
}

function getGroupLabel(group: AutomationGroupId): string {
  const labels = strings.group as Record<string, string>;
  return labels[group] ?? group;
}

function getGroupHint(group: AutomationGroupId): string {
  const hints = strings.groupHint as Record<string, string>;
  return hints[group] ?? '';
}

export default function AutomationGroup({ group, rows }: Props) {
  if (rows.length === 0) return null;
  return (
    <section
      className="kk-card"
      style={{ overflow: 'hidden', marginBottom: 16 }}
    >
      <header
        style={{
          padding: '14px 18px 10px',
          borderBottom: '1px solid #F8DCE5',
          background: '#fff',
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
          {getGroupLabel(group)} <span style={{ color: '#B0A0A8', fontWeight: 600 }}>({rows.length})</span>
        </p>
        <p style={{ fontSize: 11, color: '#B0A0A8', margin: '3px 0 0' }}>
          {getGroupHint(group)}
        </p>
      </header>
      <div>
        {rows.map((row) => (
          <AutomationRow key={row.id} data={row} />
        ))}
      </div>
    </section>
  );
}
