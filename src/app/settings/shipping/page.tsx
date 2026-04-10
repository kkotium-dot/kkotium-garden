'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Truck, Filter, AlertTriangle, Hash, RefreshCw, Download } from 'lucide-react';
import { PlatformPicker, SupplierPicker } from '@/components/ui/PlatformSupplierPicker';

type ShippingTemplate = {
  id: string; name: string; code: string;
  platformCode: string | null; supplierCode: string | null;
  courierCode: string; shippingType: number;
  shippingFee: number; freeThreshold: number | null;
  returnFee: number; exchangeFee: number;
  jejuFee: number; islandFee: number;
  naverTemplateNo: string | null; bundleKey: string | null;
  active: boolean; createdAt: string; updatedAt: string;
  // joined relations
  supplier?: { id: string; name: string; code: string; abbr: string } | null;
  _count?: { Product: number };
};
type Supplier = { id: string; name: string; code: string; };
type Platform = { id: string; name: string; code: string; };

const EMPTY_FORM = {
  name: '', platformCode: '', supplierCode: '',
  courierCode: 'CJGLS', shippingType: 1,
  shippingFee: 3000, freeThreshold: 30000,
  returnFee: 6000, exchangeFee: 6000,
  jejuFee: 5000, islandFee: 5000,
  naverTemplateNo: '', bundleKey: '',
};

// Shipping type label + color
const ST_META: Record<number, { label: string; color: string; bg: string; border: string }> = {
  1: { label: '묶음배송', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  2: { label: '개별배송', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  3: { label: '조건부무료', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  4: { label: '무료배송', color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
};
const stMeta = (t: number) => ST_META[t] ?? { label: `타입${t}`, color: '#888', bg: '#f9f9f9', border: '#eee' };

export default function ShippingPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [templates, setTemplates] = useState<ShippingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fpc, setFpc] = useState('');
  const [fsi, setFsi] = useState('');
  const [modal, setModal] = useState<{
    open: boolean; mode: 'add'|'edit'; id?: string;
    data: typeof EMPTY_FORM & { active?: boolean };
  }>({ open: false, mode: 'add', data: { ...EMPTY_FORM } });
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null);
  // A-3/A-4: address sync + delivery extract state
  const [syncingAddr, setSyncingAddr] = useState(false);
  const [extracting, setExtracting]   = useState(false);

  // Quick-code edit: inline naverTemplateNo input per card
  const [quickNoId, setQuickNoId] = useState<string | null>(null);
  const [quickNoVal, setQuickNoVal] = useState('');
  const [quickNoSaving, setQuickNoSaving] = useState(false);

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // A-3: sync Naver addressbook (pickup + return addresses)
  const syncAddressbook = async () => {
    setSyncingAddr(true);
    try {
      const res  = await fetch('/api/naver/addressbooks');
      const data = await res.json();
      if (data.success) {
        const r = data.defaults?.release;
        const ret = data.defaults?.return;
        showToast(
          r || ret
            ? `주소록 동기화 완료! ${r ? '출고지: ' + r.addressName : ''} ${ret ? '/ 반품지: ' + ret.addressName : ''}`.trim()
            : '주소록이 비어있습니다. 스마트스토어 센터에서 주소록을 먼저 등록해주세요.'
        );
      } else {
        showToast(data.error ?? '주소록 동기화 실패 — 네이버 API 키를 확인해주세요', 'error');
      }
    } catch {
      showToast('주소록 동기화 중 오류 발생', 'error');
    } finally {
      setSyncingAddr(false);
    }
  };

  // A-4: extract deliveryInfo from registered Naver products
  const extractDelivery = async () => {
    setExtracting(true);
    try {
      const res  = await fetch('/api/naver/sync-delivery', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(
          data.created > 0
            ? `배송 정보 추출 완료! 새 템플릿 ${data.created}개 생성됨 (전체 ${data.extracted}개 상품 처리)`
            : data.extracted > 0
              ? `배송 정보 추출 완료! 기존 템플릿 매칭됨 (${data.extracted}개 상품)`
              : data.message ?? '네이버에 등록된 상품이 없습니다'
        );
        if (data.created > 0) loadAll(fpc||undefined, fsi||undefined);
      } else {
        showToast(data.error ?? '배송 정보 추출 실패', 'error');
      }
    } catch {
      showToast('배송 정보 추출 중 오류 발생', 'error');
    } finally {
      setExtracting(false);
    }
  };

  const loadAll = async (platformCode?: string, supplierId?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (platformCode) params.set('platformCode', platformCode);
      if (supplierId)   params.set('supplierId', supplierId);
      const [tRes, pRes, sRes] = await Promise.all([
        fetch('/api/shipping-templates?' + params),
        fetch('/api/platforms'),
        fetch('/api/suppliers'),
      ]);
      const [tData, pData, sData] = await Promise.all([tRes.json(), pRes.json(), sRes.json()]);
      if (tData.success) setTemplates(tData.templates ?? []);
      if (pData.success) setPlatforms(pData.platforms ?? []);
      if (sData.success) setSuppliers(sData.suppliers ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(fpc||undefined, fsi||undefined); }, [fpc, fsi]);

  const setField = (k: string, v: any) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

  const save = async () => {
    if (!modal.data.name.trim()) { showToast('템플릿명을 입력해 주세요', 'error'); return; }
    setSaving(true);
    try {
      const body = {
        ...modal.data,
        shippingFee:     Number(modal.data.shippingFee),
        freeThreshold:   Number(modal.data.shippingType) === 3 ? Number(modal.data.freeThreshold) : null,
        returnFee:       Number(modal.data.returnFee),
        exchangeFee:     Number(modal.data.exchangeFee),
        jejuFee:         Number(modal.data.jejuFee),
        islandFee:       Number(modal.data.islandFee),
        naverTemplateNo: modal.data.naverTemplateNo.trim() || null,
      };
      const url    = modal.mode === 'edit' ? `/api/shipping-templates/${modal.id}` : '/api/shipping-templates';
      const method = modal.mode === 'edit' ? 'PATCH' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data   = await res.json();
      if (!data.success) throw new Error(data.error ?? '저장 실패');
      showToast(modal.mode === 'edit' ? '수정됐어요' : '추가됐어요');
      setModal(m => ({ ...m, open: false }));
      loadAll(fpc||undefined, fsi||undefined);
    } catch (e: any) {
      showToast(e.message ?? '오류 발생', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: ShippingTemplate) => {
    if (!confirm(`"${t.name}" 템플릿을 삭제할까요?`)) return;
    const res  = await fetch(`/api/shipping-templates/${t.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) { showToast('삭제됐어요'); loadAll(fpc||undefined, fsi||undefined); }
    else showToast(data.error ?? '삭제 실패', 'error');
  };

  // Quick save naverTemplateNo (배송 템플릿 코드) inline
  const saveQuickNo = async (id: string) => {
    setQuickNoSaving(true);
    try {
      const res = await fetch(`/api/shipping-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naverTemplateNo: quickNoVal.trim() || null }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('배송 템플릿 코드 저장 완료!');
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, naverTemplateNo: quickNoVal.trim() || null } : t));
      setQuickNoId(null);
    } catch {
      showToast('저장 실패', 'error');
    } finally {
      setQuickNoSaving(false);
    }
  };

  const supplierOptions = useMemo(() => suppliers, [suppliers]);

  // Count active templates missing naverTemplateNo (배송 템플릿 코드)
  const missingCount = templates.filter(t => t.active && !t.naverTemplateNo).length;

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', padding: '28px 24px 56px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 99999,
          padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 700,
          background: toast.type === 'success' ? '#15803d' : '#e62310', color: '#fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                  {([0,60,120,180,240,300] as number[]).map((deg, i) => { const r = deg * Math.PI / 180; const cx = 26 + Math.cos(r) * 11.4; const cy = 26 + Math.sin(r) * 11.4; return <ellipse key={i} cx={cx} cy={cy} rx={14} ry={10.4} transform={`rotate(${deg} ${cx} ${cy})`} fill="#e62310" />; })}
                  <circle cx="26" cy="26" r="14.6" fill="#e62310" />
                </svg>
                <Truck size={20} color="#fff" style={{ position: 'relative', zIndex: 1 }} />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.3px', margin: 0 }}>배송 레시피</h1>
            </div>
            <button
              onClick={() => setModal({ open:true, mode:'add', data: { ...EMPTY_FORM, platformCode: fpc||'' } })}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#e62310', color: '#fff', padding: '9px 18px', borderRadius: 10, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', flexShrink: 0 }}
            >
              <Plus size={15} /> 템플릿 추가
            </button>
            {/* A-3: Naver addressbook sync */}
            <button
              onClick={syncAddressbook}
              disabled={syncingAddr}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', color: '#1d4ed8', padding: '9px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13, border: '1.5px solid #bfdbfe', cursor: syncingAddr ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: syncingAddr ? 0.6 : 1 }}
            >
              <RefreshCw size={14} className={syncingAddr ? 'animate-spin' : ''} /> 주소록 동기화
            </button>
            {/* A-4: extract delivery from Naver products */}
            <button
              onClick={extractDelivery}
              disabled={extracting}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', color: '#15803d', padding: '9px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13, border: '1.5px solid #86efac', cursor: extracting ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: extracting ? 0.6 : 1 }}
            >
              <Download size={14} /> 배송 역추출
            </button>
          </div>
          <div style={{ height: 2.5, background: '#FFB3CE', borderRadius: 99, margin: '8px 0 6px' }} />
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>배송 템플릿 코드를 등록하면 엑셀 [배송비 템플릿코드] 컬럼에 자동 입력됩니다.</p>
        </div>

        {/* Naver SmartStore direct link — naverTemplateNo manual entry guide */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '12px 16px', borderRadius: 14, marginBottom: 12,
          background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
          border: '1.5px solid #86efac',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Truck size={15} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#15803d', margin: '0 0 2px' }}>네이버 스마트스토어 배송 템플릿 번호 입력 방법</p>
              <p style={{ fontSize: 11, color: '#166534', margin: 0, lineHeight: 1.5 }}>네이버 스마트스토어 센터 › 배송 › 배송 템플릿에서 <strong>정책 번호(deliveryPolicyNo)</strong>를 확인 후 아래 [코드 입력] 버튼으로 등록하세요.</p>
            </div>
          </div>
          <a
            href="https://sell.smartstore.naver.com/#/store-delivery/delivery-policy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 10, background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            스마트스토어 센터
          </a>
        </div>

        {/* Missing code alert */}
        {missingCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 16px', borderRadius: 14, marginBottom: 16,
            background: '#fffbeb', border: '1.5px solid #fde68a',
          }}>
            <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#92400e', margin: '0 0 2px' }}>
                배송 템플릿 코드 미입력 {missingCount}개
              </p>
              <p style={{ fontSize: 11, color: '#a16207', margin: 0, lineHeight: 1.5 }}>
                코드가 없으면 엑셀 업로드 시 [배송비 템플릿코드] 컬럼이 비어 배송 정보를 수동 입력해야 합니다.
                아래 카드의 <strong>[코드 입력]</strong> 버튼을 눌러 네이버 스마트스토어센터에서 받은 배송 템플릿 코드를 등록해주세요.
              </p>
            </div>
          </div>
        )}

        {/* Filter card */}
        <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #F8DCE5', padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={14} style={{ color: '#B0A0A8' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#B0A0A8' }}>필터</span>
            </div>
            <button
              onClick={() => loadAll(fpc||undefined, fsi||undefined)}
              style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, border: '1px solid #F8DCE5', background: '#FFF8FB', color: '#888', cursor: 'pointer', fontWeight: 600 }}
            >새로고침</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#B0A0A8', fontWeight: 600, display: 'block', marginBottom: 6 }}>플랫폼</label>
              <PlatformPicker
                platforms={platforms}
                selectedId={platforms.find(p => p.code === fpc)?.id ?? ''}
                onChange={id => { const plat = platforms.find(p => p.id === id); setFsi(''); setFpc(plat?.code ?? ''); }}
                placeholder="전체"
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#B0A0A8', fontWeight: 600, display: 'block', marginBottom: 6 }}>공급사</label>
              <SupplierPicker
                suppliers={supplierOptions}
                selectedId={fsi}
                onChange={setFsi}
                selectedPlatform={platforms.find(p => p.code === fpc) ?? null}
                placeholder="전체"
              />
            </div>
          </div>
        </div>

        {/* Template list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: 90, background: '#fff', borderRadius: 16, border: '1.5px solid #F8DCE5', opacity: 0.5 }} className="animate-pulse" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div style={{ background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 18, padding: '48px 20px', textAlign: 'center' }}>
            <Truck size={32} style={{ color: '#FFB3CE', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 700, color: '#1A1A1A', margin: '0 0 4px' }}>등록된 배송 템플릿이 없어요</p>
            <p style={{ fontSize: 12, color: '#B0A0A8', margin: 0 }}>위의 템플릿 추가 버튼으로 첫 레시피를 만들어보세요</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {templates.map(t => {
              const meta     = stMeta(t.shippingType);
              const hasCode  = !!t.naverTemplateNo;
              const isQuickEdit = quickNoId === t.id;

              return (
                <div key={t.id} style={{
                  background: '#fff', borderRadius: 18,
                  border: `1.5px solid ${!t.active ? '#F8DCE5' : hasCode ? '#F8DCE5' : '#fde68a'}`,
                  padding: '16px 18px',
                  opacity: t.active ? 1 : 0.55,
                  transition: 'box-shadow 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>

                    {/* Type icon */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: meta.bg, border: `1.5px solid ${meta.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Truck size={18} style={{ color: meta.color }} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A' }}>{t.name}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                          background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
                        }}>{meta.label}</span>
                        {!t.active && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#fee2e2', color: '#b91c1c' }}>비활성</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginBottom: 8 }}>
                        {[
                          ['플랫폼', t.platformCode ?? '-'],
                          ['공급사', t.supplier?.name ? `${t.supplier.name} (${t.supplierCode ?? t.supplier.code})` : (t.supplierCode ?? '-')],
                          ['택배사', t.courierCode],
                          ['배송비', `${t.shippingFee.toLocaleString()}원`],
                          ...(t.shippingType === 3 && t.freeThreshold != null ? [['무료기준', `${t.freeThreshold.toLocaleString()}원`]] : []),
                          ['반품비', `${t.returnFee.toLocaleString()}원`],
                          ['연결 상품', `${t._count?.Product ?? 0}개`],
                        ].map(([label, val]) => (
                          <span key={label} style={{ fontSize: 11, color: '#B0A0A8' }}>
                            {label}: <strong style={{ color: '#555', fontWeight: 700 }}>{val}</strong>
                          </span>
                        ))}
                      </div>

                      {/* ── 배송 템플릿 코드 area ── */}
                      {isQuickEdit ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Hash size={13} style={{ color: '#7c3aed', flexShrink: 0 }} />
                          <input
                            autoFocus
                            type="text"
                            value={quickNoVal}
                            onChange={e => setQuickNoVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveQuickNo(t.id); if (e.key === 'Escape') setQuickNoId(null); }}
                            placeholder="네이버 스토어에서 발급된 배송 템플릿 코드 (예: 2035152)"
                            style={{
                              flex: 1, padding: '6px 12px', borderRadius: 9, fontSize: 12,
                              fontFamily: 'monospace', fontWeight: 700,
                              border: '2px solid #7c3aed', outline: 'none',
                              background: '#faf5ff', color: '#4c1d95',
                            }}
                          />
                          <button
                            onClick={() => saveQuickNo(t.id)}
                            disabled={quickNoSaving}
                            style={{ padding: '6px 14px', borderRadius: 9, fontSize: 12, fontWeight: 800, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                          >
                            {quickNoSaving ? '저장 중' : '저장'}
                          </button>
                          <button
                            onClick={() => setQuickNoId(null)}
                            style={{ padding: '6px 10px', borderRadius: 9, fontSize: 12, background: '#fff', color: '#B0A0A8', border: '1px solid #F8DCE5', cursor: 'pointer', flexShrink: 0 }}
                          >취소</button>
                        </div>
                      ) : hasCode ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 8,
                            background: '#f3e8ff', border: '1px solid #ddd6fe',
                          }}>
                            <Hash size={11} style={{ color: '#7c3aed' }} />
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#4c1d95', fontFamily: 'monospace' }}>
                              {t.naverTemplateNo}
                            </span>
                            <span style={{ fontSize: 10, color: '#9f7aea', marginLeft: 2 }}>배송비 템플릿코드 자동 입력</span>
                          </div>
                          <button
                            onClick={() => { setQuickNoId(t.id); setQuickNoVal(t.naverTemplateNo ?? ''); }}
                            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 7, border: '1px solid #ddd6fe', background: '#faf5ff', color: '#7c3aed', cursor: 'pointer', fontWeight: 600 }}
                          >수정</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 8,
                            background: '#fffbeb', border: '1px solid #fde68a',
                          }}>
                            <AlertTriangle size={11} style={{ color: '#d97706' }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e' }}>
                              배송 템플릿 코드 미입력 — [배송비 템플릿코드] 컬럼 비어있음
                            </span>
                          </div>
                          <button
                            onClick={() => { setQuickNoId(t.id); setQuickNoVal(''); }}
                            style={{
                              fontSize: 11, padding: '4px 12px', borderRadius: 8,
                              background: '#7c3aed', color: '#fff',
                              border: 'none', cursor: 'pointer', fontWeight: 700,
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            <Hash size={11} /> 코드 입력
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => setModal({ open:true, mode:'edit', id:t.id, data: { name:t.name, platformCode:t.platformCode??'', supplierCode:t.supplierCode??'', courierCode:t.courierCode, shippingType:t.shippingType, shippingFee:t.shippingFee, freeThreshold:t.freeThreshold??30000, returnFee:t.returnFee, exchangeFee:t.exchangeFee, jejuFee:t.jejuFee, islandFee:t.islandFee, naverTemplateNo:t.naverTemplateNo??'', bundleKey:t.bundleKey??'', active:t.active } })}
                        style={{ padding: 8, borderRadius: 9, background: 'transparent', border: 'none', cursor: 'pointer', color: '#B0A0A8' }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => remove(t)}
                        style={{ padding: 8, borderRadius: 9, background: 'transparent', border: 'none', cursor: 'pointer', color: '#B0A0A8' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      {modal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500,
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 24px 60px rgba(0,0,0,0.18)', border: '2px solid #F8DCE5',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 22px 16px', borderBottom: '1px solid #F8DCE5',
              position: 'sticky', top: 0, background: '#fff', zIndex: 1,
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>
                {modal.mode === 'add' ? '배송 템플릿 추가' : '배송 템플릿 수정'}
              </h2>
              <button onClick={() => setModal(m => ({ ...m, open: false }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B0A0A8', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Template name */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 5 }}>
                  템플릿 이름 <span style={{ color: '#e62310' }}>*</span>
                </label>
                <input
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F8DCE5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  placeholder="예: DMM_NEXT_조건부_30000"
                  value={modal.data.name} onChange={e => setField('name', e.target.value)}
                />
                <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 10, background: '#FFF8FB', border: '1px solid #F8DCE5', fontSize: 11, color: '#B0A0A8', lineHeight: 1.6 }}>
                  <strong style={{ color: '#e62310' }}>{'{플랫폼}_{공급사약자}_{배송유형}_{조건}'}</strong>
                  <span style={{ marginLeft: 8 }}>예) DMM_NEXT_조건부_30000 · DMM_LHMK_무료 · DMM_유료_3000</span>
                </div>
              </div>

              {/* Platform + Supplier */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 5 }}>플랫폼 코드</label>
                  <input style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F8DCE5', fontSize: 13, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="예: DMM" value={modal.data.platformCode} onChange={e => setField('platformCode', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 5 }}>공급사 코드</label>
                  <input style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F8DCE5', fontSize: 13, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="예: NEXT" value={modal.data.supplierCode} onChange={e => setField('supplierCode', e.target.value)} />
                </div>
              </div>

              {/* Courier + Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 5 }}>택배사 코드</label>
                  <input style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F8DCE5', fontSize: 13, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
                    value={modal.data.courierCode} onChange={e => setField('courierCode', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 5 }}>배송 유형</label>
                  <select
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F8DCE5', fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                    value={modal.data.shippingType} onChange={e => setField('shippingType', Number(e.target.value))}>
                    <option value={1}>1 — 묶음배송</option>
                    <option value={2}>2 — 개별배송</option>
                    <option value={3}>3 — 조건부무료</option>
                    <option value={4}>4 — 무료배송</option>
                  </select>
                </div>
              </div>

              {/* Fee + Threshold */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 5 }}>배송비 (원)</label>
                  <input type="number" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F8DCE5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    value={modal.data.shippingFee} onChange={e => setField('shippingFee', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: Number(modal.data.shippingType) === 3 ? '#555' : '#ccc', display: 'block', marginBottom: 5 }}>
                    무료 기준금액 <span style={{ fontSize: 10, fontWeight: 600 }}>(조건부무료만)</span>
                  </label>
                  <input type="number"
                    disabled={Number(modal.data.shippingType) !== 3}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F8DCE5', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: Number(modal.data.shippingType) !== 3 ? '#f9f9f9' : '#fff', color: Number(modal.data.shippingType) !== 3 ? '#ccc' : '#1A1A1A' }}
                    value={modal.data.freeThreshold} onChange={e => setField('freeThreshold', e.target.value)} />
                </div>
              </div>

              {/* ★ 배송 템플릿 코드 — highlighted section */}
              <div style={{
                padding: '14px 16px', borderRadius: 14,
                background: 'linear-gradient(135deg,#faf5ff,#f3e8ff)',
                border: '2px solid #ddd6fe',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Hash size={14} style={{ color: '#7c3aed' }} />
                  <label style={{ fontSize: 13, fontWeight: 800, color: '#4c1d95', margin: 0 }}>
                    배송 템플릿 코드
                  </label>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: '#e62310', color: '#fff', marginLeft: 2 }}>
                    배송비 템플릿코드 컬럼
                  </span>
                </div>
                <input
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 10,
                    border: '2px solid #7c3aed', fontSize: 14,
                    fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.05em',
                    outline: 'none', background: '#fff', color: '#4c1d95',
                    boxSizing: 'border-box',
                  }}
                  placeholder="예: 2035152  (네이버 스마트스토어센터 → 배송비 템플릿에서 확인)"
                  value={modal.data.naverTemplateNo}
                  onChange={e => setField('naverTemplateNo', e.target.value)}
                />
                <p style={{ fontSize: 11, color: '#7c3aed', margin: '6px 0 0', lineHeight: 1.5 }}>
                  네이버 스마트스토어센터 → 판매관리 → 배송정보관리 → 배송비 템플릿에서 코드를 확인하세요.
                  코드가 있으면 엑셀 업로드 시 배송방법·배송비유형·반품배송비 등 개별 컬럼이 자동으로 비워집니다.
                </p>
              </div>

              {/* Return + Exchange */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 5 }}>반품비 (원)</label>
                  <input type="number" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F8DCE5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    value={modal.data.returnFee} onChange={e => setField('returnFee', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 5 }}>교환비 (원)</label>
                  <input type="number" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F8DCE5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    value={modal.data.exchangeFee} onChange={e => setField('exchangeFee', e.target.value)} />
                </div>
              </div>

              {/* Jeju + Island */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 5 }}>제주 추가 (원)</label>
                  <input type="number" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F8DCE5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    value={modal.data.jejuFee} onChange={e => setField('jejuFee', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 5 }}>도서산간 추가 (원)</label>
                  <input type="number" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F8DCE5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    value={modal.data.islandFee} onChange={e => setField('islandFee', e.target.value)} />
                </div>
              </div>

            </div>

            {/* Modal footer */}
            <div style={{ display: 'flex', gap: 10, padding: '0 22px 22px' }}>
              <button
                onClick={() => setModal(m => ({ ...m, open: false }))}
                style={{ flex: 1, padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, background: '#fff', color: '#888', border: '1.5px solid #F8DCE5', cursor: 'pointer' }}
              >취소</button>
              <button
                onClick={save}
                disabled={saving}
                style={{ flex: 1, padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 800, background: saving ? '#FFB3CE' : '#e62310', color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {saving ? '저장 중...' : <><Check size={14} /> 저장</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
