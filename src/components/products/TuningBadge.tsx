// src/components/products/TuningBadge.tsx
// ============================================================================
// 좀비 배지 (#256 P4, #264 좀비 통합 판정으로 라벨 통일) — compact badge for the
// 꽃밭 돌보기 warehouse list rows. PRESENTATIONAL only: renders the
// ZombieVerdictResult computed server-side by computeZombieVerdict() /
// loadTuningScores() (no scoring logic here, #62). Same visual language as
// NameDiagnosisBadge/InventoryBadge (compact pill, hover tooltip for detail).
//
// "좀비"가 유일한 화면 노출 라벨이다(#264) — "손질필요도"·"부활 필요도" 등
// 병렬 라벨은 쓰지 않는다. 관리방향(키울/관찰/내릴)은 좀비 여부와 별개로
// 보조 정보로만 함께 표시한다. 내부 타입/변수명(tier: 'defend')은 화면에
// 직접 노출되지 않으므로 그대로 둔다.
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
