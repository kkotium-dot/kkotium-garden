// src/components/products/NameRulesPanel.tsx
// ============================================================================
// Sprint 7 P1-B (Session E-2 Sprint 7 P1): inline rule-violation panel for
// the 씨앗 심기 + 검색 조련사 product-name inputs.
//
// Reads the same detector as honey-score.ts (honey-name-rules) so the score
// panel + this inline panel always agree on findings.
//
// Empty state (no violations): renders nothing (zero visual weight).
// Violation state: red/yellow tinted panel listing each finding's message.
// ============================================================================

'use client';

import { useMemo } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { detectNameRules, type RuleSeverity } from '@/lib/honey-name-rules';

interface Props {
  productName: string;
  /** Hide panel when name is below this length — avoids noise while typing. */
  showAfterChars?: number;
  /** Style override for outer container. */
  style?: React.CSSProperties;
}

const TONE: Record<RuleSeverity, { bg: string; border: string; text: string; icon: string }> = {
  critical: { bg: '#FEF2F2', border: '#FCA5A5', text: '#991B1B', icon: '#DC2626' },
  warning:  { bg: '#FEFCE8', border: '#FEF08A', text: '#854D0E', icon: '#CA8A04' },
  info:     { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', icon: '#2563EB' },
};

export default function NameRulesPanel({ productName, showAfterChars = 5, style }: Props) {
  const result = useMemo(() => detectNameRules(productName ?? ''), [productName]);

  if ((productName ?? '').trim().length < showAfterChars) return null;
  if (result.ok) return null;

  const topTone = result.topSeverity ? TONE[result.topSeverity] : TONE.info;
  const TopIcon = result.topSeverity === 'critical' ? AlertCircle
    : result.topSeverity === 'warning' ? AlertTriangle : Info;
  const topHeading = result.topSeverity === 'critical' ? '상품명 규칙 위반 — 등록 전 수정 권장'
    : result.topSeverity === 'warning' ? '상품명 주의 사항' : '상품명 안내';

  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 12,
        background: topTone.bg,
        border: `1.5px solid ${topTone.border}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        ...style,
      }}
      role={result.topSeverity === 'critical' ? 'alert' : 'status'}
    >
      <TopIcon size={16} color={topTone.icon} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: topTone.text }}>
          {topHeading}
        </p>
        <ul style={{ margin: '4px 0 0', padding: 0, listStyle: 'none' }}>
          {result.findings.map((f) => {
            const tone = TONE[f.severity];
            return (
              <li
                key={f.code}
                style={{ fontSize: 11.5, color: tone.text, lineHeight: 1.5, marginTop: 2 }}
              >
                · {f.message}
              </li>
            );
          })}
        </ul>
        <p style={{ margin: '6px 0 0', fontSize: 10.5, color: '#737373' }}>
          상품명 길이 {result.nameLength}자 · Naver 권장 25~50자
        </p>
      </div>
    </div>
  );
}
