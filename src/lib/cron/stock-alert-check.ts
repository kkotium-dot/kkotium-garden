// src/lib/cron/stock-alert-check.ts
// ============================================================================
// STOCK ALERT CHECK (B15, docs/plan/B11_B13_B15_HANDOFF_SPEC_2026-09-09.md) —
// OOS detection + substitute_info(v2) 연결 + Discord STOCK_ALERT 발송. 원래
// cron/daily 안에 있던 "1. OOS detection" 블록을 그대로 뽑아낸 것 — 동작은
// 바뀌지 않는다. 두 곳에서 재사용한다:
//   - cron/daily (08:00 KST, 기존)
//   - cron/stock-alert-pm (신규 — B15 "데일리 2회" 중 오후분, cron/daily.ts
//     상단 주석과 동일한 이유로 Vercel Hobby가 크론 실행빈도를 "동일 크론당
//     하루 1회"로 제한해, 별도 daily 크론 2개를 시차를 둬 배치하는 방식으로
//     order-sync가 이미 쓰고 있는 패턴을 그대로 따른다).
//
// ProductEvent 'OOS' 기록은 24h 내 기존 이벤트가 있으면 건너뛰므로(dedup),
// 하루 2번 호출해도 이벤트가 중복 쌓이지 않는다.
// ============================================================================

import { prisma } from '@/lib/prisma';
import { loadDispositionVerdicts } from '@/lib/products/disposition-load';
import { sendDiscord, buildStockAlertEmbed } from '@/lib/discord';
import { scoreProduct } from '@/lib/notifications/daily-signals';
import { readSubstituteInfo } from '@/lib/product-link';

interface OosProductRow {
  id: string;
  name: string;
  sku: string;
  salePrice: number;
  supplierPrice: number;
  status: string;
  naverCategoryCode?: string | null;
  keywords?: unknown;
  tags?: unknown;
  mainImage?: string | null;
}

export interface StockAlertCheckResult {
  sent: boolean;
  count: number;
  reason?: string;
}

/**
 * products: 후보 상품 목록(대개 status !== 'INACTIVE'인 전체 또는 OOS만).
 * 실제 발송 대상은 이 함수 내부에서 status==='OUT_OF_STOCK' 또는 처분판정
 * 대기(dispositionVerdict.action !== 'NONE')로 다시 필터한다 — cron/daily와
 * 동일한 판정을 쓰기 위해서다(#62 단일 권위).
 */
export async function runStockOutAlertCheck(products: OosProductRow[]): Promise<StockAlertCheckResult> {
  // #293/#290 — status만 보면 공급처가 끊긴 상품이 알림에서 통째로 빠진다.
  let dispositionPendingIds = new Set<string>();
  let daysOosById = new Map<string, number | null>();
  try {
    const verdicts = await loadDispositionVerdicts();
    for (const v of verdicts) {
      if (v.verdict.action !== 'NONE') dispositionPendingIds.add(v.productId);
      daysOosById.set(v.productId, v.verdict.daysOutOfStock);
    }
  } catch {
    // best-effort(#82) — 판정 실패가 크론 전체를 막으면 안 된다.
  }

  const oosProducts = products.filter(
    p => p.status === 'OUT_OF_STOCK' || dispositionPendingIds.has(p.id),
  );

  if (oosProducts.length === 0) {
    return { sent: false, count: 0, reason: 'no OOS products' };
  }

  // status 기준만 이벤트로 남긴다(#293과 동일 이유 — 처분판정 대상까지 OOS
  // 이벤트로 남기면 이벤트 의미가 흐려진다). 24h 내 기존 이벤트 있으면 skip.
  for (const p of oosProducts.filter(x => x.status === 'OUT_OF_STOCK')) {
    const existing = await prisma.productEvent.findFirst({
      where: {
        productId: p.id,
        type: 'OOS',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (!existing) {
      await prisma.productEvent.create({
        data: {
          productId: p.id,
          type: 'OOS',
          oldValue: 'ACTIVE',
          newValue: 'OUT_OF_STOCK',
          note: 'Detected by daily cron',
        },
      });
    }
  }

  // B15 — substitute_info(v2)의 우선순위 대체상품을 실제로 연결한다.
  const subMap = await readSubstituteInfo(oosProducts.map(p => p.id));

  // "2차 방어선" — 앱 내부로 연결된 대체상품의 현재 재고까지 확인.
  const linkedSubProductIds = Array.from(new Set(
    oosProducts.flatMap(p => (subMap.get(p.id)?.substitutes ?? [])
      .map(s => s.substituteProductId)
      .filter((id): id is string => !!id)),
  ));
  const subProductStatus = new Map<string, string>();
  if (linkedSubProductIds.length > 0) {
    const subProducts = await prisma.product.findMany({
      where: { id: { in: linkedSubProductIds } },
      select: { id: true, status: true },
    });
    for (const sp of subProducts) subProductStatus.set(sp.id, sp.status);
  }

  const stockPayload = oosProducts.map(p => {
    const score = scoreProduct(p);
    const sub = subMap.get(p.id);
    const substitutes = sub?.substitutes ?? [];
    const alternatives = substitutes.slice(0, 2).map(s => ({
      alt_product_name: s.substituteName || '(이름 없음)',
      platform_code:    s.sourcingCode ?? '',
      platform_url:     s.sourcingUrl ?? undefined,
    }));
    const allLinked = substitutes.length > 0 && substitutes.every(s => !!s.substituteProductId);
    const allAlternativesOos = allLinked
      ? substitutes.every(s => subProductStatus.get(s.substituteProductId!) === 'OUT_OF_STOCK')
      : undefined;
    return {
      id:            p.id,
      name:          p.name,
      sku:           p.sku,
      salePrice:     p.salePrice,
      honeyScore:    score.total,
      honeyGrade:    score.grade,
      netMarginRate: score.netMarginRate,
      daysOos:       daysOosById.get(p.id) ?? undefined,
      alternatives,
      allAlternativesOos,
    };
  });

  const stockResult = await sendDiscord(
    'STOCK_ALERT',
    '',
    [buildStockAlertEmbed({ products: stockPayload })],
  );
  return { sent: stockResult.ok, count: oosProducts.length };
}
