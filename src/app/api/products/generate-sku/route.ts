import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateUniqueSku } from '@/lib/sku-engine';

// SKU generation is centralized in src/lib/sku-engine.ts so this route and the
// products POST handler share one collision-safe implementation.

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supplierId = String(body?.supplierId ?? '').trim();
    const supplierProductNo = String(body?.supplierProductNo ?? '').trim();

    if (!supplierId) {
      return NextResponse.json({ success: false, error: 'supplierId required' }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
    }

    const finalSku = await generateUniqueSku({ supplierId, supplierProductNo });

    return NextResponse.json({
      success: true,
      sku: finalSku,
      available: true,
      platformCode: supplier.platformCode,
      supplierAbbr: supplier.abbr,
      supplierName: supplier.name,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sku = searchParams.get('sku') ?? '';
    if (!sku) return NextResponse.json({ success: false, error: 'sku required' }, { status: 400 });
    const existing = await prisma.product.findUnique({ where: { sku } });
    return NextResponse.json({ success: true, sku, available: !existing });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
