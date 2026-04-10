'use client';
// /naver-settings — 네이버 기본값 v2
// P3-C: app-unified design (kk-card), domeggook API key UI, toast feedback,
//        shipping section diff note

import { useEffect, useMemo, useState } from 'react';
import { Check, Info, KeyRound, Layers } from 'lucide-react';
import {
  COURIER_CODES,
  FLOWER_CATEGORY_CODES,
  KKOTIUM_DEFAULTS,
  ORIGIN_CODES,
  PRODUCT_STATUSES,
  SHIPPING_FEE_TYPES,
  SHIPPING_PAY_TYPES,
  TAX_TYPES,
} from '@/lib/naver/codes';

type Settings = typeof KKOTIUM_DEFAULTS;

export default function NaverSettingsPage() {
  const [settings, setSettings]       = useState<Settings>(KKOTIUM_DEFAULTS);
  const [apiKey, setApiKey]           = useState('');
  const [saving, setSaving]           = useState(false);
  const [savingKey, setSavingKey]     = useState(false);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    fetch('/api/naver-settings')
      .then(r => r.json())
      .then(d => { if (d?.settings) setSettings(d.settings); })
      .catch(() => {});
    // Load domeggook API key from store_settings
    fetch('/api/store-settings')
      .then(r => r.json())
      .then(d => { if (d?.settings?.domeggookApiKey || d?.settings?.domeggook_api_key) setApiKey(d.settings.domeggookApiKey ?? d.settings.domeggook_api_key ?? ''); })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/naver-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) showToast('네이버 기본값이 저장됐습니다');
      else showToast('저장 실패', false);
    } finally {
      setSaving(false);
    }
  };

  const saveApiKey = async () => {
    setSavingKey(true);
    try {
      const res = await fetch('/api/store-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domeggookApiKey: apiKey.trim() }),
      });
      if (res.ok) showToast('도매꾹 API 키가 저장됐습니다');
      else showToast('저장 실패', false);
    } finally {
      setSavingKey(false);
    }
  };

  // Field component — defined outside useMemo to avoid closure stale state
  const setField = (k: keyof Settings, v: string | number) =>
    setSettings(prev => ({ ...prev, [k]: v }));

  // Section wrapper
  const Section = ({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) => (
    <div className="kk-card overflow-hidden">
      <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #F8DCE5', display: 'flex', alignItems: 'center', gap: 8 }}>
        {Icon && <Icon size={14} style={{ color: '#e62310' }} />}
        <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>{title}</p>
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  );

  // Unified field component
  const Field = ({ label, keyName, type = 'text', options, placeholder }: {
    label: string;
    keyName: keyof Settings;
    type?: 'text' | 'number';
    options?: { code: string; label: string }[];
    placeholder?: string;
  }) => {
    const value = settings[keyName] as string | number;
    return (
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#B0A0A8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </label>
        {options ? (
          <select
            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #F8DCE5', fontSize: 13, background: '#fff', outline: 'none', color: '#1A1A1A' }}
            value={String(value ?? '')}
            onChange={e => setField(keyName, e.target.value)}
          >
            {options.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
          </select>
        ) : (
          <input
            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #F8DCE5', fontSize: 13, outline: 'none', color: '#1A1A1A', boxSizing: 'border-box' }}
            type={type}
            placeholder={placeholder}
            value={String(value ?? '')}
            onChange={e => setField(keyName, type === 'number' ? Number(e.target.value) : e.target.value)}
          />
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 56px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 99999,
          padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 700,
          background: toast.ok ? '#15803d' : '#e62310', color: '#fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Check size={14} />
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                {([0,60,120,180,240,300] as number[]).map((deg, i) => { const r=deg*Math.PI/180; const cx=26+Math.cos(r)*11.4; const cy=26+Math.sin(r)*11.4; return <ellipse key={i} cx={cx} cy={cy} rx={14} ry={10.4} transform={`rotate(${deg} ${cx} ${cy})`} fill="#e62310" />; })}
                <circle cx="26" cy="26" r="14.6" fill="#e62310" />
              </svg>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'relative', zIndex: 1 }}>
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>네이버 기본값</h1>
          </div>
          <button onClick={save} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: saving ? '#F8DCE5' : '#e62310', color: saving ? '#B0A0A8' : '#fff', padding: '9px 18px', borderRadius: 10, fontWeight: 700, fontSize: 13, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
            <Check size={14} />
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
        <div style={{ height: 2.5, background: '#FFB3CE', borderRadius: 99, margin: '8px 0 6px' }} />
        <p style={{ fontSize: 13, color: '#888', margin: 0 }}>엑셀 내보내기(일괄등록 템플릿)에 자동으로 채워질 기본값을 관리합니다.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* 도매꾹 API 키 — NEW */}
        <div className="kk-card overflow-hidden">
          <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #F8DCE5', display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={14} style={{ color: '#e62310' }} />
            <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>도매꾹 API 키</p>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="password"
                style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid #F8DCE5', fontSize: 13, outline: 'none', fontFamily: 'monospace', color: '#1A1A1A' }}
                placeholder="도매꾹/도매매 API 키를 입력해 주세요"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
              <button onClick={saveApiKey} disabled={savingKey}
                style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: savingKey ? '#F8DCE5' : '#1A1A1A', color: savingKey ? '#B0A0A8' : '#fff', border: 'none', cursor: savingKey ? 'not-allowed' : 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} />
                {savingKey ? '저장 중' : '저장'}
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#B0A0A8', marginTop: 6, lineHeight: 1.5 }}>
              꿀통 사냥터 크롤링에 사용됩니다. 도매꾹 파트너센터 → API 관리에서 발급받을 수 있습니다.
            </p>
          </div>
        </div>

        {/* 상품 기본 */}
        <div className="kk-card overflow-hidden">
          <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #F8DCE5' }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>상품 기본</p>
          </div>
          <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <Field label="브랜드" keyName="brand" />
            <Field label="기본 카테고리" keyName="categoryCode" options={FLOWER_CATEGORY_CODES} />
            <Field label="원산지코드" keyName="originCode" options={ORIGIN_CODES} />
            <Field label="부가세" keyName="taxType" options={TAX_TYPES} />
            <Field label="상품상태" keyName="productStatus" options={PRODUCT_STATUSES} />
            <Field label="미성년자 구매" keyName="minorPurchase" options={[{ code: 'Y', label: '가능 (Y)' }, { code: 'N', label: '불가 (N)' }]} />
          </div>
        </div>

        {/* 배송 */}
        <div className="kk-card overflow-hidden">
          <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #F8DCE5', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={14} style={{ color: '#e62310' }} />
              <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>배송 기본값</p>
            </div>
          </div>
          {/* Shipping vs template diff note */}
          <div style={{ margin: '12px 20px 0', padding: '10px 14px', borderRadius: 12, background: '#eff6ff', border: '1.5px solid #bfdbfe', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Info size={13} style={{ color: '#2563eb', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, color: '#1e40af', margin: 0, lineHeight: 1.6 }}>
              <strong>여기 배송 설정</strong>은 배송 레시피(템플릿)가 연결되지 않은 상품의 엑셀 fallback 기본값입니다.
              상품별 배송 조건은 <strong>TOOLS → 배송 레시피</strong>에서 템플릿으로 관리하세요.
            </p>
          </div>
          <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <Field label="택배사코드" keyName="courierCode" options={COURIER_CODES} />
            <Field label="배송비유형" keyName="shippingFeeType" options={SHIPPING_FEE_TYPES} />
            <Field label="기본배송비" keyName="shippingFee" type="number" />
            <Field label="조건부무료 최소금액" keyName="freeShippingMin" type="number" />
            <Field label="반품배송비" keyName="returnShippingFee" type="number" />
            <Field label="교환배송비" keyName="exchangeShippingFee" type="number" />
            <Field label="배송비 결제방식" keyName="shippingPayType" options={SHIPPING_PAY_TYPES} />
            <Field label="배송방법" keyName="shippingMethod" placeholder="예: 택배배송" />
          </div>
        </div>

        {/* 출고/반품/교환지 */}
        <div className="kk-card overflow-hidden">
          <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #F8DCE5' }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>출고 / 반품 / 교환지</p>
          </div>
          <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <Field label="출고지" keyName="shippingFrom" placeholder="예: 서울특별시" />
            <Field label="반품지" keyName="returnAddress" placeholder="예: 서울특별시" />
            <Field label="교환지" keyName="exchangeAddress" placeholder="예: 서울특별시" />
          </div>
        </div>

        {/* A/S */}
        <div className="kk-card overflow-hidden">
          <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #F8DCE5' }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>A/S</p>
          </div>
          <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="A/S 전화번호" keyName="asPhone" />
            <Field label="A/S 안내" keyName="asGuide" placeholder="예: 평일 10:00~18:00" />
          </div>
        </div>

        {/* 할인 정책 안내 */}
        <div className="kk-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Info size={14} style={{ color: '#2563eb', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', margin: '0 0 4px' }}>
                즉시할인(기본할인) = 모바일 즉시할인 자동 연동
              </p>
              <p style={{ fontSize: 11, color: '#3b82f6', margin: 0, lineHeight: 1.6 }}>
                네이버 스마트스토어 정책상 모바일 즉시할인은 PC 즉시할인과 동일하게 설정됩니다.
                엑셀 내보내기 시 즉시할인 값/단위가 모바일 즉시할인 칸에도 자동으로 동일하게 입력됩니다.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
