// /api/alerts/[id]/relist-reminder
// ============================================================================
// Sprint 6-A UI Phase 2: send a Discord stock-alert reminder to nudge the
// solo-seller to contact the supplier for restock. Also resolves the alert
// with a relist-request note. Korean literals are \uXXXX-encoded to match
// the dome-inventory-poller.ts pattern (work principle #29 c).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendDiscord } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// 재등록 요청 알림
const DISCORD_TITLE = '재등록 요청 알림';
// 공급사
const LABEL_SUPPLIER = '공급사';
// 미설정
const LABEL_NONE = '미설정';
// 현재 재고
const LABEL_CURRENT_QTY = '현재 재고';
// 재고 보충 요청 필요
const LABEL_RESTOCK_NEEDED = '재고 보충 요청 필요';
// 재등록 요청 — 공급사 알림 발송
const RESOLUTION_NOTE = '재등록 요청 — 공급사 알림 발송';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 });
  }

  const alert = await prisma.lowStockAlert.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          supplier: { select: { name: true } },
          supplier_product_code: true,
        },
      },
    },
  });
  if (!alert) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (alert.resolvedAt) {
    return NextResponse.json({ data: alert });
  }

  await sendDiscord('STOCK_ALERT', '', [
    {
      title: DISCORD_TITLE,
      description:
        `\`${alert.product.supplier_product_code ?? alert.product.id}\` (${alert.product.name.slice(0, 40)})\n` +
        `${LABEL_SUPPLIER}: ${alert.product.supplier?.name ?? LABEL_NONE}\n` +
        `${LABEL_CURRENT_QTY}: ${alert.currentQty} — ${LABEL_RESTOCK_NEEDED}`,
      color: 0xFFD700,
      timestamp: new Date().toISOString(),
    },
  ]);

  const updated = await prisma.lowStockAlert.update({
    where: { id },
    data: {
      resolvedAt: new Date(),
      resolutionNote: RESOLUTION_NOTE,
    },
  });

  return NextResponse.json({ data: updated });
}
