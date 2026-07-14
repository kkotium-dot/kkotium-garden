// src/lib/products/tuning-score.ts
// ============================================================================
// 손질필요도 지수 (#256 P4) — PURE composite score answering "이 상품, 지금
// 얼마나 손봐야 하나?" for 꽃밭 돌보기. Reuses existing scoring engines only
// (no dupe, #252): revival-score (품절/판매중지 신호) + honey-score (마진) +
// product-name-diagnosis (상품명 SEO) + category-trend-cache (카테고리 트렌드)
// + dome-inventory-poller's SupplierStockProfile (공급사 재고 갱신 신뢰도).
// This module itself is PURE — no I/O, no clock. The caller (tuning-signals.ts)
// does the async DB/lookup work and passes a plain TuningScoreInput in.
//
// Priority order (운영자 확정, PRODUCT_IA_REDESIGN_V2_CONFIRMED §4):
//   품절+실적(0~40) > 마진위기(0~30) > 성장여력(0~20) > 악성재고(0~10)
//
// Seller-facing copy: "손질필요도"/"관찰" instead of developer jargon
// ("튜닝"/"방어") per 2026-07-14 운영자 지시. Internal type names (TuningTier
// = 'grow'|'defend'|'demote') are unchanged — they never render directly;
// only TUNING_TIER_LABEL and the badge strings carry the seller-facing text.
//
// Caveat (#255): this is an app-internal heuristic, NOT Naver's official score
// (Naver does not expose a per-product ranking API) — always surfaced with the
// result so no UI can present it as an official metric.
// ============================================================================

export interface TuningScoreInput {
  // ── 품절+실적 (최우선) ──
  /** Naver-side status (SALE/OUTOFSTOCK/SUSPENSION/...), null = unlinked. */
  naverStatusType?: string | null;
  /** App-side Product.status. */
  appStatus: string;
  /** Days since last sale (null = never sold / unknown — not penalized). */
  daysSinceLastSale?: number | null;

  // ── 마진위기 ──
  /** Net margin rate (%), from calcHoneyScore. */
  netMarginRate: number;

  // ── 성장여력 ──
  /** diagnoseProductName(name).score, 0-100. */
  nameSeoScore: number;
  /** Category D1 trend score (0-100) from category-trend-cache; null = no cache entry. */
  categoryTrendScore?: number | null;

  // ── 악성재고 ──
  /** SupplierStockProfile.isTrustworthy; null = no profile computed yet. */
  supplierTrustworthy?: boolean | null;
  /** Days since Product.updatedAt (staleness proxy for neglect). */
  daysSinceUpdated?: number | null;
}

export type TuningTier = 'grow' | 'defend' | 'demote';

export interface TuningScoreReason {
  text: string;
  weight: number;
}

export interface TuningScoreResult {
  /** 0-100, higher = more urgently needs tuning attention. */
  score: number;
  /** 키울(grow) / 방어(defend) / 내릴(demote) — 연동 목록 관리 방향. */
  tier: TuningTier;
  /** score >= ZOMBIE_THRESHOLD. */
  isZombie: boolean;
  /** "왜 좀비인지 한 줄" — highest-weighted contributing reason, zombie만. */
  zombieReason: string | null;
  /** All contributing reasons, most severe first. */
  reasons: string[];
  /** Same as `reasons` but with weights — lets composing engines (zombie-verdict)
   *  merge in extra signals without re-deriving this module's internal weights. */
  reasonsWeighted: TuningScoreReason[];
  /** #255 — always surfaced so this never reads as Naver's official score. */
  caveat: string;
}

// Exported so zombie-verdict.ts (#264 unification) can share the same cutoffs
// instead of redefining them.
export const ZOMBIE_THRESHOLD = 60;
export const DEFEND_THRESHOLD = 30;

/** Shared OOS/판매중지 status check — reused by zombie-verdict.ts (#264) so the
 *  "품절 대체 신호" extra weight only applies when this engine already sees the
 *  product as out-of-stock/suspended. */
export function isOutOfStockOrSuspended(input: Pick<TuningScoreInput, 'naverStatusType' | 'appStatus'>): boolean {
  return (
    OOS_STATUS.has(input.naverStatusType ?? '') || OOS_STATUS.has(input.appStatus) ||
    SUSPENDED_STATUS.has(input.naverStatusType ?? '') || SUSPENDED_STATUS.has(input.appStatus)
  );
}

const CAVEAT = '좀비 지수는 앱이 자체 산정하는 참고 지수입니다 — 네이버 공식 판매점수가 아닙니다.';

const OOS_STATUS = new Set(['OUTOFSTOCK', 'OUT_OF_STOCK']);
const SUSPENDED_STATUS = new Set(['SUSPENSION', 'CLOSE', 'PROHIBITION', 'INACTIVE', 'HIDDEN']);

export function computeTuningScore(input: TuningScoreInput): TuningScoreResult {
  const reasons: TuningScoreReason[] = [];

  // ── 1) 품절+실적 (0~40, 최우선) ──
  let perf = 0;
  const oos = OOS_STATUS.has(input.naverStatusType ?? '') || OOS_STATUS.has(input.appStatus);
  const suspended = !oos && (SUSPENDED_STATUS.has(input.naverStatusType ?? '') || SUSPENDED_STATUS.has(input.appStatus));
  if (oos) reasons.push({ text: '품절 상태', weight: 22 });
  else if (suspended) reasons.push({ text: '판매중지 상태', weight: 16 });
  perf += oos ? 22 : suspended ? 16 : 0;

  const d = input.daysSinceLastSale;
  if (d != null && d >= 7) { perf += 18; reasons.push({ text: `${d}일간 판매 0%`, weight: 18 }); }
  else if (d != null && d >= 3) { perf += 8; reasons.push({ text: `${d}일간 판매 저조`, weight: 8 }); }
  perf = Math.min(perf, 40);

  // ── 2) 마진위기 (0~30) ──
  let margin = 0;
  const m = input.netMarginRate;
  if (m < 0) { margin = 30; reasons.push({ text: '역마진 — 팔수록 손해', weight: 30 }); }
  else if (m < 5) { margin = 24; reasons.push({ text: `순마진 ${m.toFixed(1)}% — 마진 위기`, weight: 24 }); }
  else if (m < 10) { margin = 14; reasons.push({ text: `순마진 ${m.toFixed(1)}% — 마진 낮음`, weight: 14 }); }
  else if (m < 15) { margin = 6; reasons.push({ text: `순마진 ${m.toFixed(1)}% — 다소 낮음`, weight: 6 }); }

  // ── 3) 성장여력 (0~20) ──
  let growth = 0;
  if (input.nameSeoScore < 40) { growth += 12; reasons.push({ text: '상품명 SEO 취약', weight: 12 }); }
  else if (input.nameSeoScore < 60) { growth += 6; reasons.push({ text: '상품명 SEO 보완 필요', weight: 6 }); }
  if (input.categoryTrendScore != null && input.categoryTrendScore < 30) {
    growth += 8; reasons.push({ text: '경쟁가 하락·카테고리 트렌드 하락', weight: 8 });
  }
  growth = Math.min(growth, 20);

  // ── 4) 악성재고 (0~10) ──
  let deadStock = 0;
  if (input.supplierTrustworthy === false) { deadStock += 6; reasons.push({ text: '공급사 재고 갱신 중단 추정(악성재고)', weight: 6 }); }
  const u = input.daysSinceUpdated;
  if (u != null && u >= 60) { deadStock += 4; reasons.push({ text: `${u}일간 미갱신 방치`, weight: 4 }); }
  deadStock = Math.min(deadStock, 10);

  const score = Math.max(0, Math.min(100, Math.round(perf + margin + growth + deadStock)));
  const tier: TuningTier = score >= ZOMBIE_THRESHOLD ? 'demote' : score >= DEFEND_THRESHOLD ? 'defend' : 'grow';
  const isZombie = score >= ZOMBIE_THRESHOLD;

  reasons.sort((a, b) => b.weight - a.weight);

  return {
    score,
    tier,
    isZombie,
    zombieReason: isZombie ? (reasons[0]?.text ?? null) : null,
    reasons: reasons.map((r) => r.text),
    reasonsWeighted: reasons,
    caveat: CAVEAT,
  };
}

export const TUNING_TIER_LABEL: Record<TuningTier, string> = {
  grow: '키울 상품',
  defend: '관찰',
  demote: '내릴 상품',
};
