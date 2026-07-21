// src/lib/products/source-gone.ts
// ============================================================================
// 공급처 단절(소싱처 소멸) 판정 — SINGLE authority (작업원칙 #271, #62).
//
// qty=-1(#260 조회 실패 센티널)만으로는 "일시적 폴링 실패"와 "공급사가 도매꾹에서
// 상품을 내린 영구 소멸"을 구분할 수 없다. 구분 신호는 *지속성*이다:
//   - 살아있는 상품의 일시 실패 → 다음 폴에서 실재고로 자가 복구(1~2회)
//   - 하차된 상품 → -1이 무한 지속
// (#270 실측 근거: 파서 정상화 후 아이스틀·달항아리는 실재고 복구, 명화만 -1 지속)
//
// 임계값과 계산 로직을 이 파일 하나에 두어 소비처(inventory-badges API·
// tuning-signals 좀비 판정)가 서로 어긋나지 않게 한다(#62). 전상품 범용(#55) —
// 특정 상품 하드코딩 금지(CLAUDE.md §0).
// ============================================================================

import { prisma } from '@/lib/prisma';

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

// 자산 보호 판단(#272)은 클라이언트 컴포넌트에서도 쓰이므로 prisma 의존이 없는
// sales-assets.ts에 분리했다(이 파일은 prisma를 import하므로 서버 전용).
export { hasSalesAssets, type SalesAssetInput } from './sales-assets';

/**
 * Batch-load the source-gone flag for the given products.
 * Best-effort (#82): any DB/schema problem degrades to "not gone" rather than
 * throwing — a scoring hiccup must never break the product list.
 */
export async function loadSourceGoneFlags(productIds: string[]): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>();
  if (productIds.length === 0) return out;
  try {
    const snapshots = await prisma.inventorySnapshot.findMany({
      where: { productId: { in: productIds } },
      orderBy: { polledAt: 'desc' },
      select: { productId: true, qty: true },
    });
    const counts = countLeadingNegatives(snapshots);
    for (const id of productIds) out.set(id, isSourceGoneFromCount(counts.get(id)));
  } catch {
    // table not migrated / transient DB issue — degrade silently (#82)
  }
  return out;
}
