'use client';
// /orders — Order Management v2
// Design: status-based visual differentiation, power-seller optimized

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  RefreshCw, Package, Truck, Check, AlertTriangle, Search,
  ShoppingCart, XCircle, RotateCcw, CheckCircle2, Clock,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  customerName: string;
  customerPhone: string;
  shippingAddress?: string;
  createdAt?: string;
  trackingNumber?: string;
  courierCompany?: string;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<string, {
  label: string; color: string; bg: string; border: string;
  rowBg: string; rowOpacity: number; group: 'action' | 'progress' | 'done' | 'problem';
}> = {
  // Action needed
  PENDING:          { label: '결제대기',  color: '#92400e', bg: '#fffbeb', border: '#fde68a', rowBg: '#fffdf0', rowOpacity: 1,   group: 'action'   },
  PAID:             { label: '결제완료',  color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', rowBg: '#f0f7ff', rowOpacity: 1,   group: 'action'   },
  // In progress
  SHIPPING:         { label: '배송중',    color: '#6d28d9', bg: '#f5f3ff', border: '#c4b5fd', rowBg: '#faf9ff', rowOpacity: 1,   group: 'progress' },
  DELIVERED:        { label: '배송완료',  color: '#065f46', bg: '#ecfdf5', border: '#6ee7b7', rowBg: '#f6fefa', rowOpacity: 1,   group: 'progress' },
  COMPLETED:        { label: '구매확정',  color: '#14532d', bg: '#dcfce7', border: '#86efac', rowBg: '#f4fef7', rowOpacity: 1,   group: 'done'     },
  // Problem — visually muted
  CANCELLED:        { label: '취소완료',  color: '#991b1b', bg: '#fef2f2', border: '#fca5a5', rowBg: '#fff5f5', rowOpacity: 0.7, group: 'problem'  },
  CANCEL_REQUESTED: { label: '취소요청',  color: '#c2410c', bg: '#fff7ed', border: '#fed7aa', rowBg: '#fffaf5', rowOpacity: 1,   group: 'problem'  },
  RETURNED:         { label: '반품완료',  color: '#7c2d12', bg: '#fff7ed', border: '#fdba74', rowBg: '#fff8f3', rowOpacity: 0.7, group: 'problem'  },
  RETURN_REQUESTED: { label: '반품요청',  color: '#b45309', bg: '#fffbeb', border: '#fde68a', rowBg: '#fffef5', rowOpacity: 1,   group: 'problem'  },
  EXCHANGED:        { label: '교환완료',  color: '#0e7490', bg: '#ecfeff', border: '#a5f3fc', rowBg: '#f5feff', rowOpacity: 1,   group: 'done'     },
  // Raw Naver values (fallback)
  PAYED:            { label: '결제완료',  color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', rowBg: '#f0f7ff', rowOpacity: 1,   group: 'action'   },
  DELIVERING:       { label: '배송중',    color: '#6d28d9', bg: '#f5f3ff', border: '#c4b5fd', rowBg: '#faf9ff', rowOpacity: 1,   group: 'progress' },
  CANCELED:         { label: '취소완료',  color: '#991b1b', bg: '#fef2f2', border: '#fca5a5', rowBg: '#fff5f5', rowOpacity: 0.7, group: 'problem'  },
  CANCEL_DONE:      { label: '취소완료',  color: '#991b1b', bg: '#fef2f2', border: '#fca5a5', rowBg: '#fff5f5', rowOpacity: 0.7, group: 'problem'  },
  RETURN_DONE:      { label: '반품완료',  color: '#7c2d12', bg: '#fff7ed', border: '#fdba74', rowBg: '#fff8f3', rowOpacity: 0.7, group: 'problem'  },
};

function getSt(status: string) {
  return STATUS[status] ?? { label: status || '알 수 없음', color: '#888', bg: '#f9fafb', border: '#e5e7eb', rowBg: 'transparent', rowOpacity: 1, group: 'progress' as const };
}

function isPaid(status: string) { return ['PAID', 'PAYED'].includes(status); }
function isProblem(status: string) { return getSt(status).group === 'problem'; }

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, count, color, bg, border, onClick, active }: {
  icon: React.ReactNode; label: string; count: number;
  color: string; bg: string; border: string;
  onClick: () => void; active: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderRadius: 14,
      background: active ? color : bg,
      border: `1.5px solid ${active ? color : border}`,
      cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
    }}>
      <span style={{ color: active ? '#fff' : color }}>{icon}</span>
      <div>
        <p style={{ fontSize: 20, fontWeight: 900, color: active ? '#fff' : '#1A1A1A', margin: 0, lineHeight: 1 }}>{count}</p>
        <p style={{ fontSize: 11, fontWeight: 700, color: active ? 'rgba(255,255,255,0.8)' : '#888', margin: '2px 0 0' }}>{label}</p>
      </div>
    </button>
  );
}

// ── Main inner ────────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { key: '',                 label: '전체'   },
  { key: 'PAID',             label: '결제완료' },
  { key: 'SHIPPING',         label: '배송중'  },
  { key: 'DELIVERED',        label: '배송완료' },
  { key: 'COMPLETED',        label: '구매확정' },
  { key: 'CANCELLED',        label: '취소'   },
  { key: 'CANCEL_REQUESTED', label: '취소요청' },
  { key: 'RETURNED',         label: '반품'   },
  { key: 'RETURN_REQUESTED', label: '반품요청' },
];

function OrdersInner() {
  const searchParams = useSearchParams();
  const [orders, setOrders]         = useState<Order[]>([]);
  const [loading, setLoading]       = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const [syncMsg, setSyncMsg]       = useState('');
  const [syncOk, setSyncOk]         = useState<boolean | null>(null);
  const [filter, setFilter]         = useState(searchParams.get('status') ?? '');
  const [query, setQuery]           = useState('');
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [hours, setHours]           = useState(48);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: '200' });
      if (filter) p.set('status', filter);
      const r = await fetch('/api/orders?' + p);
      const d = await r.json();
      if (d.success) setOrders(d.orders ?? []);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const syncOrders = async () => {
    setSyncing(true); setSyncMsg(''); setSyncOk(null);
    try {
      const r = await fetch(`/api/naver/orders?manual=1&hours=${hours}`);
      const d = await r.json();
      setSyncOk(d.success);
      setSyncMsg(d.success
        ? `동기화 완료 — ${d.synced}개 업데이트 (총 ${d.total}개)`
        : (d.error ?? '오류 발생'));
      if (d.success) fetchOrders();
    } catch { setSyncOk(false); setSyncMsg('네트워크 오류'); }
    finally { setSyncing(false); }
  };

  const handleConfirm = async () => {
    if (!selected.size) return;
    setConfirming(true);
    try {
      const r = await fetch('/api/naver/orders/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productOrderIds: [...selected] }),
      });
      const d = await r.json();
      if (d.success) { setSelected(new Set()); fetchOrders(); }
    } catch { }
    finally { setConfirming(false); }
  };

  // Filtered + searched
  const filtered = orders.filter(o => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.shippingAddress?.toLowerCase().includes(q)
    );
  });

  // Summary counts
  const actionCount   = orders.filter(o => isPaid(o.status)).length;
  const progressCount = orders.filter(o => ['SHIPPING', 'DELIVERING', 'DELIVERED'].includes(o.status)).length;
  const problemCount  = orders.filter(o => isProblem(o.status)).length;
  const doneCount     = orders.filter(o => ['COMPLETED', 'EXCHANGED'].includes(o.status)).length;

  // Status counts for filter tabs
  const statusCounts = orders.reduce((acc, o) => {
    // Normalize: PAYED→PAID, CANCELED→CANCELLED etc.
    const norm = STATUS[o.status]?.label ? o.status : o.status;
    acc[norm] = (acc[norm] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count by tab key (account for aliased statuses)
  function tabCount(key: string) {
    if (!key) return orders.length;
    // Aliases
    const aliases: Record<string, string[]> = {
      PAID:             ['PAID', 'PAYED'],
      CANCELLED:        ['CANCELLED', 'CANCELED', 'CANCEL_DONE'],
      RETURNED:         ['RETURNED', 'RETURN_DONE'],
      SHIPPING:         ['SHIPPING', 'DELIVERING'],
      CANCEL_REQUESTED: ['CANCEL_REQUESTED', 'CANCEL_REQUEST'],
      RETURN_REQUESTED: ['RETURN_REQUESTED', 'RETURN_REQUEST'],
    };
    const keys = aliases[key] ?? [key];
    return orders.filter(o => keys.includes(o.status)).length;
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const paidOrders = filtered.filter(o => isPaid(o.status));
  const allPaidSelected = paidOrders.length > 0 && paidOrders.every(o => selected.has(o.id));
  const toggleAllPaid = () => {
    if (allPaidSelected) setSelected(new Set());
    else setSelected(new Set(paidOrders.map(o => o.id)));
  };

  const S = { padding: '0 24px 48px' };

  return (
    <div style={S}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 12px', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShoppingCart size={22} style={{ color: '#e62310' }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>주문 관리</h1>
            <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>네이버 스마트스토어</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={hours}
            onChange={e => setHours(Number(e.target.value))}
            style={{ padding: '7px 10px', borderRadius: 9, border: '1.5px solid #F8DCE5', fontSize: 12, background: '#fff', color: '#555', cursor: 'pointer' }}
          >
            <option value={24}>최근 24시간</option>
            <option value={48}>최근 48시간</option>
            <option value={168}>최근 7일</option>
            <option value={720}>최근 30일</option>
          </select>
          <button
            onClick={syncOrders}
            disabled={syncing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: syncing ? '#FFB3CE' : '#e62310', color: '#fff',
              padding: '8px 16px', borderRadius: 9, fontWeight: 700, fontSize: 13,
              border: 'none', cursor: syncing ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? '동기화 중...' : '네이버 동기화'}
          </button>
        </div>
      </div>

      <div style={{ height: 2, background: 'linear-gradient(90deg, #e62310, #FFB3CE)', borderRadius: 99, marginBottom: 16 }} />

      {/* ── Sync result ── */}
      {syncMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
          background: syncOk ? '#f0fdf4' : '#fff0f0',
          border: `1px solid ${syncOk ? '#86efac' : '#fca5a5'}`,
          borderRadius: 10, marginBottom: 14, fontSize: 12,
          color: syncOk ? '#15803d' : '#dc2626',
        }}>
          {syncOk ? <Check size={13} /> : <AlertTriangle size={13} />}
          {syncMsg}
          <button onClick={() => setSyncMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 14, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ── Summary cards ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <SummaryCard
          icon={<Clock size={18} />} label="처리 필요" count={actionCount}
          color="#1d4ed8" bg="#eff6ff" border="#bfdbfe"
          onClick={() => setFilter(filter === 'PAID' ? '' : 'PAID')} active={filter === 'PAID'}
        />
        <SummaryCard
          icon={<Truck size={18} />} label="배송 진행중" count={progressCount}
          color="#6d28d9" bg="#f5f3ff" border="#c4b5fd"
          onClick={() => setFilter(filter === 'SHIPPING' ? '' : 'SHIPPING')} active={filter === 'SHIPPING'}
        />
        <SummaryCard
          icon={<CheckCircle2 size={18} />} label="구매확정" count={doneCount}
          color="#15803d" bg="#dcfce7" border="#86efac"
          onClick={() => setFilter(filter === 'COMPLETED' ? '' : 'COMPLETED')} active={filter === 'COMPLETED'}
        />
        <SummaryCard
          icon={<XCircle size={18} />} label="취소 / 반품" count={problemCount}
          color="#dc2626" bg="#fef2f2" border="#fca5a5"
          onClick={() => setFilter(filter === 'CANCELLED' ? '' : 'CANCELLED')} active={filter === 'CANCELLED'}
        />
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {FILTER_TABS.map(({ key, label }) => {
          const cnt = tabCount(key);
          if (cnt === 0 && key !== '') return null;
          const active = filter === key;
          return (
            <button key={key} onClick={() => setFilter(key)} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
              background: active ? '#e62310' : '#fff',
              color: active ? '#fff' : '#555',
              border: `1.5px solid ${active ? '#e62310' : '#F8DCE5'}`,
              cursor: 'pointer', transition: 'all 0.12s',
            }}>
              {label}
              <span style={{
                fontSize: 10, fontWeight: 900, padding: '1px 5px', borderRadius: 99,
                background: active ? 'rgba(255,255,255,0.25)' : '#F8DCE5',
                color: active ? '#fff' : '#e62310',
              }}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* ── Search + bulk action ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#D4B0BC', pointerEvents: 'none' }} />
          <input
            type="text" placeholder="주문번호 · 고객명 · 주소 검색"
            value={query} onChange={e => setQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: 30, paddingRight: 30, paddingTop: 7, paddingBottom: 7, fontSize: 12, background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 9, outline: 'none', boxSizing: 'border-box' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#B0A0A8', fontSize: 14, lineHeight: 1 }}>×</button>
          )}
        </div>
        {selected.size > 0 && (
          <button
            onClick={handleConfirm} disabled={confirming}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#16a34a', color: '#fff', padding: '7px 14px', borderRadius: 9, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}
          >
            <Check size={13} /> {selected.size}건 발주확인
          </button>
        )}
        <button onClick={fetchOrders} style={{ padding: '7px 9px', borderRadius: 9, border: '1.5px solid #F8DCE5', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <RefreshCw size={13} style={{ color: '#B0A0A8' }} />
        </button>
        <span style={{ fontSize: 11, color: '#B0A0A8', marginLeft: 4 }}>{filtered.length}건</span>
      </div>

      {/* ── Table ── */}
      <div style={{ background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 16, overflow: 'hidden' }}>

        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '32px 160px 1fr 100px 100px 110px 80px',
          gap: 8, padding: '9px 16px',
          background: '#FFF0F5', borderBottom: '2px solid #FFB3CE',
          alignItems: 'center',
        }}>
          <input type="checkbox" checked={allPaidSelected} onChange={toggleAllPaid}
            style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#e62310' }} />
          {['주문번호', '상품 / 고객', '금액', '상태', '주문일', '액션'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 900, color: '#e62310', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '52px', textAlign: 'center' }}>
            <RefreshCw size={22} style={{ color: '#FFB3CE', margin: '0 auto 8px', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 13, color: '#B0A0A8', margin: 0 }}>불러오는 중...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '52px', textAlign: 'center' }}>
            <Package size={32} style={{ color: '#F8DCE5', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13, color: '#B0A0A8', margin: 0 }}>
              {query ? `"${query}" 검색 결과가 없습니다` : '주문이 없습니다'}
            </p>
            <p style={{ fontSize: 11, color: '#D4B0BC', margin: '4px 0 0' }}>우측 상단 "네이버 동기화" 버튼을 눌러주세요</p>
          </div>
        ) : (
          filtered.map((order, idx) => {
            const st        = getSt(order.status);
            const paid      = isPaid(order.status);
            const problem   = st.group === 'problem';
            const isSelected = selected.has(order.id);
            const isLast    = idx === filtered.length - 1;

            return (
              <div key={order.id}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '32px 160px 1fr 100px 100px 110px 80px',
                  gap: 8, padding: '11px 16px', alignItems: 'center',
                  background: isSelected
                    ? 'rgba(230,35,16,0.05)'
                    : problem
                      ? st.rowBg
                      : 'transparent',
                  opacity: st.rowOpacity,
                  transition: 'background 0.1s',
                  borderLeft: problem ? `3px solid ${st.border}` : '3px solid transparent',
                }}
                  onMouseEnter={e => { if (!isSelected && !problem) (e.currentTarget as HTMLDivElement).style.background = '#FFF8FA'; }}
                  onMouseLeave={e => { if (!isSelected && !problem) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={!paid}
                    onChange={() => paid && toggleSelect(order.id)}
                    style={{ width: 14, height: 14, cursor: paid ? 'pointer' : 'default', accentColor: '#e62310', opacity: paid ? 1 : 0.2 }}
                  />

                  {/* Order number + customer */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#1A1A1A', margin: 0, fontFamily: 'monospace', letterSpacing: '0.02em', textDecoration: problem ? 'line-through' : 'none', textDecorationColor: '#fca5a5' }}>
                      {order.orderNumber ?? order.id}
                    </p>
                    <p style={{ fontSize: 10, color: '#B0A0A8', margin: '1px 0 0' }}>
                      {order.customerName || order.customerPhone || '—'}
                    </p>
                  </div>

                  {/* Product / address */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: problem ? 'line-through' : 'none', textDecorationColor: '#fca5a5' }}>
                      {order.shippingAddress
                        ? order.shippingAddress
                        : <span style={{ color: '#D4B0BC', fontStyle: 'italic' }}>배송지 정보 없음</span>}
                    </p>
                    <p style={{ fontSize: 10, color: '#B0A0A8', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.customerPhone ? order.customerPhone : order.customerName ? order.customerName : '—'}
                    </p>
                  </div>

                  {/* Amount */}
                  <p style={{ fontSize: 13, fontWeight: 700, color: problem ? '#aaa' : '#1A1A1A', textAlign: 'right', margin: 0, textDecoration: problem ? 'line-through' : 'none', textDecorationColor: '#fca5a5' }}>
                    {(order.totalAmount ?? 0).toLocaleString()}원
                  </p>

                  {/* Status badge */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 9px', borderRadius: 99,
                    background: st.bg, border: `1px solid ${st.border}`,
                    fontSize: 11, fontWeight: 700, color: st.color,
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
                    {st.label}
                  </div>

                  {/* Date */}
                  <p style={{ fontSize: 10, color: '#999', margin: 0 }}>
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </p>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {paid && (
                      <button
                        onClick={() => toggleSelect(order.id)}
                        style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 6, background: isSelected ? '#dcfce7' : '#f0fdf4', color: '#16a34a', border: `1px solid ${isSelected ? '#86efac' : '#bbf7d0'}`, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {isSelected ? '✓ 선택됨' : '발주확인'}
                      </button>
                    )}
                    {order.trackingNumber && (
                      <button style={{ padding: '4px 6px', borderRadius: 6, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Truck size={11} />
                      </button>
                    )}
                    {problem && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 6, background: st.bg, color: st.color, border: `1px solid ${st.border}`, whiteSpace: 'nowrap' }}>
                        {st.group === 'problem' && (order.status.includes('RETURN') ? '반품' : '취소')}
                      </span>
                    )}
                  </div>
                </div>
                {!isLast && <div style={{ height: 1, background: '#F8DCE5', margin: '0 16px' }} />}
              </div>
            );
          })
        )}

        {/* Table footer */}
        {filtered.length > 0 && (
          <div style={{ padding: '9px 16px', borderTop: '1px solid #F8DCE5', background: '#FFF8FA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#B0A0A8' }}>
              전체 {orders.length}건
              {query && ` / 검색 결과 ${filtered.length}건`}
            </span>
            {selected.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#e62310' }}>{selected.size}건 선택됨</span>
                <button
                  onClick={handleConfirm} disabled={confirming}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#16a34a', color: '#fff', padding: '5px 12px', borderRadius: 7, fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer' }}
                >
                  <Check size={11} /> 발주확인 처리
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* spin animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <RefreshCw size={24} style={{ color: '#FFB3CE', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <OrdersInner />
    </Suspense>
  );
}
