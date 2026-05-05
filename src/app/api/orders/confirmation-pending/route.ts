// src/app/api/orders/confirmation-pending/route.ts
// Workflow Redesign Sprint Part A3-1 (2026-05-05) — Confirmation reminder API
//
// GET → returns the list of orders eligible for a purchase-confirmation
// reminder + the current Solapi activation status so the dashboard widget
// can render either a live preview (configured + eligible) or a stat-only
// view (not yet configured / under threshold).
//
// The response intentionally bundles Solapi state so a single SWR fetch
// drives the entire widget (no double round-trip, single loading state).

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findReminderEligibleOrders } from '@/lib/confirmation-pending';

export const dynamic = 'force-dynamic';

// Threshold to flip alimtalk feature from preview-only to live-send
// (mirrored from /api/kakao-settings — kept in sync via constant).
const SOLAPI_ACTIVATION_THRESHOLD = 50;

export async function GET() {
  try {
    // 1. Find eligible orders (DELIVERED in [D+3, D+5] window).
    const result = await findReminderEligibleOrders();

    // 2. Pull Solapi credentials + monthly delivered count (mirrors
    //    /api/kakao-settings logic so the widget never has to call both).
    const settings = await prisma.storeSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });

    const solapiConfigured = Boolean(
      settings.solapiApiKey && settings.solapiApiSecret && settings.kakaoSenderId,
    );

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyDeliveredCount = await prisma.order.count({
      where: {
        status: { in: ['DELIVERED', 'COMPLETED'] },
        OR: [
          { deliveredAt: { gte: monthStart } },
          { paidAt:      { gte: monthStart } },
        ],
      },
    });

    const eligibleForActivation = monthlyDeliveredCount >= SOLAPI_ACTIVATION_THRESHOLD;
    const sendActive = solapiConfigured && eligibleForActivation;

    return NextResponse.json({
      success: true,
      data: {
        orders:         result.orders,
        count:          result.count,
        primaryCount:   result.primaryCount,
        fallbackCount:  result.fallbackCount,
        scanWindow:     result.scanWindow,
        solapi: {
          configured:           solapiConfigured,
          eligibleForActivation,
          monthlyDeliveredCount,
          activationThreshold:  SOLAPI_ACTIVATION_THRESHOLD,
          sendActive,
          progressPercent:      Math.min(
            100,
            Math.round((monthlyDeliveredCount / SOLAPI_ACTIVATION_THRESHOLD) * 100),
          ),
        },
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to scan confirmation-pending orders';
    console.error('[orders/confirmation-pending] error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
