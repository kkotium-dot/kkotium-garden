import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/shipping-templates — list all templates with optional filters

export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const platformCode = searchParams.get('platformCode') || undefined;
    const supplierId = searchParams.get('supplierId') || undefined;

    const where: any = {};
    if (!includeInactive) where.active = true;
    if (platformCode) where.platformCode = platformCode.toUpperCase();
    if (supplierId) where.supplierId = supplierId;

    const templates = await prisma.shippingTemplate.findMany({
      where,
      orderBy: [{ platformCode: 'asc' }, { name: 'asc' }],
      include: {
        supplier: { select: { id: true, name: true, code: true, abbr: true } },
        _count: { select: { Product: true } },
      },
    });
    return NextResponse.json({ success: true, templates });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

// POST /api/shipping-templates — create a new template
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 });
    }

    // Auto-generate code from name if not provided
    const code = String(body.code ?? '').trim() ||
      name.replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase().slice(0, 30) + '_' + Date.now().toString(36).toUpperCase();

    const template = await prisma.shippingTemplate.create({
      data: {
        name,
        code,
        platformCode: body.platformCode ? String(body.platformCode).trim().toUpperCase() : null,
        supplierCode: body.supplierCode ? String(body.supplierCode).trim().toUpperCase() : null,
        supplierId: body.supplierId ? String(body.supplierId).trim() : null,
        isPrimary: Boolean(body.isPrimary ?? false),
        courierCode: String(body.courierCode ?? 'CJGLS').trim(),
        shippingType: Number(body.shippingType ?? 1),
        shippingFee: Number(body.shippingFee ?? 3000),
        freeThreshold: body.freeThreshold != null ? Number(body.freeThreshold) : null,
        returnFee: Number(body.returnFee ?? 6000),
        exchangeFee: Number(body.exchangeFee ?? 6000),
        jejuFee: Number(body.jejuFee ?? 5000),
        islandFee: Number(body.islandFee ?? 5000),
        naverTemplateNo: body.naverTemplateNo ? String(body.naverTemplateNo).trim() : null,
        bundleKey: body.bundleKey ? String(body.bundleKey).trim() : null,
        memo: body.memo ? String(body.memo).trim() : null,
      },
    });
    return NextResponse.json({ success: true, template }, { status: 201 });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Template code already exists' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
