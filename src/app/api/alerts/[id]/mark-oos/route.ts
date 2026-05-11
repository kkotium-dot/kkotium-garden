// /api/alerts/[id]/mark-oos
// ============================================================================
// Sprint 6-A UI Phase 2: mark the product as OUT_OF_STOCK in our DB AND
// resolve the alert. Naver Commerce API status flip is intentionally NOT
// invoked here — that lives in Session C (admin manual confirm step), to
// give the solo-seller a chance to inspect the Naver side before pushing.
//
// Effect:
//   1. Product.status = 'OUT_OF_STOCK'
//   2. LowStockAlert.resolvedAt = now, resolutionNote = "품절 처리"
//
// Idempotent: re-calling on a resolved alert returns the alert unchanged.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 품절 처리 — 앱 내 상태 변경
const RESOLUTION_NOTE = '품절 처리 — 앱 상태 변경, 네이버 반영은 별도';

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
    select: { id: true, productId: true, resolvedAt: true },
  });
  if (!alert) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (alert.resolvedAt) {
    return NextResponse.json({ data: alert });
  }

  await prisma.$transaction([
    prisma.product.update({
      where: { id: alert.productId },
      data: { status: 'OUT_OF_STOCK' },
    }),
    prisma.lowStockAlert.update({
      where: { id },
      data: {
        resolvedAt: new Date(),
        resolutionNote: RESOLUTION_NOTE,
      },
    }),
  ]);

  const updated = await prisma.lowStockAlert.findUnique({ where: { id } });
  return NextResponse.json({ data: updated });
}
