'use client';
// EventTimeline — mini event timeline card for dashboard
// Shows recent ProductEvent records (OOS, PRICE_CHANGE, SCORE_DROP, STATUS_CHANGE)

import { useState, useEffect } from 'react';
import { Clock, TrendingDown, Package, DollarSign, RefreshCw, Activity } from 'lucide-react';

interface ProductEvent {
  id: string;
  productId: string;
  type: string;
  oldValue?: string | null;
  newValue?: string | null;
  note?: string | null;
  createdAt: string;
  productName?: string;
}

const EVENT_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  OOS:            { label: '품절 감지',    icon: Package,      color: '#dc2626', bg: '#fee2e2' },
  PRICE_CHANGE:   { label: '가격 변동',    icon: DollarSign,   color: '#b45309', bg: '#fef3c7' },
  SCORE_DROP:     { label: '점수 급락',    icon: TrendingDown, color: '#7c3aed', bg: '#f3e8ff' },
  STATUS_CHANGE:  { label: '상태 변경',    icon: Activity,     color: '#0891b2', bg: '#e0f2fe' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return '방금';
  if (mins < 60)  return `${mins}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return `${days}일 전`;
}

export default function EventTimeline() {
  const [events, setEvents] = useState<ProductEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/events/recent');
      const data = await res.json();
      if (data.success) setEvents(data.events ?? []);
    } catch {
      // non-critical — fail silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="kk-card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px 12px',
        borderBottom: '1px solid #F8DCE5',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={14} style={{ color: '#e62310' }} />
          <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
            최근 이벤트
          </p>
          {events.length > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
              background: '#FFF0F5', color: '#e62310', border: '1px solid #FFB3CE',
            }}>
              {events.length}건
            </span>
          )}
        </div>
        <button
          onClick={load}
          style={{ padding: 6, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#B0A0A8' }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Timeline */}
      <div style={{ padding: '12px 20px', maxHeight: 280, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: 44, background: '#FFF0F5', borderRadius: 8, opacity: 0.6 }} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: 22, color: '#e62310', margin: '0 0 4px' }}>^ㅅ^</p>
            <p style={{ fontSize: 12, color: '#B0A0A8', margin: 0 }}>
              아직 기록된 이벤트가 없어요
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {events.map((ev, i) => {
              const meta = EVENT_META[ev.type] ?? EVENT_META['STATUS_CHANGE'];
              const Icon = meta.icon;
              return (
                <div
                  key={ev.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '8px 10px', borderRadius: 10,
                    background: i === 0 ? meta.bg : '#fafafa',
                    border: `1px solid ${i === 0 ? meta.color + '30' : '#F8DCE5'}`,
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    background: meta.bg, border: `1px solid ${meta.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={12} style={{ color: meta.color }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                        background: meta.bg, color: meta.color,
                      }}>
                        {meta.label}
                      </span>
                      <span style={{ fontSize: 10, color: '#B0A0A8' }}>
                        {timeAgo(ev.createdAt)}
                      </span>
                    </div>
                    {ev.productName && (
                      <p style={{
                        fontSize: 11, fontWeight: 600, color: '#1A1A1A', margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ev.productName}
                      </p>
                    )}
                    {ev.note && (
                      <p style={{ fontSize: 10, color: '#888', margin: '1px 0 0' }}>
                        {ev.note}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
