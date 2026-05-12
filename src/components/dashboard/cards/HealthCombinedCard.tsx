// src/components/dashboard/cards/HealthCombinedCard.tsx
// Session E-2 Phase 2 (2026-05-12)
// Small combined card for Section 3 (정원 건강): GoodService grade + review
// growth delta side-by-side. Designed as a *condensed* read of the two full
// widgets — both full widgets remain available in Section 5 (더보기). On
// click, each half links to its own settings/source for drill-down.

'use client';

import Link from 'next/link';
import { Shield, Star, ArrowRight } from 'lucide-react';
import { useGoodService, useReviewGrowth } from '@/lib/hooks/useDashboardData';

interface ReviewGrowthShape {
  data?: {
    summary?: {
      thisMonth?: {
        delta?: number;
        target?: number;
      };
    };
  };
}

export default function HealthCombinedCard() {
  const good = useGoodService();
  const review = useReviewGrowth<ReviewGrowthShape>();

  const overall = good.data?.score.overall ?? null;
  const grade = good.data?.score.grade ?? null;
  const gradeColor = good.data?.score.gradeColor ?? '#A3A3A3';
  const gradeLabel = good.data?.score.gradeLabel ?? '—';

  const reviewSummary = review.data?.data?.summary?.thisMonth;
  const reviewDelta = reviewSummary?.delta ?? 0;
  const reviewTarget = reviewSummary?.target ?? 0;
  const reviewPct = reviewTarget > 0 ? Math.round((reviewDelta / reviewTarget) * 100) : 0;
  const reviewOnTrack = reviewTarget > 0 && reviewDelta >= reviewTarget;

  const isLoading = good.isLoading || review.isLoading;

  return (
    <div
      className="kk-card"
      style={{
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 168,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Shield size={14} style={{ color: '#16a34a' }} />
        <p
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: '#1A1A1A',
            margin: 0,
            flex: 1,
          }}
        >
          신뢰 · 리뷰
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1 }}>
        {/* Good Service half */}
        <Link
          href="/settings/good-service"
          style={{ textDecoration: 'none' }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#15803d', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                굿서비스
              </p>
              {isLoading ? (
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#A3A3A3' }}>—</p>
              ) : (
                <>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 22,
                      fontWeight: 900,
                      color: gradeColor,
                      lineHeight: 1,
                    }}
                  >
                    {grade ?? '—'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: '#16a34a', fontWeight: 700 }}>
                    {overall !== null ? `${overall}점` : ''} {gradeLabel}
                  </p>
                </>
              )}
            </div>
            <span style={{ fontSize: 10, color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              자세히 <ArrowRight size={10} />
            </span>
          </div>
        </Link>

        {/* Review growth half */}
        <Link
          href="/settings/kakao"
          style={{ textDecoration: 'none' }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: '#FFF7ED',
              border: '1px solid #FED7AA',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#c2410c', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                리뷰 성장
              </p>
              {isLoading ? (
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#A3A3A3' }}>—</p>
              ) : (
                <>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 22,
                      fontWeight: 900,
                      color: reviewOnTrack ? '#16a34a' : '#c2410c',
                      lineHeight: 1,
                    }}
                  >
                    {reviewDelta}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: '#c2410c', fontWeight: 700 }}>
                    {reviewTarget > 0 ? `${reviewPct}% (목표 ${reviewTarget})` : '목표 미설정'}
                  </p>
                </>
              )}
            </div>
            <span style={{ fontSize: 10, color: '#c2410c', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Star size={10} /> 단골 작전
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
