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

import { ShieldOff, Unplug, PackageX, PauseCircle } from 'lucide-react';
import strings from './InventoryBadge.strings.ko.json';
import dispositionCopy from '@/lib/products/disposition.strings.ko.json';
import {
  decideDisposition,
  hasDisposition,
  type DispositionAction,
  type DispositionInput,
  type DispositionVerdict,
} from '@/lib/products/disposition';
import { BADGE_PRIORITY } from '@/components/common/badge-priority';
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
const POLL_FAILED_COLOR = { fg: '#525252', bg: '#f5f5f4', border: '#d6d3d1', dot: '#a8a29e' };

// 처분 권고 팔레트(#273). 색이 곧 "얼마나 급한가"다:
//   자주빛 — 공급처가 사라진 상품(재고 문제가 아니라 상품 자체를 정리할 때)
//   빨강  — 지금 주문 들어오면 취소해야 하는 상태(취소율 = 스토어 등급 손상)
//   주황  — 당장 사고는 안 나지만 순위가 서서히 깎이는 상태
const DISPOSITION_COLOR: Record<Exclude<DispositionAction, 'NONE'>, { fg: string; bg: string; border: string; dot: string }> = {
  RESOURCE:          { fg: '#86198f', bg: '#fdf4ff', border: '#f5d0fe', dot: '#a21caf' },
  DELETE_SAFE:       { fg: '#86198f', bg: '#fdf4ff', border: '#f5d0fe', dot: '#a21caf' },
  MARK_OUT_OF_STOCK: { fg: '#991b1b', bg: '#fef2f2', border: '#fecaca', dot: '#dc2626' },
  SUSPEND:           { fg: '#9a3412', bg: '#fff7ed', border: '#fed7aa', dot: '#f97316' },
};

const DISPOSITION_ICON: Record<Exclude<DispositionAction, 'NONE'>, typeof Unplug> = {
  RESOURCE: Unplug,
  DELETE_SAFE: Unplug,
  MARK_OUT_OF_STOCK: PackageX,
  SUSPEND: PauseCircle,
};

// qty=-1 is an explicit sentinel from the Domeggook adapter meaning "could not
// look up this product" (getItemView returned no match), not a real stock
// count. Never render it as a number — conflates polling failure with a real
// zero/negative stock (work principle #260). Same treatment for any negative
// qty defensively, since the sentinel contract could shift.
function isPollFailure(inv: InventoryBadgeData): boolean {
  return inv.qty < 0 || inv.status === 'unknown';
}

function pickLevel(inv: InventoryBadgeData): Level {
  if (isPollFailure(inv)) return 'red';
  if (inv.status && inv.status !== STATUS_ACTIVE) return 'red';
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

// Sourcing thresholds (operator decision 2026-07-18, work principle #269).
// Rationale: one listing costs ~40min of work (images + name + detail page).
// Under 20 units the listing burns its 7-day new-product boost and dies before
// payback; the rank never recovers after a restock. So the garden view asks
// "is this worth 40 minutes?" rather than "how many are left?".
const SOURCING_PLENTY_MIN = 100;
const SOURCING_TIGHT_MIN = 20;

type SourcingLevel = 'plenty' | 'tight' | 'risky' | 'soldOut' | 'unknown';

function pickSourcingLevel(inv: InventoryBadgeData): SourcingLevel {
  if (isPollFailure(inv)) return 'unknown';
  if (inv.status && inv.status !== STATUS_ACTIVE) return 'soldOut';
  if (inv.qty <= 0) return 'soldOut';
  if (inv.qty >= SOURCING_PLENTY_MIN) return 'plenty';
  if (inv.qty >= SOURCING_TIGHT_MIN) return 'tight';
  return 'risky';
}

const SOURCING_COLOR: Record<SourcingLevel, { fg: string; bg: string; border: string; dot: string }> = {
  plenty:  COLOR_BY_LEVEL.green,
  tight:   COLOR_BY_LEVEL.yellow,
  risky:   COLOR_BY_LEVEL.orange,
  soldOut: COLOR_BY_LEVEL.red,
  unknown: POLL_FAILED_COLOR,
};

/**
 * 처분 권고 판정에 필요한 상품 측 입력(#273). 재고 측 입력(sourceGone·qty·
 * status·daysOutOfStock)은 `inv`에서 자동으로 채우므로 여기서 받지 않는다 —
 * 호출부가 필드를 빠뜨려 권고가 조용히 틀리는 일을 구조적으로 막는다.
 */
export type DispositionProduct = Pick<
  DispositionInput,
  'salesCount' | 'lastSaleDate' | 'naverProductId' | 'naverStatusType'
>;

export interface InventoryBadgeProps {
  inv: InventoryBadgeData;
  /**
   * 'selling' (default) — 꽃밭 돌보기: 실제 재고 수량이 판매 가능 여부를 뜻함.
   * 'sourcing' — 정원 창고: 아직 안 올린 상품. 수량 자체보다 "40분 들여 올릴
   *   가치가 있나"가 질문이므로 숫자 대신 판단(신호등)을 노출한다.
   */
  mode?: 'selling' | 'sourcing';
  /**
   * 처분 권고(#273) 판정용 상품 정보. 주면 배지가 재고 상태 대신 "무엇을 할지"를
   * 말한다(품절 처리 / 판매중지 / 대체 소싱 / 삭제). 없으면 기존 재고 배지 그대로.
   */
  product?: DispositionProduct;
}

/**
 * 이 배지가 배지 레일에서 가져야 할 우선순위(#274). 처분 권고가 붙은 재고 배지는
 * 단순 재고 표시와 급수가 다르다 — 전자는 사고 직결, 후자는 사실 정보.
 * 판정은 disposition.ts 단일 권위를 그대로 쓴다(#62·#273).
 */
export function inventoryBadgeRank(inv: InventoryBadgeData, product?: DispositionProduct): number {
  const v = decideDisposition({
    ...product,
    sourceGone: inv.sourceGone,
    qty: inv.qty,
    supplierStatus: inv.status,
    daysOutOfStock: inv.daysOutOfStock,
  });
  return hasDisposition(v) ? BADGE_PRIORITY.disposition : BADGE_PRIORITY.stock;
}

export default function InventoryBadge({ inv, mode = 'selling', product }: InventoryBadgeProps) {
  // 처분 권고는 재고 신호보다 상위다 — 운영자가 알아야 할 건 "재고 몇 개"가
  // 아니라 "그래서 뭘 해야 하나"이기 때문. 배지 개수는 늘리지 않고 같은 자리에서
  // 문구만 승격한다(#233 과밀 방지).
  const verdict = decideDisposition({
    ...product,
    sourceGone: inv.sourceGone,
    qty: inv.qty,
    supplierStatus: inv.status,
    daysOutOfStock: inv.daysOutOfStock,
  });
  if (hasDisposition(verdict)) return <DispositionBadge inv={inv} mode={mode} verdict={verdict} />;
  if (mode === 'sourcing') return <SourcingBadge inv={inv} />;
  return <SellingBadge inv={inv} />;
}

// 처분 권고 배지(#273 · 전상품 범용 #55). 재고 숫자가 아니라 "그래서 뭘 해야
// 하나"를 말한다. 툴팁에 근거(왜 이 권고인가)와 꼬띠 보이스를 함께 실어, 배지
// 하나로 판단→근거→행동이 끊기지 않게 한다.
function DispositionBadge({ inv, mode, verdict }: { inv: InventoryBadgeData; mode: 'selling' | 'sourcing'; verdict: DispositionVerdict }) {
  const action = verdict.action as Exclude<DispositionAction, 'NONE'>;
  const p = DISPOSITION_COLOR[action];
  const Icon = DISPOSITION_ICON[action];
  const copy = dispositionCopy[action];
  const relTime = formatRelativeTime(inv.polledAt);

  // 품절 권고는 "며칠째"가 붙어야 운영자가 체감한다 (3일째 품절 vs 21일째 품절).
  const days = verdict.daysOutOfStock;
  const label = days !== null && (action === 'MARK_OUT_OF_STOCK' || action === 'SUSPEND')
    ? `${copy.label} ${days}${dispositionCopy.daysSuffix}`
    : copy.label;

  const title = [copy.tooltip, '', copy.voice, '', `${strings.tooltip.polledAtPrefix}: ${relTime}`].join('\n');

  // 소싱(정원) 뷰는 라벨만 — 아직 안 올린 상품에 스토어 조치를 권할 수 없다.
  // 판매(꽃밭) 뷰는 라벨 + 권장 액션까지.
  const text = mode === 'sourcing' ? dispositionCopy.sourcingLabel : `${label} · ${copy.action}`;

  return (
    <span
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10, fontWeight: 700, lineHeight: 1,
        color: p.fg, background: p.bg, border: `1px solid ${p.border}`,
        borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap', cursor: 'help',
      }}
    >
      <Icon size={9} style={{ color: p.fg, flexShrink: 0 }} />
      <span>{text}</span>
    </span>
  );
}

// 정원 창고 — 소싱 판단 신호등. 숫자는 툴팁으로 내리고 판단을 앞에 둔다(3초 룰).
function SourcingBadge({ inv }: { inv: InventoryBadgeData }) {
  const level = pickSourcingLevel(inv);
  const palette = !inv.isTrustworthy && level !== 'unknown' ? UNTRUSTWORTHY_COLOR : SOURCING_COLOR[level];
  const relTime = formatRelativeTime(inv.polledAt);

  const lines: string[] = [strings.sourcingVoice[level], ''];
  if (level !== 'unknown' && level !== 'soldOut') {
    lines.push(`${strings.label.qtyPrefix} ${inv.qty}${strings.label.qtyUnit} (${strings.sourcingHint[level]})`);
  }
  if (!inv.isTrustworthy && level !== 'unknown') lines.push(strings.untrustworthy.tooltip);
  if (level === 'unknown') lines.push(strings.pollFailed.tooltip);
  lines.push(`${strings.tooltip.polledAtPrefix}: ${relTime}`);

  return (
    <span
      title={lines.join('\n')}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10, fontWeight: 700, lineHeight: 1,
        color: palette.fg, background: palette.bg,
        border: `1px solid ${palette.border}`, borderRadius: 6,
        padding: '2px 6px', whiteSpace: 'nowrap', cursor: 'help',
      }}
    >
      {!inv.isTrustworthy && level !== 'unknown' && (
        <ShieldOff size={9} style={{ color: palette.fg, flexShrink: 0 }} />
      )}
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: palette.dot, flexShrink: 0 }} />
      <span>{strings.sourcing[level]}</span>
    </span>
  );
}

// 꽃밭 돌보기 — 기존 판매 재고 배지(회귀 방지를 위해 로직 그대로 보존).
function SellingBadge({ inv }: InventoryBadgeProps) {
  const pollFailed = isPollFailure(inv);
  const level = pickLevel(inv);
  const palette = pollFailed
    ? POLL_FAILED_COLOR
    : inv.isTrustworthy
      ? COLOR_BY_LEVEL[level]
      : UNTRUSTWORTHY_COLOR;
  const isNonActive = !pollFailed && inv.status && inv.status !== STATUS_ACTIVE && inv.status !== 'unknown';
  const relTime = formatRelativeTime(inv.polledAt);

  const tooltipParts: string[] = [];
  tooltipParts.push(`${strings.tooltip.polledAtPrefix}: ${relTime}`);
  if (pollFailed) tooltipParts.push(strings.pollFailed.tooltip);
  if (!pollFailed && !inv.isTrustworthy) tooltipParts.push(strings.untrustworthy.tooltip);
  if (!pollFailed && inv.alertLevel && level !== 'green') {
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
      {!pollFailed && !inv.isTrustworthy && <ShieldOff size={9} style={{ color: palette.fg, flexShrink: 0 }} />}
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
        {pollFailed
          ? strings.label.pollFailed
          : isNonActive
            ? statusLabel(inv.status)
            : `${strings.label.qtyPrefix} ${inv.qty}${strings.label.qtyUnit}`}
      </span>
    </span>
  );
}
