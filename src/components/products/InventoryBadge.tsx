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

import { ShieldOff, Unplug } from 'lucide-react';
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
const POLL_FAILED_COLOR = { fg: '#525252', bg: '#f5f5f4', border: '#d6d3d1', dot: '#a8a29e' };
// 공급처 단절 — 삭제 권장. 활성 재고 긴급(빨강)과 구별되는 자주빛(action-needed)
// 톤으로, "이건 재고 문제가 아니라 상품 자체를 정리할 때"임을 색으로 구분한다.
const SOURCE_GONE_COLOR = { fg: '#86198f', bg: '#fdf4ff', border: '#f5d0fe', dot: '#a21caf' };

// 공급처 단절은 일시적 폴링 실패보다 상위 신호다. 두 배지(판매/소싱) 모두
// 이 상태를 최우선으로 렌더한다(#55 전상품 범용).
function isSourceGone(inv: InventoryBadgeData): boolean {
  return inv.sourceGone === true;
}

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

export interface InventoryBadgeProps {
  inv: InventoryBadgeData;
  /**
   * 'selling' (default) — 꽃밭 돌보기: 실제 재고 수량이 판매 가능 여부를 뜻함.
   * 'sourcing' — 정원 창고: 아직 안 올린 상품. 수량 자체보다 "40분 들여 올릴
   *   가치가 있나"가 질문이므로 숫자 대신 판단(신호등)을 노출한다.
   */
  mode?: 'selling' | 'sourcing';
  /**
   * 지켜야 할 판매 자산(리뷰·검색순위·판매이력)이 있는지(#272).
   * true면 공급처 단절 시에도 "삭제"가 아니라 "대체 소싱"을 권한다 —
   * 삭제하면 상품 URL에 쌓인 리뷰·순위가 영구 소멸하기 때문.
   */
  hasSalesAssets?: boolean;
}

export default function InventoryBadge({ inv, mode = 'selling', hasSalesAssets = false }: InventoryBadgeProps) {
  // 공급처 단절은 판매/소싱 모드 무관하게 동일 신호 — 최우선 분기(#55).
  if (isSourceGone(inv)) return <SourceGoneBadge inv={inv} mode={mode} hasSalesAssets={hasSalesAssets} />;
  if (mode === 'sourcing') return <SourcingBadge inv={inv} />;
  return <SellingBadge inv={inv} />;
}

// 공급처 단절 · 삭제 권장 배지 (전상품 범용). 재고 신호가 아니라 "이 상품은
// 다시 못 들여오니 정리하세요"라는 운영 신호. 목록 어디서든 동일하게 보인다.
function SourceGoneBadge({ inv, mode, hasSalesAssets }: { inv: InventoryBadgeData; mode: 'selling' | 'sourcing'; hasSalesAssets: boolean }) {
  const p = SOURCE_GONE_COLOR;
  const relTime = formatRelativeTime(inv.polledAt);
  // 자산 보호(#272): 판매 이력이 있으면 삭제하면 리뷰·순위가 함께 사라지므로
  // "대체 소싱"을 권한다. 이력이 없는 미판매 상품만 삭제를 권한다.
  const tooltip = hasSalesAssets ? strings.sourceGone.tooltipKeep : strings.sourceGone.tooltip;
  const voice = hasSalesAssets ? strings.sourceGone.voiceKeep : strings.sourceGone.voice;
  const action = hasSalesAssets ? strings.sourceGone.actionKeep : strings.sourceGone.action;
  const title = [tooltip, '', voice, '', `${strings.tooltip.polledAtPrefix}: ${relTime}`].join('\n');
  // 소싱(정원) 뷰는 라벨만, 판매(꽃밭) 뷰는 라벨+권장 액션까지.
  const text = mode === 'sourcing'
    ? strings.sourceGone.sourcingLabel
    : `${strings.sourceGone.label} · ${action}`;
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
      <Unplug size={9} style={{ color: p.fg, flexShrink: 0 }} />
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
