'use client';
// HoneyScorePanel — 꼬띠 꿀통지수 실시간 평가 패널
// Placed in product registration right panel, reads live form inputs
// Design: app unified style — white card, #e62310 accent, #FFB3CE lines

import { useState, useMemo } from 'react';
import {
  RefreshCw, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, BarChart2,
} from 'lucide-react';
import { calcHoneyScore, getHoneyGradeDisplay, getKkottiMoodMeta } from '@/lib/honey-score';
import type { HoneyScoreResult } from '@/lib/honey-score';

interface HoneyScorePanelProps {
  salePrice: number;
  supplierPrice: number;
  categoryId?: string;
  productName?: string;
  keywords?: string[];
  tags?: string[];
  hasMainImage?: boolean;
  hasDescription?: boolean;
  hasDiscountSet?: boolean;
  naverFeeRate?: number;
}

// ── Score bar sub-component ──────────────────────────────────────────────────
function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{
      flex: 1, height: 5, background: '#F8DCE5', borderRadius: 99, overflow: 'hidden',
    }}>
      <div style={{
        width: `${Math.max(2, value)}%`, height: '100%',
        background: color, borderRadius: 99, transition: 'width 0.7s ease',
      }} />
    </div>
  );
}

// ── Kkotti SVG mascot — expression driven by mood ──────────────────────────
function KkottiFace({ mood, size = 44 }: { mood: HoneyScoreResult['kkottiMood']; size?: number }) {
  const config: Record<HoneyScoreResult['kkottiMood'], {
    hatColor: string; bodyColor: string; bootColor: string;
    eyeType: 'happy' | 'normal' | 'worried' | 'stressed';
    mouthType: 'smile-big' | 'smile' | 'flat' | 'frown';
    accessory?: 'star' | 'sweat';
  }> = {
    celebrate: { hatColor: '#e62310', bodyColor: '#fce7f3', bootColor: '#f472b6', eyeType: 'happy',   mouthType: 'smile-big', accessory: 'star'  },
    happy:     { hatColor: '#e62310', bodyColor: '#fce7f3', bootColor: '#f472b6', eyeType: 'happy',   mouthType: 'smile',     accessory: undefined },
    thinking:  { hatColor: '#2563eb', bodyColor: '#eff6ff', bootColor: '#93c5fd', eyeType: 'normal',  mouthType: 'flat',      accessory: undefined },
    worried:   { hatColor: '#ca8a04', bodyColor: '#fef9c3', bootColor: '#fbbf24', eyeType: 'worried', mouthType: 'frown',     accessory: undefined },
    stressed:  { hatColor: '#dc2626', bodyColor: '#fee2e2', bootColor: '#f87171', eyeType: 'stressed',mouthType: 'frown',     accessory: 'sweat'  },
  };
  const c = config[mood];

  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cowgirl hat brim */}
      <ellipse cx="22" cy="12" rx="14" ry="3.5" fill={c.hatColor} opacity="0.25" />
      {/* Hat crown */}
      <rect x="12" y="7" width="20" height="8" rx="3.5" fill={c.hatColor} />
      {/* Hat brim solid */}
      <rect x="9" y="13" width="26" height="3" rx="1.5" fill={c.hatColor} />
      {/* Hat band */}
      <rect x="12" y="12" width="20" height="2" rx="1" fill="#fff" opacity="0.35" />

      {/* Tulip body */}
      <ellipse cx="22" cy="31" rx="11" ry="9" fill={c.bodyColor} />
      {/* Face circle */}
      <ellipse cx="22" cy="27" rx="9" ry="9" fill="#fdf2f8" />

      {/* Eyes */}
      {c.eyeType === 'happy' ? (
        <>
          <path d="M16 25.5 Q17.5 23.5 19 25.5" stroke={c.hatColor} strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <path d="M25 25.5 Q26.5 23.5 28 25.5" stroke={c.hatColor} strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </>
      ) : c.eyeType === 'stressed' ? (
        <>
          <path d="M16 24 L19 26 M19 24 L16 26" stroke={c.hatColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M25 24 L28 26 M28 24 L25 26" stroke={c.hatColor} strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : c.eyeType === 'worried' ? (
        <>
          <ellipse cx="17.5" cy="25.5" rx="1.8" ry="1.8" fill={c.hatColor} />
          <ellipse cx="26.5" cy="25.5" rx="1.8" ry="1.8" fill={c.hatColor} />
          {/* Worried brow */}
          <path d="M15 23 Q17 21.5 20 22.5" stroke={c.hatColor} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
          <path d="M29 23 Q27 21.5 24 22.5" stroke={c.hatColor} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
        </>
      ) : (
        <>
          <ellipse cx="17.5" cy="25.5" rx="1.8" ry="1.8" fill={c.hatColor} />
          <ellipse cx="26.5" cy="25.5" rx="1.8" ry="1.8" fill={c.hatColor} />
        </>
      )}

      {/* Mouth */}
      {c.mouthType === 'smile-big' ? (
        <path d="M16 30 Q22 35 28 30" stroke={c.hatColor} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      ) : c.mouthType === 'smile' ? (
        <path d="M17.5 30 Q22 33.5 26.5 30" stroke={c.hatColor} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      ) : c.mouthType === 'flat' ? (
        <line x1="18" y1="31" x2="26" y2="31" stroke={c.hatColor} strokeWidth="1.5" strokeLinecap="round" />
      ) : (
        <path d="M17.5 32 Q22 29 26.5 32" stroke={c.hatColor} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      )}

      {/* Cheeks */}
      {(c.eyeType === 'happy') && (
        <>
          <ellipse cx="14" cy="27.5" rx="2.5" ry="1.5" fill="#f9a8d4" opacity="0.5" />
          <ellipse cx="30" cy="27.5" rx="2.5" ry="1.5" fill="#f9a8d4" opacity="0.5" />
        </>
      )}

      {/* Accessories */}
      {c.accessory === 'star' && (
        <text x="32" y="16" fontSize="8" fill="#f59e0b" fontFamily="sans-serif">✦</text>
      )}
      {c.accessory === 'sweat' && (
        <ellipse cx="30" cy="21" rx="1.5" ry="2.2" fill="#93c5fd" opacity="0.85" />
      )}

      {/* Pink cowgirl boots */}
      <ellipse cx="17" cy="40" rx="3.5" ry="2.2" fill={c.bootColor} />
      <ellipse cx="27" cy="40" rx="3.5" ry="2.2" fill={c.bootColor} />
    </svg>
  );
}

// ── Score donut ring ─────────────────────────────────────────────────────────
function ScoreRing({ score, grade }: { score: number; grade: HoneyScoreResult['grade'] }) {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const colors: Record<string, string> = {
    S: '#9333ea', A: '#16a34a', B: '#2563eb', C: '#ca8a04', D: '#e62310',
  };
  const col = colors[grade] ?? '#6b7280';

  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#F8DCE5" strokeWidth="6" />
      <circle
        cx="32" cy="32" r={r}
        fill="none"
        stroke={col}
        strokeWidth="6"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x="32" y="36" textAnchor="middle" fontSize="13" fontWeight="900" fill={col}>
        {score}
      </text>
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HoneyScorePanel({
  salePrice,
  supplierPrice,
  categoryId,
  productName,
  keywords = [],
  tags = [],
  hasMainImage,
  hasDescription,
  hasDiscountSet,
  naverFeeRate = 0.055,
}: HoneyScorePanelProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [dialogueKey, setDialogueKey] = useState(0);

  const result: HoneyScoreResult = useMemo(() => calcHoneyScore({
    salePrice, supplierPrice, categoryId, productName,
    keywords, tags, hasMainImage, hasDescription, hasDiscountSet, naverFeeRate,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [salePrice, supplierPrice, categoryId, productName, keywords, tags,
       hasMainImage, hasDescription, hasDiscountSet, naverFeeRate, dialogueKey]);

  const gradeDisplay = getHoneyGradeDisplay(result.grade);
  const moodMeta     = getKkottiMoodMeta(result.kkottiMood);
  const hasPricing   = salePrice > 0 && supplierPrice > 0;

  // Grade accent color for border/bg
  const gradeColor: Record<string, string> = {
    S: '#9333ea', A: '#16a34a', B: '#2563eb', C: '#ca8a04', D: '#e62310',
  };
  const gradeLight: Record<string, string> = {
    S: '#faf5ff', A: '#f0fdf4', B: '#eff6ff', C: '#fefce8', D: '#fff0f0',
  };
  const gc  = gradeColor[result.grade] ?? '#e62310';
  const gbl = gradeLight[result.grade] ?? '#fff0f0';

  return (
    <div className="kk-card" style={{ overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #F8DCE5',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: hasPricing ? gbl : '#FFF8FB',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart2 size={14} style={{ color: hasPricing ? gc : '#B0A0A8' }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A' }}>꿀통지수</span>
          {hasPricing && (
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99,
              background: gc, color: '#fff',
            }}>
              {gradeDisplay.label}
            </span>
          )}
        </div>
        {hasPricing && (
          <button
            onClick={() => setDialogueKey(k => k + 1)}
            style={{
              padding: 5, borderRadius: 7, background: 'transparent',
              border: 'none', cursor: 'pointer', color: '#B0A0A8',
            }}
            title="꼬띠 다시 말하기"
          >
            <RefreshCw size={12} />
          </button>
        )}
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── No pricing state ── */}
        {!hasPricing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <KkottiFace mood="thinking" size={40} />
            <p style={{ fontSize: 12, color: '#B0A0A8', margin: 0, lineHeight: 1.5 }}>
              판매가 + 공급가 입력 시<br />꿀통지수가 계산됩니다
            </p>
          </div>
        ) : (
          <>
            {/* ── Kkotti character + score ring ── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 14,
              background: gbl, border: `1.5px solid ${gc}30`,
            }}>
              <KkottiFace mood={result.kkottiMood} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: gc, margin: '0 0 4px' }}>
                  {moodMeta.label}
                </p>
                <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, margin: 0 }}>
                  {result.kkottiDialogue}
                </p>
              </div>
              <ScoreRing score={result.total} grade={result.grade} />
            </div>

            {/* ── Kkotti tip bubble ── */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '10px 12px', borderRadius: 12,
              background: '#fffbeb', border: '1px solid #fde68a',
            }}>
              <div style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a7 7 0 0 1 7 7c0 2.9-1.8 5.4-4.3 6.5V17a1 1 0 0 1-1 1h-3.4a1 1 0 0 1-1-1v-1.5C6.8 14.4 5 11.9 5 9a7 7 0 0 1 7-7zm-1 18h2v2h-2v-2z"/>
                </svg>
              </div>
              <p style={{ fontSize: 11, color: '#92400e', margin: 0, lineHeight: 1.5 }}>
                {result.kkottiTip}
              </p>
            </div>

            {/* ── Margin breakdown ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: '총마진율',  value: result.marginRate,    suffix: '%' },
                { label: '순마진율',  value: result.netMarginRate, suffix: '%',
                  sub: `수수료 ${(naverFeeRate * 100).toFixed(1)}% 반영` },
              ].map(item => {
                const col = item.value >= 40 ? '#16a34a'
                  : item.value >= 30 ? '#2563eb'
                  : item.value >= 20 ? '#ca8a04' : '#e62310';
                return (
                  <div key={item.label} style={{
                    background: '#FFF8FB', borderRadius: 12,
                    padding: '10px 12px', textAlign: 'center',
                    border: '1px solid #F8DCE5',
                  }}>
                    <p style={{ fontSize: 10, color: '#B0A0A8', margin: '0 0 4px', fontWeight: 600 }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: 20, fontWeight: 900, color: col, margin: 0, lineHeight: 1 }}>
                      {item.value.toFixed(1)}{item.suffix}
                    </p>
                    {item.sub && (
                      <p style={{ fontSize: 10, color: '#B0A0A8', margin: '3px 0 0' }}>{item.sub}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Toggle detail button ── */}
            <button
              onClick={() => setDetailOpen(o => !o)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 4, padding: '6px 0', fontSize: 11, color: '#B0A0A8',
                background: 'transparent', border: 'none', cursor: 'pointer',
              }}
            >
              {detailOpen
                ? <><ChevronUp size={12} /> 간단히 보기</>
                : <><ChevronDown size={12} /> 항목별 상세 보기</>
              }
            </button>

            {detailOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* Sub-score bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[
                    { label: '수익성',    score: result.marginScore,     color: '#9333ea', weight: '40%' },
                    { label: '2026 SEO', score: result.seoScore,         color: '#2563eb', weight: '35%' },
                    { label: '경쟁강도',  score: result.competitionScore, color: '#16a34a', weight: '15%' },
                    { label: '보너스',    score: result.bonusScore,       color: '#f59e0b', weight: '10%' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: '#B0A0A8', width: 52, flexShrink: 0 }}>
                        {item.label}
                      </span>
                      <ScoreBar value={item.score} color={item.color} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', width: 22, textAlign: 'right', flexShrink: 0 }}>
                        {item.score}
                      </span>
                      <span style={{ fontSize: 10, color: '#D1C4CA', width: 26, flexShrink: 0 }}>
                        {item.weight}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Strengths */}
                {result.strengths.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {result.strengths.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <CheckCircle size={11} style={{ color: '#16a34a', flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 11, color: '#15803d' }}>{s}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {result.warnings.map((w, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <AlertCircle size={11} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 11, color: '#92400e' }}>{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Recommendation pill ── */}
            <div style={{
              padding: '9px 14px', borderRadius: 12, textAlign: 'center',
              fontSize: 12, fontWeight: 700,
              background: gbl, color: gc, border: `1.5px solid ${gc}40`,
            }}>
              {result.recommendation}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
