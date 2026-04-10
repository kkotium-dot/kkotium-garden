// src/app/api/events/recent/route.ts
// GET /api/events/recent — returns last 20 ProductEvents with product name

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const events = await prisma.productEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Enrich with product names via a single lookup
    const productIds = [...new Set(events.map(e => e.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(products.map(p => [p.id, p.name]));

    const enriched = events.map(e => ({
      id:          e.id,
      productId:   e.productId,
      type:        e.type,
      oldValue:    e.oldValue,
      newValue:    e.newValue,
      note:        e.note,
      createdAt:   e.createdAt.toISOString(),
      productName: nameMap.get(e.productId) ?? null,
    }));

    return NextResponse.json({ success: true, events: enriched });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
