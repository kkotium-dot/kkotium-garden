import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
    });
    if (!supplier) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, supplier });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const data: any = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.abbr !== undefined) {
      const v = String(body.abbr).trim().toUpperCase();
      if (v.length < 2 || v.length > 4) {
        return NextResponse.json({ success: false, error: 'abbr must be 2-4 characters' }, { status: 400 });
      }
      data.abbr = v;
    }
    if (body.platformCode !== undefined) {
      data.platformCode = String(body.platformCode).trim().toUpperCase();
    }
    // Update platformId FK when provided
    if (body.platformId !== undefined) {
      data.platformId = body.platformId || null;
    } else if (body.platformCode !== undefined) {
      // Auto-resolve platformId from platformCode
      const pc = String(body.platformCode).trim().toUpperCase();
      const plat = await prisma.platform.findFirst({ where: { code: pc } });
      if (plat) data.platformId = plat.id;
    }
    if (body.defaultMargin !== undefined) data.defaultMargin = Number(body.defaultMargin);
    if (body.contact !== undefined) data.contact = String(body.contact).trim() || null;
    if (body.address !== undefined) data.address = String(body.address).trim() || null;
    if (body.description !== undefined) data.description = String(body.description).trim() || null;
    if (body.domeggookSellerId !== undefined) data.domeggookSellerId = String(body.domeggookSellerId).trim() || null;
    if (body.active !== undefined) data.active = Boolean(body.active);
    // Default shipping template connection
    if (body.defaultShippingTemplateId !== undefined) {
      data.defaultShippingTemplateId = body.defaultShippingTemplateId || null;
    }

    const supplier = await prisma.supplier.update({ where: { id: params.id }, data });
    return NextResponse.json({ success: true, supplier });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productCount = await prisma.product.count({ where: { supplierId: params.id } });
    if (productCount > 0) {
      return NextResponse.json({
        success: false,
        error: productCount + ' products linked. Delete or reassign them first.',
        productCount,
      }, { status: 409 });
    }
    await prisma.supplier.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, deleted: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
