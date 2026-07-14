// src/components/products/TuningBadge.tsx
// ============================================================================
// Tuning score badge (#256 P4) — compact 튜닝 필요도 지수 badge for the
// 꽃밭 돌보기 warehouse list rows. PRESENTATIONAL only: renders the
// TuningScoreResult computed server-side by computeTuningScore() /
// loadTuningScores() (no scoring logic here, #62). Same visual language as
// NameDiagnosisBadge/InventoryBadge (compact pill, hover tooltip for detail).
//
// Korean strings live in TuningBadge.strings.ko.json per work principle #35.
// The caveat text is always surfaced in the tooltip per #255 — this score is
// an app-internal heuristic, never presented as Naver's official ranking.
// ============================================================================

'use client';

import { Skull, ShieldCheck, TrendingDown } from 'lucide-react';
import strings from './TuningBadge.strings.ko.json';

export interface TuningBadgeData {
  score: number;
  tier: 'grow' | 'defend' | 'demote';
  isZombie: boolean;
  zombieReason: string | null;
  reasons: string[];
  caveat: string;
}

const TIER_TONE: Record<TuningBadgeData['tier'], { bg: string; border: string; color: string }> = {
  grow:   { bg: '#ECFDF5', border: '#A7F3D0', color: '#047857' },
  defend: { bg: '#FFFBEB', border: '#FDE68A', color: '#B45309' },
  demote: { bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C' },
};

export default function TuningBadge({ data }: { data: TuningBadgeData }) {
  const tone = TIER_TONE[data.tier];
  const gradeLabel = data.isZombie ? strings.grade.zombie : strings.grade[data.tier];

  const title = [
    `${strings.prefix} ${data.score}\u00B7${gradeLabel}`,
    ...(data.reasons.length ? ['', strings.reasonsHeader, ...data.reasons.map((r) => `\u2022 ${r}`)] : []),
    '',
    `${strings.caveatHeader} ${data.caveat}`,
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
      {data.isZombie
        ? <Skull size={12} strokeWidth={2.4} />
        : data.tier === 'grow'
          ? <ShieldCheck size={12} strokeWidth={2.4} />
          : <TrendingDown size={12} strokeWidth={2.4} />}
      <span>{strings.prefix} {data.score}</span>
      <span style={{ opacity: 0.7, fontWeight: 600 }}>&middot; {gradeLabel}</span>
      {data.isZombie && data.zombieReason && (
        <span style={{ opacity: 0.85, fontWeight: 600 }}>&middot; {data.zombieReason}</span>
      )}
    </span>
  );
}
