// src/app/api/products/publish-readiness-batch/route.ts
//
// 2026-07-11 — Batch publish-readiness for the /products hub (#245, per-row
// 발행준비 X/8). Runs the SAME getPublishReadiness gate as the single-product
// checklist, but for every product in ONE pass (one findMany + one address
// lookup) so the hub can show each row's X/8 without an N+1 fan-out. Read-only.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPublishReadiness } from '@/lib/naver/publish-readiness';
import { getNaverAddressIds } from '@/lib/naver/load-update-context';
import type { LocalProduct } from '@/lib/naver/product-builder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // One address lookup (store-level) shared by every product's gate.
    const addresses = await getNaverAddressIds();
    const hasAddresses = !!addresses;

    const dbProducts = await prisma.product.findMany({
      include: { product_options: true },
    });

    const items = dbProducts.map((db) => {
      const product: LocalProduct = {
        ...db,
        additionalImages: db.additionalImages as unknown,
        keywords: db.keywords as unknown,
        tags: db.tags as unknown,
        product_options: db.product_options ?? null,
      };
      const r = getPublishReadiness(product, !!db.shipping_template_id, hasAddresses, {
        registered: !!db.naverProductId,
        statusType: db.naver_status_type ?? null,
      });
      return { id: db.id, ready: r.ready, passed: r.passed, total: r.total };
    });

    return NextResponse.json({ success: true, items });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
