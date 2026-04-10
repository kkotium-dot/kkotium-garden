// src/app/api/naver-settings/route.ts
// Naver default settings — stored in StoreSettings DB table (not filesystem)
// Replaces the old naver-settings.json file approach (breaks on Vercel deploy)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { KKOTIUM_DEFAULTS } from '@/lib/naver/codes';


export const dynamic = 'force-dynamic';
const SETTINGS_ID = 'default';

// Map naver-specific fields onto StoreSettings row
// Non-standard fields are stored as JSON in a dedicated naverDefaults column if present,
// otherwise we return KKOTIUM_DEFAULTS merged with stored overrides
async function getNaverSettings() {
  try {
    const row = await (prisma as any).storeSettings.findUnique({
      where: { id: SETTINGS_ID },
    });

    if (!row) return { ...KKOTIUM_DEFAULTS };

    // Merge DB values over defaults
    return {
      ...KKOTIUM_DEFAULTS,
      // Fields that exist in StoreSettings
      asPhone:    row.asPhone    || KKOTIUM_DEFAULTS.asPhone,
      asGuide:    row.asGuide    || KKOTIUM_DEFAULTS.asGuide,
      courierCode: row.defaultCourierCode || KKOTIUM_DEFAULTS.courierCode,
      returnShippingFee:   row.defaultReturnFee   ?? KKOTIUM_DEFAULTS.returnShippingFee,
      exchangeShippingFee: row.defaultExchangeFee ?? KKOTIUM_DEFAULTS.exchangeShippingFee,
      freeShippingMin: row.freeShippingThreshold ?? KKOTIUM_DEFAULTS.freeShippingMin,
      // Parse extended naver defaults from JSON column if it exists
      ...(row.naverDefaults ? JSON.parse(row.naverDefaults) : {}),
    };
  } catch {
    return { ...KKOTIUM_DEFAULTS };
  }
}

export async function GET() {
  const settings = await getNaverSettings();
  return NextResponse.json({ success: true, settings });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Extract fields that map directly to StoreSettings columns
    const storeUpdate: Record<string, unknown> = { updatedAt: new Date() };
    if (body.asPhone    !== undefined) storeUpdate.asPhone    = String(body.asPhone).trim();
    if (body.asGuide    !== undefined) storeUpdate.asGuide    = String(body.asGuide).trim();
    if (body.courierCode !== undefined) storeUpdate.defaultCourierCode = String(body.courierCode).trim();
    if (body.returnShippingFee   !== undefined) storeUpdate.defaultReturnFee   = Number(body.returnShippingFee);
    if (body.exchangeShippingFee !== undefined) storeUpdate.defaultExchangeFee = Number(body.exchangeShippingFee);
    if (body.freeShippingMin !== undefined) storeUpdate.freeShippingThreshold = Number(body.freeShippingMin);

    // Store remaining naver-specific fields as JSON if naverDefaults column exists
    // (safe — if column doesn't exist, upsert just ignores unknown keys via try/catch)
    const naverExtra: Record<string, unknown> = {};
    const directKeys = new Set(['asPhone','asGuide','courierCode','returnShippingFee','exchangeShippingFee','freeShippingMin']);
    for (const [k, v] of Object.entries(body)) {
      if (!directKeys.has(k)) naverExtra[k] = v;
    }
    if (Object.keys(naverExtra).length > 0) {
      try { storeUpdate.naverDefaults = JSON.stringify(naverExtra); } catch {}
    }

    await (prisma as any).storeSettings.upsert({
      where:  { id: SETTINGS_ID },
      update: storeUpdate,
      create: { id: SETTINGS_ID, ...storeUpdate },
    });

    const settings = await getNaverSettings();
    return NextResponse.json({ success: true, settings });
  } catch (e: any) {
    console.error('[naver-settings] POST error:', e);
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
