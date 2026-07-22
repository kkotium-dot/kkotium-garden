// src/lib/products/disposition-load.ts
// ============================================================================
// 처분 판정 서버 로더 — SINGLE authority (작업원칙 #290, #278, #62).
//
// 처분 판정(disposition.ts)은 PURE지만 입력에 재고 스냅샷이 필요하다. 지금까지
// 그 입력을 화면(클라이언트)에서만 모아 써서, **서버 집계(대시보드 카운트)는
// 여전히 `status='OUT_OF_STOCK'`로 세고 있었다.** 그 결과 공급처가 끊긴 상품
// (앱 status는 ACTIVE로 남는다)이 대시보드 "품절 경보"에서 통째로 빠졌다 —
// #278("대기함은 상태가 아니라 판정으로 모은다")의 서버 쪽 재발.
//
// 이 파일이 서버에서 처분 판정을 만드는 단일 경로다. 대시보드·API·크론 등
// 서버 소비처는 전부 여기를 쓴다. 화면과 서버가 다른 수를 말하면 운영자는
// 어느 쪽도 믿지 않게 된다.
//
// 쿼리 비용: 상품 1회 + 스냅샷 1회. 스냅샷은 in-memory로 접어 쓰므로 N+1 없음.
// best-effort(#82) — DB 문제 시 빈 결과로 degrade하고 절대 throw하지 않는다.
// ============================================================================

import { prisma } from '@/lib/prisma';
import { countLeadingNegatives, countLeadingOutOfStockDays, isSourceGoneFromCount } from './source-gone';
import { decideDisposition, type DispositionVerdict } from './disposition';

export interface DispositionRow {
  productId: string;
  verdict: DispositionVerdict;
}

/**
 * 전 상품의 처분 판정을 계산한다. 화면(useInventoryBadges + decideDisposition)과
 * **같은 입력·같은 규칙**을 쓰므로 수치가 어긋나지 않는다.
 */
export async function loadDispositionVerdicts(): Promise<DispositionRow[]> {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        naverProductId: true,
        naver_status_type: true,
        salesCount: true,
        lastSaleDate: true,
        supplier_product_code: true,
      },
    });
    if (products.length === 0) return [];

    const ids = products.map((p) => p.id);
    const snapshots = await prisma.inventorySnapshot.findMany({
      where: { productId: { in: ids } },
      orderBy: { polledAt: 'desc' },
      select: { productId: true, qty: true, status: true, polledAt: true },
    });

    // 최신 스냅샷 1건 + 연속 런 집계 — inventory-badges 라우트와 동일 계산(#62).
    const latest = new Map<string, (typeof snapshots)[number]>();
    for (const s of snapshots) if (!latest.has(s.productId)) latest.set(s.productId, s);
    const negRuns = countLeadingNegatives(snapshots);
    const oosDays = countLeadingOutOfStockDays(snapshots);

    return products.map((p) => {
      const snap = latest.get(p.id);
      return {
        productId: p.id,
        verdict: decideDisposition({
          salesCount: p.salesCount,
          lastSaleDate: p.lastSaleDate,
          naverProductId: p.naverProductId,
          naverStatusType: p.naver_status_type,
          sourceGone: isSourceGoneFromCount(negRuns.get(p.id)),
          qty: snap?.qty,
          supplierStatus: snap?.status,
          daysOutOfStock: oosDays.get(p.id) ?? null,
        }),
      };
    });
  } catch {
    return []; // #82 — 집계 실패가 대시보드를 깨뜨리면 안 된다
  }
}

/** 처분 조치가 필요한(권고가 있는) 상품 수. 대시보드 "처분 대기" 카운트. */
export async function countDispositionPending(): Promise<number> {
  const rows = await loadDispositionVerdicts();
  return rows.filter((r) => r.verdict.action !== 'NONE').length;
}
