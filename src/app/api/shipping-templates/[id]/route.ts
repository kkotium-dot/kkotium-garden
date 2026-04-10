import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const data: any = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.platformCode !== undefined) data.platformCode = String(body.platformCode).trim().toUpperCase() || null;
    if (body.supplierCode !== undefined) data.supplierCode = String(body.supplierCode).trim().toUpperCase() || null;
    if (body.courierCode !== undefined) data.courierCode = String(body.courierCode).trim();
    if (body.shippingType !== undefined) data.shippingType = Number(body.shippingType);
    if (body.shippingFee !== undefined) data.shippingFee = Number(body.shippingFee);
    if (body.freeThreshold !== undefined) data.freeThreshold = body.freeThreshold ? Number(body.freeThreshold) : null;
    if (body.returnFee !== undefined) data.returnFee = Number(body.returnFee);
    if (body.exchangeFee !== undefined) data.exchangeFee = Number(body.exchangeFee);
    if (body.jejuFee !== undefined) data.jejuFee = Number(body.jejuFee);
    if (body.islandFee !== undefined) data.islandFee = Number(body.islandFee);
    if (body.naverTemplateNo !== undefined) data.naverTemplateNo = String(body.naverTemplateNo).trim() || null;
    if (body.bundleKey !== undefined) data.bundleKey = String(body.bundleKey).trim() || null;
    if (body.active !== undefined) data.active = Boolean(body.active);

    const template = await prisma.shippingTemplate.update({ where: { id: params.id }, data });
    return NextResponse.json({ success: true, template });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productCount = await prisma.product.count({
      where: { shipping_template_id: params.id },
    });
    if (productCount > 0) {
      await prisma.shippingTemplate.update({ where: { id: params.id }, data: { active: false } });
      return NextResponse.json({ success: true, deactivated: true, productCount, message: `Linked to ${productCount} product(s) — deactivated instead of deleted.` });
    }
    await prisma.shippingTemplate.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, deleted: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
