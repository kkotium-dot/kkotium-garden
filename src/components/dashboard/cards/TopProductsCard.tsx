// src/components/dashboard/cards/TopProductsCard.tsx
// Session E-2 Phase 2 (2026-05-12)
// P0-C foundation placeholder — Pareto top-product card.
// Until src/lib/pareto-analyzer.ts ships, this surfaces a friendly empty
// state that explains the upcoming behavior. Once the analyzer exists,
// swap the inner body for live data; the outer card frame stays the same
// so the Section 3 grid layout does not shift on cutover.

'use client';

import Link from 'next/link';
import { Trophy, ArrowRight } from 'lucide-react';

export default function TopProductsCard() {
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
            color: '#A3A3A3',
            background: '#FAFAFA',
            padding: '2px 7px',
            borderRadius: 999,
            border: '1px solid #E5E5E5',
          }}
        >
          P0-C 준비 중
        </span>
      </div>

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

      <Link
        href="/automation"
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
        진행 상태 확인 <ArrowRight size={11} />
      </Link>
    </div>
  );
}
