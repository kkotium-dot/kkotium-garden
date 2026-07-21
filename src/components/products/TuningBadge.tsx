// src/components/products/TuningBadge.tsx
// ============================================================================
// 좀비 발견 배지 (작업원칙 #264) — 꽃밭 돌보기 목록 행에 붙는 압축 배지.
// PRESENTATIONAL only: computeZombieVerdict()가 서버에서 계산한 결과를 그리기만
// 한다(판정 로직 없음, #62).
//
// 설계 의도 (2026-07-14 운영자 지시):
//   - 좀비인 상품만 눈에 띄게 — 빨간 배지 + 해골 + 사유 한 줄.
//   - 좀비가 아닌 상품은 조용하게 — 시야를 방해하지 않는 저채도 배지.
//     ("좀비 16 · 키울 상품"처럼 멀쩡한 상품에 좀비 라벨이 붙는 건 오설계였음)
//   - hover 시 좀비가 된 이유 전체 + 꼬띠 한마디(#264 운영자 아이디어).
//
// 화면 문구는 셀러 실무 용어 + 꽃틔움 정원 컨셉(#262). 한글 문자열은 전부
// TuningBadge.strings.ko.json에 분리(#35). caveat는 항상 노출(#255) — 앱 자체
// 참고 지수이지 네이버 공식 점수가 아님.
// ============================================================================

'use client';

import { Skull, Sprout, Eye } from 'lucide-react';
import { kkottiLine } from '@/lib/products/kkotti-zombie-voice';
import strings from './TuningBadge.strings.ko.json';

export interface TuningBadgeData {
  score: number;
  tier: 'grow' | 'defend' | 'demote';
  isZombie: boolean;
  zombieReason: string | null;
  reasons: string[];
  caveat: string;
}

const ZOMBIE_TONE  = { bg: '#FEF2F2', border: '#FCA5A5', color: '#B91C1C' };
const HEALTHY_TONE = { bg: '#F8FAF9', border: '#E3E8E5', color: '#6B7280' };

export interface TuningBadgeProps {
  data: TuningBadgeData;
  /**
   * 밀집 목록(배지 레일 #274)용 압축 모드. 인라인 사유를 빼고 라벨만 남긴다.
   * 사유는 이미 hover 툴팁에 전문이 있으므로 **정보 손실 0**이다.
   * 근거: 사유까지 인라인으로 붙으면 배지 하나가 199px를 먹어 다른 신호를 전부
   * 밀어낸다(브라우저 실측). 밀집 목록의 배지는 "무엇"만 말하고 "왜"는 hover로
   * 내리는 것이 원칙(#276).
   */
  compact?: boolean;
}

export default function TuningBadge({ data, compact = false }: TuningBadgeProps) {
  const tone = data.isZombie ? ZOMBIE_TONE : HEALTHY_TONE;

  const label = data.isZombie
    ? strings.zombie.label
    : data.tier === 'grow'
      ? strings.healthy.grow
      : strings.healthy.defend;

  const titleLines: string[] = [];
  if (data.isZombie && data.reasons.length) {
    titleLines.push(strings.reasonsHeader, ...data.reasons.map((r) => `\u2022 ${r}`), '');
  }
  titleLines.push(kkottiLine(data), '');
  titleLines.push(`${strings.scoreLabel} ${data.score}`);
  titleLines.push(`${strings.caveatHeader} ${data.caveat}`);
  const title = titleLines.join('\n');

  return (
    <span
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px',
        borderRadius: 999, background: tone.bg, border: `1px solid ${tone.border}`,
        color: tone.color, fontSize: 11,
        fontWeight: data.isZombie ? 700 : 600,
        whiteSpace: 'nowrap', cursor: 'help',
      }}
    >
      {data.isZombie
        ? <Skull size={12} strokeWidth={2.4} />
        : data.tier === 'grow'
          ? <Sprout size={12} strokeWidth={2.2} />
          : <Eye size={12} strokeWidth={2.2} />}
      <span>{label}</span>
      {!compact && data.isZombie && data.zombieReason && (
        <span style={{ opacity: 0.85, fontWeight: 600 }}>&middot; {data.zombieReason}</span>
      )}
    </span>
  );
}
