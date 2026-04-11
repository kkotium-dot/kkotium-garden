'use client';
// /orders — Phase B: Order Management
// Naver Commerce API real-time order sync + manual confirm/ship actions
// Design: Kkotium garden theme

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RefreshCw, Package, Truck, Check, AlertTriangle, Search, X, ChevronRight } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NaverOrder {
  // DB fields (from /api/orders)
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  totalPrice?: number;
  customerName: string;
  customerPhone: string;
  shippingAddress?: string;
  createdAt?: string;
  trackingNumber?: string;
  courierCompany?: string;
  // Legacy / display helpers
  productOrderId?: string;
  productName?: string;
  quantity?: number;
  totalPaymentAmount?: number;
  orderStatus?: string;
  paymentDate?: string;
  receiverName?: string;
}

interface SyncResult {
  success: boolean;
  synced: number;
  total: number;
  error?: string;
  ipError?: boolean;
}

// Naver order status → Korean label + color
const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  // Active order statuses
  // Raw Naver API statuses (in case stored directly)
  CANCEL_DONE:       { label: '취소완료',   color: '#e62310', bg: '#fff0f5', dot: 'bg-red-500'    },
  CANCEL_REQUEST:    { label: '취소요청',   color: '#f97316', bg: '#fff7ed', dot: 'bg-orange-400' },
  RETURN_DONE:       { label: '반품완료',   color: '#e62310', bg: '#fff0f5', dot: 'bg-red-400'    },
  RETURN_REQUEST:    { label: '반품요청',   color: '#d97706', bg: '#fffbeb', dot: 'bg-amber-400'  },
  // Internal mapped statuses
  PENDING:           { label: '결제대기',   color: '#888',    bg: '#f9fafb', dot: 'bg-gray-400'   },
  PAYMENT_WAITING:   { label: '결제대기',   color: '#888',    bg: '#f9fafb', dot: 'bg-gray-400'   },
  PAID:              { label: '결제완료',   color: '#2563eb', bg: '#eff6ff', dot: 'bg-blue-500'   },
  PAYED:             { label: '결제완료',   color: '#2563eb', bg: '#eff6ff', dot: 'bg-blue-500'   },
  SHIPPING:          { label: '배송중',     color: '#7c3aed', bg: '#f5f3ff', dot: 'bg-purple-500' },
  DELIVERING:        { label: '배송중',     color: '#7c3aed', bg: '#f5f3ff', dot: 'bg-purple-500' },
  DELIVERED:         { label: '배송완료',   color: '#16a34a', bg: '#f0fdf4', dot: 'bg-green-500'  },
  COMPLETED:         { label: '구매확정',   color: '#15803d', bg: '#dcfce7', dot: 'bg-green-600'  },
  PURCHASE_DECIDED:  { label: '구매확정',   color: '#15803d', bg: '#dcfce7', dot: 'bg-green-600'  },
  // Claim statuses
  CANCELLED:         { label: '취소완료',   color: '#e62310', bg: '#fff0f5', dot: 'bg-red-500'    },
  CANCELED:          { label: '취소완료',   color: '#e62310', bg: '#fff0f5', dot: 'bg-red-500'    },
  CANCEL_REQUESTED:  { label: '취소요청',   color: '#f97316', bg: '#fff7ed', dot: 'bg-orange-400' },
  RETURNED:          { label: '반품완료',   color: '#e62310', bg: '#fff0f5', dot: 'bg-red-400'    },
  RETURN_REQUESTED:  { label: '반품요청',   color: '#d97706', bg: '#fffbeb', dot: 'bg-amber-400'  },
  EXCHANGED:         { label: '교환완료',   color: '#0891b2', bg: '#ecfeff', dot: 'bg-cyan-500'   },
};

function getStatusMeta(status: string) {
  return STATUS_META[status] ?? { label: status, color: '#888', bg: '#f9fafb', dot: 'bg-gray-400' };
}

// ── Inner page (uses useSearchParams) ─────────────────────────────────────────

function OrdersInner() {
  const searchParams = useSearchParams();
  const [orders, setOrders]           = useState<NaverOrder[]>([]);
  const [loading, setLoading]         = useState(false);
  const [syncing, setSyncing]         = useState(false);
  const [syncResult, setSyncResult]   = useState<SyncResult | null>(null);
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') ?? '');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirming, setConfirming]   = useState<Set<string>>(new Set());
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [ipWarning, setIpWarning]     = useState(false);
  const [hours, setHours]             = useState(24);

  // Sync Naver orders
  const syncOrders = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res  = await fetch(`/api/naver/orders?manual=1&hours=${hours}`);
      const data = await res.json();
      const ipErr = data.error?.includes('IP_NOT_ALLOWED') || data.error?.includes('IP');
      setIpWarning(ipErr);
      setSyncResult({ ...data, ipError: ipErr });
      if (data.success) fetchOrders();
    } catch {
      setSyncResult({ success: false, synced: 0, total: 0, error: '네트워크 오류' });
    } finally {
      setSyncing(false);
    }
  };

  // Fetch orders from DB
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (searchQuery)  params.set('search', searchQuery);
      params.set('limit', '100');
      const res  = await fetch('/api/orders?' + params);
      const data = await res.json();
      if (data.success) setOrders(data.orders ?? []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [filterStatus]);

  // Bulk confirm orders (발주확인)
  const handleBulkConfirm = async () => {
    const ids = [...selected];
    setConfirming(new Set(ids));
    try {
      const res  = await fetch('/api/naver/orders/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productOrderIds: ids }),
      });
      const data = await res.json();
      if (data.success) {
        setSelected(new Set());
        fetchOrders();
      }
    } catch {
      // non-critical
    } finally {
      setConfirming(new Set());
    }
  };

  const filtered = orders.filter(o => {
    const matchSearch = !searchQuery ||
      (o.productOrderId?.includes(searchQuery) ||
       o.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       o.receiverName?.includes(searchQuery));
    return matchSearch;
  });

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.orderStatus] = (acc[o.orderStatus] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    const payed = filtered.filter(o => o.status === 'PAID' || o.status === 'PAYED');
    if (selected.size === payed.length && payed.length > 0) setSelected(new Set());
    else setSelected(new Set(payed.map(o => o.id ?? o.productOrderId ?? '')));
  };

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', padding: '24px', paddingBottom: 56 }}>

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                {([0,60,120,180,240,300] as number[]).map((deg, i) => {
                  const r = deg * Math.PI / 180;
                  const cx = 26 + Math.cos(r) * 11.4;
                  const cy = 26 + Math.sin(r) * 11.4;
                  return <ellipse key={i} cx={cx} cy={cy} rx={14} ry={10.4} transform={`rotate(${deg} ${cx} ${cy})`} fill="#e62310" />;
                })}
                <circle cx="26" cy="26" r="14.6" fill="#e62310" />
              </svg>
              <Package size={20} style={{ position: 'relative', zIndex: 1, color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>주문 관리</h1>
              <p style={{ fontSize: 12, color: '#888', margin: 0, marginTop: 2 }}>네이버 스마트스토어 주문 현황</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Hours selector */}
            <select
              value={hours}
              onChange={e => setHours(Number(e.target.value))}
              style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #F8DCE5', fontSize: 12, background: '#fff', color: '#555' }}
            >
              <option value={24}>최근 24시간</option>
              <option value={48}>최근 48시간</option>
              <option value={168}>최근 7일</option>
              <option value={720}>최근 30일</option>
            </select>
            <button
              onClick={syncOrders}
              disabled={syncing}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: syncing ? '#FFB3CE' : '#e62310', color: '#fff', padding: '9px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13, border: 'none', cursor: syncing ? 'not-allowed' : 'pointer' }}
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? '동기화 중...' : '네이버 동기화'}
            </button>
          </div>
        </div>
        <div style={{ height: 2.5, background: '#FFB3CE', borderRadius: 99, margin: '8px 0 6px' }} />
      </div>

      {/* IP Warning Banner */}
      {ipWarning && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
          background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 14, marginBottom: 16,
        }}>
          <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#92400e', margin: '0 0 4px' }}>
              네이버 API IP 허용 필요
            </p>
            <p style={{ fontSize: 12, color: '#a16207', margin: '0 0 6px', lineHeight: 1.6 }}>
              Vercel 서버 IP가 네이버 커머스 API 허용 목록에 없습니다.
              네이버 개발자센터 → 내 애플리케이션 → API 설정 → <strong>IP 허용 목록</strong>에서 Vercel IP를 추가하거나
              <strong> IP 제한을 해제</strong>해주세요.
            </p>
            <a
              href="https://developers.naver.com/apps/#/list"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, fontWeight: 700, color: '#d97706', textDecoration: 'underline' }}
            >
              네이버 개발자센터 바로가기
            </a>
          </div>
        </div>
      )}

      {/* Sync result */}
      {syncResult && !ipWarning && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          background: syncResult.success ? '#f0fdf4' : '#fff0f5',
          border: `1px solid ${syncResult.success ? '#86efac' : '#FFB3CE'}`,
          borderRadius: 12, marginBottom: 14, fontSize: 13,
          color: syncResult.success ? '#15803d' : '#e62310',
        }}>
          {syncResult.success
            ? <><Check size={14} /> 동기화 완료 — {syncResult.synced}개 주문 업데이트 (총 {syncResult.total}개)</>
            : <><AlertTriangle size={14} /> {syncResult.error}</>
          }
        </div>
      )}

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {[
          { key: '', label: '전체', count: orders.length },
          ...Object.entries(statusCounts).map(([key, count]) => ({
            key,
            label: getStatusMeta(key).label,
            count,
          })),
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700,
              background: filterStatus === key ? '#e62310' : '#fff',
              color: filterStatus === key ? '#fff' : '#555',
              border: `1.5px solid ${filterStatus === key ? '#e62310' : '#F8DCE5'}`,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {label}
            <span style={{
              fontSize: 10, fontWeight: 900, padding: '1px 6px', borderRadius: 99,
              background: filterStatus === key ? 'rgba(255,255,255,0.9)' : '#F8DCE5',
              color: '#e62310',
            }}>{count}</span>
          </button>
        ))}
      </div>

      {/* Search + bulk actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#D4B0BC' }} />
          <input
            type="text"
            placeholder="주문번호, 상품명, 수취인 검색"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: 13, background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 10, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        {selected.size > 0 && (
          <button
            onClick={handleBulkConfirm}
            disabled={confirming.size > 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#16a34a', color: '#fff', padding: '8px 14px', borderRadius: 10, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}
          >
            <Check size={13} /> {selected.size}개 발주확인
          </button>
        )}
        <button
          onClick={fetchOrders}
          disabled={loading}
          style={{ padding: '8px 10px', borderRadius: 10, border: '1.5px solid #F8DCE5', background: '#fff', cursor: 'pointer' }}
        >
          <RefreshCw size={13} style={{ color: '#B0A0A8' }} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Orders table */}
      <div style={{ background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 18, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '36px 140px 1fr 90px 90px 100px 80px',
          gap: 8, padding: '10px 16px',
          background: '#FFF0F5', borderBottom: '2px solid #FFB3CE',
        }}>
          <input
            type="checkbox"
            onChange={toggleAll}
            checked={selected.size > 0 && selected.size > 0 && selected.size === filtered.filter(o => o.status === 'PAID' || o.status === 'PAYED').length}
            style={{ width: 15, height: 15 }}
          />
          {['주문번호', '상품', '결제금액', '상태', '주문일', '관리'].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 900, color: '#e62310', letterSpacing: '0.04em' }}>{h}</span>
          ))}
        </div>
        <div style={{ height: 1, background: '#F8DCE5' }} />

        {/* Rows */}
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <RefreshCw size={24} className="animate-spin" style={{ color: '#FFB3CE', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: '#B0A0A8' }}>불러오는 중...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <Package size={32} style={{ color: '#F8DCE5', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13, color: '#B0A0A8', margin: 0 }}>
              {ipWarning ? '네이버 IP 설정 후 동기화하면 주문이 표시됩니다' : '주문이 없습니다'}
            </p>
            <p style={{ fontSize: 11, color: '#D4B0BC', margin: '4px 0 0' }}>
              우측 상단 "네이버 동기화" 버튼을 눌러주세요
            </p>
          </div>
        ) : (
          filtered.map((order, idx) => {
            const meta   = getStatusMeta(order.status ?? order.orderStatus ?? '');
            const isLast = idx === filtered.length - 1;
            const isPayed = order.status === 'PAID' || order.status === 'PAYED' || order.orderStatus === 'PAYED';
            return (
              <div key={order.productOrderId}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '36px 140px 1fr 90px 90px 100px 80px',
                  gap: 8, padding: '12px 16px', alignItems: 'center',
                  background: selected.has(order.id ?? order.productOrderId ?? '') ? 'rgba(230,35,16,0.04)' : 'transparent',
                }}
                  onMouseEnter={e => { if (!selected.has(order.id ?? order.productOrderId ?? '')) (e.currentTarget as HTMLElement).style.background = '#FFF8FA'; }}
                  onMouseLeave={e => { if (!selected.has(order.id ?? order.productOrderId ?? '')) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(order.id ?? order.productOrderId ?? '')}
                    disabled={!isPayed}
                    onChange={() => isPayed && toggleSelect(order.id ?? order.productOrderId ?? '')}
                    style={{ width: 15, height: 15, opacity: isPayed ? 1 : 0.3 }}
                  />
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#1A1A1A', margin: 0, fontFamily: 'monospace' }}>
                      {(order.orderNumber ?? order.productOrderId ?? order.id)?.slice(-12)}
                    </p>
                    <p style={{ fontSize: 10, color: '#B0A0A8', margin: '2px 0 0' }}>{order.customerName ?? order.receiverName}</p>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.productName ?? order.orderNumber ?? '-'}
                    </p>
                    <p style={{ fontSize: 11, color: '#B0A0A8', margin: '2px 0 0' }}>주문번호: {(order.orderNumber ?? order.id)?.slice(-12)}</p>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', textAlign: 'right', margin: 0 }}>
                    {(order.totalAmount ?? order.totalPaymentAmount ?? 0).toLocaleString()}원
                  </p>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 99,
                    background: meta.bg, fontSize: 11, fontWeight: 700, color: meta.color,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                    {meta.label}
                  </div>
                  <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </p>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {isPayed && (
                      <button
                        onClick={() => toggleSelect(order.id ?? order.productOrderId ?? '')}
                        style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 7, background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', cursor: 'pointer' }}
                      >
                        확인
                      </button>
                    )}
                    {order.trackingNumber && (
                      <button
                        style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 7, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                      >
                        <Truck size={10} />
                      </button>
                    )}
                  </div>
                </div>
                {!isLast && <div style={{ height: 1, background: '#F8DCE5', margin: '0 16px' }} />}
              </div>
            );
          })
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #F8DCE5', background: '#FFF8FA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#B0A0A8' }}>{filtered.length}개 주문</span>
            {selected.size > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#e62310' }}>{selected.size}개 선택됨</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <RefreshCw size={28} className="animate-spin" style={{ color: '#FFB3CE' }} />
      </div>
    }>
      <OrdersInner />
    </Suspense>
  );
}
