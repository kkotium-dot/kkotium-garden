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
//
// 순수 계산(카운트·임계 판정)은 source-gone-pure.ts로 분리돼 있다(작업2,
// 2026-07-24) — 이 파일은 prisma를 import하므로 client 컴포넌트에서 직접
// import하면 안 된다(#32/#37). lifecycle.ts 등 client-safe 모듈은 그 순수
// 모듈만 가져다 쓴다. 기존 import 경로(`from './source-gone'`)는 아래
// 재수출로 그대로 동작한다.
// ============================================================================

import { prisma } from '@/lib/prisma';
import { countLeadingNegatives, isSourceGoneFromCount } from './source-gone-pure';

export {
  SOURCE_GONE_MIN_CONSECUTIVE,
  countLeadingNegatives,
  countLeadingOutOfStockDays,
  isSourceGoneFromCount,
} from './source-gone-pure';

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
