// src/components/automation/StatusBadge.tsx
// Phase 1: small pill badge for automation status (active / pending / hold / preparing).

import type { AutomationStatus } from '@/lib/automation-registry';
import strings from '@/lib/i18n/automation-strings.ko.json';

interface Props {
  status: AutomationStatus;
  size?: 'sm' | 'md';
}

const PALETTE: Record<AutomationStatus, { bg: string; border: string; color: string }> = {
  active:    { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
  pending:   { bg: '#f3f4f6', border: '#d1d5db', color: '#4b5563' },
  hold:      { bg: '#fefce8', border: '#fde68a', color: '#a16207' },
  preparing: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
};

export default function StatusBadge({ status, size = 'md' }: Props) {
  const p = PALETTE[status];
  const label = strings.status[status];
  const fontSize = size === 'sm' ? 10 : 11;
  const padding = size === 'sm' ? '2px 7px' : '3px 9px';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize,
        fontWeight: 700,
        padding,
        borderRadius: 999,
        background: p.bg,
        color: p.color,
        border: `1px solid ${p.border}`,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}
