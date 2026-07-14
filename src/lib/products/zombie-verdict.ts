// src/lib/products/zombie-verdict.ts
// ============================================================================
// 좀비 통합 판정 엔진 (작업원칙 #264) — SINGLE authority for "이 상품, 좀비인가?".
// #261은 폐기(둘을 별개로 유지하라는 지침은 운영자가 2026-07-14 뒤집음). #264가
// 최신 지침: "좀비 발견"이 유일한 화면 노출 판정 라벨이고, 아래 4개 엔진은
// 삭제하지 않고 이 파일의 입력 신호로 흡수된다 —
//   - revival-score.ts   → 상태/이미지/SEO 신호 (thin_images만 여기서 추가 흡수;
//                           suspended/out_of_stock/weak_name_seo는 이미
//                           tuning-score.ts가 동일 신호를 더 정밀하게 다룸)
//   - tuning-score.ts    → 마진/판매실적/트렌드/재고신뢰도 신호 (메인 엔진, 그대로 재사용)
//   - product-name-diagnosis → tuning-score.ts의 nameSeoScore 입력으로 이미 흡수됨
//   - substitute (품절 대체) → 품절인데 대체상품 미설정이면 추가 감점
//
// PURE (no I/O, no clock) — same discipline as the engines it composes. Callers
// (tuning-signals.ts) do the async DB reads and pass a plain ZombieVerdictInput.
//
// UI에는 이 결과의 score/tier/isZombie/zombieReason/reasons만 노출한다 — "손질
// 필요도"/"부활 필요도" 같은 병렬 라벨은 화면에서 제거하고 "좀비"로 통일한다(#264).
// ============================================================================

import {
  computeTuningScore,
  isOutOfStockOrSuspended,
  ZOMBIE_THRESHOLD,
  DEFEND_THRESHOLD,
  type TuningScoreInput,
  type TuningScoreReason,
  type TuningTier,
} from './tuning-score';

export interface ZombieVerdictInput extends TuningScoreInput {
  /** 대표 + 추가 이미지 총 개수 (revival-score.ts의 thin_images 신호 흡수). */
  imageCount?: number;
  /** 품절 대체 신호: 대체상품/재소싱 정보가 설정돼 있는지. 품절/판매중지가
   *  아닌 상품엔 해당 없음(null) — 감점하지 않는다. */
  oosSubstituteConfigured?: boolean | null;
}

export interface ZombieVerdictResult {
  /** 0-100, higher = 좀비에 가까움. tuning-score와 동일 스케일. */
  score: number;
  /** 키울(grow) / 방어(defend) / 내릴(demote) — 연동 목록 관리 방향. */
  tier: TuningTier;
  /** score >= ZOMBIE_THRESHOLD — 화면에는 이 값만 "좀비" 배지로 노출한다. */
  isZombie: boolean;
  /** "왜 좀비인지 한 줄" — 가장 비중 높은 사유, zombie가 아니면 null. */
  zombieReason: string | null;
  /** 좀비가 된 핵심 사유, 우선순위 정렬, 최대 3개 — 배지 클릭 시 노출용. */
  reasons: string[];
  /** #255 — 항상 노출: 네이버 공식 지표가 아니라 앱 자체 참고 지수. */
  caveat: string;
}

const THIN_IMAGES_WEIGHT = 10;
const OOS_NO_SUBSTITUTE_WEIGHT = 14;
const MAX_REASONS = 3;

/**
 * 좀비 통합 판정. tuning-score.ts를 메인 엔진으로 재사용하고, revival-score.ts의
 * thin_images 신호와 품절 대체 신호를 추가 가중치로 흡수해 하나의 점수/사유
 * 목록으로 합친다(#264). "부활 필요도"·"손질필요도" 같은 별도 라벨은 만들지
 * 않고 이 결과 하나만 화면에 노출한다.
 */
export function computeZombieVerdict(input: ZombieVerdictInput): ZombieVerdictResult {
  const base = computeTuningScore(input);

  const extra: TuningScoreReason[] = [];
  if ((input.imageCount ?? 99) <= 1) {
    extra.push({ text: '대표 이미지 부족', weight: THIN_IMAGES_WEIGHT });
  }
  if (isOutOfStockOrSuspended(input) && input.oosSubstituteConfigured === false) {
    extra.push({ text: '품절인데 대체상품 미설정', weight: OOS_NO_SUBSTITUTE_WEIGHT });
  }

  const merged = [...base.reasonsWeighted, ...extra].sort((a, b) => b.weight - a.weight);
  const extraTotal = extra.reduce((sum, r) => sum + r.weight, 0);
  const score = Math.max(0, Math.min(100, base.score + extraTotal));

  const tier: TuningTier = score >= ZOMBIE_THRESHOLD ? 'demote' : score >= DEFEND_THRESHOLD ? 'defend' : 'grow';
  const isZombie = score >= ZOMBIE_THRESHOLD;
  const reasons = merged.slice(0, MAX_REASONS).map((r) => r.text);

  return {
    score,
    tier,
    isZombie,
    zombieReason: isZombie ? (reasons[0] ?? null) : null,
    reasons,
    caveat: base.caveat,
  };
}
