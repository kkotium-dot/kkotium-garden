// src/app/api/crawl/batch-register/route.ts
// Batch register sourcing shelf items as DRAFT products
// POST body: { ids: string[], markupRate?: number }
// - ids: crawl_log IDs to register
// - markupRate: sale price multiplier (default 1.3 = 30% markup)
// Returns: { success, created, skipped, errors }

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function sanitize(s: string | null | undefined): string {
  return (s || '').replace(/[\x00-\x1F\x7F]/g, ' ').replace(/"/g, "'").trim();
}

function generateSku(name: string, index: number): string {
  const prefix = name
    .replace(/[^a-zA-Z0-9가-힣]/g, '')
    .slice(0, 6)
    .toUpperCase();
  return `BATCH-${prefix}-${Date.now()}-${index}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    const markupRate: number = typeof body.markupRate === 'number' ? body.markupRate : 1.3;

    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: 'No IDs provided' }, { status: 400 });
    }
    if (ids.length > 20) {
      return NextResponse.json({ success: false, error: 'Max 20 items per batch' }, { status: 400 });
    }

    // Fetch crawl_logs
    const crawlItems = await (prisma as any).crawlLog.findMany({
      where: { id: { in: ids }, sourcingStatus: { in: ['SOURCED', 'PENDING'] } },
    });

    // Resolve default supplier + user
    const defaultSupplier = await prisma.supplier.findFirst();
    const defaultUser     = await prisma.user.findFirst();

    if (!defaultSupplier || !defaultUser) {
      return NextResponse.json({ success: false, error: 'No supplier or user in DB' }, { status: 400 });
    }

    const created: string[] = [];
    const skipped: string[] = [];
    const errors:  Array<{ id: string; error: string }> = [];

    for (let i = 0; i < crawlItems.length; i++) {
      const item = crawlItems[i];
      try {
        const name          = sanitize(item.name);
        if (!name) { skipped.push(item.id); continue; }

        const supplierPrice = Number(item.supplierPrice || item.supplier_price || 0);
        if (supplierPrice <= 0) { skipped.push(item.id); continue; }

        const salePrice   = Math.ceil(supplierPrice * markupRate / 100) * 100; // round up to nearest 100
        const margin      = parseFloat(((salePrice - supplierPrice) / salePrice * 100).toFixed(2));
        const imgs        = Array.isArray(item.images) ? item.images as string[] : [];
        const mainImage   = imgs[0] || null;
        const shippingFee = Number(item.shipFee ?? item.ship_fee ?? 3000);
        const sku         = generateSku(name, i);

        const product = await prisma.product.create({
          data: {
            name,
            sku,
            category:          'uncategorized',
            naverCategoryCode: sanitize(item.categoryCode ?? item.category_code) || '50003307',
            salePrice,
            supplierPrice,
            margin,
            status:            'DRAFT',
            brand:             '꽃틔움',
            manufacturer:      '도매매 공급사',
            originCode:        '0200037',
            shippingFee,
            images:            imgs,
            mainImage,
            aiScore:           0,
            supplierId:        defaultSupplier.id,
            userId:            defaultUser.id,
          },
        });

        // Link crawl_log to created product and mark as REGISTERED
        await (prisma as any).crawlLog.update({
          where: { id: item.id },
          data:  { sourcingStatus: 'REGISTERED', productId: product.id },
        });

        created.push(product.id);
      } catch (e) {
        errors.push({ id: item.id, error: e instanceof Error ? e.message.slice(0, 80) : String(e) });
      }
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      errors:  errors.length,
      productIds: created,
      details: errors.length > 0 ? errors : undefined,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
