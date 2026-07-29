// src/lib/products/deletion-audit.ts
// ============================================================================
// 상품 하드 삭제 감사 기록 (운영자 요청 2026-07-29 ①, #315).
//
// 지금까지 상품 삭제는 product_events에 아무 흔적도 안 남겼다(P4 발견 —
// 명화 삭제 이력 미기록). ProductEvent.product_id는 Product로의 FK가 없어
// (information_schema 확인 — Desktop) 삭제 후에도 참조 무결성 위반 없이
// 남는다. 그래서 이벤트는 **삭제 성공 이후** 기록한다 — 스냅샷/처분판정은
// 삭제 전에 미리 캡처해두고, 삭제가 실제로 성공했을 때만 그 캡처를 쓴다.
// 삭제가 실패하면 이벤트도 안 남는다(허위 "삭제됨" 기록 방지).
//
// 처분사유는 disposition.ts(단일 권위, #62)의 판정을 그대로 쓴다 — 이 파일이
// 별도 삭제사유 규칙을 만들지 않는다.
// ============================================================================

import { prisma } from '@/lib/prisma';
import { loadDispositionVerdicts } from './disposition-load';

export interface DeletionSnapshot {
  id: string;
  name: string | null;
  category: string | null;
  salesCount: number | null;
  /** disposition.ts 판정(action) — 권고 없이 수동 삭제했으면 'NONE'. */
  reason: string;
}

/**
 * 삭제 전에 호출 — 스냅샷 + 처분판정을 캡처한다. loadDispositionVerdicts는
 * 살아있는 재고 스냅샷을 읽으므로 반드시 실제 delete 이전에 실행해야 한다
 * (삭제 후엔 InventorySnapshot이 cascade로 함께 사라져 판정 불가).
 */
export async function captureDeletionSnapshots(ids: string[]): Promise<DeletionSnapshot[]> {
  if (ids.length === 0) return [];
  const [products, verdicts] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, category: true, salesCount: true },
    }),
    loadDispositionVerdicts(),
  ]);
  const verdictMap = new Map(verdicts.map((v) => [v.productId, v.verdict.action]));
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    salesCount: p.salesCount,
    reason: verdictMap.get(p.id) ?? 'NONE',
  }));
}

/**
 * 삭제 성공 이후 호출 — PRODUCT_DELETED 이벤트를 남긴다. best-effort(#82):
 * 감사 기록 실패가 이미 끝난 삭제를 되돌릴 수는 없으니 throw하지 않는다.
 */
export async function recordProductDeletedEvents(snapshots: DeletionSnapshot[]): Promise<void> {
  if (snapshots.length === 0) return;
  try {
    await prisma.productEvent.createMany({
      data: snapshots.map((s) => ({
        productId: s.id,
        type: 'PRODUCT_DELETED',
        oldValue: JSON.stringify({ name: s.name, category: s.category, salesCount: s.salesCount ?? 0 }),
        note: s.reason,
      })),
    });
  } catch {
    // 감사 기록 실패는 삭제 자체를 막지 않는다 — 삭제는 이미 끝났다.
  }
}
