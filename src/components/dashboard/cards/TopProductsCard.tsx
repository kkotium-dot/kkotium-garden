// src/components/dashboard/cards/TopProductsCard.tsx
// Sprint 7 P0-C — Pareto top-product card, activated.
//
// Data: /api/products/pareto (computePareto). Cold start (0 orders in last
// 30 days) shows the original "매출 누적 시 자동 산정" placeholder body so
// the card still has friendly copy. Once orders exist, the body switches
// to a ranked list of the top-5 products with revenue + share %.

'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Trophy, ArrowRight } from 'lucide-react';
import type { ParetoSummary } from '@/lib/pareto-analyzer';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TopProductsCard() {
  const { data, isLoading, error } = useSWR<ParetoSummary>(
    '/api/products/pareto',
    fetcher,
    { refreshInterval: 10 * 60_000, revalidateOnFocus: true },
  );

  const topFive = data?.topFive ?? [];
  const hasData = !!data && topFive.length > 0;

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
        <Trophy size={14} style={{ color: '#eab308' }} />
        <p
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: '#1A1A1A',
            margin: 0,
            flex: 1,
          }}
        >
          효자 상품 TOP 5
        </p>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: hasData ? '#15803D' : '#A3A3A3',
            background: hasData ? '#F0FDF4' : '#FAFAFA',
            padding: '2px 7px',
            borderRadius: 999,
            border: `1px solid ${hasData ? '#BBF7D0' : '#E5E5E5'}`,
          }}
        >
          {hasData
            ? `${data!.lookbackDays}일 기준`
            : isLoading
              ? '계산 중'
              : error
                ? '조회 실패'
                : 'P0-C 대기'}
        </span>
      </div>

      {hasData ? (
        <RankedList summary={data!} />
      ) : (
        <EmptyBody />
      )}

      <Link
        href={hasData ? '/products' : '/automation'}
        style={{
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          color: '#525252',
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {hasData ? '전체 상품 보기' : '진행 상태 확인'} <ArrowRight size={11} />
      </Link>
    </div>
  );
}

function RankedList({ summary }: { summary: ParetoSummary }) {
  return (
    <div
      style={{
        flex: 1,
        background: '#FFFBEB',
        border: '1px solid #FDE68A',
        borderRadius: 10,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {summary.topFive.map((p) => (
        <div
          key={p.productId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 0',
            borderBottom: '1px dashed rgba(146, 64, 14, 0.18)',
          }}
        >
          <span
            style={{
              flexShrink: 0,
              width: 22,
              height: 22,
              borderRadius: 7,
              background: '#FFFFFF',
              border: '1px solid #FDE68A',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 800,
              color: '#92400e',
            }}
          >
            {p.rank}
          </span>
          <p
            style={{
              flex: 1,
              minWidth: 0,
              margin: 0,
              fontSize: 11,
              fontWeight: 700,
              color: '#7c2d12',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {p.productName}
          </p>
          <span style={{ fontSize: 10, color: '#a16207', whiteSpace: 'nowrap' }}>
            {Math.round(p.share * 100)}%
          </span>
        </div>
      ))}
      <p style={{ margin: '4px 0 0', fontSize: 10, color: '#a16207', lineHeight: 1.4 }}>
        상위 {summary.paretoSlice.length}개가 매출 {Math.round(summary.paretoShare * 100)}% 차지 — 광고 우선 집중 추천
      </p>
    </div>
  );
}

function EmptyBody() {
  return (
    <div
      style={{
        flex: 1,
        background: '#FFFBEB',
        border: '1px dashed #FDE68A',
        borderRadius: 10,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#92400e' }}>
        매출 누적 시 자동 산정
      </p>
      <p style={{ margin: 0, fontSize: 11, color: '#a16207', lineHeight: 1.5 }}>
        상위 20% 상품이 매출 70~80%를 차지하는 패턴(멱법칙)을 자동 식별해
        광고 80% 집중 대상으로 추천해드려요.
      </p>
    </div>
  );
}
