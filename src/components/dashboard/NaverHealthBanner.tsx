// src/components/dashboard/NaverHealthBanner.tsx
// ============================================================================
// PROXY-HEALTH (#204, PROXY_HEALTH_SPEC_2026-07-07)
// Dashboard system banner for Naver-integration health. The Naver proxy (home
// Mac / Tailscale Funnel) is the single point of failure for every Naver
// integration; when it dies silently, sync stops but the app shows nothing.
//
// Design decisions (per spec + work principles):
//   - System-global entity → lives on the dashboard surface, NOT the product
//     C-9 matrix (#195: each intervention on its own entity).
//   - healthy=true (and loading) → renders nothing (noise 0). This is an alert,
//     not a persistent panel — when the integration is fine, it is invisible.
//   - errorClass-specific guidance tells the operator WHAT to fix, not a vague
//     "error" (#204: detect → surface → guide).
//   - Advisory only (#56) — no forced action, just a visible, honest status.
//   - Korean strings live in NaverHealthBanner.strings.ko.json (#3-1). Lucide
//     icons only, no emoji (#3-1).
// ============================================================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, WifiOff, Unplug, Lock, ShieldAlert, KeyRound, Timer, ServerCrash } from 'lucide-react';
import strings from './NaverHealthBanner.strings.ko.json';

type ErrorClass =
  | 'FUNNEL_DOWN'
  | 'PROXY_DOWN'
  | 'PROXY_AUTH'
  | 'IP_NOT_ALLOWED'
  | 'AUTH_SIGN_INVALID'
  | 'RATE_LIMIT'
  | 'NAVER_ERROR';

interface HealthResponse {
  healthy: boolean;
  errorClass?: ErrorClass;
  message?: string;
  checkedAt: string;
  cached?: boolean;
}

const ICON_BY_CLASS: Record<ErrorClass, typeof AlertTriangle> = {
  FUNNEL_DOWN: Unplug,
  PROXY_DOWN: WifiOff,
  PROXY_AUTH: Lock,
  IP_NOT_ALLOWED: ShieldAlert,
  AUTH_SIGN_INVALID: KeyRound,
  RATE_LIMIT: Timer,
  NAVER_ERROR: ServerCrash,
};

// RATE_LIMIT is transient/self-recovering → softer amber tone. Every other
// class needs an operator action → alert red.
const TONE_BY_CLASS: Record<ErrorClass, { bg: string; border: string; accent: string; text: string }> = {
  FUNNEL_DOWN:       { bg: '#FEF2F2', border: '#FECACA', accent: '#DC2626', text: '#991B1B' },
  PROXY_DOWN:        { bg: '#FEF2F2', border: '#FECACA', accent: '#DC2626', text: '#991B1B' },
  PROXY_AUTH:        { bg: '#FEF2F2', border: '#FECACA', accent: '#DC2626', text: '#991B1B' },
  IP_NOT_ALLOWED:    { bg: '#FEF2F2', border: '#FECACA', accent: '#DC2626', text: '#991B1B' },
  AUTH_SIGN_INVALID: { bg: '#FEF2F2', border: '#FECACA', accent: '#DC2626', text: '#991B1B' },
  NAVER_ERROR:       { bg: '#FEF2F2', border: '#FECACA', accent: '#DC2626', text: '#991B1B' },
  RATE_LIMIT:        { bg: '#FFFBEB', border: '#FDE68A', accent: '#B45309', text: '#92400E' },
};

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diffSec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (diffSec < 60) return `${diffSec}초 전`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 48) return `${diffHr}시간 전`;
  return `${Math.round(diffHr / 24)}일 전`;
}

export default function NaverHealthBanner() {
  const [data, setData] = useState<HealthResponse | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/naver/health', { cache: 'no-store' });
      if (!res.ok) return; // a failed health-endpoint fetch is not itself a Naver verdict — stay silent
      const json = (await res.json()) as HealthResponse;
      setData(json);
    } catch {
      // Network hiccup fetching our own endpoint — do not raise a false alarm.
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, 60_000);
    const onFocus = () => fetchHealth();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchHealth]);

  // Loading, healthy, or an unclassifiable failure → render nothing (noise 0).
  if (!data || data.healthy || !data.errorClass) return null;

  const errorClass = data.errorClass;
  const Icon = ICON_BY_CLASS[errorClass] ?? AlertTriangle;
  const tone = TONE_BY_CLASS[errorClass] ?? TONE_BY_CLASS.NAVER_ERROR;
  const title = strings.title[errorClass] ?? strings.title.NAVER_ERROR;
  const guide = strings.guide[errorClass] ?? strings.guide.NAVER_ERROR;

  return (
    <div
      role="alert"
      style={{
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        borderLeft: `4px solid ${tone.accent}`,
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        gap: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 34,
          height: 34,
          borderRadius: 9,
          background: '#fff',
          border: `1px solid ${tone.border}`,
          flexShrink: 0,
        }}
      >
        <Icon size={18} style={{ color: tone.accent }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: tone.text, lineHeight: 1.3 }}>
          {title}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: tone.text, lineHeight: 1.5, opacity: 0.92 }}>
          {guide}
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#9ca3af', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span>{strings.footer.spofNote}</span>
          <span>·</span>
          <span>{strings.footer.checkedPrefix} {formatRelative(data.checkedAt)}</span>
        </p>
      </div>
    </div>
  );
}
