// src/lib/products/source-gone-pure.ts
// ============================================================================
// 공급처 단절(소싱처 소멸) 판정 — 순수 계산 부분만 분리 (작업2, 2026-07-24).
//
// source-gone.ts는 파일 최상단에서 prisma를 import한다. lifecycle.ts가 그
// 파일에서 isSourceGoneFromCount 하나만 가져다 써도 prisma import 구문 전체가
// 딸려와, lifecycle.ts(따라서 이를 감싸는 surfaceRules.ts)를 client 컴포넌트에서
// 안전하게 못 쓰게 만든다(#32/#37). sales-assets.ts가 이미 같은 이유로 분리된
// 전례를 그대로 따른다 — 순수 계산은 여기, DB I/O(loadSourceGoneFlags)만
// source-gone.ts에 남긴다. source-gone.ts는 이 모듈을 재수출해 기존
// import 경로를 그대로 유지한다(#62 단일 권위는 유지).
//
// PURE (no I/O, no prisma) — client 컴포넌트에서도 안전하게 import 가능.
// ============================================================================

/**
 * Consecutive qty=-1 count (from the newest poll) at which a lookup failure is
 * treated as a permanent supplier delisting rather than a transient hiccup.
 */
export const SOURCE_GONE_MIN_CONSECUTIVE = 3;

/**
 * Count leading consecutive qty<0 snapshots per product.
 * `snapshots` MUST be ordered polledAt DESC (newest first) across all products;
 * the run for each product stops at its first non-negative qty.
 */
export function countLeadingNegatives(
  snapshots: Array<{ productId: string; qty: number }>,
): Map<string, number> {
  const counts = new Map<string, number>();
  const sealed = new Set<string>();
  for (const s of snapshots) {
    if (sealed.has(s.productId)) continue;
    if (s.qty < 0) counts.set(s.productId, (counts.get(s.productId) ?? 0) + 1);
    else sealed.add(s.productId); // first non-negative seals the run
  }
  return counts;
}

/**
 * 연속 품절 지속일 집계 (#273 처분 권고 입력).
 *
 * `snapshots`는 polledAt DESC(최신 우선)로 전 상품이 섞여 들어온다. 상품별로
 * 최신부터 qty<=0인 스냅샷이 이어지는 구간을 세고, 그 구간의 *가장 오래된*
 * 폴링 시각으로부터 지난 일수를 돌려준다. 최신 스냅샷이 재고 양수면 품절이
 * 아니므로 해당 상품은 맵에 담지 않는다(= 지속일 없음).
 *
 * qty<0(조회 실패 센티널 #260)도 런을 끊지 않는다 — 조회가 한 번 실패했다고
 * 품절 시계가 리셋되면 장기 품절이 영원히 임계에 닿지 못한다. 조회 실패가
 * 지속되는 경우는 sourceGone이 별도로 잡아내므로(#271) 이중 방어가 된다.
 */
export function countLeadingOutOfStockDays(
  snapshots: Array<{ productId: string; qty: number; polledAt: Date }>,
): Map<string, number> {
  const oldestInRun = new Map<string, Date>();
  const sealed = new Set<string>();
  for (const s of snapshots) {
    if (sealed.has(s.productId)) continue;
    if (s.qty <= 0) oldestInRun.set(s.productId, s.polledAt); // desc 정렬이므로 계속 덮어쓰면 최고(最古)가 남는다
    else sealed.add(s.productId); // 재고가 있었던 시점에서 런이 끊긴다
  }
  const days = new Map<string, number>();
  for (const [productId, since] of oldestInRun) {
    const ms = Date.now() - since.getTime();
    days.set(productId, Math.max(0, Math.floor(ms / 86_400_000)));
  }
  return days;
}

/** Whether a consecutive-negative run means the supplier has delisted. */
export function isSourceGoneFromCount(consecutiveNegatives: number | undefined): boolean {
  return (consecutiveNegatives ?? 0) >= SOURCE_GONE_MIN_CONSECUTIVE;
}
