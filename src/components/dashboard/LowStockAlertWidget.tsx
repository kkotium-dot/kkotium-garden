// src/components/dashboard/LowStockAlertWidget.tsx
// ============================================================================
// Sprint 6-A UI Phase 2 + 3: triage widget for unresolved LowStockAlerts.
//
// Layout (senior decision — fastest scan for solo seller):
//   - Header with title, subtitle, active count badge, and "Poll now" trigger.
//   - Inline toast banner area (auto-dismisses after 5s).
//   - Two groups vertically stacked:
//       (1) Active alerts (trustworthy suppliers) — actionable rows.
//       (2) Untrustworthy supplier group — direct-check only, no actions.
//   - Inside (1), rows are sorted level priority DESC (red → orange → yellow),
//     then triggeredAt DESC. Level color is on the left edge stripe.
//   - Each row has 3 inline actions:
//       - 재등록 알림   → POST relist-reminder (Discord nudge + resolve)
//       - 가격 조정     → Link to /naver-seo?product={id}
//       - 품절 처리     → opens OOS confirm modal (default: app-only)
//   - "해결" toggle reveals an inline note input → PATCH resolve.
//
// Phase 3 additions:
//   - "Poll now" button: POST /api/admin/poll-inventory-now (3-min rate limit)
//   - OOS confirm modal: choose app-only or app+Naver Commerce API flip
//
// Empty state: friendly hint (no alerts is the happy path).
// Korean strings live in LowStockAlertWidget.strings.ko.json (work principle #35).
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertOctagon, AlertTriangle, Info,
  Bell, DollarSign, CircleX, CheckCircle2,
  ShieldOff, ExternalLink, Loader2, RefreshCw, X,
} from 'lucide-react';
import strings from './LowStockAlertWidget.strings.ko.json';
import { useLowStockAlerts, type LowStockAlertRow } from '@/lib/hooks/useLowStockAlerts';

// ─── Constants ──────────────────────────────────────────────────────────────

type Level = 'yellow' | 'orange' | 'red';

const LEVEL_COLOR: Record<Level, { stripe: string; pill: string; pillBg: string; pillBorder: string; icon: typeof AlertOctagon }> = {
  red:    { stripe: '#dc2626', pill: '#991b1b', pillBg: '#fef2f2', pillBorder: '#fecaca', icon: AlertOctagon },
  orange: { stripe: '#f97316', pill: '#9a3412', pillBg: '#fff7ed', pillBorder: '#fed7aa', icon: AlertTriangle },
  yellow: { stripe: '#eab308', pill: '#a16207', pillBg: '#fefce8', pillBorder: '#fde68a', icon: Info },
};

const LEVEL_PRIORITY: Record<Level, number> = { red: 3, orange: 2, yellow: 1 };

const TOAST_DURATION_MS = 5000;

// ─── Toast ──────────────────────────────────────────────────────────────────

type ToastKind = 'success' | 'error' | 'info';
interface ToastState {
  kind: ToastKind;
  message: string;
}

function ToastBanner({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  const palette: Record<ToastKind, { bg: string; border: string; color: string }> = {
    success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
    error:   { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' },
    info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
  };
  const c = palette[toast.kind];
  return (
    <div
      role="status"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        marginBottom: 10,
        fontSize: 12,
        fontWeight: 600,
        color: c.color,
      }}
    >
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={onClose}
        aria-label="close"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: c.color, padding: 2, display: 'flex',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return strings.time.justNow;
  const diffMin = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (diffMin < 1) return strings.time.justNow;
  if (diffMin < 60) return `${diffMin}${strings.time.minutesAgoSuffix}`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}${strings.time.hoursAgoSuffix}`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}${strings.time.daysAgoSuffix}`;
}

// ─── Action button (inline pill) ────────────────────────────────────────────

function ActionButton({
  icon: Icon, label, color, bg, border, onClick, disabled, busy, title,
}: {
  icon: typeof Bell;
  label: string;
  color: string;
  bg: string;
  border: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 700,
        color: disabled ? '#9ca3af' : color,
        background: disabled ? '#f9fafb' : bg,
        border: `1px solid ${disabled ? 'var(--border-neutral)' : border}`,
        borderRadius: 6,
        padding: '4px 8px',
        cursor: disabled || busy ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        whiteSpace: 'nowrap',
        transition: 'background 0.12s',
      }}
    >
      {busy
        ? <Loader2 size={11} className="animate-spin" style={{ flexShrink: 0 }} />
        : <Icon size={11} style={{ flexShrink: 0 }} />}
      <span>{label}</span>
    </button>
  );
}

// ─── OOS confirm modal ──────────────────────────────────────────────────────

function OosConfirmModal({
  productName,
  onCancel,
  onConfirm,
  busy,
}: {
  productName: string;
  onCancel: () => void;
  onConfirm: (alsoNaver: boolean) => void;
  busy: boolean;
}) {
  // Senior policy: default selection = app-only (safe). Seller must click to
  // opt in to the Naver Commerce API flip. Esc / backdrop cancels.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, busy]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={strings.oosModal.title}
      onClick={busy ? undefined : onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          padding: 20,
          maxWidth: 460,
          width: '100%',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <CircleX size={20} style={{ color: '#dc2626' }} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#111827' }}>
            {strings.oosModal.title}
          </h3>
        </div>
        <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
          <strong style={{ color: '#111827' }}>{productName}</strong>
        </p>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: '#374151', lineHeight: 1.55 }}>
          {strings.oosModal.question}
        </p>

        {/* Option A: App-only (default — auto-focused) */}
        <button
          autoFocus
          disabled={busy}
          onClick={() => onConfirm(false)}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            background: '#f0fdf4', border: '1.5px solid #86efac',
            borderRadius: 10, padding: '10px 14px', marginBottom: 8,
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#15803d' }}>
            {strings.oosModal.appOnly}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#166534', lineHeight: 1.4 }}>
            {strings.oosModal.appOnlyHint}
          </p>
        </button>

        {/* Option B: App + Naver Commerce */}
        <button
          disabled={busy}
          onClick={() => onConfirm(true)}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            background: '#fff7ed', border: '1.5px solid #fed7aa',
            borderRadius: 10, padding: '10px 14px', marginBottom: 10,
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#9a3412' }}>
            {strings.oosModal.alsoNaver}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#7c2d12', lineHeight: 1.4 }}>
            {strings.oosModal.alsoNaverHint}
          </p>
        </button>

        <p style={{ margin: '0 0 12px', fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
          {strings.oosModal.consignmentOnly}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              fontSize: 12, fontWeight: 700, color: '#6b7280',
              background: 'transparent', border: '1px solid var(--border-neutral)',
              borderRadius: 8, padding: '6px 14px',
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {strings.oosModal.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

interface RowProps {
  alert: LowStockAlertRow;
  onAction: () => void;
  onToast: (toast: ToastState) => void;
  onRequestOos: (alert: LowStockAlertRow) => void;
}

function AlertRow({ alert, onAction, onToast, onRequestOos }: RowProps) {
  const level: Level = alert.level;
  const palette = LEVEL_COLOR[level];
  const Icon = palette.icon;

  const [resolving, setResolving] = useState(false);
  const [busyAction, setBusyAction] = useState<'relist' | 'resolve' | null>(null);
  const [note, setNote] = useState('');

  async function doAction(action: 'relist' | 'resolve') {
    setBusyAction(action);
    try {
      const url =
        action === 'relist' ? `/api/alerts/${alert.id}/relist-reminder` :
                              `/api/alerts/${alert.id}/resolve`;
      const opts: RequestInit = action === 'resolve'
        ? { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolutionNote: note }) }
        : { method: 'POST' };
      const res = await fetch(url, opts);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onAction();
      setResolving(false);
      setNote('');
      onToast({
        kind: 'success',
        message: action === 'relist' ? strings.toast.relistAlertSuccess : strings.toast.resolveSuccess,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[LowStockAlertWidget] action failed', action, err);
      onToast({ kind: 'error', message: strings.toast.resolveFail });
    } finally {
      setBusyAction(null);
    }
  }

  const seoHref = `/naver-seo?product=${alert.product.id}`;

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: '12px 14px',
        background: '#fff',
        borderLeft: `4px solid ${palette.stripe}`,
        borderTop: '1px solid #f3f4f6',
        borderRight: '1px solid #f3f4f6',
        borderBottom: '1px solid #f3f4f6',
        borderRadius: 8,
      }}
    >
      {/* Level icon column */}
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        <Icon size={18} style={{ color: palette.stripe }} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Row 1: product name + level pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.3, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {alert.product.name}
          </p>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 800, color: palette.pill,
            background: palette.pillBg, border: `1px solid ${palette.pillBorder}`,
            borderRadius: 6, padding: '2px 6px', flexShrink: 0,
          }}>
            {strings.level[level]}
          </span>
        </div>

        {/* Row 2: meta strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#6b7280', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', color: '#9ca3af' }}>{alert.product.sku}</span>
          <span>
            <strong style={{ color: '#111827' }}>{strings.qty.current}</strong>{' '}
            <strong style={{ color: palette.stripe }}>{alert.currentQty}</strong>
            {strings.qty.unit}
            <span style={{ color: '#9ca3af' }}> / {strings.qty.threshold} {alert.threshold}{strings.qty.unit}</span>
          </span>
          <span>
            {alert.product.supplierName ?? strings.supplier.noSupplier}
          </span>
          <span style={{ color: '#9ca3af' }}>{relativeTime(alert.triggeredAt)}</span>
        </div>

        {/* Row 3: actions */}
        {!resolving ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <ActionButton
              icon={Bell}
              label={strings.action.relistAlert}
              color={LEVEL_COLOR.yellow.pill}
              bg={LEVEL_COLOR.yellow.pillBg}
              border={LEVEL_COLOR.yellow.pillBorder}
              title={strings.action.relistAlertHint}
              busy={busyAction === 'relist'}
              disabled={busyAction !== null && busyAction !== 'relist'}
              onClick={() => void doAction('relist')}
            />
            <Link
              href={seoHref}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 700,
                color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe',
                borderRadius: 6, padding: '4px 8px', textDecoration: 'none', whiteSpace: 'nowrap',
              }}
              title={strings.action.priceCutHint}
            >
              <DollarSign size={11} style={{ flexShrink: 0 }} />
              <span>{strings.action.priceCut}</span>
              <ExternalLink size={9} style={{ flexShrink: 0, opacity: 0.6 }} />
            </Link>
            <ActionButton
              icon={CircleX}
              label={strings.action.markOutOfStock}
              color={LEVEL_COLOR.red.pill}
              bg={LEVEL_COLOR.red.pillBg}
              border={LEVEL_COLOR.red.pillBorder}
              title={strings.action.markOutOfStockHint}
              busy={false}
              disabled={busyAction !== null}
              onClick={() => onRequestOos(alert)}
            />
            <button
              onClick={() => setResolving(true)}
              disabled={busyAction !== null}
              title={strings.action.resolveHint}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 700, color: '#374151',
                background: '#f9fafb', border: '1px solid var(--border-neutral)',
                borderRadius: 6, padding: '4px 8px',
                cursor: busyAction !== null ? 'not-allowed' : 'pointer',
                opacity: busyAction !== null ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              <CheckCircle2 size={11} style={{ flexShrink: 0 }} />
              <span>{strings.action.resolve}</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              autoFocus
              type="text"
              value={note}
              placeholder={strings.action.resolveNotePlaceholder}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void doAction('resolve');
                if (e.key === 'Escape') { setResolving(false); setNote(''); }
              }}
              style={{
                flex: 1, fontSize: 12, padding: '5px 8px',
                border: '1.5px solid #16a34a', borderRadius: 6,
                outline: 'none', background: '#f0fdf4',
              }}
            />
            <ActionButton
              icon={CheckCircle2}
              label={strings.action.resolve}
              color="#15803d"
              bg="#f0fdf4"
              border="#bbf7d0"
              busy={busyAction === 'resolve'}
              disabled={busyAction !== null && busyAction !== 'resolve'}
              onClick={() => void doAction('resolve')}
            />
            <button
              onClick={() => { setResolving(false); setNote(''); }}
              disabled={busyAction !== null}
              style={{
                fontSize: 11, color: '#6b7280',
                background: 'transparent', border: 'none',
                cursor: 'pointer', padding: '4px',
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Untrustworthy row (informational, no actions) ─────────────────────────

function UntrustworthyRow({ alert }: { alert: LowStockAlertRow }) {
  return (
    <div
      style={{
        display: 'flex', gap: 10,
        padding: '10px 14px',
        background: '#fafafa',
        border: '1px dashed #d4d4d4',
        borderRadius: 8,
      }}
    >
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        <ShieldOff size={16} style={{ color: '#737373' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#525252', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {alert.product.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#737373', marginTop: 2 }}>
          <span>{alert.product.supplierName ?? strings.supplier.noSupplier}</span>
          <span>·</span>
          <span>{strings.untrustworthy.directCheckLabel}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main widget ────────────────────────────────────────────────────────────

export default function LowStockAlertWidget() {
  const { alerts, isLoading, refresh } = useLowStockAlerts();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [polling, setPolling] = useState(false);
  const [oosTarget, setOosTarget] = useState<LowStockAlertRow | null>(null);
  const [oosBusy, setOosBusy] = useState(false);

  // Auto-dismiss toast after TOAST_DURATION_MS.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(t);
  }, [toast]);

  // Split: trustworthy supplier alerts (actionable) vs untrustworthy (direct check).
  const trustworthy: LowStockAlertRow[] = [];
  const untrustworthy: LowStockAlertRow[] = [];
  for (const a of alerts) {
    if (a.product.isTrustworthy) trustworthy.push(a);
    else untrustworthy.push(a);
  }

  // Final sort inside trustworthy: level priority DESC, then triggeredAt DESC.
  trustworthy.sort((a, b) => {
    const dp = LEVEL_PRIORITY[b.level] - LEVEL_PRIORITY[a.level];
    if (dp !== 0) return dp;
    return b.triggeredAt.localeCompare(a.triggeredAt);
  });

  const hasAny = alerts.length > 0;

  async function handlePollNow() {
    if (polling) return;
    setPolling(true);
    try {
      const res = await fetch('/api/admin/poll-inventory-now', { method: 'POST' });
      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        setToast({ kind: 'info', message: strings.toast.pollRateLimited });
        return;
      }
      if (!res.ok) {
        const errMsg = typeof data?.error === 'string' ? data.error : `HTTP ${res.status}`;
        setToast({ kind: 'error', message: `${strings.toast.pollFail} (${errMsg})` });
        return;
      }

      if (typeof data?.totalProducts === 'number' && data.totalProducts === 0) {
        setToast({ kind: 'info', message: strings.toast.pollNoProducts });
      } else {
        const newAlerts = data?.newAlerts ?? { yellow: 0, orange: 0, red: 0 };
        const newCount = (newAlerts.yellow ?? 0) + (newAlerts.orange ?? 0) + (newAlerts.red ?? 0);
        const summary =
          `${strings.toast.pollSuccess} — ` +
          `${data?.totalProducts ?? 0}${strings.qty.unit} / ` + // N products checked
          `${strings.qty.current} ${data?.snapshotsSaved ?? 0} · ` + // snapshots saved
          `new ${newCount}`;
        setToast({ kind: 'success', message: summary });
      }
      refresh();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[LowStockAlertWidget] poll failed', err);
      setToast({ kind: 'error', message: strings.toast.pollFail });
    } finally {
      setPolling(false);
    }
  }

  async function handleOosConfirm(alsoNaver: boolean) {
    if (!oosTarget || oosBusy) return;
    setOosBusy(true);
    try {
      const url = `/api/alerts/${oosTarget.id}/mark-oos${alsoNaver ? '?alsoNaver=1' : ''}`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : `HTTP ${res.status}`);

      if (alsoNaver) {
        // The API returns naverFlipped flag when alsoNaver was requested.
        const naverOk = data?.naverFlipped === true;
        setToast({
          kind: naverOk ? 'success' : 'error',
          message: naverOk ? strings.toast.outOfStockNaverSuccess : strings.toast.outOfStockNaverFail,
        });
      } else {
        setToast({ kind: 'success', message: strings.toast.outOfStockSuccess });
      }
      setOosTarget(null);
      refresh();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[LowStockAlertWidget] mark-oos failed', err);
      setToast({ kind: 'error', message: strings.toast.resolveFail });
    } finally {
      setOosBusy(false);
    }
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #F8DCE5',
        borderRadius: 16,
        padding: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8,
          background: hasAny ? '#fef2f2' : '#f0fdf4',
        }}>
          <AlertOctagon size={18} style={{ color: hasAny ? '#dc2626' : '#16a34a' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>
            {strings.header.title}
            {hasAny && (
              <span style={{
                marginLeft: 8, fontSize: 11, fontWeight: 800,
                color: '#dc2626', background: '#fef2f2',
                border: '1px solid #fecaca', borderRadius: 99,
                padding: '1px 8px',
              }}>
                {alerts.length}
              </span>
            )}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
            {strings.header.subtitle}
          </p>
        </div>
        <button
          onClick={() => void handlePollNow()}
          disabled={polling}
          title={strings.header.pollNowHint}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 700,
            color: polling ? '#9ca3af' : '#1d4ed8',
            background: polling ? '#f9fafb' : '#eff6ff',
            border: `1px solid ${polling ? 'var(--border-neutral)' : '#bfdbfe'}`,
            borderRadius: 6, padding: '4px 10px',
            cursor: polling ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {polling
            ? <Loader2 size={11} className="animate-spin" style={{ flexShrink: 0 }} />
            : <RefreshCw size={11} style={{ flexShrink: 0 }} />}
          <span>{polling ? strings.header.polling : strings.header.pollNow}</span>
        </button>
      </div>

      {/* Toast */}
      {toast && <ToastBanner toast={toast} onClose={() => setToast(null)} />}

      {/* Body */}
      {!hasAny && !isLoading && (
        <div style={{ textAlign: 'center', padding: '20px 12px', color: '#9ca3af' }}>
          <CheckCircle2 size={24} style={{ color: '#22c55e', margin: '0 auto 8px' }} />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
            {strings.header.emptyAll}
          </p>
          <p style={{ margin: 0, fontSize: 11, marginTop: 4 }}>
            {strings.header.emptyHint}
          </p>
        </div>
      )}

      {hasAny && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {trustworthy.map((a) => (
            <AlertRow
              key={a.id}
              alert={a}
              onAction={refresh}
              onToast={setToast}
              onRequestOos={(target) => setOosTarget(target)}
            />
          ))}

          {untrustworthy.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <ShieldOff size={12} style={{ color: '#737373' }} />
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#525252' }}>
                  {strings.untrustworthy.groupTitle}
                </p>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#525252',
                  background: '#f3f4f6', borderRadius: 99,
                  padding: '1px 6px',
                }}>{untrustworthy.length}</span>
              </div>
              <p style={{ margin: 0, fontSize: 10, color: '#737373', marginBottom: 8 }}>
                {strings.untrustworthy.groupSubtitle}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {untrustworthy.map((a) => (
                  <UntrustworthyRow key={a.id} alert={a} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {oosTarget && (
        <OosConfirmModal
          productName={oosTarget.product.name}
          busy={oosBusy}
          onCancel={() => { if (!oosBusy) setOosTarget(null); }}
          onConfirm={(alsoNaver) => void handleOosConfirm(alsoNaver)}
        />
      )}
    </div>
  );
}
