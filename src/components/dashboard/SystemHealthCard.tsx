// src/components/dashboard/SystemHealthCard.tsx
// ============================================================================
// Sprint 8-IA Phase 1 Task 4: dashboard system health card.
// Consumes /api/system-health and renders the slim 8 active automations as a
// responsive grid. Polls every 60s and revalidates on window focus. Replaces
// the prior "any-automation status" mental model with the registry's true 8
// production entries (작업원칙 #46).
// ============================================================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity, Package, Sparkles, Bell, Flame, Tag, Clock,
  ArrowRight, Loader2, AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

type HealthStatus = 'success' | 'warning' | 'failed' | 'pending';

interface HealthItem {
  id: string;
  displayName: string;
  iconKey: string;
  status: HealthStatus;
  lastRunAt: string | null;
  lastMessage: string;
  nextRunAt: string | null;
  pending: boolean;
}

interface HealthResponse {
  ok: boolean;
  summary: { healthy: number; total: number; generatedAt: string };
  items: HealthItem[];
}

const ICON_BY_KEY: Record<string, LucideIcon> = {
  Activity, Package, Sparkles, Bell, Flame, Tag, Clock,
};

const STATUS_PALETTE: Record<HealthStatus, { border: string; text: string; label: string; bg: string }> = {
  success: { border: '#1D9E75', text: '#0F6E56', label: '정상',       bg: '#ECFDF5' },
  warning: { border: '#EF9F27', text: '#854F0B', label: '실행 지연',  bg: '#FFFBEB' },
  failed:  { border: '#E24B4A', text: '#A32D2D', label: '실패',       bg: '#FEF2F2' },
  pending: { border: '#B4B2A9', text: '#444441', label: '대기',       bg: '#F5F5F4' },
};

// NEW badge expires 30 days after Sprint 8-IA Phase 1 launch (2026-05-20 KST).
const NEW_BADGE_EXPIRES_AT = new Date('2026-06-19T00:00:00+09:00').getTime();

function formatRelative(iso: string | null): string {
  if (!iso) return '아직 실행 전';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '아직 실행 전';
  const diffSec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (diffSec < 60) return `${diffSec}초 전`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 48) return `${diffHr}시간 전`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}일 전`;
}

function formatNext(iso: string | null): string {
  if (!iso) return '신호 도착 시 실행';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '예정 없음';
  const diffMin = Math.round((t - Date.now()) / 60_000);
  if (diffMin <= 0) return '실행 예정';
  if (diffMin < 60) return `${diffMin}분 후`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 48) return `${diffHr}시간 후`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}일 후`;
}

export function SystemHealthCard() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/system-health', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as HealthResponse;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
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

  return (
    <div
      className="kk-card"
      style={{
        overflow: 'hidden',
        background: '#FFFFFF',
        border: '1px solid #F0EAEC',
        borderRadius: 14,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 18px 12px',
          borderBottom: '1px solid #F8DCE5',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <Activity size={16} style={{ color: '#F63B28' }} />
        <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>시스템 상태</p>
        {Date.now() < NEW_BADGE_EXPIRES_AT && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: '#BE185D',
              background: '#FDF2F8',
              border: '1px solid #FBCFE8',
              padding: '2px 8px',
              borderRadius: 999,
              letterSpacing: '0.04em',
            }}
          >
            NEW
          </span>
        )}
        {data && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#0F6E56',
              background: '#ECFDF5',
              border: '1px solid #BBF7D0',
              padding: '2px 8px',
              borderRadius: 999,
            }}
          >
            {data.summary.healthy}/{data.summary.total} 정상
          </span>
        )}
        <span style={{ fontSize: 11, color: '#A3A3A3', marginLeft: 'auto' }}>
          {data ? `${formatRelative(data.summary.generatedAt)} 갱신` : ''}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 18px 12px' }}>
        {loading && !data && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888', fontSize: 12 }}>
            <Loader2 size={14} className="animate-spin" />
            시스템 상태를 가져오는 중입니다…
          </div>
        )}

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 10,
              color: '#A32D2D',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <AlertCircle size={14} />
            상태를 불러오지 못했습니다 — {error}
          </div>
        )}

        {/* Defensive: /api/system-health may return error envelope without items. */}
        {data && Array.isArray(data.items) && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 10,
            }}
          >
            {data.items.map((item) => {
              const palette = STATUS_PALETTE[item.status];
              const Icon = ICON_BY_KEY[item.iconKey] ?? Activity;
              return (
                <div
                  key={item.id}
                  style={{
                    position: 'relative',
                    padding: '10px 12px 10px 14px',
                    background: '#FFFFFF',
                    border: '1px solid #F0EAEC',
                    borderLeft: `3px solid ${palette.border}`,
                    borderRadius: 10,
                    minHeight: 88,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon size={14} style={{ color: palette.text }} />
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: '#1A1A1A',
                        margin: 0,
                        flex: 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.displayName}
                    </p>
                  </div>

                  <p style={{ fontSize: 11, color: '#666', margin: 0 }}>
                    {formatRelative(item.lastRunAt)}
                  </p>

                  <p
                    style={{
                      fontSize: 10,
                      color: '#888',
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={item.lastMessage}
                  >
                    {item.lastMessage}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 'auto',
                      paddingTop: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: palette.text,
                        background: palette.bg,
                        padding: '2px 6px',
                        borderRadius: 999,
                      }}
                    >
                      {palette.label}
                    </span>
                    <span style={{ fontSize: 10, color: '#A3A3A3' }}>
                      {formatNext(item.nextRunAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '10px 18px 12px',
          borderTop: '1px solid #F8DCE5',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: '#A3A3A3' }}>
          자동화 관리
        </span>
        <Link
          href="/admin/automation"
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            fontWeight: 700,
            color: '#F63B28',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          전체 자동화 보기
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

export default SystemHealthCard;
