import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
function validateAbbr(abbr: string): string | null {
  const v = abbr.trim().toUpperCase();
  if (!v) return 'abbr is required';
  if (v.length < 2 || v.length > 4) return 'abbr must be 2-4 characters';
  if (!/^[A-Z0-9]+$/.test(v)) return 'abbr must be uppercase letters or digits only';
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const platformCode = searchParams.get('platformCode') ?? '';
    const platformId = searchParams.get('platformId') ?? '';
    const supplierId = searchParams.get('supplierId') ?? '';
    const domeggookSellerId = searchParams.get('domeggookSellerId') ?? '';
    const where: any = {};
    // Filter by platformId (FK) when provided — preferred
    if (platformId) where.platformId = platformId;
    // Fallback: filter by platformCode string
    else if (platformCode) where.platformCode = platformCode;
    // Single supplier lookup
    if (supplierId) where.id = supplierId;
    // Crawler auto-mapping: look up by domeggook seller ID
    if (domeggookSellerId) where.domeggookSellerId = domeggookSellerId;
    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: [{ platformCode: 'asc' }, { name: 'asc' }],
      include: {
        products: { select: { id: true } },
        shippingTemplates: { select: { id: true, name: true }, where: { active: true } },
        defaultShippingTemplate: { select: { id: true, name: true, shippingFee: true, shippingType: true } },
      },
    });
    return NextResponse.json({ success: true, suppliers });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? '').trim();
    const code = String(body?.code ?? '').trim().toUpperCase();
    const abbr = String(body?.abbr ?? '').trim().toUpperCase();
    const platformCode = String(body?.platformCode ?? 'ETC').trim().toUpperCase();
    const platformId: string | null = body?.platformId ?? null;
    const defaultMargin = body?.defaultMargin != null ? Number(body.defaultMargin) : 30;
    const contact = String(body?.contact ?? '').trim() || null;
    const address = String(body?.address ?? '').trim() || null;
    const description = String(body?.description ?? '').trim() || null;
    const domeggookSellerId = String(body?.domeggookSellerId ?? '').trim() || null;

    if (!name) return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 });
    if (!code) return NextResponse.json({ success: false, error: 'code is required' }, { status: 400 });

    const abbrError = validateAbbr(abbr);
    if (abbrError) return NextResponse.json({ success: false, error: abbrError }, { status: 400 });

    // Resolve platformId from platformCode if not provided directly
    let resolvedPlatformId: string | null = platformId;
    if (!resolvedPlatformId && platformCode && platformCode !== 'ETC') {
      const plat = await prisma.platform.findFirst({ where: { code: platformCode } });
      resolvedPlatformId = plat?.id ?? null;
    }

    const codeExists = await prisma.supplier.findUnique({ where: { code } });
    if (codeExists) return NextResponse.json({ success: false, error: 'code already exists' }, { status: 409 });

    const abbrExists = await prisma.supplier.findUnique({ where: { abbr } });
    if (abbrExists) return NextResponse.json({ success: false, error: 'abbr ' + abbr + ' already exists' }, { status: 409 });

    const supplier = await prisma.supplier.create({
      data: {
        name, code, abbr, platformCode, defaultMargin, contact, address, description, domeggookSellerId,
        // Connect platformId FK so supplier appears under platform in settings
        ...(resolvedPlatformId ? { platformId: resolvedPlatformId } : {}),
      },
    });
    return NextResponse.json({ success: true, supplier }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
