'use client';
// E-13C: Insert card generator
// A6 (105x148mm) printable thank-you cards with kakao QR + review reward CTA
// Hybrid color: 4-slot palette (from /settings/kakao) + HEX override for one-off cards
// Print: A4 single-sheet, 4 cards per page, 1cm margins for cutting

import { useEffect, useMemo, useState } from 'react';
import {
  CreditCard, Printer, Download, Palette as PaletteIcon,
  Loader2, AlertCircle, Settings, Sparkles,
} from 'lucide-react';
import KakaoChannelQR from '@/components/kakao/KakaoChannelQR';
import { getCardColorScheme, isValidHex, expandHex } from '@/lib/insert-card-colors';

interface PaletteSlot {
  name: string;
  hex: string;
}

interface Settings {
  kakaoChannelId: string;
  kakaoChannelUrl: string;
  kakaoChannelName: string;
  insertCardPalette: {
    slot1: PaletteSlot;
    slot2: PaletteSlot;
    slot3: PaletteSlot;
    slot4: PaletteSlot;
  };
}

type SlotKey = 'slot1' | 'slot2' | 'slot3' | 'slot4' | 'custom';

const REWARD_PRESETS = [
  { label: '텍스트 리뷰', amount: 500 },
  { label: '포토 리뷰', amount: 1000 },
  { label: '베스트 리뷰', amount: 3000 },
];

export default function InsertCardPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  // Card content
  const [storeName, setStoreName] = useState('꽃틔움 가든');
  const [productName, setProductName] = useState('');
  const [reviewReward, setReviewReward] = useState(1000);
  const [mainMessage, setMainMessage] = useState('소중한 한 송이를 선택해주셔서 감사합니다');
  const [subMessage, setSubMessage] = useState('포토 리뷰 작성 시 적립금을 드려요');

  // Color selection
  const [activeSlot, setActiveSlot] = useState<SlotKey>('slot1');
  const [customHex, setCustomHex] = useState('#FF6B8A');

  // Print layout
  const [layout, setLayout] = useState<'single' | 'fourPerA4'>('fourPerA4');

  useEffect(() => {
    fetch('/api/kakao-settings')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setSettings({
            kakaoChannelId: res.data.kakaoChannelId,
            kakaoChannelUrl: res.data.kakaoChannelUrl,
            kakaoChannelName: res.data.kakaoChannelName,
            insertCardPalette: res.data.insertCardPalette,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Resolved color from active slot or custom HEX
  const baseHex = useMemo(() => {
    if (!settings) return '#FF6B8A';
    if (activeSlot === 'custom') {
      return isValidHex(customHex) ? expandHex(customHex) : '#FF6B8A';
    }
    return settings.insertCardPalette[activeSlot].hex;
  }, [settings, activeSlot, customHex]);

  const colors = useMemo(() => getCardColorScheme(baseHex), [baseHex]);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div style={{ padding: 40, display: 'flex', alignItems: 'center', gap: 8, color: '#888' }}>
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        <span>설정 불러오는 중...</span>
      </div>
    );
  }

  if (!settings) {
    return (
      <div style={{ padding: 40, color: '#E62310' }}>
        <AlertCircle size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />
        설정을 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header (hidden on print) */}
      <div className="no-print" style={{ padding: '20px 32px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFF0F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={20} strokeWidth={2.5} color="#E62310" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#222', margin: 0 }}>인서트 카드</h1>
        </div>
        <p style={{ fontSize: 13, color: '#666', margin: '0 0 16px', lineHeight: 1.6 }}>
          박스에 동봉하는 A6 감사카드를 생성합니다. 카카오 QR + 리뷰 적립금 안내로 친구 추가 + 리뷰를 동시에 유도하세요.
        </p>
      </div>

      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, padding: '0 32px 80px', alignItems: 'flex-start' }}>
        {/* Left: input panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Color theme */}
          <Section title="컬러 테마" icon={<PaletteIcon size={14} />}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
              {(['slot1', 'slot2', 'slot3', 'slot4'] as const).map((slot) => {
                const s = settings.insertCardPalette[slot];
                const active = activeSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setActiveSlot(slot)}
                    style={{
                      padding: 6,
                      background: active ? '#FFF0F5' : '#fff',
                      border: `2px solid ${active ? '#E62310' : '#FFE4EC'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <div style={{ width: '100%', height: 28, borderRadius: 4, background: s.hex }} />
                    <span style={{ fontSize: 10, color: active ? '#E62310' : '#666', fontWeight: 600 }}>{s.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom HEX override */}
            <button
              type="button"
              onClick={() => setActiveSlot('custom')}
              style={{
                width: '100%', padding: 8,
                background: activeSlot === 'custom' ? '#FFF0F5' : '#fff',
                border: `2px solid ${activeSlot === 'custom' ? '#E62310' : '#FFE4EC'}`,
                borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <Sparkles size={12} color={activeSlot === 'custom' ? '#E62310' : '#888'} />
              <span style={{ fontSize: 12, fontWeight: 600, color: activeSlot === 'custom' ? '#E62310' : '#666' }}>
                이번 카드만 다른 색
              </span>
            </button>

            {activeSlot === 'custom' && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input
                  type="text"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value.toUpperCase())}
                  placeholder="#FF6B8A"
                  style={{ ...inputStyle, fontFamily: 'Menlo, monospace', flex: 1 }}
                  maxLength={7}
                />
                <input
                  type="color"
                  value={isValidHex(customHex) ? expandHex(customHex) : '#FF6B8A'}
                  onChange={(e) => setCustomHex(e.target.value.toUpperCase())}
                  style={{ width: 44, height: 36, padding: 2, border: '1px solid #E5E5E5', borderRadius: 8, cursor: 'pointer' }}
                />
              </div>
            )}

            <div style={{ marginTop: 10, padding: 8, background: '#F8F8F8', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Settings size={11} color="#888" />
              <span style={{ fontSize: 10, color: '#888' }}>
                팔레트 4종은 카카오 채널 설정에서 변경
              </span>
            </div>
          </Section>

          {/* Card content */}
          <Section title="카드 내용" icon={<CreditCard size={14} />}>
            <Row label="스토어명">
              <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} maxLength={30} style={inputStyle} />
            </Row>
            <Row label="상품명 (선택)">
              <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} maxLength={40} placeholder="비워두면 표시 안 됨" style={inputStyle} />
            </Row>
            <Row label="메인 메시지">
              <textarea value={mainMessage} onChange={(e) => setMainMessage(e.target.value)} maxLength={50} rows={2} style={{ ...inputStyle, resize: 'none' }} />
            </Row>
            <Row label="서브 메시지">
              <input type="text" value={subMessage} onChange={(e) => setSubMessage(e.target.value)} maxLength={40} style={inputStyle} />
            </Row>
            <Row label="리뷰 적립금">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 6 }}>
                {REWARD_PRESETS.map((p) => (
                  <button
                    key={p.amount}
                    type="button"
                    onClick={() => setReviewReward(p.amount)}
                    style={{
                      padding: '6px 4px',
                      fontSize: 10,
                      fontWeight: 600,
                      color: reviewReward === p.amount ? '#fff' : '#666',
                      background: reviewReward === p.amount ? '#E62310' : '#fff',
                      border: `1px solid ${reviewReward === p.amount ? '#E62310' : '#E5E5E5'}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    {p.label} {p.amount}원
                  </button>
                ))}
              </div>
              <input type="number" value={reviewReward} onChange={(e) => setReviewReward(Number(e.target.value) || 0)} min={0} max={100000} step={500} style={inputStyle} />
            </Row>
          </Section>

          {/* Print options */}
          <Section title="인쇄 설정" icon={<Printer size={14} />}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button
                type="button"
                onClick={() => setLayout('fourPerA4')}
                style={{
                  padding: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  color: layout === 'fourPerA4' ? '#fff' : '#666',
                  background: layout === 'fourPerA4' ? '#E62310' : '#fff',
                  border: `1px solid ${layout === 'fourPerA4' ? '#E62310' : '#E5E5E5'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                A4 4매 배치
              </button>
              <button
                type="button"
                onClick={() => setLayout('single')}
                style={{
                  padding: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  color: layout === 'single' ? '#fff' : '#666',
                  background: layout === 'single' ? '#E62310' : '#fff',
                  border: `1px solid ${layout === 'single' ? '#E62310' : '#E5E5E5'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                A6 단일
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#888', margin: '10px 0 0', lineHeight: 1.5 }}>
              A4 4매 배치: 가정용 프린터로 1장 인쇄 → 자르기. 종이 절약, 가장 권장.
            </p>
          </Section>

          {/* Action */}
          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 20px', fontSize: 14, fontWeight: 700,
              color: '#fff', background: '#E62310',
              border: 'none', borderRadius: 10, cursor: 'pointer',
            }}
          >
            <Download size={14} />
            <span>인쇄 / PDF로 저장</span>
          </button>
          <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0', lineHeight: 1.5, textAlign: 'center' }}>
            인쇄 대화창에서 &quot;PDF로 저장&quot;을 선택하면 파일로 보관할 수 있습니다.
          </p>
        </div>

        {/* Right: live preview */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div style={{ background: '#F4F4F4', borderRadius: 12, padding: 24, minHeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#888', margin: 0, letterSpacing: '0.05em' }}>실시간 미리보기 (A6 105 × 148mm)</p>
            <CardPreview
              colors={colors}
              storeName={storeName}
              productName={productName}
              mainMessage={mainMessage}
              subMessage={subMessage}
              reviewReward={reviewReward}
              channelId={settings.kakaoChannelId}
              channelUrl={settings.kakaoChannelUrl}
              channelName={settings.kakaoChannelName}
            />
          </div>
        </div>
      </div>

      {/* Print-only output */}
      <div className="print-only">
        {layout === 'fourPerA4' ? (
          <div className="a4-grid">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="a4-cell">
                <CardPreview
                  colors={colors}
                  storeName={storeName}
                  productName={productName}
                  mainMessage={mainMessage}
                  subMessage={subMessage}
                  reviewReward={reviewReward}
                  channelId={settings.kakaoChannelId}
                  channelUrl={settings.kakaoChannelUrl}
                  channelName={settings.kakaoChannelName}
                  printSafe
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="a6-single">
            <CardPreview
              colors={colors}
              storeName={storeName}
              productName={productName}
              mainMessage={mainMessage}
              subMessage={subMessage}
              reviewReward={reviewReward}
              channelId={settings.kakaoChannelId}
              channelUrl={settings.kakaoChannelUrl}
              channelName={settings.kakaoChannelName}
              printSafe
            />
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .print-only { display: none; }
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          .print-only {
            display: block;
            position: absolute;
            top: 0;
            left: 0;
            width: 210mm;
            min-height: 297mm;
          }
          .no-print { display: none !important; }
          .a4-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            gap: 4mm;
            width: 100%;
            height: 100%;
          }
          .a4-cell {
            display: flex;
            align-items: center;
            justify-content: center;
            border: 0.3mm dashed #CCC;
          }
          .a6-single {
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding-top: 20mm;
          }
        }
      `}</style>
    </div>
  );
}

// ── Card preview component ─────────────────────────────────────────────────────

interface CardPreviewProps {
  colors: ReturnType<typeof getCardColorScheme>;
  storeName: string;
  productName: string;
  mainMessage: string;
  subMessage: string;
  reviewReward: number;
  channelId: string;
  channelUrl: string;
  channelName: string;
  printSafe?: boolean;
}

function CardPreview({
  colors, storeName, productName, mainMessage, subMessage, reviewReward,
  channelId, channelUrl, channelName, printSafe = false,
}: CardPreviewProps) {
  // A6: 105 x 148 mm. On screen, scale to 280 x 395 px (~2.7x). On print, use mm directly.
  const dimensions = printSafe
    ? { width: '105mm', height: '148mm' }
    : { width: 280, height: 395 };

  return (
    <div
      style={{
        ...dimensions,
        background: colors.background,
        borderRadius: printSafe ? 0 : 8,
        boxShadow: printSafe ? 'none' : `0 4px 20px ${colors.shadow}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        border: `${printSafe ? '0.3mm' : '1px'} solid ${colors.accentBorder}`,
      }}
    >
      {/* Header band */}
      <div
        style={{
          background: colors.headerBg,
          padding: printSafe ? '6mm 6mm 5mm' : '14px 20px 12px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: printSafe ? '4mm' : 14, fontWeight: 800, color: colors.textOnDark, margin: 0, letterSpacing: '-0.02em' }}>
          {storeName}
        </p>
        <p style={{ fontSize: printSafe ? '2.5mm' : 9, fontWeight: 500, color: colors.textOnDark, opacity: 0.85, margin: '2px 0 0', letterSpacing: '0.15em' }}>
          THANK YOU
        </p>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: printSafe ? '5mm 6mm' : '16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Greeting */}
        <div style={{ textAlign: 'center', marginBottom: printSafe ? '3mm' : 8 }}>
          <p style={{ fontSize: printSafe ? '3.2mm' : 12, fontWeight: 600, color: colors.textOnLight, margin: '0 0 4px', lineHeight: 1.4 }}>
            {mainMessage}
          </p>
          {productName && (
            <p style={{ fontSize: printSafe ? '2.5mm' : 10, fontWeight: 500, color: colors.textOnLight, opacity: 0.7, margin: 0 }}>
              {productName}
            </p>
          )}
        </div>

        {/* Reward block */}
        <div
          style={{
            width: '100%',
            background: colors.accentLight,
            border: `${printSafe ? '0.3mm' : '1px'} solid ${colors.accentBorder}`,
            borderRadius: printSafe ? '2mm' : 6,
            padding: printSafe ? '4mm' : 12,
            textAlign: 'center',
            marginBottom: printSafe ? '4mm' : 12,
          }}
        >
          <p style={{ fontSize: printSafe ? '2.8mm' : 10, fontWeight: 600, color: colors.textOnLight, margin: '0 0 3px', opacity: 0.85 }}>
            {subMessage}
          </p>
          <p style={{ fontSize: printSafe ? '6mm' : 22, fontWeight: 900, color: colors.headerBg, margin: 0, letterSpacing: '-0.02em' }}>
            {reviewReward.toLocaleString()}원
          </p>
        </div>

        {/* QR + channel info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: printSafe ? '4mm' : 12, width: '100%' }}>
          <div style={{ width: printSafe ? '24mm' : 80, height: printSafe ? '24mm' : 80, flexShrink: 0, background: '#fff', padding: printSafe ? '1mm' : 4, border: `${printSafe ? '0.3mm' : '1px'} solid ${colors.accentBorder}`, borderRadius: printSafe ? '1mm' : 4 }}>
            <KakaoChannelQR channelId={channelId} channelUrl={channelUrl} size={printSafe ? 80 : 72} showActions={false} bgColor="#FFFFFF" fgColor="#000000" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: printSafe ? '2.8mm' : 10, fontWeight: 700, color: colors.textOnLight, margin: '0 0 2px' }}>
              친구 추가
            </p>
            <p style={{ fontSize: printSafe ? '2.4mm' : 9, fontWeight: 500, color: colors.textOnLight, margin: '0 0 4px', opacity: 0.8 }}>
              {channelName}
            </p>
            <p style={{ fontSize: printSafe ? '2mm' : 8, fontWeight: 500, color: colors.textOnLight, margin: 0, opacity: 0.6, fontFamily: 'Menlo, monospace' }}>
              {channelId}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: colors.accentMid, padding: printSafe ? '2mm' : 6, textAlign: 'center' }}>
        <p style={{ fontSize: printSafe ? '2.2mm' : 9, fontWeight: 500, color: colors.textOnLight, margin: 0, opacity: 0.85 }}>
          QR 스캔 → 친구 추가 → 적립금 안내 받기
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ background: '#fff', border: '1px solid #FFE4EC', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ color: '#E62310' }}>{icon}</span>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: '#222', margin: 0 }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#444', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  fontSize: 12,
  color: '#222',
  background: '#fff',
  border: '1px solid #E5E5E5',
  borderRadius: 6,
  outline: 'none',
};
