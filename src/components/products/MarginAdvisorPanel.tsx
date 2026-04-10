'use client';
// MarginAdvisorPanel.tsx
// Power-seller margin advisory panel
// - Shows when category (d1/d2/d3) is selected
// - Works on both /crawl and /products/new
// - No crawling required — pure category + price based

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Info, Zap } from 'lucide-react';
import {
  getMarginAdvice,
  calcBreakevenPrice,
  calcRecommendedPrice,
  calcNetMargin,
  getSeasonContext,
} from '@/lib/naver-margin-advisor';

interface MarginAdvisorPanelProps {
  d1: string;
  d2: string;
  d3: string;
  supplierPrice: number;
  salePrice: number;
  shippingFee?: number;
  // Callbacks to apply recommended price
  onApplySalePrice?: (price: number) => void;
}

export default function MarginAdvisorPanel({
  d1,
  d2,
  d3,
  supplierPrice,
  salePrice,
  shippingFee = 3000,
  onApplySalePrice,
}: MarginAdvisorPanelProps) {
  const advice = useMemo(() => {
    if (!d1 || !d3) return null;
    return getMarginAdvice(d1, d2, d3);
  }, [d1, d2, d3]);

  const season = useMemo(() => {
    if (!advice) return null;
    return getSeasonContext(advice);
  }, [advice]);

  const calculations = useMemo(() => {
    if (!advice || supplierPrice <= 0) return null;
    const fee = advice.naverFeeRate;
    const returnRate = advice.returnRateTypical;
    const breakeven = calcBreakevenPrice(supplierPrice, shippingFee, fee, returnRate);
    const recMin = calcRecommendedPrice(supplierPrice, shippingFee, fee, returnRate, advice.marginMin);
    const recRecommended = calcRecommendedPrice(supplierPrice, shippingFee, fee, returnRate, advice.marginRecommended);
    const recGood = calcRecommendedPrice(supplierPrice, shippingFee, fee, returnRate, advice.marginGood);
    const currentNetMargin = salePrice > 0
      ? calcNetMargin(supplierPrice, salePrice, shippingFee, fee, returnRate)
      : null;

    return { breakeven, recMin, recRecommended, recGood, currentNetMargin, fee, returnRate };
  }, [advice, supplierPrice, salePrice, shippingFee]);

  if (!advice) return null;

  const hasPrice = supplierPrice > 0;
  const netMargin = calculations?.currentNetMargin ?? null;
  const marginStatus = netMargin === null ? 'none'
    : netMargin < 0 ? 'loss'
    : netMargin < advice.marginMin ? 'danger'
    : netMargin < advice.marginRecommended ? 'warning'
    : netMargin < advice.marginGood ? 'ok'
    : 'good';

  const marginColor = {
    none: '#888', loss: '#dc2626', danger: '#f59e0b',
    warning: '#2563eb', ok: '#16a34a', good: '#15803d',
  }[marginStatus];

  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #FFB3CE',
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: '#FFF0F5',
        borderBottom: '1px solid #FFB3CE',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <Zap size={13} color="#e62310" strokeWidth={2.5} />
        <span style={{ fontSize: 11, fontWeight: 900, color: '#e62310', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'Arial Black', Impact, sans-serif" }}>
          마진 어드바이저
        </span>
        <span style={{ fontSize: 11, color: '#888', marginLeft: 2 }}>
          {d1} &gt; {d2} {d3 ? `> ${d3}` : ''}
        </span>
        {season?.isNowPeakSeason && (
          <span style={{ marginLeft: 'auto', padding: '2px 8px', background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: 99, fontSize: 10, fontWeight: 700, color: '#92400E' }}>
            성수기
          </span>
        )}
        {season?.isNowOffSeason && advice.isSeasonal && (
          <span style={{ marginLeft: 'auto', padding: '2px 8px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 99, fontSize: 10, fontWeight: 700, color: '#475569' }}>
            비수기
          </span>
        )}
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Current margin status */}
        {hasPrice && netMargin !== null && (
          <div style={{
            padding: '10px 12px',
            background: marginStatus === 'loss' || marginStatus === 'danger' ? '#FEF2F2' : marginStatus === 'warning' ? '#EFF6FF' : '#F0FDF4',
            border: `1px solid ${marginStatus === 'loss' || marginStatus === 'danger' ? '#FECACA' : marginStatus === 'warning' ? '#BFDBFE' : '#BBF7D0'}`,
            borderRadius: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {netMargin >= 0
                  ? <TrendingUp size={14} color={marginColor} />
                  : <TrendingDown size={14} color={marginColor} />
                }
                <span style={{ fontSize: 12, fontWeight: 700, color: '#444' }}>현재 순마진율</span>
                <span style={{ fontSize: 10, color: '#888' }}>(반품{calculations?.returnRate}% 포함)</span>
              </div>
              <span style={{ fontSize: 20, fontWeight: 900, color: marginColor }}>
                {netMargin.toFixed(1)}%
              </span>
            </div>
            <p style={{ fontSize: 11, color: marginColor, marginTop: 4, fontWeight: 600 }}>
              {marginStatus === 'loss' && `손실 구간 — 최소 ${calculations?.recMin.toLocaleString()}원 이상으로 올려야 합니다`}
              {marginStatus === 'danger' && `위험 구간 — 반품 1건에 적자 전환 가능 (권장 최소 ${advice.marginMin}%)`}
              {marginStatus === 'warning' && `보통 — 파워셀러 권장 마진(${advice.marginRecommended}%)에 미달`}
              {marginStatus === 'ok' && `양호 — 파워셀러 권장 마진 달성`}
              {marginStatus === 'good' && `우수 — 상위 셀러 수준의 마진율`}
            </p>
          </div>
        )}

        {/* Recommended prices */}
        {hasPrice && calculations && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#555', marginBottom: 6 }}>
              추천 판매가 (도매가 {supplierPrice.toLocaleString()}원 기준)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[
                { label: `최소 ${advice.marginMin}%`, price: calculations.recMin, color: '#e62310', bg: '#FFF0EF' },
                { label: `권장 ${advice.marginRecommended}%`, price: calculations.recRecommended, color: '#2563eb', bg: '#EFF6FF' },
                { label: `우수 ${advice.marginGood}%`, price: calculations.recGood, color: '#15803d', bg: '#F0FDF4' },
              ].map(({ label, price, color, bg }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onApplySalePrice?.(price)}
                  style={{
                    padding: '8px 6px',
                    background: bg,
                    border: `1px solid ${color}44`,
                    borderRadius: 10,
                    cursor: onApplySalePrice ? 'pointer' : 'default',
                    textAlign: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (onApplySalePrice) (e.currentTarget as HTMLElement).style.borderColor = color; }}
                  onMouseLeave={e => { if (onApplySalePrice) (e.currentTarget as HTMLElement).style.borderColor = `${color}44`; }}
                >
                  <p style={{ fontSize: 9, color, fontWeight: 700, marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: 13, fontWeight: 900, color }}>{price.toLocaleString()}원</p>
                  {onApplySalePrice && <p style={{ fontSize: 9, color: '#888', marginTop: 1 }}>클릭 적용</p>}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 10, color: '#aaa', marginTop: 4 }}>
              손익분기: {calculations.breakeven.toLocaleString()}원 · 반품{calculations.returnRate}% · 네이버수수료{(calculations.fee*100).toFixed(1)}% 포함
            </p>
          </div>
        )}

        {/* Return rate info */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: '#FFF8FA', borderRadius: 8, border: '1px solid #FFB3CE' }}>
          <Info size={12} color="#e62310" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>예상 반품률: </span>
            <span style={{ fontSize: 11, color: '#e62310', fontWeight: 700 }}>
              {advice.returnRateMin}~{advice.returnRateMax}% (평균 {advice.returnRateTypical}%)
            </span>
            <span style={{ fontSize: 10, color: '#888', marginLeft: 4 }}>— {advice.returnRateReason}</span>
          </div>
        </div>

        {/* Season alert */}
        {advice.isSeasonal && season && (
          <div style={{ padding: '7px 10px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #FDE68A', display: 'flex', gap: 6 }}>
            <AlertTriangle size={12} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#92400E' }}>시즌 상품 주의 </span>
              <span style={{ fontSize: 10, color: '#B45309' }}>
                성수기: {season.peakMonthsLabel}
                {advice.seasonNote && ` — ${advice.seasonNote}`}
              </span>
              {season.isNowOffSeason && (
                <p style={{ fontSize: 10, color: '#D97706', marginTop: 2, fontWeight: 600 }}>
                  현재 비수기 — 재고 최소화, 시즌 전 대량 주문 계획 권장
                </p>
              )}
            </div>
          </div>
        )}

        {/* Strategy */}
        <div style={{ padding: '7px 10px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#15803d', marginBottom: 3 }}>파워셀러 전략</p>
          <p style={{ fontSize: 11, color: '#166534' }}>{advice.pricingStrategy}</p>
        </div>

        {/* Warnings */}
        {advice.warnings.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {advice.warnings.map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: 10, color: '#c2410c' }}>
                <span style={{ flexShrink: 0, marginTop: 1 }}>!</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tips */}
        {advice.tips.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {advice.tips.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: 10, color: '#1d4ed8' }}>
                <span style={{ flexShrink: 0, marginTop: 1 }}>+</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
