// src/components/dashboard/GoodServiceWidget.tsx
// C-9: Good Service Score Dashboard Widget
// 3-axis gauge + grade badge + improvement tips + grade simulator
// 2025-04 update: Talktalk reply standard hardened from 24h to 12h
// 2025-12 update: Seller grade evaluation window changed 3 months -> 1 month
// Option E (2026-05-03): SWR migration via useGoodService() hook (5 min cadence)

'use client';

import { useState } from 'react';
import { Shield, TrendingUp, Truck, Star, AlertTriangle, ChevronRight, RefreshCw, Info, MessageCircle } from 'lucide-react';
import { useGoodService } from '@/lib/hooks/useDashboardData';

// Circular gauge component
function ScoreGauge({ value, label, icon: Icon, color, size = 80 }: {
  value: number; label: string; icon: React.ElementType; color: string; size?: number;
}) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;
  const bgColor = color + '20';

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={bgColor} strokeWidth={5} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={color} strokeWidth={5}
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <Icon size={14} style={{ color, marginBottom: 2 }} />
          <span style={{ fontSize: 16, fontWeight: 900, color }}>{value}</span>
        </div>
      </div>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#1A1A1A', marginTop: 6, marginBottom: 0 }}>
        {label}
      </p>
    </div>
  );
}

// Grade badge with Naver-style labels
function GradeBadge({ label, color, overall }: {
  grade: string; label: string; color: string; overall: number;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderRadius: 14,
      background: color + '10', border: `1.5px solid ${color}30`,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Shield size={22} style={{ color }} strokeWidth={2.5} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{overall}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#B0A0A8' }}>/100</span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 99,
          background: color, color: '#fff', marginTop: 2, display: 'inline-block',
        }}>
          {label}
        </span>
      </div>
    </div>
  );
}

export default function GoodServiceWidget() {
  // Option E: SWR-backed data fetching (5 min refreshInterval + revalidateOnFocus)
  const { data, isLoading, isValidating, refresh } = useGoodService();
  const [showSimulator, setShowSimulator] = useState(false);

  // Spinner shows on either initial load OR background revalidation.
  const showSpinner = isLoading || isValidating;

  if (isLoading && !data) {
    return (
      <div className="kk-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={14} style={{ color: '#B0A0A8' }} />
          <span style={{ fontSize: 14, fontWeight: 800, color: '#B0A0A8' }}>
            굿서비스 (Good Service) 점수 불러오는 중...
          </span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { score, gradeSimulation, monthlySummary } = data;
  const fmt = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(0)}만원` : `${n.toLocaleString()}원`;

  return (
    <div className="kk-card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px 12px',
        borderBottom: '1px solid #F8DCE5',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={14} style={{ color: '#e62310' }} />
          <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
            굿서비스 (Good Service) 점수
          </p>
          <span style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 99,
            background: '#FEF0F3', color: '#e62310', fontWeight: 700,
          }}>
            14일 기준
          </span>
        </div>
        <button onClick={refresh} disabled={showSpinner} style={{
          padding: 4, borderRadius: 6, background: 'transparent', border: 'none',
          cursor: showSpinner ? 'not-allowed' : 'pointer', color: '#B0A0A8',
        }}>
          <RefreshCw size={12} className={showSpinner ? 'animate-spin' : ''} />
        </button>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Overall score + 3 axis gauges */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Left: Overall badge */}
          <GradeBadge
            grade={score.grade}
            label={score.gradeLabel}
            color={score.gradeColor}
            overall={score.overall}
          />
          {/* Right: 3 axes */}
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            <ScoreGauge value={score.orderFulfillment} label="주문이행" icon={TrendingUp} color="#16a34a" size={70} />
            <ScoreGauge value={score.deliveryQuality} label="배송품질" icon={Truck} color="#2563eb" size={70} />
            <ScoreGauge value={score.customerSatisfaction} label="고객만족" icon={Star} color="#eab308" size={70} />
          </div>
        </div>

        {/* Talktalk 12h info chip (2025-04 hardened) */}
        <div style={{
          marginTop: 12, padding: '8px 12px', borderRadius: 8,
          background: '#F0F9FF', border: '1px solid #BAE6FD',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <MessageCircle size={12} style={{ color: '#0369a1', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#0369a1', fontWeight: 600, lineHeight: 1.4 }}>
            톡톡 응답 기준 <strong style={{ fontWeight: 800 }}>12시간 강화</strong> (2025.4) - 자동응답 설정 권장
          </span>
        </div>

        {/* Tips */}
        {score.tips.length > 0 && (
          <div style={{
            marginTop: 14, padding: '10px 14px', borderRadius: 10,
            background: '#FFF8E1', border: '1px solid #FFE082',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <AlertTriangle size={12} style={{ color: '#F59E0B' }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: '#92400E' }}>
                개선 포인트
              </span>
            </div>
            {score.tips.map((tip, i) => (
              <p key={i} style={{ fontSize: 11, color: '#92400E', margin: '3px 0', lineHeight: 1.5 }}>
                {tip}
              </p>
            ))}
          </div>
        )}

        {/* Grade simulator toggle */}
        <button
          onClick={() => setShowSimulator(!showSimulator)}
          style={{
            width: '100%', marginTop: 12, padding: '10px 14px',
            borderRadius: 10, border: '1px solid #F8DCE5', background: '#FAFAFA',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info size={12} style={{ color: '#e62310' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>
              등급 시뮬레이터 (Seller Grade)
            </span>
            <span style={{
              fontSize: 9, padding: '1px 6px', borderRadius: 99,
              background: '#F8DCE5', color: '#e62310', fontWeight: 700,
            }}>
              월 단위 평가 (2025.12 개편)
            </span>
          </div>
          <ChevronRight size={14} style={{
            color: '#B0A0A8',
            transform: showSimulator ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }} />
        </button>

        {/* Grade simulator panel */}
        {showSimulator && (
          <div style={{
            marginTop: 8, padding: '14px', borderRadius: 10,
            background: '#F9FAFB', border: '1px solid #E5E7EB',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div style={{ textAlign: 'center', padding: '8px', borderRadius: 8, background: '#fff', border: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 10, color: '#B0A0A8', margin: '0 0 4px', fontWeight: 600 }}>현재 등급</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>{gradeSimulation.currentGrade}</p>
              </div>
              <div style={{ textAlign: 'center', padding: '8px', borderRadius: 8, background: '#fff', border: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 10, color: '#B0A0A8', margin: '0 0 4px', fontWeight: 600 }}>월 매출</p>
                <p style={{ fontSize: 14, fontWeight: 900, color: '#2563eb', margin: 0 }}>{fmt(monthlySummary.salesAmount)}</p>
              </div>
              <div style={{ textAlign: 'center', padding: '8px', borderRadius: 8, background: '#fff', border: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 10, color: '#B0A0A8', margin: '0 0 4px', fontWeight: 600 }}>월 판매</p>
                <p style={{ fontSize: 14, fontWeight: 900, color: '#16a34a', margin: 0 }}>{monthlySummary.salesCount}건</p>
              </div>
            </div>

            {gradeSimulation.nextGrade && gradeSimulation.gap && (
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                background: '#EFF6FF', border: '1px solid #BFDBFE',
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#1E40AF', margin: '0 0 6px' }}>
                  {gradeSimulation.nextGrade} 달성까지
                </p>
                {gradeSimulation.gap.salesAmount > 0 && (
                  <p style={{ fontSize: 11, color: '#1E40AF', margin: '2px 0' }}>
                    매출 {fmt(gradeSimulation.gap.salesAmount)} 더 필요
                  </p>
                )}
                {gradeSimulation.gap.salesCount > 0 && (
                  <p style={{ fontSize: 11, color: '#1E40AF', margin: '2px 0' }}>
                    판매 {gradeSimulation.gap.salesCount}건 더 필요
                  </p>
                )}
                {gradeSimulation.gap.score > 0 && (
                  <p style={{ fontSize: 11, color: '#1E40AF', margin: '2px 0' }}>
                    굿서비스 점수 {gradeSimulation.gap.score}점 더 필요
                  </p>
                )}
              </div>
            )}

            {!gradeSimulation.nextGrade && (
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                background: '#F0FDF4', border: '1px solid #86EFAC',
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#166534', margin: 0 }}>
                  최고 등급 달성 중입니다!
                </p>
              </div>
            )}

            {/* Grade reform notice */}
            <div style={{
              marginTop: 10, padding: '8px 10px', borderRadius: 6,
              background: '#FEF3C7', border: '1px solid #FDE68A',
            }}>
              <p style={{ fontSize: 10, color: '#92400E', margin: 0, lineHeight: 1.4 }}>
                <strong style={{ fontWeight: 800 }}>2025.12 등급 개편</strong>: 평가 기간 3개월→1개월, 빅파워 4,000만→1,000만원, 파워 800만→300만원, 새싹 200만→80만원
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
