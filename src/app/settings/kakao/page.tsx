'use client';
// E-13A: Kakao business channel settings page
// Manages: channel info (single source of truth), insert card palette, solapi credentials (built but inactive until 50+ orders)

import { useEffect, useState } from 'react';
import {
  MessageCircle, Save, Lock, CheckCircle2, Circle,
  AlertCircle, Loader2, Palette, Send, Info, Sparkles,
} from 'lucide-react';
import KakaoChannelQR from '@/components/kakao/KakaoChannelQR';

interface PaletteSlot {
  name: string;
  hex: string;
}

interface KakaoSettings {
  kakaoChannelId: string;
  kakaoChannelUrl: string;
  kakaoChannelName: string;
  kakaoChannelEmail: string;
  solapiApiKey: string;
  solapiApiSecretSet: boolean;
  kakaoSenderId: string;
  kakaoSenderPhone: string;
  insertCardPalette: {
    slot1: PaletteSlot;
    slot2: PaletteSlot;
    slot3: PaletteSlot;
    slot4: PaletteSlot;
  };
  solapiConfigured: boolean;
  eligibleForActivation: boolean;
  monthlyDeliveredCount: number;
  activationThreshold: number;
  progressPercent: number;
}

const SLOT_KEYS: Array<keyof KakaoSettings['insertCardPalette']> = ['slot1', 'slot2', 'slot3', 'slot4'];

const SETUP_CHECKLIST = [
  { key: 'channel', label: '카카오 채널 ID 입력', required: true },
  { key: 'qrPrint', label: '카카오 채널 QR 인쇄 (인서트 카드)', required: false },
  { key: 'solapiSignup', label: '솔라피 가입 + API Key 발급', required: false },
  { key: 'pfid', label: '카카오 PFID 등록 (솔라피 콘솔)', required: false },
  { key: 'sender', label: '발신번호 등록 (1영업일)', required: false },
  { key: 'templates', label: '알림톡 템플릿 3종 등록 (검수 1~3영업일)', required: false },
  { key: 'activate', label: '솔라피 키 입력 → 자동 활성화', required: false },
];

export default function KakaoSettingsPage() {
  const [data, setData] = useState<KakaoSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Local edit state for credentials (not pre-filled from masked values)
  const [solapiApiKeyInput, setSolapiApiKeyInput] = useState('');
  const [solapiApiSecretInput, setSolapiApiSecretInput] = useState('');

  useEffect(() => {
    fetch('/api/kakao-settings')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.error || '설정을 불러오지 못했습니다');
        }
      })
      .catch(() => setError('네트워크 오류'))
      .finally(() => setLoading(false));
  }, []);

  function updateField<K extends keyof KakaoSettings>(key: K, value: KakaoSettings[K]) {
    setData((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updatePaletteSlot(slot: keyof KakaoSettings['insertCardPalette'], field: 'name' | 'hex', value: string) {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        insertCardPalette: {
          ...prev.insertCardPalette,
          [slot]: { ...prev.insertCardPalette[slot], [field]: value },
        },
      };
    });
  }

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      kakaoChannelId: data.kakaoChannelId,
      kakaoChannelUrl: data.kakaoChannelUrl,
      kakaoChannelName: data.kakaoChannelName,
      kakaoChannelEmail: data.kakaoChannelEmail,
      kakaoSenderId: data.kakaoSenderId,
      kakaoSenderPhone: data.kakaoSenderPhone,
      insertCardPalette: data.insertCardPalette,
    };

    // Only send credentials if user typed new values
    if (solapiApiKeyInput.trim().length > 0) payload.solapiApiKey = solapiApiKeyInput.trim();
    if (solapiApiSecretInput.trim().length > 0) payload.solapiApiSecret = solapiApiSecretInput.trim();

    try {
      const res = await fetch('/api/kakao-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        setSavedAt(Date.now());
        setSolapiApiKeyInput('');
        setSolapiApiSecretInput('');
        // Refresh from server to update masks
        const refreshed = await fetch('/api/kakao-settings').then((r) => r.json());
        if (refreshed.success) setData(refreshed.data);
        setTimeout(() => setSavedAt(null), 2500);
      } else {
        setError(result.error || '저장 실패');
      }
    } catch {
      setError('네트워크 오류');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, display: 'flex', alignItems: 'center', gap: 8, color: '#888' }}>
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        <span>설정 불러오는 중...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 40, color: '#E62310' }}>
        <AlertCircle size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />
        설정을 불러올 수 없습니다. {error}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 32px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEE500', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MessageCircle size={20} strokeWidth={2.5} color="#3C1E1E" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#222', margin: 0 }}>카카오 채널 설정</h1>
      </div>
      <p style={{ fontSize: 13, color: '#666', margin: '0 0 24px', lineHeight: 1.6 }}>
        카카오 비즈니스 채널 친구 자산은 무료 마케팅 풀입니다. 지금부터 인서트 카드 QR로 친구를 모으고, 월 50건 이상 주문 시 알림톡 자동 발송을 활성화하세요.
      </p>

      {/* Activation progress */}
      <div style={{ background: '#FFF8DC', border: '1px solid #FEE500', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} color="#B8860B" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#3C1E1E' }}>알림톡 자동 활성화까지</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#B8860B' }}>
            {data.monthlyDeliveredCount} / {data.activationThreshold}건
          </span>
        </div>
        <div style={{ height: 8, background: '#F4E4A6', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${data.progressPercent}%`, background: data.eligibleForActivation ? '#22C55E' : '#FEE500', borderRadius: 99, transition: 'width 0.4s' }} />
        </div>
        <p style={{ fontSize: 11, color: '#7A5A1A', margin: '8px 0 0', lineHeight: 1.5 }}>
          {data.eligibleForActivation
            ? '활성화 조건 도달! 솔라피 가입 후 키를 입력하면 즉시 알림톡 발송이 가능합니다.'
            : '월 배송완료 50건 도달 시 알림톡 발송 비용(건당 13원)이 ROI 양수가 됩니다. 그 전까지는 인서트 카드만으로 충분합니다.'}
        </p>
      </div>

      {/* Section 1: Channel basics */}
      <Section title="채널 기본 정보" icon={<MessageCircle size={14} />}>
        <Row label="채널 공개 ID">
          <input
            type="text"
            value={data.kakaoChannelId}
            onChange={(e) => updateField('kakaoChannelId', e.target.value)}
            placeholder="_xkfALG"
            style={inputStyle}
          />
          <Hint>관리자센터의 검색용 ID 입력 (예: _xkfALG)</Hint>
        </Row>
        <Row label="채널 이름">
          <input
            type="text"
            value={data.kakaoChannelName}
            onChange={(e) => updateField('kakaoChannelName', e.target.value)}
            placeholder="꽃틔움 KKOTIUM"
            style={inputStyle}
          />
        </Row>
        <Row label="채널 URL">
          <input
            type="text"
            value={data.kakaoChannelUrl}
            onChange={(e) => updateField('kakaoChannelUrl', e.target.value)}
            placeholder="https://pf.kakao.com/_xkfALG"
            style={inputStyle}
          />
          <Hint>비워두면 채널 ID로 자동 생성됩니다</Hint>
        </Row>
        <Row label="비즈니스 이메일">
          <input
            type="email"
            value={data.kakaoChannelEmail}
            onChange={(e) => updateField('kakaoChannelEmail', e.target.value)}
            placeholder="kkotium@naver.com"
            style={inputStyle}
          />
        </Row>

        {/* QR preview */}
        <div style={{ marginTop: 16, padding: 16, background: '#FFFAF0', border: '1px solid #FFE4EC', borderRadius: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#993556', margin: '0 0 12px' }}>채널 QR 미리보기 (저장 후 반영)</p>
          <KakaoChannelQR channelId={data.kakaoChannelId || '_xkfALG'} channelUrl={data.kakaoChannelUrl} size={180} />
        </div>
      </Section>

      {/* Section 2: Insert card palette */}
      <Section title="인서트 카드 컬러 팔레트" icon={<Palette size={14} />}>
        <p style={{ fontSize: 12, color: '#666', margin: '0 0 16px', lineHeight: 1.6 }}>
          시즌별로 자유롭게 변경할 수 있는 4종 슬롯입니다. 인서트 카드 생성기에서 슬롯 1~4 중 하나를 선택하거나 HEX 직접 입력으로 임시 오버라이드 가능합니다.
        </p>
        {SLOT_KEYS.map((slot, i) => {
          const data2 = data.insertCardPalette[slot];
          return (
            <div key={slot} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 1fr 140px', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid #FFE4EC' : 'none' }}>
              <div style={{ width: 56, height: 56, borderRadius: 10, background: data2.hex, border: '2px solid #FFE4EC' }} />
              <input
                type="text"
                value={data2.name}
                onChange={(e) => updatePaletteSlot(slot, 'name', e.target.value)}
                placeholder={`Slot ${i + 1} 이름`}
                style={{ ...inputStyle, marginTop: 0 }}
                maxLength={30}
              />
              <input
                type="text"
                value={data2.hex}
                onChange={(e) => updatePaletteSlot(slot, 'hex', e.target.value.toUpperCase())}
                placeholder="#FF6B8A"
                style={{ ...inputStyle, marginTop: 0, fontFamily: 'Menlo, monospace' }}
                maxLength={7}
              />
              <input
                type="color"
                value={/^#[0-9A-F]{6}$/i.test(data2.hex) ? data2.hex : '#FF6B8A'}
                onChange={(e) => updatePaletteSlot(slot, 'hex', e.target.value.toUpperCase())}
                style={{ width: '100%', height: 36, padding: 2, border: '1px solid #E5E5E5', borderRadius: 8, cursor: 'pointer' }}
              />
            </div>
          );
        })}
      </Section>

      {/* Section 3: Solapi credentials (disabled until eligible) */}
      <Section
        title="알림톡 발송 연동 (솔라피)"
        icon={data.solapiConfigured ? <CheckCircle2 size={14} color="#22C55E" /> : <Lock size={14} />}
        muted={!data.solapiConfigured}
      >
        {!data.solapiConfigured && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 12, background: '#F8F8F8', borderRadius: 8, marginBottom: 16 }}>
            <Info size={14} color="#888" style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: '#666', margin: 0, lineHeight: 1.6 }}>
              월 배송완료 50건 도달 후 솔라피 가입 → API Key 발급 → 여기에 입력 → 즉시 활성화됩니다. 그 전에는 입력만 해두셔도 발송은 일어나지 않습니다.
            </p>
          </div>
        )}
        <Row label="솔라피 API Key">
          <input
            type="text"
            value={solapiApiKeyInput || data.solapiApiKey}
            onChange={(e) => setSolapiApiKeyInput(e.target.value)}
            placeholder="NCS..."
            style={inputStyle}
            autoComplete="off"
          />
        </Row>
        <Row label="솔라피 API Secret">
          <input
            type="password"
            value={solapiApiSecretInput || (data.solapiApiSecretSet ? '••••••••••••' : '')}
            onChange={(e) => setSolapiApiSecretInput(e.target.value)}
            placeholder="새 시크릿 입력"
            style={inputStyle}
            autoComplete="off"
          />
        </Row>
        <Row label="카카오 PFID">
          <input
            type="text"
            value={data.kakaoSenderId}
            onChange={(e) => updateField('kakaoSenderId', e.target.value)}
            placeholder="@kkotium 또는 PFID 코드"
            style={inputStyle}
          />
        </Row>
        <Row label="발신번호">
          <input
            type="tel"
            value={data.kakaoSenderPhone}
            onChange={(e) => updateField('kakaoSenderPhone', e.target.value)}
            placeholder="01012345678 (- 없이)"
            style={inputStyle}
          />
        </Row>
      </Section>

      {/* Section 4: Setup checklist */}
      <Section title="연동 가이드 체크리스트" icon={<Send size={14} />}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {SETUP_CHECKLIST.map((item) => {
            const done =
              (item.key === 'channel' && Boolean(data.kakaoChannelId)) ||
              (item.key === 'solapiSignup' && Boolean(data.solapiApiKey)) ||
              (item.key === 'pfid' && Boolean(data.kakaoSenderId)) ||
              (item.key === 'sender' && Boolean(data.kakaoSenderPhone)) ||
              (item.key === 'activate' && data.solapiConfigured);
            return (
              <li key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #FFE4EC' }}>
                {done ? <CheckCircle2 size={16} color="#22C55E" /> : <Circle size={16} color="#CCC" />}
                <span style={{ fontSize: 13, color: done ? '#22C55E' : '#444', textDecoration: done ? 'line-through' : 'none' }}>
                  {item.label}
                </span>
                {item.required && !done && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#E62310', background: '#FFF0F0', padding: '2px 6px', borderRadius: 4, marginLeft: 'auto' }}>
                    필수
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Save bar */}
      <div style={{ position: 'sticky', bottom: 16, marginTop: 24, padding: 12, background: '#fff', border: '2px solid #FF6B8A', borderRadius: 12, boxShadow: '0 4px 16px rgba(255,107,138,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 12, color: '#666' }}>
          {savedAt && <span style={{ color: '#22C55E', fontWeight: 600 }}>저장 완료</span>}
          {error && <span style={{ color: '#E62310' }}>{error}</span>}
          {!savedAt && !error && '변경 사항이 있다면 저장해주세요'}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', fontSize: 14, fontWeight: 700,
            color: '#fff', background: saving ? '#FFB3CE' : '#E62310',
            border: 'none', borderRadius: 10, cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
          <span>{saving ? '저장 중...' : '전체 저장'}</span>
        </button>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, icon, children, muted }: { title: string; icon: React.ReactNode; children: React.ReactNode; muted?: boolean }) {
  return (
    <section
      style={{
        background: '#fff',
        border: `1px solid ${muted ? '#E5E5E5' : '#FFE4EC'}`,
        borderRadius: 14,
        padding: 20,
        marginBottom: 16,
        opacity: muted ? 0.85 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ color: muted ? '#888' : '#E62310' }}>{icon}</span>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#222', margin: 0 }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>{children}</p>;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 13,
  color: '#222',
  background: '#fff',
  border: '1px solid #E5E5E5',
  borderRadius: 8,
  outline: 'none',
};
