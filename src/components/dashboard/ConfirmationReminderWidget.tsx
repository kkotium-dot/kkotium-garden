// src/components/dashboard/ConfirmationReminderWidget.tsx
// Workflow Redesign Sprint Part A3-1b (2026-05-05) — Confirmation reminder widget
//
// Purpose
//   Surfaces orders eligible for a D+3~5 purchase-confirmation reminder so
//   the seller can lift the confirmation rate (which gates settlement +
//   review eligibility). Pairs with the A3-1a backend (confirmation-pending
//   lib + API route + useConfirmationPending SWR hook).
//
// Power-seller value adds (self-judgment, beyond ROADMAP minimum)
//   1. Per-day urgency color tier (D+3 yellow, D+4 orange, D+5 red) — the
//      closer to Naver's D+8 auto-confirm, the more visually urgent.
//   2. Solapi CTA — when keys are missing, a one-click link routes to the
//      kakao settings page so activation friction is zero.
//   3. Expandable alimtalk preview — first eligible order's reminderPreview
//      is collapsed by default and can be expanded for visual QA.
//   4. Single-fetch policy — every status block (orders + solapi) comes
//      from one SWR call, so there is exactly one loading state.
//
// Hook contract: see useConfirmationPending() in src/lib/hooks/useDashboardData.ts.
// Backend response: see src/app/api/orders/confirmation-pending/route.ts.

'use client';

import { useState } from 'react';
import {
  BellRing, RefreshCw, Send, MessageSquare, ChevronRight, ChevronDown,
  Settings, Sparkles, Info, ShieldCheck, Inbox,
} from 'lucide-react';
import Link from 'next/link';
import { useConfirmationPending } from '@/lib/hooks/useDashboardData';

// ─── Response typings (mirror /api/orders/confirmation-pending) ───────────
type ReminderSignal = 'delivered_at' | 'payment_date_fallback';

interface ReminderEligibleOrder {
  productOrderId: string;
  orderNumber: string;
  customerNameMasked: string;
  customerPhone: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  daysSinceDelivery: number;
  signal: ReminderSignal;
  referenceDate: string;
  reminderPreview: string;
}

interface ConfirmationPendingData {
  orders: ReminderEligibleOrder[];
  count: number;
  primaryCount: number;
  fallbackCount: number;
  scanWindow: { fromIso: string; toIso: string };
  solapi: {
    configured: boolean;
    eligibleForActivation: boolean;
    monthlyDeliveredCount: number;
    activationThreshold: number;
    sendActive: boolean;
    progressPercent: number;
  };
}

interface ConfirmationPendingApiResponse {
  success?: boolean;
  data?: ConfirmationPendingData;
  error?: string;
}

// ─── Urgency styling per D+ day ───────────────────────────────────────────
// Tier 1 (D+3) = yellow / Tier 2 (D+4) = orange / Tier 3 (D+5) = red.
// Naver auto-confirms at D+8, so D+5 is the last meaningful reminder window.
function getUrgencyStyle(days: number): {
  bg: string;
  border: string;
  text: string;
  label: string;
} {
  if (days >= 5) {
    return { bg: '#fee2e2', border: '#fecaca', text: '#dc2626', label: '긴급' };
  }
  if (days >= 4) {
    return { bg: '#ffedd5', border: '#fed7aa', text: '#c2410c', label: '주의' };
  }
  return { bg: '#fef9c3', border: '#fde68a', text: '#ca8a04', label: '여유' };
}

// ─── Solapi state banner styling ──────────────────────────────────────────
type SolapiBanner = {
  bg: string;
  border: string;
  text: string;
  iconColor: string;
  Icon: typeof Sparkles;
  title: string;
  description: string;
  showCta: boolean;
};

function buildSolapiBanner(solapi: ConfirmationPendingData['solapi']): SolapiBanner {
  const { configured, eligibleForActivation, monthlyDeliveredCount, activationThreshold } = solapi;
  const remaining = Math.max(0, activationThreshold - monthlyDeliveredCount);

  if (!configured) {
    return {
      bg: '#fff7ed',
      border: '#fed7aa',
      text: '#c2410c',
      iconColor: '#ea580c',
      Icon: Sparkles,
      title: '지금은 미리보기만',
      description: `월 ${activationThreshold}건+ 도달 후 솔라피 키 입력하면 자동 발송 (건당 약 13원)`,
      showCta: true,
    };
  }

  if (configured && !eligibleForActivation) {
    return {
      bg: '#eff6ff',
      border: '#bfdbfe',
      text: '#1d4ed8',
      iconColor: '#2563eb',
      Icon: ShieldCheck,
      title: '키 입력됨 · 활성화 대기',
      description: `활성화까지 ${remaining}건 남음 (월 ${monthlyDeliveredCount}/${activationThreshold}건 배송완료)`,
      showCta: false,
    };
  }

  return {
    bg: '#f0fdf4',
    border: '#86efac',
    text: '#15803d',
    iconColor: '#16a34a',
    Icon: Send,
    title: '발송 가능',
    description: `솔라피 발송 활성화 — 건당 약 13원 (자동 발송 토글은 향후 추가 예정)`,
    showCta: false,
  };
}

// ─── Order row ─────────────────────────────────────────────────────────────
function OrderRow({
  order,
  expanded,
  onToggle,
}: {
  order: ReminderEligibleOrder;
  expanded: boolean;
  onToggle: () => void;
}) {
  const urgency = getUrgencyStyle(order.daysSinceDelivery);
  const isFallback = order.signal === 'payment_date_fallback';

  return (
    <div
      style={{
        borderRadius: 10,
        background: '#fff',
        border: `1px solid ${expanded ? urgency.border : '#F8DCE5'}`,
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '10px 12px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Urgency D+N pill */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 44,
            padding: '4px 6px',
            borderRadius: 8,
            background: urgency.bg,
            border: `1px solid ${urgency.border}`,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 900, color: urgency.text, lineHeight: 1 }}>
            D+{order.daysSinceDelivery}
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, color: urgency.text, marginTop: 2 }}>
            {urgency.label}
          </span>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#1A1A1A',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 220,
              }}
              title={order.productName}
            >
              {order.productName}
            </span>
            {isFallback && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 99,
                  background: '#FFE5EE',
                  color: '#FF6B8A',
                }}
                title="배송완료일 누락 — 결제일 + 3일 추정 기준"
              >
                추정
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: '#B0A0A8', margin: '2px 0 0' }}>
            {order.customerNameMasked} · {order.quantity}개 · {order.totalAmount.toLocaleString('ko-KR')}원
          </p>
        </div>

        {/* Expand icon */}
        <div style={{ flexShrink: 0, color: '#B0A0A8', display: 'flex', alignItems: 'center' }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {/* Alimtalk preview — collapsible */}
      {expanded && (
        <div
          style={{
            padding: '10px 12px 12px',
            borderTop: `1px dashed ${urgency.border}`,
            background: urgency.bg,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 6,
            }}
          >
            <MessageSquare size={11} style={{ color: urgency.text }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: urgency.text }}>
              알림톡 미리보기
            </span>
          </div>
          <pre
            style={{
              fontSize: 11,
              color: '#1A1A1A',
              background: '#fff',
              border: `1px solid ${urgency.border}`,
              borderRadius: 6,
              padding: '8px 10px',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'keep-all',
              fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
          >
            {order.reminderPreview}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Loading skeleton ──────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="kk-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <RefreshCw size={14} className="animate-spin" style={{ color: '#FFB3CE' }} />
        <p style={{ fontSize: 12, color: '#B0A0A8', margin: 0 }}>
          구매확정 리마인더 데이터 불러오는 중...
        </p>
      </div>
      <div style={{ height: 10, background: '#F8DCE5', borderRadius: 6, width: '40%', marginBottom: 8 }} />
      <div style={{ height: 52, background: '#FFF0F5', borderRadius: 10 }} />
    </div>
  );
}

// ─── Empty state (no eligible orders) ─────────────────────────────────────
function EmptyState({
  scanWindow,
  banner,
}: {
  scanWindow: ConfirmationPendingData['scanWindow'];
  banner: SolapiBanner;
}) {
  // Localize ISO scan window edges into KST date label (yyyy-mm-dd).
  const formatKstDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div style={{ padding: '20px 18px' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '28px 16px',
          borderRadius: 12,
          background: '#FFFAFB',
          border: '1px dashed #F8DCE5',
        }}
      >
        <Inbox size={28} style={{ color: '#FFB3CE' }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', margin: 0, textAlign: 'center' }}>
          D+3~5 윈도우 미확정 주문 없음
        </p>
        <p
          style={{
            fontSize: 11,
            color: '#B0A0A8',
            margin: 0,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          매출 발생 시 자동 안내됩니다.
          <br />
          스캔 창: {formatKstDate(scanWindow.fromIso)} ~ {formatKstDate(scanWindow.toIso)}
        </p>
      </div>

      {/* Solapi banner — still rendered in empty state so seller knows the policy */}
      <div
        style={{
          marginTop: 12,
          padding: '10px 12px',
          borderRadius: 10,
          background: banner.bg,
          border: `1px solid ${banner.border}`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <banner.Icon size={13} style={{ color: banner.iconColor, flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: banner.text, margin: 0 }}>
            {banner.title}
          </p>
          <p style={{ fontSize: 10, color: banner.text, margin: '3px 0 0', opacity: 0.85, lineHeight: 1.5 }}>
            {banner.description}
          </p>
          {banner.showCta && (
            <Link
              href="/settings/kakao"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 7,
                padding: '4px 10px',
                borderRadius: 6,
                background: '#fff',
                border: `1px solid ${banner.border}`,
                fontSize: 10,
                fontWeight: 700,
                color: banner.text,
                textDecoration: 'none',
              }}
            >
              <Settings size={10} />
              솔라피 키 입력하기
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main widget ───────────────────────────────────────────────────────────
export default function ConfirmationReminderWidget() {
  const { data: apiResponse, isLoading, refresh } =
    useConfirmationPending<ConfirmationPendingApiResponse>();

  // Track which order's preview is expanded (single-expand semantics).
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading && !apiResponse) {
    return <LoadingSkeleton />;
  }

  const data: ConfirmationPendingData | null = apiResponse?.success
    ? (apiResponse.data ?? null)
    : null;

  // Hard error — surface but keep the widget mounted so refresh works.
  if (!data) {
    return (
      <div className="kk-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Info size={14} style={{ color: '#FFB3CE' }} />
          <p style={{ fontSize: 12, color: '#B0A0A8', margin: 0 }}>
            구매확정 리마인더 데이터를 불러오지 못했습니다.
          </p>
          <button
            onClick={refresh}
            style={{
              marginLeft: 'auto',
              padding: 6,
              borderRadius: 8,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#B0A0A8',
            }}
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>
    );
  }

  const banner = buildSolapiBanner(data.solapi);
  const hasOrders = data.count > 0;

  // Status pill at header — mirrors the banner intent so the seller can
  // glance the widget header without scrolling to the banner.
  const headerPill: { bg: string; text: string; label: string } = (() => {
    if (!data.solapi.configured) {
      return { bg: '#FFE5EE', text: '#FF6B8A', label: '미리보기 모드' };
    }
    if (data.solapi.sendActive) {
      return { bg: '#dcfce7', text: '#15803d', label: '발송 활성' };
    }
    return { bg: '#dbeafe', text: '#1d4ed8', label: '활성화 대기' };
  })();

  return (
    <div className="kk-card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '14px 20px 12px',
          borderBottom: '1px solid #F8DCE5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <BellRing size={14} style={{ color: '#FF6B8A' }} fill="#FFE5EE" />
          <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
            구매확정 리마인더
          </p>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: 99,
              background: hasOrders ? '#fee2e2' : '#F8DCE5',
              color: hasOrders ? '#dc2626' : '#B0A0A8',
            }}
          >
            {data.count}건
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 99,
              background: headerPill.bg,
              color: headerPill.text,
            }}
          >
            {headerPill.label}
          </span>
        </div>
        <button
          onClick={refresh}
          style={{
            padding: 6,
            borderRadius: 8,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#B0A0A8',
          }}
          title="새로고침"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Body — empty state OR orders list */}
      {!hasOrders ? (
        <EmptyState scanWindow={data.scanWindow} banner={banner} />
      ) : (
        <div style={{ padding: '14px 20px 16px' }}>
          {/* Solapi banner */}
          <div
            style={{
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 10,
              background: banner.bg,
              border: `1px solid ${banner.border}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <banner.Icon size={13} style={{ color: banner.iconColor, flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: banner.text, margin: 0 }}>
                {banner.title}
              </p>
              <p style={{ fontSize: 10, color: banner.text, margin: '3px 0 0', opacity: 0.85, lineHeight: 1.5 }}>
                {banner.description}
              </p>
              {/* Activation progress bar — visible while configured but under threshold or before configuration */}
              {!data.solapi.sendActive && (
                <div style={{ marginTop: 8 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 700, color: banner.text }}>
                      활성화 진행률
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 800, color: banner.text }}>
                      {data.solapi.monthlyDeliveredCount}/{data.solapi.activationThreshold}건 ({data.solapi.progressPercent}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: 5,
                      background: '#fff',
                      borderRadius: 99,
                      overflow: 'hidden',
                      border: `1px solid ${banner.border}`,
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${data.solapi.progressPercent}%`,
                        background: banner.iconColor,
                        borderRadius: 99,
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                </div>
              )}
              {banner.showCta && (
                <Link
                  href="/settings/kakao"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 8,
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: '#fff',
                    border: `1px solid ${banner.border}`,
                    fontSize: 10,
                    fontWeight: 700,
                    color: banner.text,
                    textDecoration: 'none',
                  }}
                >
                  <Settings size={10} />
                  솔라피 키 입력하기
                </Link>
              )}
            </div>
          </div>

          {/* Order list — defensive against partial response shapes. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(Array.isArray(data.orders) ? data.orders : []).map((order) => (
              <OrderRow
                key={order.productOrderId}
                order={order}
                expanded={expandedId === order.productOrderId}
                onToggle={() =>
                  setExpandedId(expandedId === order.productOrderId ? null : order.productOrderId)
                }
              />
            ))}
          </div>

          {/* Signal mix footer hint — only when both signal types present */}
          {data.fallbackCount > 0 && (
            <div
              style={{
                marginTop: 11,
                padding: '8px 11px',
                background: '#FFFAFB',
                borderRadius: 8,
                border: '1px dashed #F8DCE5',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 6,
              }}
            >
              <Info size={11} style={{ color: '#B0A0A8', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 10, color: '#888', margin: 0, lineHeight: 1.5 }}>
                배송완료일 누락 주문 {data.fallbackCount}건은 결제일 + 3일 추정 기준입니다.
                네이버 동기화가 완료되면 자동 보정됩니다.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
