'use client';
import { useState, useEffect } from 'react';
import { Check, Store, Truck, Phone, RotateCcw, Key, Eye, EyeOff } from 'lucide-react';
import { COURIER_CODES } from '@/lib/naver/codes';

interface StoreSettings {
  freeShippingThreshold: number;
  storeName: string;
  asPhone: string;
  asGuide: string;
  defaultCourierCode: string;
  defaultReturnFee: number;
  defaultExchangeFee: number;
  domeggookApiKey: string;
}

const DEFAULTS: StoreSettings = {
  freeShippingThreshold: 30000,
  storeName: '',
  asPhone: '',
  asGuide: '',
  defaultCourierCode: 'CJGLS',
  defaultReturnFee: 6000,
  defaultExchangeFee: 6000,
  domeggookApiKey: '',
};

const inp = 'w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent bg-white transition';
const sel = inp + ' appearance-none cursor-pointer';

function SettingSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 bg-gray-50">
        <span className="text-rose-400">{icon}</span>
        <h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function StoreSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/store-settings')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.settings) {
          setSettings({
            freeShippingThreshold: d.settings.freeShippingThreshold ?? DEFAULTS.freeShippingThreshold,
            storeName: d.settings.storeName ?? '',
            asPhone: d.settings.asPhone ?? '',
            asGuide: d.settings.asGuide ?? '',
            defaultCourierCode: d.settings.defaultCourierCode ?? DEFAULTS.defaultCourierCode,
            defaultReturnFee: d.settings.defaultReturnFee ?? DEFAULTS.defaultReturnFee,
            defaultExchangeFee: d.settings.defaultExchangeFee ?? DEFAULTS.defaultExchangeFee,
            domeggookApiKey: d.settings.domeggook_api_key_set ? '••••••••' : '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/store-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          // Only send if user actually typed a new key (not the masked placeholder)
          domeggookApiKey: settings.domeggookApiKey.includes('•') ? undefined : settings.domeggookApiKey,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(d.error ?? '저장 실패');
      }
    } catch {
      setError('네트워크 오류');
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof StoreSettings, val: string | number) =>
    setSettings(prev => ({ ...prev, [key]: val }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/settings" className="text-gray-400 hover:text-gray-600 text-sm">← 설정</a>
            <span className="text-gray-300">|</span>
            <h1 className="text-base font-bold text-gray-900">스토어 기본 설정</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            {saved ? <Check size={14} /> : null}
            {saving ? '저장 중...' : saved ? '저장됨' : '저장'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <Check size={14} />
            설정이 저장되었습니다.
          </div>
        )}

        {/* Store info */}
        <SettingSection icon={<Store size={16} />} title="스토어 정보">
          <Field label="스토어 이름" hint="내부 식별용으로만 사용됩니다">
            <input
              className={inp}
              value={settings.storeName}
              onChange={e => update('storeName', e.target.value)}
              placeholder="예) 꽃틔움 가든"
            />
          </Field>
        </SettingSection>

        {/* Shipping defaults */}
        <SettingSection icon={<Truck size={16} />} title="배송 기본값">
          {/* Free shipping threshold — the key setting */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-blue-500 text-base">&#9432;</span>
              <p className="text-xs font-semibold text-blue-700">무료배송 기준금액</p>
            </div>
            <p className="text-xs text-blue-600 leading-relaxed">
              상품 등록 시 판매가가 이 금액 이상이고 배송유형이 유료인 경우,
              조건부무료 배송으로 전환을 추천하는 힌트가 자동으로 표시됩니다.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  className={inp}
                  type="number"
                  min={0}
                  step={1000}
                  value={settings.freeShippingThreshold}
                  onChange={e => update('freeShippingThreshold', Number(e.target.value))}
                  placeholder="30000"
                />
              </div>
              <span className="text-sm text-gray-600 shrink-0">원 이상</span>
              <button
                type="button"
                onClick={() => update('freeShippingThreshold', 30000)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-rose-500 transition-colors shrink-0 px-2 py-1.5 rounded-lg hover:bg-rose-50"
                title="기본값 30,000원으로 초기화"
              >
                <RotateCcw size={12} />
                기본값
              </button>
            </div>
            <p className="text-xs text-blue-500">
              현재 설정: 판매가 <strong>{settings.freeShippingThreshold.toLocaleString()}원</strong> 이상 시 힌트 표시
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="기본 택배사">
              <select
                className={sel}
                value={settings.defaultCourierCode}
                onChange={e => update('defaultCourierCode', e.target.value)}
              >
                {COURIER_CODES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </Field>
            <div />
            <Field label="기본 반품배송비 (원)">
              <input
                className={inp}
                type="number"
                min={0}
                value={settings.defaultReturnFee}
                onChange={e => update('defaultReturnFee', Number(e.target.value))}
              />
            </Field>
            <Field label="기본 교환배송비 (원)">
              <input
                className={inp}
                type="number"
                min={0}
                value={settings.defaultExchangeFee}
                onChange={e => update('defaultExchangeFee', Number(e.target.value))}
              />
            </Field>
          </div>
        </SettingSection>

        {/* A/S defaults */}
        <SettingSection icon={<Phone size={16} />} title="A/S 기본값">
          <Field label="A/S 전화번호" hint="상품 등록 시 기본값으로 자동 입력됩니다">
            <input
              className={inp}
              value={settings.asPhone}
              onChange={e => update('asPhone', e.target.value)}
              placeholder="010-0000-0000"
            />
          </Field>
          <Field label="A/S 안내 문구">
            <textarea
              className={`${inp} h-24 resize-none`}
              value={settings.asGuide}
              onChange={e => update('asGuide', e.target.value)}
              placeholder="예) 제품 수령 후 7일 이내 교환/반품 가능합니다. 단순 변심의 경우 왕복 배송비는 고객 부담입니다."
            />
          </Field>
        </SettingSection>

        {/* Domeggook API Key */}
        <SettingSection icon={<Key size={16} />} title="도매꾹 API Key">
          <Field
            label="도매꾹 OpenAPI Key"
            hint="도매꾹(domeggook.com) → 마이페이지 → API 관리에서 발급받은 키를 입력하세요. 크롤러(꿀통 사냥터) 작동에 필수입니다."
          >
            <input
              type="password"
              className={inp}
              value={settings.domeggookApiKey}
              onChange={e => update('domeggookApiKey', e.target.value)}
              placeholder="도매꾹 API Key 입력"
              autoComplete="off"
            />
            {settings.domeggookApiKey.includes('•') && (
              <p className="mt-1 text-xs text-green-600 font-medium">✓ API Key 설정됨 — 새 키를 입력하면 덮어쓰기됩니다</p>
            )}
          </Field>
        </SettingSection>

        {/* Domeggook API Key */}
        <SettingSection icon={<Key size={16} />} title="도매꾹 API Key">
          <Field
            label="도매꾹 OpenAPI Key"
            hint="도매꾹(domeggook.com) → 마이페이지 → API 관리에서 발급받은 키를 입력하세요. 크롤러(꿀통 사냥터) 작동에 필수입니다."
          >
            <input
              type="password"
              className={inp}
              value={settings.domeggookApiKey}
              onChange={e => update('domeggookApiKey', e.target.value)}
              placeholder="도매꾹 API Key 입력"
              autoComplete="off"
            />
            {settings.domeggookApiKey.includes('•') && (
              <p className="mt-1 text-xs text-green-600 font-medium">✓ API Key 설정됨 — 새 키를 입력하면 덮어쓰기됩니다</p>
            )}
          </Field>
        </SettingSection>

        {/* Save footer */}
        <div className="pt-2 pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            {saved && <Check size={16} />}
            {saving ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
