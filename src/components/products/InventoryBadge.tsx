// src/components/products/InventoryBadge.tsx
// ============================================================================
// Sprint 6-A UI: Inline stock badge for /products warehouse rows.
//
// Visual spec (senior decision):
//   - Compact pill: "재고 23개" + colored dot (green/yellow/orange/red)
//   - Untrustworthy supplier: ShieldOff icon + grayscale + tooltip
//   - Non-active status: red pill + status label (sold out / stopped / hidden)
//   - Hover tooltip: relative time since last poll
//   - Empty data: render nothing (cold start safe)
//
// Korean strings live in InventoryBadge.strings.ko.json per work principle #35.
// ============================================================================

import { ShieldOff } from 'lucide-react';
import strings from './InventoryBadge.strings.ko.json';
import type { InventoryBadgeData } from '@/lib/hooks/useInventoryBadges';

type Level = 'green' | 'yellow' | 'orange' | 'red';

const STATUS_ACTIVE = '\uD310\uB9E4\uC911'; // 판매중

const COLOR_BY_LEVEL: Record<Level, { fg: string; bg: string; border: string; dot: string }> = {
  green:  { fg: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', dot: '#16a34a' },
  yellow: { fg: '#a16207', bg: '#fefce8', border: '#fde68a', dot: '#eab308' },
  orange: { fg: '#9a3412', bg: '#fff7ed', border: '#fed7aa', dot: '#f97316' },
  red:    { fg: '#991b1b', bg: '#fef2f2', border: '#fecaca', dot: '#dc2626' },
};

const UNTRUSTWORTHY_COLOR = { fg: '#525252', bg: '#fafafa', border: '#d4d4d4', dot: '#737373' };

function pickLevel(inv: InventoryBadgeData): Level {
  if (inv.status && inv.status !== STATUS_ACTIVE && inv.status !== 'unknown') return 'red';
  if (inv.alertLevel === 'red') return 'red';
  if (inv.alertLevel === 'orange') return 'orange';
  if (inv.alertLevel === 'yellow') return 'yellow';
  return 'green';
}

function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return strings.label.unknownPoll;
  const diffMin = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (diffMin < 1) return strings.tooltip.justNow;
  if (diffMin < 60) return `${diffMin}${strings.tooltip.minutesAgoSuffix}`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}${strings.tooltip.hoursAgoSuffix}`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}${strings.tooltip.daysAgoSuffix}`;
}

function statusLabel(status: string): string {
  // Map known non-active dome statuses to user-facing words.
  // Anything else falls back to the raw status (e.g. "검토중").
  if (status === '\uD488\uC808') return strings.statusBadge.soldOut;        // 품절
  if (status === '\uD310\uB9E4\uC911\uC9C0') return strings.statusBadge.stopped; // 판매중지
  if (status === '\uBE44\uACF5\uAC1C') return strings.statusBadge.hidden;   // 비공개
  if (status === 'unknown') return strings.label.unknownStatus;
  return status;
}

export interface InventoryBadgeProps {
  inv: InventoryBadgeData;
}

export default function InventoryBadge({ inv }: InventoryBadgeProps) {
  const level = pickLevel(inv);
  const palette = inv.isTrustworthy ? COLOR_BY_LEVEL[level] : UNTRUSTWORTHY_COLOR;
  const isNonActive = inv.status && inv.status !== STATUS_ACTIVE && inv.status !== 'unknown';
  const relTime = formatRelativeTime(inv.polledAt);

  const tooltipParts: string[] = [];
  tooltipParts.push(`${strings.tooltip.polledAtPrefix}: ${relTime}`);
  if (!inv.isTrustworthy) tooltipParts.push(strings.untrustworthy.tooltip);
  if (inv.alertLevel && level !== 'green') {
    tooltipParts.push(`${strings.level[inv.alertLevel]} \u00B7 ${inv.alertThreshold ?? 0} \uC774\uD558`); // 단순 임계 표시
  }
  const title = tooltipParts.join('\n');

  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1,
        color: palette.fg,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 6,
        padding: '2px 6px',
        whiteSpace: 'nowrap',
      }}
    >
      {!inv.isTrustworthy && <ShieldOff size={9} style={{ color: palette.fg, flexShrink: 0 }} />}
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: palette.dot,
          flexShrink: 0,
        }}
      />
      <span>
        {isNonActive
          ? statusLabel(inv.status)
          : `${strings.label.qtyPrefix} ${inv.qty}${strings.label.qtyUnit}`}
      </span>
    </span>
  );
}
