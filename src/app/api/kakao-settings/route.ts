// E-13A Kakao channel settings API
// GET: Returns kakao channel info + solapi readiness state + insert card palette
// PATCH: Updates settings (channel info, solapi credentials, insert card palette)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Default insert card palette structure
type CardPalette = {
  slot1: { name: string; hex: string };
  slot2: { name: string; hex: string };
  slot3: { name: string; hex: string };
  slot4: { name: string; hex: string };
};

const DEFAULT_PALETTE: CardPalette = {
  slot1: { name: 'Pink',  hex: '#FF6B8A' },
  slot2: { name: 'Red',   hex: '#E62310' },
  slot3: { name: 'Beige', hex: '#A37B4B' },
  slot4: { name: 'Blush', hex: '#D4537E' },
};

// Threshold to auto-activate alimtalk feature (delivered+confirmed orders this month)
const SOLAPI_ACTIVATION_THRESHOLD = 50;

// Validate HEX color format (#RRGGBB or #RGB)
function isValidHex(hex: string): boolean {
  return /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(hex);
}

// Sanitize palette input — accept only known slot names + valid hex
function sanitizePalette(input: unknown): CardPalette {
  if (!input || typeof input !== 'object') return DEFAULT_PALETTE;
  const raw = input as Record<string, unknown>;
  const result: CardPalette = { ...DEFAULT_PALETTE };
  (['slot1', 'slot2', 'slot3', 'slot4'] as const).forEach((key) => {
    const slot = raw[key];
    if (slot && typeof slot === 'object') {
      const s = slot as Record<string, unknown>;
      const name = typeof s.name === 'string' ? s.name.slice(0, 30) : DEFAULT_PALETTE[key].name;
      const hex = typeof s.hex === 'string' && isValidHex(s.hex) ? s.hex.toUpperCase() : DEFAULT_PALETTE[key].hex;
      result[key] = { name, hex };
    }
  });
  return result;
}

export async function GET() {
  try {
    const settings = await prisma.storeSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });

    // Count this-month orders that reached DELIVERED or beyond (proxy for activation readiness)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyDeliveredCount = await prisma.order.count({
      where: {
        status: { in: ['DELIVERED', 'COMPLETED'] },
        OR: [
          { deliveredAt: { gte: monthStart } },
          { paidAt: { gte: monthStart } },
        ],
      },
    });

    const palette = sanitizePalette(settings.insertCardPalette);

    // Solapi activation state — explicit boolean for UI clarity
    const solapiConfigured = Boolean(settings.solapiApiKey && settings.solapiApiSecret && settings.kakaoSenderId);
    const eligibleForActivation = monthlyDeliveredCount >= SOLAPI_ACTIVATION_THRESHOLD;

    return NextResponse.json({
      success: true,
      data: {
        // Channel basics
        kakaoChannelId: settings.kakaoChannelId,
        kakaoChannelUrl: settings.kakaoChannelUrl || `https://pf.kakao.com/${settings.kakaoChannelId}`,
        kakaoChannelName: settings.kakaoChannelName,
        kakaoChannelEmail: settings.kakaoChannelEmail,
        // Solapi credentials (mask on output for security)
        solapiApiKey: settings.solapiApiKey ? '••••' + settings.solapiApiKey.slice(-4) : '',
        solapiApiSecretSet: Boolean(settings.solapiApiSecret),
        kakaoSenderId: settings.kakaoSenderId,
        kakaoSenderPhone: settings.kakaoSenderPhone,
        // Insert card palette (full)
        insertCardPalette: palette,
        // Activation state
        solapiConfigured,
        eligibleForActivation,
        monthlyDeliveredCount,
        activationThreshold: SOLAPI_ACTIVATION_THRESHOLD,
        progressPercent: Math.min(100, Math.round((monthlyDeliveredCount / SOLAPI_ACTIVATION_THRESHOLD) * 100)),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to load kakao settings';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    // Channel info
    if (typeof body.kakaoChannelId === 'string') {
      const id = body.kakaoChannelId.trim().slice(0, 20);
      if (id.length > 0) updates.kakaoChannelId = id;
    }
    if (typeof body.kakaoChannelUrl === 'string') {
      updates.kakaoChannelUrl = body.kakaoChannelUrl.trim().slice(0, 200);
    }
    if (typeof body.kakaoChannelName === 'string') {
      updates.kakaoChannelName = body.kakaoChannelName.trim().slice(0, 100);
    }
    if (typeof body.kakaoChannelEmail === 'string') {
      updates.kakaoChannelEmail = body.kakaoChannelEmail.trim().slice(0, 100);
    }

    // Solapi credentials — only update if non-mask value provided
    if (typeof body.solapiApiKey === 'string' && !body.solapiApiKey.startsWith('•')) {
      updates.solapiApiKey = body.solapiApiKey.trim().slice(0, 200);
    }
    if (typeof body.solapiApiSecret === 'string' && body.solapiApiSecret.length > 0) {
      updates.solapiApiSecret = body.solapiApiSecret.trim().slice(0, 200);
    }
    if (typeof body.kakaoSenderId === 'string') {
      updates.kakaoSenderId = body.kakaoSenderId.trim().slice(0, 100);
    }
    if (typeof body.kakaoSenderPhone === 'string') {
      updates.kakaoSenderPhone = body.kakaoSenderPhone.trim().slice(0, 20);
    }

    // Insert card palette
    if (body.insertCardPalette) {
      updates.insertCardPalette = sanitizePalette(body.insertCardPalette);
    }

    const updated = await prisma.storeSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...updates },
      update: updates,
    });

    return NextResponse.json({ success: true, data: { id: updated.id } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to update kakao settings';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
