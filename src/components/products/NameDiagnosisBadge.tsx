// src/components/products/NameDiagnosisBadge.tsx
// ============================================================================
// NAME-DIAG-3 (#251) — compact 상품명 진단 배지 for the revival hub /
// reactivation list rows. PRESENTATIONAL only: it renders the result of
// computeNameDiagnosis (served by /api/seo/name-diagnosis) — no logic here (#62).
// Seller language (#233), Lucide icons only (no emoji), honest caveats via the
// hover title (#231).
// ============================================================================

'use client';

import { ShieldCheck, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

export interface NameBadgeData {
  grade: 'S' | 'A' | 'B' | 'C';
  nameScore: number;
  trendReflected: 'strong' | 'ok' | 'weak' | 'unknown';
  topWeakness: string | null;
  weaknessCount: number;
  suggestions: string[];
  caveats: string[];
}

const GRADE_TONE: Record<NameBadgeData['grade'], { bg: string; border: string; color: string; label: string }> = {
  S: { bg: '#ECFDF5', border: '#A7F3D0', color: '#047857', label: '우수' },
  A: { bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8', label: '양호' },
  B: { bg: '#FFFBEB', border: '#FDE68A', color: '#B45309', label: '보완 권장' },
  C: { bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C', label: '개선 필요' },
};

export default function NameDiagnosisBadge({ data }: { data: NameBadgeData }) {
  const tone = GRADE_TONE[data.grade];
  // Hover title carries the full seller-language coaching + honest limits (#231).
  const title = [
    `상품명 진단 ${data.grade} (${data.nameScore}점)`,
    ...(data.suggestions.length ? ['', '개선 제안:', ...data.suggestions.map((s) => `• ${s}`)] : []),
    ...(data.caveats.length ? ['', '데이터 한계:', ...data.caveats.map((c) => `• ${c}`)] : []),
  ].join('\n');

  return (
    <span
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px',
        borderRadius: 999, background: tone.bg, border: `1px solid ${tone.border}`,
        color: tone.color, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'help',
      }}
    >
      {data.grade === 'S' || data.grade === 'A'
        ? <ShieldCheck size={12} strokeWidth={2.4} />
        : <AlertTriangle size={12} strokeWidth={2.4} />}
      <span>상품명 {data.grade}</span>
      <span style={{ opacity: 0.7, fontWeight: 600 }}>· {tone.label}</span>
      {data.weaknessCount > 0 && (
        <span style={{ opacity: 0.85, fontWeight: 600 }}>
          · {data.topWeakness ? `${data.topWeakness} 외 ` : ''}개선 {data.weaknessCount}건
        </span>
      )}
      {data.trendReflected === 'strong' && (
        <TrendingUp size={11} strokeWidth={2.4} style={{ color: '#059669' }} aria-label="검색 상승세" />
      )}
      {data.trendReflected === 'weak' && (
        <TrendingDown size={11} strokeWidth={2.4} style={{ color: '#D97706' }} aria-label="검색 수요 낮음" />
      )}
    </span>
  );
}
