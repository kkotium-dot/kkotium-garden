import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// SKU format:
//   With supplier abbr:    {PLATFORM}-{ABBR}-{SUPPLIER_PRODUCT_NO}  e.g. DMM-HV-39234
//   Without supplier abbr: {PLATFORM}-DIRECT-{SUPPLIER_PRODUCT_NO}  e.g. DMM-DIRECT-39234
//   Fallback (no product no): KKT-{YYMMDD}-{RANDOM6}

export const dynamic = 'force-dynamic';
function buildFallbackSku(): string {
  const now = new Date();
  const ymd = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `KKT-${ymd}-${rand}`;
}

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

    let sku: string;
    if (!supplierProductNo) {
      sku = buildFallbackSku();
    } else {
      const platform = (supplier.platformCode ?? 'ETC').toUpperCase();
      const abbrPart = supplier.abbr ? supplier.abbr.toUpperCase() : 'DIRECT';
      sku = `${platform}-${abbrPart}-${supplierProductNo.toUpperCase()}`;
    }

    // Ensure uniqueness: append suffix if collision
    let finalSku = sku;
    let attempt = 0;
    while (true) {
      const existing = await prisma.product.findUnique({ where: { sku: finalSku } });
      if (!existing) break;
      attempt += 1;
      finalSku = `${sku}-${attempt}`;
      if (attempt > 99) { finalSku = buildFallbackSku(); break; }
    }

    return NextResponse.json({
      success: true,
      sku: finalSku,
      available: true,
      platformCode: supplier.platformCode,
      supplierAbbr: supplier.abbr,
      supplierName: supplier.name,
      warning: attempt > 0 ? `Original SKU ${sku} was taken. Assigned ${finalSku}` : null,
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
