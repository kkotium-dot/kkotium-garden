'use client';
// /orders — Order Management v3
// Full detail drawer, status-based visual diff, power-seller optimized

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  RefreshCw, Package, Truck, Check, AlertTriangle, Search,
  ShoppingCart, XCircle, RotateCcw, CheckCircle2, Clock,
  X, Phone, MapPin, CreditCard, Hash, User, Info,
  ChevronRight,
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
  updatedAt?: string;
  trackingNumber?: string;
  courierCompany?: string;
  productName?: string;
  quantity?: number;
  paymentDate?: string;
  claimReason?: string;
  claimDetail?: string;
  refundStatus?: string;
  shippingRequest?: string;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<string, {
  label: string; color: string; bg: string; border: string;
  rowBg: string; rowOpacity: number; group: 'action' | 'progress' | 'done' | 'problem';
}> = {
  PENDING:          { label: '결제대기',  color: '#92400e', bg: '#fffbeb', border: '#fde68a', rowBg: '#fffdf5', rowOpacity: 1,   group: 'action'   },
  PAID:             { label: '결제완료',  color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', rowBg: '#f0f7ff', rowOpacity: 1,   group: 'action'   },
  PAYED:            { label: '결제완료',  color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', rowBg: '#f0f7ff', rowOpacity: 1,   group: 'action'   },
  SHIPPING:         { label: '배송중',    color: '#6d28d9', bg: '#f5f3ff', border: '#c4b5fd', rowBg: '#faf9ff', rowOpacity: 1,   group: 'progress' },
  DELIVERING:       { label: '배송중',    color: '#6d28d9', bg: '#f5f3ff', border: '#c4b5fd', rowBg: '#faf9ff', rowOpacity: 1,   group: 'progress' },
  DELIVERED:        { label: '배송완료',  color: '#065f46', bg: '#ecfdf5', border: '#6ee7b7', rowBg: '#f5fef9', rowOpacity: 1,   group: 'progress' },
  COMPLETED:        { label: '구매확정',  color: '#14532d', bg: '#dcfce7', border: '#86efac', rowBg: '#f4fef7', rowOpacity: 1,   group: 'done'     },
  CANCELLED:        { label: '취소완료',  color: '#991b1b', bg: '#fef2f2', border: '#fca5a5', rowBg: '#fff5f5', rowOpacity: 0.72, group: 'problem' },
  CANCELED:         { label: '취소완료',  color: '#991b1b', bg: '#fef2f2', border: '#fca5a5', rowBg: '#fff5f5', rowOpacity: 0.72, group: 'problem' },
  CANCEL_DONE:      { label: '취소완료',  color: '#991b1b', bg: '#fef2f2', border: '#fca5a5', rowBg: '#fff5f5', rowOpacity: 0.72, group: 'problem' },
  CANCEL_REQUESTED: { label: '취소요청',  color: '#c2410c', bg: '#fff7ed', border: '#fed7aa', rowBg: '#fffaf5', rowOpacity: 1,   group: 'problem'  },
  CANCEL_REQUEST:   { label: '취소요청',  color: '#c2410c', bg: '#fff7ed', border: '#fed7aa', rowBg: '#fffaf5', rowOpacity: 1,   group: 'problem'  },
  RETURNED:         { label: '반품완료',  color: '#7c2d12', bg: '#fff7ed', border: '#fdba74', rowBg: '#fff8f3', rowOpacity: 0.72, group: 'problem' },
  RETURN_DONE:      { label: '반품완료',  color: '#7c2d12', bg: '#fff7ed', border: '#fdba74', rowBg: '#fff8f3', rowOpacity: 0.72, group: 'problem' },
  RETURN_REQUESTED: { label: '반품요청',  color: '#b45309', bg: '#fffbeb', border: '#fde68a', rowBg: '#fffef5', rowOpacity: 1,   group: 'problem'  },
  RETURN_REQUEST:   { label: '반품요청',  color: '#b45309', bg: '#fffbeb', border: '#fde68a', rowBg: '#fffef5', rowOpacity: 1,   group: 'problem'  },
  EXCHANGED:        { label: '교환완료',  color: '#0e7490', bg: '#ecfeff', border: '#a5f3fc', rowBg: '#f5feff', rowOpacity: 1,   group: 'done'     },
};

function getSt(s: string) {
  return STATUS[s] ?? { label: s || '—', color: '#888', bg: '#f9fafb', border: '#e5e7eb', rowBg: 'transparent', rowOpacity: 1, group: 'progress' as const };
}
function isPaid(s: string)    { return ['PAID', 'PAYED'].includes(s); }
function isProblem(s: string) { return getSt(s).group === 'problem'; }
function isCancel(s: string)  { return s.includes('CANCEL'); }

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function DetailRow({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value?: string | null; highlight?: boolean }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #F8DCE5' }}>
      <span style={{ color: '#e62310', flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#B0A0A8', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ fontSize: 13, color: highlight ? '#dc2626' : '#1A1A1A', margin: 0, lineHeight: 1.5, wordBreak: 'break-word', fontWeight: highlight ? 700 : 400 }}>{value}</p>
      </div>
    </div>
  );
}

function OrderDrawer({ order, onClose }: { order: Order; onClose: () => void }) {
  const st     = getSt(order.status);
  const problem = isProblem(order.status);
  const cancel  = isCancel(order.status);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40, backdropFilter: 'blur(2px)' }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 380,
        background: '#fff', boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
        zIndex: 50, display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* Drawer header */}
        <div style={{ padding: '16px 20px', borderBottom: '2px solid #FFB3CE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#FFF0F5' }}>
          <div>
            <p style={{ fontSize: 10, color: '#B0A0A8', margin: 0, fontFamily: 'monospace' }}>#{order.orderNumber?.slice(-12)}</p>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#1A1A1A', margin: '2px 0 0' }}>{order.customerName || '—'}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 99,
              background: st.bg, border: `1px solid ${st.border}`,
              fontSize: 11, fontWeight: 700, color: st.color,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.color }} />
              {st.label}
            </span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#B0A0A8', borderRadius: 6, display: 'flex', alignItems: 'center' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Claim alert */}
        {problem && (
          <div style={{
            margin: '16px 20px 0', padding: '12px 14px',
            background: cancel ? '#fef2f2' : '#fff7ed',
            border: `1.5px solid ${cancel ? '#fca5a5' : '#fdba74'}`,
            borderRadius: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <AlertTriangle size={14} style={{ color: cancel ? '#dc2626' : '#d97706' }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: cancel ? '#dc2626' : '#b45309' }}>
                {cancel ? '취소 처리된 주문' : '반품 처리된 주문'}
              </span>
            </div>
            {order.claimReason && (
              <p style={{ fontSize: 12, color: cancel ? '#991b1b' : '#7c2d12', margin: '0 0 4px', fontWeight: 700 }}>
                사유: {order.claimReason}
              </p>
            )}
            {order.refundStatus && (
              <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
                환불: {order.refundStatus}
              </p>
            )}
          </div>
        )}

        {/* Detail content */}
        <div style={{ padding: '16px 20px', flex: 1 }}>

          {/* Product info */}
          <div style={{ marginBottom: 16, padding: '12px 14px', background: '#FFF8FA', borderRadius: 12, border: '1px solid #F8DCE5' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#B0A0A8', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>상품 정보</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', margin: '0 0 4px', lineHeight: 1.4 }}>
              {order.productName || '상품명 없음'}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#888' }}>수량: {order.quantity ?? 1}개</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#e62310' }}>
                {(order.totalAmount ?? 0).toLocaleString()}원
              </span>
            </div>
          </div>

          {/* Order details */}
          <DetailRow icon={<Hash size={13} />}    label="주문번호"   value={order.orderNumber} />
          <DetailRow icon={<User size={13} />}     label="주문자"    value={order.customerName} />
          <DetailRow icon={<Phone size={13} />}    label="연락처"    value={order.customerPhone} />
          <DetailRow
            icon={<MapPin size={13} />}
            label="배송지"
            value={order.shippingAddress || (problem && cancel ? '취소 주문 — 배송지 정보 없음' : '배송지 정보 없음')}
            highlight={!order.shippingAddress}
          />
          {order.shippingRequest && (
            <DetailRow icon={<Info size={13} />}   label="배송 메모" value={order.shippingRequest} />
          )}
          <DetailRow icon={<CreditCard size={13} />} label="결제금액" value={`${(order.totalAmount ?? 0).toLocaleString()}원`} />
          <DetailRow
            icon={<Clock size={13} />}
            label="결제일시"
            value={order.paymentDate
              ? new Date(order.paymentDate).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
              : order.createdAt
                ? new Date(order.createdAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                : null}
          />
          {order.trackingNumber && (
            <DetailRow icon={<Truck size={13} />}  label="송장번호"  value={`${order.courierCompany ?? ''} ${order.trackingNumber}`} />
          )}

          {/* Claim detail */}
          {order.claimDetail && (
            <div style={{ marginTop: 12, padding: '12px 14px', background: cancel ? '#fef2f2' : '#fff7ed', borderRadius: 12, border: `1px solid ${cancel ? '#fca5a5' : '#fdba74'}` }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#B0A0A8', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {cancel ? '취소 사유 상세' : '반품 사유 상세'}
              </p>
              <p style={{ fontSize: 12, color: '#555', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {order.claimDetail}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, count, color, bg, border, onClick, active }: {
  icon: React.ReactNode; label: string; count: number;
  color: string; bg: string; border: string; onClick: () => void; active: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 14px', borderRadius: 14,
      background: active ? color : bg,
      border: `1.5px solid ${active ? color : border}`,
      cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
    }}>
      <span style={{ color: active ? '#fff' : color }}>{icon}</span>
      <div>
        <p style={{ fontSize: 22, fontWeight: 900, color: active ? '#fff' : '#1A1A1A', margin: 0, lineHeight: 1 }}>{count}</p>
        <p style={{ fontSize: 10, fontWeight: 700, color: active ? 'rgba(255,255,255,0.8)' : '#888', margin: '2px 0 0', whiteSpace: 'nowrap' }}>{label}</p>
      </div>
    </button>
  );
}

// ── Filter tabs ───────────────────────────────────────────────────────────────

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

// ── Main ──────────────────────────────────────────────────────────────────────

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
  const [drawer, setDrawer]         = useState<Order | null>(null);
  // Dispatch modal state
  const [dispatchModal, setDispatchModal] = useState<{ orderId: string; productName: string } | null>(null);
  const [dispatchCourier, setDispatchCourier]   = useState('CJ대한통운');
  const [dispatchTracking, setDispatchTracking] = useState('');
  const [dispatching, setDispatching]           = useState(false);
  const [dispatchMsg, setDispatchMsg]           = useState('');

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

  const handleDispatch = async () => {
    if (!dispatchModal || !dispatchTracking.trim()) return;
    setDispatching(true); setDispatchMsg('');
    try {
      const r = await fetch('/api/naver/orders/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrderId: dispatchModal.orderId,
          deliveryCompany: dispatchCourier,
          trackingNumber:  dispatchTracking.trim(),
        }),
      });
      const d = await r.json();
      if (d.success) {
        setDispatchModal(null);
        setDispatchTracking('');
        fetchOrders();
      } else {
        setDispatchMsg(d.error ?? '송장 등록 실패');
      }
    } catch { setDispatchMsg('네트워크 오류'); }
    finally { setDispatching(false); }
  };

  // Alias normaliser for filter tab counts
  const ALIAS: Record<string, string[]> = {
    PAID:             ['PAID', 'PAYED'],
    CANCELLED:        ['CANCELLED', 'CANCELED', 'CANCEL_DONE'],
    RETURNED:         ['RETURNED', 'RETURN_DONE'],
    SHIPPING:         ['SHIPPING', 'DELIVERING'],
    CANCEL_REQUESTED: ['CANCEL_REQUESTED', 'CANCEL_REQUEST'],
    RETURN_REQUESTED: ['RETURN_REQUESTED', 'RETURN_REQUEST'],
  };
  const tabCount = (key: string) => {
    if (!key) return orders.length;
    const keys = ALIAS[key] ?? [key];
    return orders.filter(o => keys.includes(o.status)).length;
  };

  const filtered = orders.filter(o => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.productName?.toLowerCase().includes(q) ||
      o.customerPhone?.includes(q)
    );
  });

  // Summary counts
  const actionCount   = orders.filter(o => isPaid(o.status)).length;
  const progressCount = orders.filter(o => ['SHIPPING', 'DELIVERING', 'DELIVERED'].includes(o.status)).length;
  const problemCount  = orders.filter(o => isProblem(o.status)).length;
  const doneCount     = orders.filter(o => ['COMPLETED', 'EXCHANGED'].includes(o.status)).length;

  const paidFiltered   = filtered.filter(o => isPaid(o.status));
  const allPaidSelected = paidFiltered.length > 0 && paidFiltered.every(o => selected.has(o.id));
  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllPaid = () => allPaidSelected ? setSelected(new Set()) : setSelected(new Set(paidFiltered.map(o => o.id)));

  return (
    <div style={{ padding: '20px 24px 60px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <ShoppingCart size={20} style={{ color: '#e62310' }} />
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>주문 관리</h1>
            <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>네이버 스마트스토어</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <select value={hours} onChange={e => setHours(Number(e.target.value))}
            style={{ padding: '7px 10px', borderRadius: 9, border: '1.5px solid #F8DCE5', fontSize: 12, background: '#fff', color: '#555', cursor: 'pointer' }}>
            <option value={24}>최근 24시간</option>
            <option value={48}>최근 48시간</option>
            <option value={168}>최근 7일</option>
            <option value={720}>최근 30일</option>
          </select>
          <button onClick={syncOrders} disabled={syncing} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: syncing ? '#FFB3CE' : '#e62310', color: '#fff',
            padding: '8px 15px', borderRadius: 9, fontWeight: 700, fontSize: 13,
            border: 'none', cursor: syncing ? 'not-allowed' : 'pointer',
          }}>
            <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? '동기화 중...' : '네이버 동기화'}
          </button>
        </div>
      </div>

      <div style={{ height: 2, background: 'linear-gradient(90deg, #e62310, #FFB3CE)', borderRadius: 99, marginBottom: 14 }} />

      {/* Sync result banner */}
      {syncMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px',
          background: syncOk ? '#f0fdf4' : '#fff0f0',
          border: `1px solid ${syncOk ? '#86efac' : '#fca5a5'}`,
          borderRadius: 10, marginBottom: 13, fontSize: 12,
          color: syncOk ? '#15803d' : '#dc2626',
        }}>
          {syncOk ? <Check size={13} /> : <AlertTriangle size={13} />}
          {syncMsg}
          <button onClick={() => setSyncMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}>×</button>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 9, marginBottom: 14, flexWrap: 'wrap' }}>
        <SummaryCard icon={<Clock size={17} />}       label="처리 필요"  count={actionCount}   color="#1d4ed8" bg="#eff6ff" border="#bfdbfe" onClick={() => setFilter(f => f === 'PAID'      ? '' : 'PAID')}      active={filter === 'PAID'} />
        <SummaryCard icon={<Truck size={17} />}        label="배송 진행중" count={progressCount} color="#6d28d9" bg="#f5f3ff" border="#c4b5fd" onClick={() => setFilter(f => f === 'SHIPPING'  ? '' : 'SHIPPING')}  active={filter === 'SHIPPING'} />
        <SummaryCard icon={<CheckCircle2 size={17} />} label="구매확정"   count={doneCount}     color="#15803d" bg="#dcfce7" border="#86efac" onClick={() => setFilter(f => f === 'COMPLETED' ? '' : 'COMPLETED')} active={filter === 'COMPLETED'} />
        <SummaryCard icon={<XCircle size={17} />}      label="취소/반품"  count={problemCount}  color="#dc2626" bg="#fef2f2" border="#fca5a5" onClick={() => setFilter(f => f === 'CANCELLED' ? '' : 'CANCELLED')} active={filter === 'CANCELLED'} />
      </div>

      {/* Filter tabs — only show tabs with orders */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 11 }}>
        {FILTER_TABS.map(({ key, label }) => {
          const cnt = tabCount(key);
          if (cnt === 0 && key !== '') return null;
          const active = filter === key;
          return (
            <button key={key} onClick={() => setFilter(key)} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 11px', borderRadius: 99, fontSize: 12, fontWeight: 700,
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

      {/* Search + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#D4B0BC', pointerEvents: 'none' }} />
          <input type="text" placeholder="주문번호 · 고객명 · 상품명 검색"
            value={query} onChange={e => setQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: 28, paddingRight: 26, paddingTop: 7, paddingBottom: 7, fontSize: 12, background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 9, outline: 'none', boxSizing: 'border-box' }}
          />
          {query && <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#B0A0A8', fontSize: 14, lineHeight: 1 }}>×</button>}
        </div>
        {selected.size > 0 && (
          <button onClick={handleConfirm} disabled={confirming} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: '#16a34a', color: '#fff', padding: '7px 13px',
            borderRadius: 9, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer',
          }}>
            <Check size={12} /> {selected.size}건 발주확인
          </button>
        )}
        <button onClick={fetchOrders} style={{ padding: '7px 8px', borderRadius: 9, border: '1.5px solid #F8DCE5', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <RefreshCw size={12} style={{ color: '#B0A0A8' }} />
        </button>
        <span style={{ fontSize: 11, color: '#B0A0A8' }}>{filtered.length}건</span>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 16, overflow: 'hidden' }}>

        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '30px 130px 1fr 96px 86px 96px 90px',
          gap: 8, padding: '8px 14px',
          background: '#FFF0F5', borderBottom: '2px solid #FFB3CE', alignItems: 'center',
        }}>
          <input type="checkbox" checked={allPaidSelected} onChange={toggleAllPaid}
            style={{ width: 13, height: 13, cursor: 'pointer', accentColor: '#e62310' }} />
          {['주문번호 / 고객', '상품명', '결제금액', '상태', '주문일', '처리'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 900, color: '#e62310', letterSpacing: '0.04em' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 52, textAlign: 'center' }}>
            <RefreshCw size={22} style={{ color: '#FFB3CE', margin: '0 auto 8px', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 13, color: '#B0A0A8', margin: 0 }}>불러오는 중...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 52, textAlign: 'center' }}>
            <Package size={32} style={{ color: '#F8DCE5', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13, color: '#B0A0A8', margin: 0 }}>
              {query ? `"${query}" 검색 결과 없음` : '주문이 없습니다'}
            </p>
            <p style={{ fontSize: 11, color: '#D4B0BC', margin: '4px 0 0' }}>우측 상단 "네이버 동기화" 버튼을 눌러주세요</p>
          </div>
        ) : (
          filtered.map((order, idx) => {
            const st        = getSt(order.status);
            const paid      = isPaid(order.status);
            const problem   = st.group === 'problem';
            const cancel    = isCancel(order.status);
            const isSel     = selected.has(order.id);
            const isLast    = idx === filtered.length - 1;

            return (
              <div key={order.id}>
                <div
                  onClick={() => setDrawer(order)}
                  style={{
                    display: 'grid', gridTemplateColumns: '30px 130px 1fr 96px 86px 96px 90px',
                    gap: 8, padding: '10px 14px', alignItems: 'center',
                    background: isSel ? 'rgba(230,35,16,0.05)' : problem ? st.rowBg : 'transparent',
                    opacity: st.rowOpacity,
                    borderLeft: problem ? `3px solid ${st.border}` : '3px solid transparent',
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSel && !problem) (e.currentTarget as HTMLDivElement).style.background = '#FFF8FA'; }}
                  onMouseLeave={e => { if (!isSel && !problem) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  {/* Checkbox — stop click propagation */}
                  <div onClick={e => e.stopPropagation()}>
                    <input type="checkbox"
                      checked={isSel}
                      disabled={!paid}
                      onChange={() => paid && toggleSelect(order.id)}
                      style={{ width: 13, height: 13, cursor: paid ? 'pointer' : 'default', accentColor: '#e62310', opacity: paid ? 1 : 0.2 }}
                    />
                  </div>

                  {/* Col: order number + customer */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#555', margin: 0, fontFamily: 'monospace' }}>
                      {order.orderNumber?.slice(-12)}
                    </p>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', margin: '2px 0 0' }}>{order.customerName || '—'}</p>
                    <p style={{ fontSize: 10, color: '#B0A0A8', margin: '1px 0 0' }}>{order.customerPhone || ''}</p>
                  </div>

                  {/* Col: product name + claim info */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: problem ? '#aaa' : '#1A1A1A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: problem ? 'line-through' : 'none', textDecorationColor: '#fca5a5' }}>
                      {order.productName || '(상품명 없음)'}
                    </p>
                    {problem && order.claimReason ? (
                      <p style={{ fontSize: 10, fontWeight: 700, margin: '2px 0 0', color: cancel ? '#dc2626' : '#b45309', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        사유: {order.claimReason}
                      </p>
                    ) : order.quantity && order.quantity > 1 ? (
                      <p style={{ fontSize: 10, color: '#B0A0A8', margin: '2px 0 0' }}>{order.quantity}개</p>
                    ) : null}
                  </div>

                  {/* Amount */}
                  <p style={{ fontSize: 13, fontWeight: 700, color: problem ? '#aaa' : '#1A1A1A', textAlign: 'right', margin: 0, textDecoration: problem ? 'line-through' : 'none', textDecorationColor: '#fca5a5' }}>
                    {(order.totalAmount ?? 0).toLocaleString()}원
                  </p>

                  {/* Status badge */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 99,
                    background: st.bg, border: `1px solid ${st.border}`,
                    fontSize: 11, fontWeight: 700, color: st.color, whiteSpace: 'nowrap',
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
                    {st.label}
                  </div>

                  {/* Date */}
                  <p style={{ fontSize: 10, color: '#999', margin: 0 }}>
                    {(order.paymentDate ?? order.createdAt)
                      ? new Date(order.paymentDate ?? order.createdAt!).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </p>

                  {/* Col: actions — only actionable items, no redundant labels */}
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                    {paid ? (
                      <button
                        onClick={() => toggleSelect(order.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 700, padding: '5px 9px', borderRadius: 7,
                          background: isSel ? '#16a34a' : '#f0fdf4',
                          color: isSel ? '#fff' : '#16a34a',
                          border: `1.5px solid ${isSel ? '#16a34a' : '#bbf7d0'}`,
                          cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        <Check size={11} />
                        {isSel ? '선택됨' : '발주확인'}
                      </button>
                    ) : order.status === 'CONFIRMED' && !order.trackingNumber ? (
                      <button
                        onClick={() => { setDispatchModal({ orderId: order.id, productName: order.productName ?? '' }); setDispatchMsg(''); setDispatchTracking(''); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 700, padding: '5px 9px', borderRadius: 7,
                          background: '#fff7ed', color: '#ea580c',
                          border: '1.5px solid #fed7aa',
                          cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        <Truck size={11} /> 송장등록
                      </button>
                    ) : order.trackingNumber ? (
                      <button
                        title={`${order.courierCompany ?? ''} ${order.trackingNumber}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 700, padding: '5px 9px', borderRadius: 7,
                          background: '#eff6ff', color: '#2563eb',
                          border: '1.5px solid #bfdbfe',
                          cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        <Truck size={11} /> 배송조회
                      </button>
                    ) : (
                      <span style={{ fontSize: 10, color: '#D4B0BC' }}>
                        <ChevronRight size={14} />
                      </span>
                    )}
                  </div>
                </div>
                {!isLast && <div style={{ height: 1, background: '#F8DCE5', margin: '0 14px' }} />}
              </div>
            );
          })
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div style={{ padding: '8px 14px', borderTop: '1px solid #F8DCE5', background: '#FFF8FA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#B0A0A8' }}>전체 {orders.length}건{query ? ` / 검색 ${filtered.length}건` : ''}</span>
            {selected.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#e62310' }}>{selected.size}건 선택</span>
                <button onClick={handleConfirm} disabled={confirming} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: '#16a34a', color: '#fff', padding: '4px 11px',
                  borderRadius: 7, fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer',
                }}>
                  <Check size={10} /> 발주확인 처리
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dispatch modal — 송장 등록 */}
      {dispatchModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20,
        }} onClick={() => setDispatchModal(null)}>
          <div style={{
            background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 400,
            boxShadow: '0 8px 40px rgba(230,35,16,0.13)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#1a0a0a', marginBottom: 4 }}>송장 등록</div>
            <div style={{ fontSize: 12, color: '#B0A0A8', marginBottom: 20, wordBreak: 'keep-all' }}>{dispatchModal.productName}</div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4a3a3a', marginBottom: 6 }}>택배사</div>
              <select
                value={dispatchCourier}
                onChange={e => setDispatchCourier(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #F8DCE5', fontSize: 13, outline: 'none' }}
              >
                {['CJ대한통운','한진택배','롯데택배','우체국','로젠택배','GS편의점택배','CU편의점택배'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4a3a3a', marginBottom: 6 }}>송장번호</div>
              <input
                type="text"
                value={dispatchTracking}
                onChange={e => setDispatchTracking(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleDispatch(); }}
                placeholder="송장번호 입력"
                autoFocus
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #F8DCE5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {dispatchMsg && (
              <div style={{ fontSize: 12, color: '#e62310', marginBottom: 12, padding: '8px 12px', background: '#fff0f0', borderRadius: 8 }}>
                {dispatchMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setDispatchModal(null)}
                style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1.5px solid #F8DCE5', background: '#fff', color: '#B0A0A8', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={handleDispatch}
                disabled={dispatching || !dispatchTracking.trim()}
                style={{
                  flex: 2, padding: '11px 0', borderRadius: 10, border: 'none',
                  background: dispatching || !dispatchTracking.trim() ? '#F8DCE5' : '#e62310',
                  color: '#fff', fontWeight: 800, fontSize: 13, cursor: dispatching || !dispatchTracking.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Truck size={14} /> {dispatching ? '등록 중...' : '배송 처리'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {drawer && <OrderDrawer order={drawer} onClose={() => setDrawer(null)} />}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <RefreshCw size={22} style={{ color: '#FFB3CE', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <OrdersInner />
    </Suspense>
  );
}
