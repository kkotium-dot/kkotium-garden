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
    // #334(2026-08-10): String(null) === "null" — 자바스크립트 함정. body.x가
    // 이미 JS null(필드를 비운 채 저장, 또는 클라이언트가 null을 그대로 보낸
    // 경우)이면 String()이 문자열 "null"을 만들어 DB에 그대로 저장돼버렸다
    // (거래처 명단 화면에 "null" 텍스트로 노출된 실측 사례, 4개 공급사 전부
    // 오염 확인). null/undefined는 String() 없이 그대로 null로 저장하고,
    // 실제 문자열 값만 trim한다. 4개 필드(contact/address/description/
    // domeggookSellerId) 전부 같은 패턴이라 한 번에 근본 수정한다(#55).
    if (body.contact !== undefined) data.contact = body.contact == null ? null : String(body.contact).trim() || null;
    if (body.address !== undefined) data.address = body.address == null ? null : String(body.address).trim() || null;
    if (body.description !== undefined) data.description = body.description == null ? null : String(body.description).trim() || null;
    if (body.domeggookSellerId !== undefined) data.domeggookSellerId = body.domeggookSellerId == null ? null : String(body.domeggookSellerId).trim() || null;
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
