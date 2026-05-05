// src/app/api/orders/month-review-pending/route.ts
// Workflow Redesign Sprint Part A3-4a (2026-05-05) — Month review reminder API
//
// GET → returns the list of orders eligible for a one-month-use review
// reminder + the current Solapi activation status so the dashboard widget
// can render either a live preview (configured + eligible) or a stat-only
// view (not yet configured / under threshold).
//
// The response intentionally bundles Solapi state so a single SWR fetch
// drives the entire widget (no double round-trip, single loading state).
//
// Mirror of /api/orders/confirmation-pending so the two-stage review
// pipeline (D+3~5 confirm + D+28~32 month-review) shares the same
// activation gate (50 monthly delivered orders).

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findMonthReviewEligibleOrders } from '@/lib/month-review-pending';

export const dynamic = 'force-dynamic';

// Threshold to flip alimtalk feature from preview-only to live-send
// (mirrored from /api/kakao-settings + /api/orders/confirmation-pending —
// kept in sync via shared constant).
const SOLAPI_ACTIVATION_THRESHOLD = 50;

export async function GET() {
  try {
    // 1. Find eligible orders (COMPLETED in [D+28, D+32] window).
    const result = await findMonthReviewEligibleOrders();

    // 2. Pull Solapi credentials + monthly delivered count (mirrors
    //    /api/kakao-settings + /api/orders/confirmation-pending logic so
    //    the widget never has to call multiple endpoints).
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
    const msg = e instanceof Error ? e.message : 'Failed to scan month-review-pending orders';
    console.error('[orders/month-review-pending] error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
