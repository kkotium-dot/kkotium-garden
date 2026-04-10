import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
const SETTINGS_ID = 'default';

export async function GET() {
  try {
    // Use raw query to include domeggook_api_key which is not in Prisma schema yet
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT *, domeggook_api_key FROM store_settings WHERE id = 'default' LIMIT 1
    `;
    const settings = rows[0] ?? {
      id: SETTINGS_ID,
      free_shipping_threshold: 30000,
      store_name: '',
      as_phone: '',
      as_guide: '',
      default_courier_code: 'CJGLS',
      default_return_fee: 6000,
      default_exchange_fee: 6000,
      domeggook_api_key: '',
    };
    // Mask API key — only show if set (first 6 chars + ***)
    const rawKey = String(settings.domeggook_api_key ?? '');
    const maskedKey = rawKey.length > 6 ? rawKey.slice(0, 6) + '***' : (rawKey ? '***' : '');
    // Normalize to camelCase for frontend consistency
    const normalized = {
      ...settings,
      domeggookApiKey: rawKey,              // camelCase alias
      domeggook_api_key_masked: maskedKey,
      domeggook_api_key_set: rawKey.length > 0,
    };
    return NextResponse.json({ success: true, settings: normalized });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.freeShippingThreshold !== undefined)
      data.freeShippingThreshold = Number(body.freeShippingThreshold);
    if (body.storeName !== undefined)
      data.storeName = String(body.storeName).trim();
    if (body.asPhone !== undefined)
      data.asPhone = String(body.asPhone).trim();
    if (body.asGuide !== undefined)
      data.asGuide = String(body.asGuide).trim();
    if (body.defaultCourierCode !== undefined)
      data.defaultCourierCode = String(body.defaultCourierCode).trim();
    if (body.defaultReturnFee !== undefined)
      data.defaultReturnFee = Number(body.defaultReturnFee);
    if (body.defaultExchangeFee !== undefined)
      data.defaultExchangeFee = Number(body.defaultExchangeFee);
    // Domeggook OpenAPI Key
    if (body.domeggookApiKey !== undefined) {
      const key = String(body.domeggookApiKey).trim();
      await prisma.$executeRaw`UPDATE store_settings SET domeggook_api_key = ${key} WHERE id = 'default'`;
      if (!Object.keys(data).length) return NextResponse.json({ success: true });
    }

    data.updatedAt = new Date();

    const settings = await (prisma as any).storeSettings.upsert({
      where: { id: SETTINGS_ID },
      update: data,
      create: { id: SETTINGS_ID, ...data },
    });

    return NextResponse.json({ success: true, settings });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

// POST is an alias for PATCH — naver-settings page calls POST
export const POST = PATCH;
